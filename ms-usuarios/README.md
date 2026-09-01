# ms-usuarios

> Este microservicio todavía no tiene su implementación real. Esta carpeta trae por ahora un **stub liviano
> en Node/Express** (`src/server.js`) que respeta el contrato JSON exacto de abajo pero sin lógica de negocio
> real (sin Flyway, sin validación JWT, sin persistencia más allá de datos en memoria) — sirve únicamente
> para poder levantar y probar el sistema completo (frontend + gateway + los tres servicios) mientras se
> construye la versión definitiva. Este documento es el **contrato** que debe cumplir esa versión definitiva,
> para que quien la construya (en cualquier stack — Spring Boot, Node, .NET, lo que sea) pueda hacerlo sin
> coordinar cada detalle en vivo con el resto del equipo. Ver el plan completo en
> [`../docs/SubastaLive_Plan_de_Proyecto_v4.pdf`](../docs/SubastaLive_Plan_de_Proyecto_v4.pdf) (secciones 5.6, 6.2, 6.3).
>
> Convenciones generales (formato de error, tipos de dato, roles, header de auth) están centralizadas en el
> [README principal](../README.md#convenciones-de-api-compartidas) para no repetirlas en los tres servicios.

## Responsabilidad

Dueño del **perfil de dominio del usuario** y de su historial de participación. No es un intermediario de
identidad: la autenticación la resuelven Cognito / Entra ID, y este servicio solo guarda datos de negocio
asociados al `sub` (identificador único) que viene en el token.

Cubre las historias:
- **HU-06** — Consultar mi historial (RF-14, RF-15)

## Propiedad de los datos

- Esquema propio en la instancia RDS PostgreSQL compartida: **`schema_usuarios`** (ver [`../db/schema_usuarios`](../db/schema_usuarios)).
- Ningún otro microservicio debe leer o escribir directamente sobre este esquema (RNF-06). Si otro servicio
  necesita datos de usuario, debe pedirlos por API a `ms-usuarios`, no consultar la base directamente.

## Autenticación y autorización

- Debe validar el JWT en cada request (filtro / interceptor / middleware según el stack elegido), aceptando
  tokens emitidos por **dos issuers**: el user pool de Amazon Cognito (postores) y el tenant de Microsoft
  Entra ID (martilleros/administradores). Rechazar con 401 si el token no es válido o no viene de alguno de
  los dos issuers configurados (RF-29, RF-33).
- El rol autorizado se lee del claim de rol dentro del token, no de la ruta ni del issuer (RF-30, RF-34).
- El identificador de usuario a usar como clave de negocio es el claim `sub` del token.

## Modelo de datos (JSON)

### `Usuario`

```json
{
  "sub": "b3f1c2a4-1234-4a11-9c31-abcdef123456",
  "rol": "POSTOR",
  "nombre": "Pamela Álvarez",
  "email": "pamela.alvarez@example.com",
  "fechaRegistro": "2026-08-20T14:03:00Z"
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `sub` | string (uuid) | Igual al claim `sub` del token que emitió Cognito o Entra ID |
| `rol` | string (enum) | `POSTOR` \| `MARTILLERO` \| `ADMINISTRADOR` — tomado del claim de rol del token, no editable por el usuario |
| `nombre` | string | Tomado del claim del token si existe (`name`), o `null` |
| `email` | string | Tomado del claim del token si existe (`email`), o `null` |
| `fechaRegistro` | string (datetime ISO-8601) | Fecha del primer login (ver auto-provisioning más abajo) |

### `ItemHistorial`

```json
{ "pujaId": "9a2f1a10-...", "subastaId": "1e77c3b0-...", "monto": 24000, "fecha": "2026-08-27T19:55:00Z" }
```

No incluye `resultado` (ganada/perdida) porque la determinación del mejor postor al cierre (RF-19) recién se
implementa en la **Etapa 3**; en la Etapa 1 este endpoint solo expone qué pujas hizo el usuario. El frontend
puede cruzarlo con el estado de la subasta (`ms-catalogo`) si necesita mostrar algo más elaborado.

## Endpoints que debe exponer

### `GET /usuarios/me`

Devuelve (y provisiona si no existe) el perfil del usuario autenticado.

- **Rol requerido:** cualquiera autenticado (Postor, Martillero, Administrador).
- **Request:** sin body. Headers: `Authorization: Bearer <jwt>`.
- **Decisión tomada — auto-provisioning:** si no existe un `Usuario` para el `sub` del token, se crea en esa
  misma llamada usando el `sub`, el `rol` y los claims `name`/`email` disponibles en el token, con
  `fechaRegistro = ahora`. Este endpoint **no debe responder 404** en el flujo normal — siempre devuelve un
  perfil, recién creado o existente.
- **Response `200 OK`:**
  ```json
  {
    "sub": "b3f1c2a4-1234-4a11-9c31-abcdef123456",
    "rol": "POSTOR",
    "nombre": "Pamela Álvarez",
    "email": "pamela.alvarez@example.com",
    "fechaRegistro": "2026-08-20T14:03:00Z"
  }
  ```
- **Response `401 Unauthorized`:** token ausente, inválido o expirado (ver formato de error estándar en el README principal).

### `GET /usuarios/{sub}/historial`

Historial de pujas del usuario (RF-15).

- **Rol requerido:** Postor (solo puede pedir su propio `sub` — comparar contra el `sub` del token, 403 si no coincide), o Administrador (puede pedir cualquiera).
- **Request:** path param `sub` (uuid). Query params opcionales: `limit` (default 20), `offset` (default 0).
- **Response `200 OK`:**
  ```json
  {
    "usuarioSub": "b3f1c2a4-1234-4a11-9c31-abcdef123456",
    "pujas": [
      { "pujaId": "9a2f1a10-...", "subastaId": "1e77c3b0-...", "monto": 24000, "fecha": "2026-08-27T19:55:00Z" },
      { "pujaId": "8b1e77aa-...", "subastaId": "0fa3d221-...", "monto": 15000, "fecha": "2026-08-20T11:02:00Z" }
    ]
  }
  ```
- **Response `403 Forbidden`:** un postor pidiendo el historial de otro `sub`.

## Comunicación con otros microservicios

**Etapa 1 no tiene mensajería (RabbitMQ/Kafka aún no existen), así que cualquier comunicación entre
servicios en esta etapa es síncrona vía HTTP.**

- `ms-usuarios` **no llama a nadie** para resolver `GET /usuarios/me` (el perfil se arma solo con el token).
- Para armar `GET /usuarios/{sub}/historial`, `ms-usuarios` llama a:

  **`GET {MS_PUJAS_BASE_URL}/pujas?usuarioSub={sub}`** (contrato completo en [`../ms-pujas/README.md`](../ms-pujas/README.md))

  Reenviar el JWT original de la petición entrante en esta llamada saliente (Etapa 1 no define aún un
  mecanismo de autenticación servicio-a-servicio separado del JWT de usuario).

  Respuesta esperada de `ms-pujas`:
  ```json
  [
    { "id": "9a2f1a10-...", "subastaId": "1e77c3b0-...", "monto": 24000, "fecha": "2026-08-27T19:55:00Z" }
  ]
  ```
  `ms-usuarios` mapea `id` → `pujaId` al construir su propia respuesta.

- Nadie más debería necesitar llamar a `ms-usuarios` en la Etapa 1, salvo el frontend.

## Variables de entorno esperadas

| Variable | Descripción |
|---|---|
| `DB_URL` / `DB_HOST` / `DB_PORT` / `DB_NAME` | Conexión a la instancia RDS PostgreSQL |
| `DB_USERNAME`, `DB_PASSWORD` | Credenciales de conexión |
| `DB_POOL_MAX_SIZE` | Límite del pool de conexiones por contenedor (RNF-05) |
| `JWT_ISSUER_URI_COGNITO` | Issuer URI del user pool de Cognito |
| `JWT_ISSUER_URI_ENTRA` | Issuer URI del tenant de Entra ID |
| `MS_PUJAS_BASE_URL` | URL base para llamar a `ms-pujas` (ej. `http://ms-pujas:8083` en Docker Compose) |
| `SERVER_PORT` | Puerto HTTP del servicio (sugerido: `8081`) |

## Evolución prevista (no implementar todavía)

- **Etapa 2:** sin cambios de responsabilidad; puede empezar a consumir eventos de RabbitMQ si el diseño
  final lo requiere para mantener el historial actualizado sin llamadas síncronas.
- **Etapa 3:** podría convertirse en consumidor Kafka del tópico de pujas para materializar el historial de
  forma asíncrona en lugar de llamar síncronamente a `ms-pujas`, y podría enriquecer `ItemHistorial` con
  `resultado` una vez que exista `ms-adjudicacion`. Si se anticipa esto, conviene separar la lógica de "armar
  el historial" de "cómo se obtienen los datos", para no reescribir todo después.

## Checklist para quien lo implemente

- [ ] Definir el stack (Spring Boot es lo planeado originalmente, pero es libre).
- [ ] Modelar la entidad `Usuario` según el JSON de arriba.
- [ ] Migraciones de `schema_usuarios` con Flyway (copiar el `V1__init.sql` de `../db/schema_usuarios` a
      `src/main/resources/db/migration/` — ver `../db/README.md`, sección "Migraciones automáticas").
- [ ] Validación JWT multi-issuer.
- [ ] Implementar el auto-provisioning en `GET /usuarios/me`.
- [ ] Cliente HTTP hacia `ms-pujas` para `GET /usuarios/{sub}/historial`.
- [ ] Exponer `/health` para verificación de despliegue.
- [ ] Dockerfile para poder correrlo en el `docker-compose.yml` de la raíz del repo.
- [ ] Repositorio ECR + cluster/service de ECS creados (ver README principal, sección CI/CD) — el pipeline
      [`../.github/workflows/deploy-ms-usuarios.yml`](../.github/workflows/deploy-ms-usuarios.yml) ya existe
      y se activa solo al hacer push a esta carpeta.
