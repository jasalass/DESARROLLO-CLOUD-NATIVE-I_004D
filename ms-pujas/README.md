# ms-pujas

> Este microservicio aún no está implementado. Este documento es el **contrato** que debe cumplir, para que
> quien lo construya (en cualquier stack) pueda hacerlo sin coordinar cada detalle en vivo con el resto del
> equipo. Ver el plan completo en
> [`../docs/SubastaLive_Plan_de_Proyecto_v3.pdf`](../docs/SubastaLive_Plan_de_Proyecto_v3.pdf) (secciones 5.3, 5.4, 6.2, 6.3, 8.3).
>
> Convenciones generales (formato de error, tipos de dato, roles, header de auth) están centralizadas en el
> [README principal](../README.md#convenciones-de-api-compartidas) para no repetirlas en los tres servicios.

## Responsabilidad

Recibe, valida y registra las **pujas** de los postores. Es dueño de la "verdad" transaccional de cuál es la
mejor puja vigente de cada subasta (sección 5.3 del plan: PostgreSQL responde "¿cuál es el estado actual?",
y el ejemplo dado es exactamente este). El precio vigente de una subasta se calcula **localmente**, a partir
de las pujas que este servicio ya tiene guardadas — no se le pregunta a nadie más.

Cubre las historias:
- **HU-03** — Emitir una puja (RF-06, RF-07, RF-08; RF-09 en Etapa 3)

## Propiedad de los datos

- Esquema propio en la instancia RDS PostgreSQL compartida: **`schema_pujas`** (ver [`../db/schema_pujas`](../db/schema_pujas)).
- Ningún otro microservicio debe leer o escribir directamente sobre este esquema (RNF-06).

## Autenticación y autorización

- Validar JWT multi-issuer (Cognito + Entra ID) en cada request (RF-29, RF-33).
- Emitir una puja es una acción de **Postor**. Consultar pujas puede estar disponible también para
  Martillero/Admin (por ejemplo, para ver actividad de sus subastas).

## Modelo de datos (JSON)

### `Puja`

```json
{
  "id": "9a2f1a10-...",
  "subastaId": "1e77c3b0-...",
  "usuarioSub": "b3f1c2a4-...",
  "monto": 24000,
  "fecha": "2026-08-27T19:55:00Z"
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string (uuid) | Generado por el servicio |
| `subastaId` | string (uuid) | Referencia a una subasta de `ms-catalogo` (no hay FK real entre esquemas, solo el id) |
| `usuarioSub` | string (uuid) | Tomado del token, nunca del body |
| `monto` | number | Validado contra el precio vigente + incremento mínimo antes de guardar |
| `fecha` | string (datetime ISO-8601) | Timestamp del servidor al recibir la puja — es la base del orden de llegada (RF-09, relevante recién en Etapa 3) |

## Endpoints que debe exponer

### `POST /pujas`

Registra una puja (RF-06, RF-07, RF-08).

- **Rol requerido:** Postor.
- **Request:**
  ```json
  { "subastaId": "1e77c3b0-...", "monto": 24000 }
  ```
  (`usuarioSub` sale del token, no del body — si el body trae ese campo, ignorarlo)
- **Response `201 Created`:**
  ```json
  {
    "id": "9a2f1a10-...",
    "subastaId": "1e77c3b0-...",
    "usuarioSub": "b3f1c2a4-...",
    "monto": 24000,
    "fecha": "2026-08-27T19:55:00Z"
  }
  ```
- **Response `409 Conflict`** — la subasta no está abierta (RF-06):
  ```json
  { "codigo": "SUBASTA_NO_ABIERTA", "mensaje": "La subasta 1e77c3b0-... no está en estado ABIERTA." }
  ```
- **Response `400 Bad Request`** — el monto no supera precio vigente + incremento mínimo (RF-07):
  ```json
  {
    "codigo": "MONTO_INSUFICIENTE",
    "mensaje": "El monto debe ser al menos 25000.",
    "detalles": { "montoMinimoRequerido": 25000 }
  }
  ```

### `GET /pujas?subastaId={id}`

Historial de pujas de una subasta (RNF-02, útil para mostrar actividad en vivo).

- **Rol requerido:** cualquiera autenticado.
- **Response `200 OK`** (orden: más reciente primero):
  ```json
  [
    { "id": "9a2f1a10-...", "subastaId": "1e77c3b0-...", "usuarioSub": "b3f1c2a4-...", "monto": 24000, "fecha": "2026-08-27T19:55:00Z" },
    { "id": "8b1e77aa-...", "subastaId": "1e77c3b0-...", "usuarioSub": "c72a90de-...", "monto": 22000, "fecha": "2026-08-27T19:40:00Z" }
  ]
  ```

### `GET /pujas/{subastaId}/actual`

Precio vigente de una subasta, calculado localmente (`MAX(monto)` de las pujas de esa subasta). Pensado para
ser consumido por `ms-catalogo` al enriquecer `GET /subastas/{id}`.

- **Rol requerido:** cualquiera autenticado.
- **Response `200 OK`** (con pujas):
  ```json
  { "subastaId": "1e77c3b0-...", "montoActual": 24000, "totalPujas": 6, "ultimaPujaFecha": "2026-08-27T19:55:00Z" }
  ```
- **Response `200 OK`** (sin pujas todavía — no es error):
  ```json
  { "subastaId": "1e77c3b0-...", "montoActual": null, "totalPujas": 0, "ultimaPujaFecha": null }
  ```

### `GET /pujas?usuarioSub={sub}`

Historial de pujas de un usuario. Pensado para ser consumido por `ms-usuarios`.

- **Rol requerido:** cualquiera autenticado (la restricción de "solo su propio historial" la aplica quien
  llama — típicamente `ms-usuarios` — no este endpoint).
- **Response `200 OK`:**
  ```json
  [
    { "id": "9a2f1a10-...", "subastaId": "1e77c3b0-...", "monto": 24000, "fecha": "2026-08-27T19:55:00Z" }
  ]
  ```
  (no incluye `usuarioSub` en cada item porque ya se sabe de antemano cuál es — es el filtro de la consulta)

## Reglas de negocio a validar antes de aceptar una puja (RF-06, RF-07)

1. Consultar `GET /subastas/{id}/reglas` en `ms-catalogo` (ver más abajo) para obtener `estado`,
   `precioBase` e `incrementoMinimo`. Si `estado != "ABIERTA"` → `409 SUBASTA_NO_ABIERTA`.
2. Calcular el precio vigente **localmente**: `MAX(monto)` de las pujas ya guardadas para esa `subastaId`, o
   `precioBase` (obtenido en el paso 1) si todavía no hay pujas.
3. El `monto` recibido debe ser mayor o igual a `precioVigente + incrementoMinimo`. Si no, `400 MONTO_INSUFICIENTE`.
4. Guardar la puja de forma persistente antes de responder éxito al cliente (RF-08). La fecha se asigna en el
   servidor, no la envía el cliente.

## Comunicación con otros microservicios

**Etapa 1 no tiene mensajería (RabbitMQ/Kafka aún no existen); toda comunicación entre servicios en esta
etapa es síncrona vía HTTP.**

- Antes de aceptar una puja, `ms-pujas` llama a:

  **`GET {MS_CATALOGO_BASE_URL}/subastas/{id}/reglas`** (contrato completo en [`../ms-catalogo/README.md`](../ms-catalogo/README.md))

  Respuesta esperada:
  ```json
  { "id": "1e77c3b0-...", "estado": "ABIERTA", "precioBase": 20000, "incrementoMinimo": 1000 }
  ```
  **Importante:** se llama a `/subastas/{id}/reglas`, **no** a `/subastas/{id}` — ese segundo endpoint es el
  que usa el frontend y que a su vez llama de vuelta a `ms-pujas` para el precio vigente; usar `/reglas` evita
  ese doble salto en cada puja.

- `ms-usuarios` llama a `GET /pujas?usuarioSub={sub}` de este servicio (ver contrato arriba).
- `ms-catalogo` llama a `GET /pujas/{subastaId}/actual` de este servicio (ver contrato arriba).
- Nadie debería necesitar escribir en `schema_pujas` salvo este servicio.

## Variables de entorno esperadas

| Variable | Descripción |
|---|---|
| `DB_URL` / `DB_HOST` / `DB_PORT` / `DB_NAME` | Conexión a la instancia RDS PostgreSQL |
| `DB_USERNAME`, `DB_PASSWORD` | Credenciales de conexión |
| `DB_POOL_MAX_SIZE` | Límite del pool de conexiones por contenedor (RNF-05) |
| `JWT_ISSUER_URI_COGNITO` | Issuer URI del user pool de Cognito |
| `JWT_ISSUER_URI_ENTRA` | Issuer URI del tenant de Entra ID |
| `MS_CATALOGO_BASE_URL` | URL base para llamar a `ms-catalogo` (ej. `http://ms-catalogo:8082` en Docker Compose) |
| `SERVER_PORT` | Puerto HTTP del servicio (sugerido: `8083`) |

## Evolución prevista (no implementar todavía)

- **Etapa 3:** `ms-pujas` se convierte en **productor Kafka**: tras validar y persistir cada puja en RDS,
  publica el evento `PUJA_REALIZADA` en un tópico (usando `subastaId` como clave de partición para conservar
  el orden por subasta, RF-09). La escritura en RDS y la publicación en Kafka **no son atómicas** — se acepta
  esa inconsistencia eventual y se compensa con consumidores idempotentes (RNF-03, sección 5.4 del plan). Si
  se anticipa esto, conviene aislar "guardar la puja" de "notificar que se guardó" desde el diseño inicial,
  para agregar el productor Kafka después sin tocar la lógica de validación.
- Con Kafka en juego, `ms-adjudicacion` (Etapa 3) determinará el mejor postor consumiendo este evento, y
  `ms-analitica` (Etapa 3) calculará métricas en vivo del mismo evento, en paralelo y sin interferirse
  (consumer groups independientes).

## Checklist para quien lo implemente

- [ ] Definir el stack.
- [ ] Modelar la entidad `Puja` según el JSON de arriba (con índice por `subastaId` para calcular el máximo rápido).
- [ ] Migraciones de `schema_pujas` (ver `../db/schema_pujas`).
- [ ] Validación JWT multi-issuer.
- [ ] Cliente HTTP hacia `ms-catalogo` (`/subastas/{id}/reglas`) para validar estado antes de aceptar la puja.
- [ ] Exponer `/health`.
- [ ] Dockerfile para el `docker-compose.yml` de la raíz.
- [ ] Repositorio ECR + cluster/service de ECS creados (ver README principal, sección CI/CD) — el pipeline
      [`../.github/workflows/deploy-ms-pujas.yml`](../.github/workflows/deploy-ms-pujas.yml) ya existe
      y se activa solo al hacer push a esta carpeta.
