# ms-usuarios

> Este microservicio aún no está implementado. Este documento es el **contrato** que debe cumplir, para que
> quien lo construya (en cualquier stack — Spring Boot, Node, .NET, lo que sea) pueda hacerlo sin coordinar
> cada detalle en vivo con el resto del equipo. Ver el plan completo en
> [`../docs/SubastaLive_Plan_de_Proyecto_v3.pdf`](../docs/SubastaLive_Plan_de_Proyecto_v3.pdf) (secciones 5.6, 6.2, 6.3).

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

## Endpoints que debe exponer

| Método | Ruta | Rol requerido | Descripción |
|---|---|---|---|
| `GET` | `/usuarios/me` | Postor, Martillero, Admin | Devuelve el perfil del usuario autenticado (según `sub` del token). Si no existe aún, créalo on-the-fly con los datos básicos del token (auto-provisioning en el primer login) o falla con 404 si se prefiere provisioning explícito — documentar la decisión aquí una vez tomada. |
| `GET` | `/usuarios/{sub}/historial` | Postor (solo su propio `sub`), Admin | Historial de pujas y adjudicaciones del postor (RF-15). El contenido real de pujas vive en `ms-pujas`; este endpoint puede necesitar consultarlo (ver más abajo) o mantener una copia de solo lectura sincronizada por integración futura (Etapa 2/3). |

> Los nombres exactos de ruta pueden ajustarse; lo importante es mantener el contrato con el frontend y
> documentar aquí cualquier cambio.

## Comunicación con otros microservicios

**Etapa 1 no tiene mensajería (RabbitMQ/Kafka aún no existen), así que cualquier comunicación entre
servicios en esta etapa es síncrona vía HTTP.**

- `ms-usuarios` **no necesita llamar** a `ms-catalogo` ni a `ms-pujas` para resolver sus propios endpoints
  (el perfil se arma solo con el token).
- Para armar `GET /usuarios/{sub}/historial` con datos reales de pujas, `ms-usuarios` probablemente deba
  llamar a un endpoint interno de `ms-pujas` (p. ej. `GET /pujas?usuarioSub={sub}`, ver contrato en
  [`../ms-pujas/README.md`](../ms-pujas/README.md)). Definir si esa llamada es síncrona directa (más simple
  para Etapa 1) o si se difiere a cuando exista streaming (Etapa 3, más correcto a largo plazo). Documentar
  la decisión tomada.
- Nadie más debería necesitar llamar a `ms-usuarios` en la Etapa 1, salvo el frontend.

## Variables de entorno esperadas

Definir el nombre exacto que uses, pero como mínimo el servicio necesitará:

| Variable | Descripción |
|---|---|
| `DB_URL` / `DB_HOST` / `DB_PORT` / `DB_NAME` | Conexión a la instancia RDS PostgreSQL |
| `DB_USERNAME`, `DB_PASSWORD` | Credenciales de conexión |
| `DB_POOL_MAX_SIZE` | Límite del pool de conexiones por contenedor (RNF-05) |
| `JWT_ISSUER_URI_COGNITO` | Issuer URI del user pool de Cognito |
| `JWT_ISSUER_URI_ENTRA` | Issuer URI del tenant de Entra ID |
| `SERVER_PORT` | Puerto HTTP del servicio (sugerido: `8081`) |

## Evolución prevista (no implementar todavía)

- **Etapa 2:** sin cambios de responsabilidad; puede empezar a consumir eventos de RabbitMQ si el diseño
  final lo requiere para mantener el historial actualizado sin llamadas síncronas.
- **Etapa 3:** podría convertirse en consumidor Kafka del tópico de pujas para materializar el historial de
  forma asíncrona en lugar de llamar síncronamente a `ms-pujas`. Si se anticipa esto, conviene separar la
  lógica de "armar el historial" de "cómo se obtienen los datos", para no reescribir todo después.

## Checklist para quien lo implemente

- [ ] Definir el stack (Spring Boot es lo planeado originalmente, pero es libre).
- [ ] Modelar la entidad de perfil de usuario (campos mínimos: `sub`, rol, nombre/email si vienen del token, fecha de registro).
- [ ] Migraciones de `schema_usuarios` (ver `../db/schema_usuarios`).
- [ ] Validación JWT multi-issuer.
- [ ] Implementar y documentar aquí la decisión de auto-provisioning del perfil.
- [ ] Exponer `/health` para verificación de despliegue.
- [ ] Dockerfile para poder correrlo en el `docker-compose.yml` de la raíz del repo.
