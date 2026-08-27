# ms-catalogo

> Este microservicio aún no está implementado. Este documento es el **contrato** que debe cumplir, para que
> quien lo construya (en cualquier stack) pueda hacerlo sin coordinar cada detalle en vivo con el resto del
> equipo. Ver el plan completo en
> [`../docs/SubastaLive_Plan_de_Proyecto_v3.pdf`](../docs/SubastaLive_Plan_de_Proyecto_v3.pdf) (secciones 5.5, 6.2, 6.3, 7.3).

## Responsabilidad

Dueño de los **lotes** y las **subastas**: creación de lotes, programación de apertura/cierre de una subasta,
y gestión de las transiciones de estado (`PROGRAMADA` → `ABIERTA` → `CERRADA`/`ADJUDICADA`, u otro modelo de
estados que se defina).

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

## Endpoints que debe exponer

| Método | Ruta | Rol requerido | Descripción |
|---|---|---|---|
| `GET` | `/subastas` | Cualquiera autenticado | Lista subastas con su estado actual (RF-04). Debe soportar al menos filtro por estado. |
| `GET` | `/subastas/{id}` | Cualquiera autenticado | Detalle de una subasta (incluye referencia al lote). |
| `GET` | `/lotes/{id}` | Cualquiera autenticado | Detalle del lote: descripción, precio base, imagen (RF-05). |
| `POST` | `/lotes` | Martillero, Admin | Crea un lote con sus datos y precio base (RF-16). |
| `POST` | `/subastas` | Martillero, Admin | Programa apertura y cierre de una subasta sobre un lote existente (RF-17). |
| `PATCH` | `/subastas/{id}/estado` | Martillero, Admin (o proceso interno programado) | Gestiona la transición de estado de la subasta (RF-18): abrir al llegar la hora programada, cerrar al vencer el plazo. |

> El mecanismo para disparar el cierre automático al vencer el plazo (RF-18) es responsabilidad de este
> servicio: puede ser un scheduler interno (`@Scheduled` u equivalente) que revise subastas vencidas, o un
> job externo que llame al `PATCH` de arriba. Documentar aquí la decisión tomada.

## ¿Quién expone el "precio vigente" de una subasta?

Importante para quien implemente esto y para el frontend: según la sección 5.3 del plan, **PostgreSQL
responde "¿cuál es el estado actual?"**, y el ejemplo dado es justamente "mejor puja vigente". La puja en sí
la registra `ms-pujas`, no `ms-catalogo`. Dos maneras razonables de resolver esto en la Etapa 1 (elegir una y
documentarla aquí):

1. `GET /subastas/{id}` en `ms-catalogo` devuelve solo metadatos (estado, fechas, lote) y el frontend pide el
   precio vigente aparte a `ms-pujas` (`GET /pujas/{subastaId}/actual`, ver contrato en
   [`../ms-pujas/README.md`](../ms-pujas/README.md)).
2. `ms-catalogo` llama internamente a `ms-pujas` para enriquecer la respuesta con el precio vigente antes de
   devolverla al frontend (más cómodo para el cliente, acopla ambos servicios por HTTP síncrono).

## Comunicación con otros microservicios

**Etapa 1 no tiene mensajería (RabbitMQ/Kafka aún no existen); toda comunicación entre servicios en esta
etapa es síncrona vía HTTP.**

- `ms-pujas` necesita saber si una subasta está **abierta** antes de aceptar una puja (RF-06) y cuál es el
  incremento mínimo / precio base (RF-07). Debe llamar a un endpoint de `ms-catalogo` para eso — sugerido:
  `GET /subastas/{id}` debe incluir `estado`, `precioBase` (o precio vigente si se optó por la opción 2
  de arriba) e `incrementoMinimo`.
- `ms-catalogo` no necesita llamar a `ms-pujas` salvo que se elija la opción 2 de la sección anterior.

## Variables de entorno esperadas

| Variable | Descripción |
|---|---|
| `DB_URL` / `DB_HOST` / `DB_PORT` / `DB_NAME` | Conexión a la instancia RDS PostgreSQL |
| `DB_USERNAME`, `DB_PASSWORD` | Credenciales de conexión |
| `DB_POOL_MAX_SIZE` | Límite del pool de conexiones por contenedor (RNF-05) |
| `JWT_ISSUER_URI_COGNITO` | Issuer URI del user pool de Cognito |
| `JWT_ISSUER_URI_ENTRA` | Issuer URI del tenant de Entra ID |
| `MS_PUJAS_BASE_URL` | URL base para llamar a `ms-pujas` (según la opción elegida arriba) |
| `SERVER_PORT` | Puerto HTTP del servicio (sugerido: `8082`) |

## Evolución prevista (no implementar todavía)

- **Etapa 2:** `ms-catalogo` se convierte en **productor RabbitMQ**: al cerrar una subasta, publica el evento
  que dispara notificaciones, generación de comprobante y reserva de cobro (HU-05, HU-08), respondiendo sin
  esperar a que esas tareas terminen (RF-13). Diseñar el endpoint/lógica de cierre pensando en que ahí se
  insertará la publicación del mensaje.
- **Etapa 3:** el rol de "publicar el evento de cierre" se traslada a `ms-adjudicacion` (nuevo servicio,
  consumidor Kafka). `ms-catalogo` deja de encargarse de eso, pero mantiene todo lo demás sin cambios.

## Checklist para quien lo implemente

- [ ] Definir el stack.
- [ ] Modelar entidades `Lote` y `Subasta` (con su máquina de estados).
- [ ] Migraciones de `schema_catalogo` (ver `../db/schema_catalogo`).
- [ ] Validación JWT multi-issuer + autorización por rol.
- [ ] Mecanismo de cierre automático al vencer el plazo.
- [ ] Documentar en este archivo la decisión sobre el precio vigente (opción 1 o 2 de arriba).
- [ ] Exponer `/health`.
- [ ] Dockerfile para el `docker-compose.yml` de la raíz.
