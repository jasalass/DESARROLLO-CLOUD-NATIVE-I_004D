# ms-pujas

> Este microservicio **ya está implementado** (Java 17 + Spring Boot 3.3.2), probado en Docker Compose local
> y desplegado de verdad en ECS/Fargate en AWS — ver la checklist al final de este documento y
> [`../docs/despliegue-aws.md`](../docs/despliegue-aws.md). El resto de este documento sigue siendo el
> **contrato** de referencia (endpoints, JSON, reglas de negocio) para quien necesite consumirlo o
> modificarlo. Ver el plan completo en
> [`../docs/SubastaLive_Plan_de_Proyecto_v4.pdf`](../docs/SubastaLive_Plan_de_Proyecto_v4.pdf) (secciones 5.3, 5.4, 6.2, 6.3, 8.3).
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

## Checklist de implementación

Ya implementado y desplegado — este servicio no está pendiente:

- [x] Stack: Java 17 + Spring Boot 3.3.2.
- [x] Modelada la entidad `Puja` según el JSON de arriba (con índice por `subastaId` para calcular el máximo rápido).
- [x] Migraciones de `schema_pujas` con Flyway (`V1__init.sql` en `src/main/resources/db/migration/`).
- [x] Validación JWT multi-issuer (`SecurityConfig.java`), más un perfil `local` con token simplificado
      (`local:<sub>:<ROL>`) para probar sin Cognito/Entra ID reales — ver `security/`.
- [x] Cliente HTTP hacia `ms-catalogo` (`/subastas/{id}/reglas`) para validar estado antes de aceptar la puja.
- [x] Expone `/health`.
- [x] Dockerfile, probado en el `docker-compose.yml` de la raíz.
- [x] Desplegado de verdad en AWS: ECR, ECS/Fargate (subred privada, sin IP pública), ALB con health check —
      ver [`../docs/despliegue-aws.md`](../docs/despliegue-aws.md) para el paso a paso completo, con los
      errores reales encontrados y su solución. El pipeline
      [`../.github/workflows/deploy-ms-pujas.yml`](../.github/workflows/deploy-ms-pujas.yml) despliega
      automáticamente en cada push a esta carpeta.

## Dónde está implementado cada punto de la rúbrica (archivo:línea)

Este servicio es el que asume, del lado del backend, el indicador de la pauta "Configura correctamente el
BFF para que, al igual que el API Manager, pueda validar el token recibido con el IDaaS definido y solo
permita consumir el endpoint si el token es válido" — no hay un servicio "BFF" separado (ver la aclaración de
terminología en la sección 5.6 del plan y en `despliegue-aws.md`): cada microservicio, incluido este, hace su
propia validación completa, como defensa en profundidad detrás del API Gateway.

La forma de leer la tabla: cada fila es un sub-requisito del indicador, con el archivo y las líneas exactas
donde se resuelve, para que puedas abrir el código y verificarlo mientras lees la pauta.

| Qué exige la pauta | Dónde | Qué hace exactamente |
|---|---|---|
| Valida issuer y audience del JWT | [`security/SecurityConfig.java:97-106`](src/main/java/com/subastalive/pujas/security/SecurityConfig.java#L97-L106) | `issuerAuthenticationManagerResolver()` arma un `JwtIssuerAuthenticationManagerResolver` con un `AuthenticationManager` por cada issuer configurado (Cognito y Entra ID) — solo un JWT cuyo `iss` esté en ese mapa pasa a validarse. Probado en producción con tokens reales de ambos proveedores |
| Verifica la firma del token | [`SecurityConfig.java:108-113`](src/main/java/com/subastalive/pujas/security/SecurityConfig.java#L108-L113) | `jwtAuthenticationManager()` crea el `JwtDecoder` con `JwtDecoders.fromIssuerLocation(issuerUri)`, que descubre las claves públicas del issuer (JWKS) y valida la firma con ellas |
| Verifica la vigencia (expiración) | [`SecurityConfig.java:108-113`](src/main/java/com/subastalive/pujas/security/SecurityConfig.java#L108-L113) | La incluye el `JwtDecoder` de Spring Security por defecto (valida `exp`/`nbf` automáticamente al decodificar) |
| Extrae el rol del token, sea cual sea el proveedor | [`SecurityConfig.java:124-142`](src/main/java/com/subastalive/pujas/security/SecurityConfig.java#L124-L142) | `extraerRol()` lee el claim `roles` de Entra ID; para Cognito, que no emite ningún claim de rol, asume `POSTOR` por ser el único proveedor que se usa para ese rol — confirmado con tokens reales de los dos proveedores |
| Resuelve la identidad del usuario de forma correcta para ambos proveedores | [`security/CurrentUser.java:38-47`](src/main/java/com/subastalive/pujas/security/CurrentUser.java#L38-L47) | `resolverIdentificador()` usa el claim `oid` para Entra ID (su `sub` es un identificador *pairwise*, no un UUID) y el `sub` estándar para Cognito |
| Aplica autorización por rol | [`security/CurrentUser.java:20-29`](src/main/java/com/subastalive/pujas/security/CurrentUser.java#L20-L29) y [`web/PujaController.java:42-45`](src/main/java/com/subastalive/pujas/web/PujaController.java#L42-L45) | `CurrentUser.resolve()` extrae el rol desde el `GrantedAuthority` (`ROLE_<ROL>`, otorgado en `SecurityConfig.java:115-122`); `PujaController.crear()` rechaza con `AccessDeniedException` si el rol no es `POSTOR` |
| Configura CORS para permitir la comunicación con el frontend | [`SecurityConfig.java:56, 86-95`](src/main/java/com/subastalive/pujas/security/SecurityConfig.java#L56) | `.cors(...)` wireado con un bean `CorsConfigurationSource` propio — necesario porque Spring MVC rechaza el preflight `OPTIONS` por su cuenta si no hay una `CorsConfiguration` registrada, incluso si el API Gateway ya tiene CORS configurado (ver `despliegue-aws.md`, sección 9) |
| Responde con códigos de error adecuados | [`SecurityConfig.java:67-75`](src/main/java/com/subastalive/pujas/security/SecurityConfig.java#L67-L75) (401/403 desde la capa de seguridad) y [`web/GlobalExceptionHandler.java:24-70`](src/main/java/com/subastalive/pujas/web/GlobalExceptionHandler.java#L24-L70) (409/400/404/502/403/500 desde la lógica de negocio) | Todos devuelven el mismo formato `{codigo, mensaje, detalles}` vía [`web/JsonErrorWriter.java:21-25`](src/main/java/com/subastalive/pujas/web/JsonErrorWriter.java#L21-L25) o `ErrorResponse.of(...)`; el handler genérico (`GlobalExceptionHandler.java:65-70`) además deja el error real en el log, no solo el 500 genérico al cliente |
| Endpoint de salud para verificar el despliegue | [`web/HealthController.java:9-12`](src/main/java/com/subastalive/pujas/web/HealthController.java#L9-L12) | `GET /health` → `"ms-pujas up"`, sin autenticación (`SecurityConfig.java:60`) — es lo que usa el health check del Target Group en AWS |
| Modo de prueba sin IdPs reales (perfil `local`) | [`security/LocalSecurityConfig.java`](src/main/java/com/subastalive/pujas/security/LocalSecurityConfig.java), [`security/LocalTokenAuthFilter.java`](src/main/java/com/subastalive/pujas/security/LocalTokenAuthFilter.java) | Reemplaza la validación JWT real por un token trivial (`Bearer local:<sub>:<ROL>`) — activo solo con `SPRING_PROFILES_ACTIVE=local`, nunca en producción |
