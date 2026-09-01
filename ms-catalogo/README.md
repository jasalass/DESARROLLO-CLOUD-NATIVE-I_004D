# ms-catalogo

> **Implementación real: Spring Boot + JPA + Flyway + seguridad dual local/JWT**, mismo patrón que
> `ms-pujas` (ver su código para el mismo estilo de seguridad, manejo de errores, etc.). Reemplaza al stub
> liviano en Node/Express que traía esta carpeta antes — el contrato HTTP de abajo no cambió.
>
> Decisiones tomadas que no estaban explícitas en este README (documentadas acá para que el resto del
> equipo sepa a qué atenerse, según el punto 3 del README principal):
> - `fechaCierre` debe ser estrictamente posterior a `fechaApertura` en `POST /subastas`; si no, `400`
>   con `codigo: "VALIDACION"` (`detalles.campo = "fechaCierre"`). La tabla ya tenía el `CHECK` a nivel de
>   base de datos; esto solo evita que ese `CHECK` termine devolviendo un `500` genérico.
> - `PATCH /subastas/{id}/estado` solo valida el **rol** (Martillero o Administrador), no la propiedad del
>   lote — a diferencia de `POST /subastas`, que sí exige que el Martillero sea dueño del lote. El README no
>   lo pedía explícitamente para el PATCH, así que se dejó igual de permisivo que como está escrito arriba.
>
> Este documento sigue siendo el **contrato**: qué responsabilidad tiene el servicio, qué esquema de base de
> datos le pertenece, qué endpoints expone (rutas, roles, JSON exacto) y qué llama a otros microservicios.
> Ver el plan completo en
> [`../docs/SubastaLive_Plan_de_Proyecto_v4.pdf`](../docs/SubastaLive_Plan_de_Proyecto_v4.pdf) (secciones 5.5, 6.2, 6.3, 7.3).
>
> Convenciones generales (formato de error, tipos de dato, roles, header de auth) están centralizadas en el
> [README principal](../README.md#convenciones-de-api-compartidas) para no repetirlas en los tres servicios.

## Responsabilidad

Dueño de los **lotes** y las **subastas**: creación de lotes, programación de apertura/cierre de una subasta,
y gestión de las transiciones de estado (`PROGRAMADA` → `ABIERTA` → `CERRADA`/`ADJUDICADA`).

Cubre las historias:
- **HU-02** — Consultar subastas y lotes (RF-04, RF-05)
- **HU-07** — Publicar un lote y programar su subasta (RF-16, RF-17, RF-18)

## Propiedad de los datos

- Esquema propio en la instancia RDS PostgreSQL compartida: **`schema_catalogo`** (ver [`../db/schema_catalogo`](../db/schema_catalogo)).
- Ningún otro microservicio debe leer o escribir directamente sobre este esquema (RNF-06).

## Autenticación y autorización

- Validar JWT multi-issuer (Cognito + Entra ID) en cada request (RF-29, RF-33).
- Rutas de **consulta** (listar subastas, ver detalle de lote) están disponibles para cualquier usuario
  autenticado (postor, martillero, admin) — son compartidas entre roles, por eso no se separan por proveedor
  de token (ver sección 5.6 del plan).
- Rutas de **escritura** (crear lote, programar subasta, cambiar estado) requieren rol **Martillero** o
  **Administrador** (RF-30).

## Modelo de datos (JSON)

### `Lote`

```json
{
  "id": "c4a1f900-...",
  "martilleroSub": "d81fa021-...",
  "titulo": "Reloj antiguo de pared",
  "descripcion": "Reloj de péndulo, madera de roble, funcionando.",
  "precioBase": 20000,
  "incrementoMinimo": 1000,
  "imagenUrl": "https://.../reloj.jpg"
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string (uuid) | Generado por el servicio |
| `martilleroSub` | string (uuid) | `sub` del creador, tomado del token — nunca del body |
| `titulo`, `descripcion` | string | — |
| `precioBase` | number | Debe ser > 0 |
| `incrementoMinimo` | number | Debe ser > 0; monto mínimo que debe superar cada nueva puja sobre el precio actual |
| `imagenUrl` | string (url) | Puede ser `null` en la Etapa 1 si no hay almacenamiento de imágenes resuelto aún |

### `Subasta`

```json
{
  "id": "1e77c3b0-...",
  "loteId": "c4a1f900-...",
  "estado": "ABIERTA",
  "fechaApertura": "2026-08-27T18:00:00Z",
  "fechaCierre": "2026-08-27T20:00:00Z"
}
```

`estado` es uno de: `PROGRAMADA` → `ABIERTA` → `CERRADA` → `ADJUDICADA`. Transiciones válidas: `PROGRAMADA→ABIERTA`, `ABIERTA→CERRADA`, `CERRADA→ADJUDICADA`. Cualquier otra combinación responde `409` con `codigo: "TRANSICION_INVALIDA"`.

## Endpoints que debe exponer

### `GET /subastas`

Lista subastas (RF-04).

- **Rol requerido:** cualquiera autenticado.
- **Query params:** `estado` (opcional, filtra por uno de los valores del enum).
- **Response `200 OK`:**
  ```json
  [
    {
      "id": "1e77c3b0-...",
      "estado": "ABIERTA",
      "fechaApertura": "2026-08-27T18:00:00Z",
      "fechaCierre": "2026-08-27T20:00:00Z",
      "lote": {
        "id": "c4a1f900-...",
        "titulo": "Reloj antiguo de pared",
        "precioBase": 20000,
        "imagenUrl": "https://.../reloj.jpg"
      }
    }
  ]
  ```
  **Decisión tomada:** el listado **no** incluye el precio vigente en tiempo real (evita una llamada a
  `ms-pujas` por cada subasta listada — N+1). El precio vigente solo se resuelve en el detalle (siguiente
  endpoint).

### `GET /subastas/{id}`

Detalle de una subasta, para la vista de "sala de subasta" (RF-04, RF-05). Endpoint de cara al frontend.

- **Rol requerido:** cualquiera autenticado.
- **Response `200 OK`:**
  ```json
  {
    "id": "1e77c3b0-...",
    "estado": "ABIERTA",
    "fechaApertura": "2026-08-27T18:00:00Z",
    "fechaCierre": "2026-08-27T20:00:00Z",
    "lote": {
      "id": "c4a1f900-...",
      "titulo": "Reloj antiguo de pared",
      "descripcion": "Reloj de péndulo, madera de roble, funcionando.",
      "precioBase": 20000,
      "incrementoMinimo": 1000,
      "imagenUrl": "https://.../reloj.jpg"
    },
    "precioActual": 24000,
    "totalPujas": 6
  }
  ```
  **Decisión tomada:** `precioActual` y `totalPujas` se obtienen llamando a `ms-pujas` (ver
  "Comunicación con otros microservicios" más abajo). Si `ms-pujas` no responde o no hay pujas todavía,
  `precioActual = lote.precioBase` y `totalPujas = 0` — nunca fallar el endpoint completo por un problema del
  servicio de pujas.

### `GET /subastas/{id}/reglas`

Endpoint **interno**, pensado para que `ms-pujas` valide una puja sin depender de la versión "enriquecida"
del detalle (evita que `ms-pujas` dispare, indirectamente, una llamada de vuelta a sí mismo a través de este
servicio).

- **Rol requerido:** cualquiera autenticado (se reenvía el JWT del postor que está pujando; Etapa 1 no define
  un mecanismo de autenticación servicio-a-servicio independiente).
- **Response `200 OK`:**
  ```json
  { "id": "1e77c3b0-...", "estado": "ABIERTA", "precioBase": 20000, "incrementoMinimo": 1000 }
  ```
- **Response `404 Not Found`:** subasta inexistente.

### `GET /lotes/{id}`

Detalle de un lote (RF-05).

- **Rol requerido:** cualquiera autenticado.
- **Response `200 OK`:** objeto `Lote` completo (ver modelo de datos arriba).

### `POST /lotes`

Crea un lote (RF-16).

- **Rol requerido:** Martillero, Administrador.
- **Request:**
  ```json
  {
    "titulo": "Reloj antiguo de pared",
    "descripcion": "Reloj de péndulo, madera de roble, funcionando.",
    "precioBase": 20000,
    "incrementoMinimo": 1000,
    "imagenUrl": "https://.../reloj.jpg"
  }
  ```
- **Response `201 Created`:** objeto `Lote` completo, con `id` generado y `martilleroSub` tomado del token.
- **Response `400 Bad Request`:**
  ```json
  { "codigo": "VALIDACION", "mensaje": "precioBase debe ser mayor a 0", "detalles": { "campo": "precioBase" } }
  ```

### `POST /subastas`

Programa apertura y cierre de una subasta sobre un lote existente (RF-17).

- **Rol requerido:** Martillero (dueño del lote), Administrador.
- **Request:**
  ```json
  { "loteId": "c4a1f900-...", "fechaApertura": "2026-08-27T18:00:00Z", "fechaCierre": "2026-08-27T20:00:00Z" }
  ```
- **Response `201 Created`:** objeto `Subasta` con `estado: "PROGRAMADA"`.
- **Response `409 Conflict`:** el lote ya tiene una subasta activa (`PROGRAMADA` o `ABIERTA`).
  ```json
  { "codigo": "LOTE_YA_EN_SUBASTA", "mensaje": "El lote c4a1f900-... ya tiene una subasta activa." }
  ```

### `PATCH /subastas/{id}/estado`

Transiciona el estado de una subasta (RF-18).

- **Rol requerido:** Martillero, Administrador, o el propio proceso interno de cierre automático (ver abajo).
- **Request:** `{ "estado": "ABIERTA" }`
- **Response `200 OK`:** objeto `Subasta` actualizado.
- **Response `409 Conflict`:** transición inválida (ver enum de arriba).

**Decisión tomada — cierre automático (RF-18):** un scheduler interno en este mismo servicio revisa
periódicamente (configurable, sugerido cada 30s) las subastas en estado `ABIERTA` cuya `fechaCierre` ya pasó,
y las transiciona a `CERRADA` reusando la misma lógica del `PATCH` de arriba. No se expone como job externo
para no depender de un orquestador adicional en la Etapa 1.

## Comunicación con otros microservicios

**Etapa 1 no tiene mensajería (RabbitMQ/Kafka aún no existen); toda comunicación entre servicios en esta
etapa es síncrona vía HTTP.**

- Al resolver `GET /subastas/{id}`, `ms-catalogo` llama a:

  **`GET {MS_PUJAS_BASE_URL}/pujas/{subastaId}/actual`** (contrato completo en [`../ms-pujas/README.md`](../ms-pujas/README.md))

  Respuesta esperada:
  ```json
  { "subastaId": "1e77c3b0-...", "montoActual": 24000, "totalPujas": 6, "ultimaPujaFecha": "2026-08-27T19:55:00Z" }
  ```
  Si `montoActual` viene `null` (no hay pujas), usar `lote.precioBase` como `precioActual` en la respuesta.

- `ms-pujas` llama a **`GET /subastas/{id}/reglas`** de este servicio antes de aceptar una puja (no a
  `GET /subastas/{id}`, justamente para no encadenar una llamada de vuelta a `ms-pujas`). Ver el detalle en
  [`../ms-pujas/README.md`](../ms-pujas/README.md).

## Variables de entorno esperadas

| Variable | Descripción |
|---|---|
| `DB_URL` / `DB_HOST` / `DB_PORT` / `DB_NAME` | Conexión a la instancia RDS PostgreSQL |
| `DB_USERNAME`, `DB_PASSWORD` | Credenciales de conexión |
| `DB_POOL_MAX_SIZE` | Límite del pool de conexiones por contenedor (RNF-05) |
| `JWT_ISSUER_URI_COGNITO` | Issuer URI del user pool de Cognito |
| `JWT_ISSUER_URI_ENTRA` | Issuer URI del tenant de Entra ID |
| `MS_PUJAS_BASE_URL` | URL base para llamar a `ms-pujas` (ej. `http://ms-pujas:8083` en Docker Compose) |
| `SERVER_PORT` | Puerto HTTP del servicio (sugerido: `8082`) |

## Evolución prevista (no implementar todavía)

- **Etapa 2:** `ms-catalogo` se convierte en **productor RabbitMQ**: al transicionar una subasta a `CERRADA`,
  publica el evento que dispara notificaciones, generación de comprobante y reserva de cobro (HU-05, HU-08),
  respondiendo sin esperar a que esas tareas terminen (RF-13). El `PATCH /subastas/{id}/estado` es el punto
  natural donde se insertará esa publicación.
- **Etapa 3:** el rol de "publicar el evento de cierre" se traslada a `ms-adjudicacion` (nuevo servicio,
  consumidor Kafka). `ms-catalogo` deja de encargarse de eso, pero mantiene todo lo demás sin cambios.

## Checklist para quien lo implemente

- [x] Definir el stack. → **Spring Boot 3.3 + Java 17 + JPA + Flyway** (idéntico a `ms-pujas`).
- [x] Modelar entidades `Lote` y `Subasta` según el JSON de arriba, con su máquina de estados
      (`domain/EstadoSubasta.java`).
- [x] Migraciones de `schema_catalogo` con Flyway (`src/main/resources/db/migration/V1__init.sql`, copiado
      de `../db/schema_catalogo` — ver `../db/README.md`, sección "Migraciones automáticas").
- [x] Validación JWT multi-issuer + autorización por rol (`security/`, mismo patrón dual local/JWT que
      `ms-pujas`: perfil `local` usa `LocalTokenAuthFilter`, cualquier otro perfil valida JWT real contra
      Cognito/Entra ID en `SecurityConfig`).
- [x] Scheduler de cierre automático al vencer el plazo (`scheduler/CierreAutomaticoScheduler.java`, cada
      30s por defecto, configurable con `CIERRE_AUTOMATICO_INTERVALO_MS`).
- [x] Cliente HTTP hacia `ms-pujas` para enriquecer `GET /subastas/{id}` (`pujas/PujasClient.java`, nunca
      lanza excepción hacia arriba — ver la decisión tomada más arriba sobre no fallar el endpoint).
- [x] Exponer `/health`.
- [x] Dockerfile para el `docker-compose.yml` de la raíz (ya actualizado con las variables `DB_*` y
      `SPRING_PROFILES_ACTIVE: local`, igual que el bloque de `ms-pujas`).
- [ ] Repositorio ECR + cluster/service de ECS creados (ver README principal, sección CI/CD) — el pipeline
      [`../.github/workflows/deploy-ms-catalogo.yml`](../.github/workflows/deploy-ms-catalogo.yml) ya existe
      y se activa solo al hacer push a esta carpeta. **Pendiente**: crearlos a mano en la consola de AWS
      (esto no se puede hacer desde el código).

## Cómo levantarlo

**Con Docker Compose (recomendado, junto al resto del sistema):**
```bash
docker compose up -d --build
```
Esto reconstruye la imagen de `ms-catalogo` con la implementación real y la levanta en el puerto `8082`,
ya conectada a Postgres con las tablas creadas automáticamente por Flyway.

**Suelto, con Maven (requiere Postgres corriendo en `localhost:5432`, ver `db/README.md`):**
```bash
cd ms-catalogo
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

**Probar un endpoint** (con el token simplificado del perfil `local`, formato `local:<sub>:<ROL>` — ver
`security/LocalTokenAuthFilter.java`):
```bash
curl -H "Authorization: Bearer local:11111111-1111-1111-1111-111111111111:MARTILLERO" \
     -H "Content-Type: application/json" \
     -X POST http://localhost:8082/lotes \
     -d '{"titulo":"Reloj antiguo","descripcion":"Funcionando","precioBase":20000,"incrementoMinimo":1000}'
```

**Tests:**
```bash
mvn test
```
