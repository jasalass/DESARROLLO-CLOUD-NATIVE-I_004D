# ms-pujas

> Este microservicio aún no está implementado. Este documento es el **contrato** que debe cumplir, para que
> quien lo construya (en cualquier stack) pueda hacerlo sin coordinar cada detalle en vivo con el resto del
> equipo. Ver el plan completo en
> [`../docs/SubastaLive_Plan_de_Proyecto_v3.pdf`](../docs/SubastaLive_Plan_de_Proyecto_v3.pdf) (secciones 5.3, 5.4, 6.2, 6.3, 8.3).

## Responsabilidad

Recibe, valida y registra las **pujas** de los postores. Es dueño de la "verdad" transaccional de cuál es la
mejor puja vigente de cada subasta (sección 5.3 del plan: PostgreSQL responde "¿cuál es el estado actual?",
y el ejemplo dado es exactamente este).

Cubre las historias:
- **HU-03** — Emitir una puja (RF-06, RF-07, RF-08; RF-09 en Etapa 3)

## Propiedad de los datos

- Esquema propio en la instancia RDS PostgreSQL compartida: **`schema_pujas`** (ver [`../db/schema_pujas`](../db/schema_pujas)).
- Ningún otro microservicio debe leer o escribir directamente sobre este esquema (RNF-06).

## Autenticación y autorización

- Validar JWT multi-issuer (Cognito + Entra ID) en cada request (RF-29, RF-33).
- Emitir una puja es una acción de **Postor**. Consultar pujas puede estar disponible también para
  Martillero/Admin (por ejemplo, para ver actividad de sus subastas).

## Endpoints que debe exponer

| Método | Ruta | Rol requerido | Descripción |
|---|---|---|---|
| `POST` | `/pujas` | Postor | Registra una puja. Body sugerido: `{ subastaId, monto }`; el `usuarioSub` sale del token, no del body. |
| `GET` | `/pujas?subastaId={id}` | Cualquiera autenticado | Historial de pujas de una subasta (más reciente primero), útil para mostrar actividad y para auditoría (RNF-02). |
| `GET` | `/pujas/{subastaId}/actual` | Cualquiera autenticado | Devuelve la mejor puja vigente de una subasta (monto y quién la hizo, sin exponer datos sensibles del postor). Ver la nota sobre "precio vigente" en [`../ms-catalogo/README.md`](../ms-catalogo/README.md). |
| `GET` | `/pujas?usuarioSub={sub}` | Postor (solo su propio `sub`), Admin | Historial de pujas de un usuario, usado por `ms-usuarios` para armar `GET /usuarios/{sub}/historial`. |

## Reglas de negocio a validar antes de aceptar una puja (RF-06, RF-07)

1. La subasta debe estar en estado **abierta** — esto lo sabe `ms-catalogo`, no este servicio, así que hay
   que consultarlo (ver sección siguiente).
2. El monto debe superar el precio actual (la mejor puja vigente, o el precio base si aún no hay pujas) más
   el incremento mínimo definido para esa subasta.
3. La puja se registra de forma persistente antes de responder éxito al cliente (RF-08).

## Comunicación con otros microservicios

**Etapa 1 no tiene mensajería (RabbitMQ/Kafka aún no existen); toda comunicación entre servicios en esta
etapa es síncrona vía HTTP.**

- Antes de aceptar una puja, `ms-pujas` **debe llamar a `ms-catalogo`** (`GET /subastas/{id}`, ver contrato
  en [`../ms-catalogo/README.md`](../ms-catalogo/README.md)) para confirmar que la subasta está abierta y
  obtener el precio base / incremento mínimo, salvo que el equipo decida cachear esos datos localmente (no
  recomendado para la Etapa 1: la fuente de verdad del estado de la subasta es `ms-catalogo`).
- `ms-usuarios` puede llamar a `ms-pujas` (`GET /pujas?usuarioSub={sub}`) para armar el historial de un
  postor.
- Nadie debería necesitar escribir en `schema_pujas` salvo este servicio.

## Variables de entorno esperadas

| Variable | Descripción |
|---|---|
| `DB_URL` / `DB_HOST` / `DB_PORT` / `DB_NAME` | Conexión a la instancia RDS PostgreSQL |
| `DB_USERNAME`, `DB_PASSWORD` | Credenciales de conexión |
| `DB_POOL_MAX_SIZE` | Límite del pool de conexiones por contenedor (RNF-05) |
| `JWT_ISSUER_URI_COGNITO` | Issuer URI del user pool de Cognito |
| `JWT_ISSUER_URI_ENTRA` | Issuer URI del tenant de Entra ID |
| `MS_CATALOGO_BASE_URL` | URL base para llamar a `ms-catalogo` y validar el estado de la subasta |
| `SERVER_PORT` | Puerto HTTP del servicio (sugerido: `8083`) |

## Evolución prevista (no implementar todavía)

- **Etapa 3:** `ms-pujas` se convierte en **productor Kafka**: tras validar y persistir cada puja en RDS,
  publica el evento `PUJA_REALIZADA` en un tópico (usando `auctionId` como clave de partición para conservar
  el orden por subasta, RF-09). La escritura en RDS y la publicación en Kafka **no son atómicas** — se acepta
  esa inconsistencia eventual y se compensa con consumidores idempotentes (RNF-03, sección 5.4 del plan). Si
  se anticipa esto, conviene aislar "guardar la puja" de "notificar que se guardó" desde el diseño inicial,
  para agregar el productor Kafka después sin tocar la lógica de validación.
- Con Kafka en juego, `ms-adjudicacion` (Etapa 3) determinará el mejor postor consumiendo este evento, y
  `ms-analitica` (Etapa 3) calculará métricas en vivo del mismo evento, en paralelo y sin interferirse
  (consumer groups independientes).

## Checklist para quien lo implemente

- [ ] Definir el stack.
- [ ] Modelar la entidad `Puja` (subastaId, usuarioSub, monto, timestamp de llegada — importante para el
      orden, ver RF-09).
- [ ] Migraciones de `schema_pujas` (ver `../db/schema_pujas`).
- [ ] Validación JWT multi-issuer.
- [ ] Cliente HTTP hacia `ms-catalogo` para validar estado de subasta antes de aceptar la puja.
- [ ] Exponer `/health`.
- [ ] Dockerfile para el `docker-compose.yml` de la raíz.
