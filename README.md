# SubastaLive

Plataforma cloud native de subastas en línea. Proyecto de la asignatura DSY1107 — Desarrollo Cloud Native I (Duoc UC, sección I_004D).

El plan de proyecto completo, con historias de usuario, requisitos y arquitectura por etapa, está en [`docs/SubastaLive_Plan_de_Proyecto_v3.pdf`](docs/SubastaLive_Plan_de_Proyecto_v3.pdf).

## Estructura del monorepo

```
SubastaLive/
├── frontend/        SPA — login dual Cognito / Entra ID
├── ms-usuarios/     Microservicio — perfil de dominio del usuario           (SIN IMPLEMENTAR — solo contrato)
├── ms-catalogo/     Microservicio — lotes, subastas y estados               (SIN IMPLEMENTAR — solo contrato)
├── ms-pujas/        Microservicio — recepción y validación de pujas        (SIN IMPLEMENTAR — solo contrato)
├── db/              Scripts SQL por esquema para la instancia RDS (PostgreSQL)
├── docker-compose.yml   Entorno local: Postgres + Adminer, con plantillas para los microservicios
└── docs/            Documentación del proyecto
```

Esta es la estructura de la **Etapa 1** (arquitectura base, identidad federada y exposición segura); las
etapas 2 y 3 agregarán mensajería (RabbitMQ) y streaming (Kafka) sin modificar lo ya construido (ver sección
4 del plan).

## Estado actual: contratos, no código

Las carpetas `ms-usuarios/`, `ms-catalogo/` y `ms-pujas/` **no tienen código todavía**. Cada una tiene un
`README.md` que funciona como contrato: qué responsabilidad tiene el servicio, qué esquema de base de datos
le pertenece, qué endpoints debe exponer (con rutas, roles y body sugeridos), y qué llamadas debe hacer a
los otros microservicios (y con qué payload). La idea es que cada persona del equipo pueda tomar un
microservicio y construirlo **en el stack que prefiera** (Spring Boot, Node, .NET, lo que sea) sin tener que
coordinar cada detalle en vivo — el contrato entre servicios ya queda escrito.

Quien implemente un microservicio debe:
1. Leer su `README.md` completo antes de empezar.
2. Elegir stack y anotarlo en el README del servicio.
3. Resolver los puntos marcados como "decisión pendiente" (por ejemplo, cómo se expone el precio vigente de
   una subasta) y **documentar la decisión tomada en el mismo README**, para que quien construya los
   servicios vecinos sepa a qué atenerse.
4. Agregar sus tablas al esquema correspondiente en `db/` (ver [`db/README.md`](db/README.md)).
5. Agregar un `Dockerfile` a su carpeta y descomentar su bloque en `docker-compose.yml`.

El frontend lo construye el equipo directamente sobre `frontend/`; no tiene contrato aparte porque consume
los mismos endpoints documentados en cada microservicio, a través del API Gateway.

## Comunicación entre microservicios (Etapa 1)

Todavía no existe RabbitMQ ni Kafka, así que en esta etapa los microservicios que necesitan datos de otro se
llaman **por HTTP síncrono** (no hay cola ni tópico de por medio). El detalle de qué servicio llama a cuál,
a qué endpoint y por qué, está documentado en la sección "Comunicación con otros microservicios" de cada
README. En resumen:

- `ms-pujas` llama a `ms-catalogo` para validar que una subasta esté abierta antes de aceptar una puja.
- `ms-usuarios` puede llamar a `ms-pujas` para armar el historial de un postor.
- El frontend llama a los tres a través del API Gateway.

Cada microservicio debe validar el JWT de forma independiente (defensa en profundidad, RF-29), aceptando
tokens tanto de Amazon Cognito como de Microsoft Entra ID.

## Entorno local (Docker Compose)

```bash
docker compose up -d
```

Esto levanta:
- **Postgres** en `localhost:5432` (usuario/clave `subastalive`/`subastalive`, base `subastalive`), con los
  tres esquemas (`schema_usuarios`, `schema_catalogo`, `schema_pujas`) creados automáticamente a partir de
  los scripts en `db/`.
- **Adminer** en [http://localhost:8080](http://localhost:8080) para explorar la base sin instalar nada
  (servidor: `postgres`, usuario/clave/base: `subastalive`).

Los tres microservicios están dejados como bloques **comentados** en `docker-compose.yml`, listos para
descomentar apenas cada uno tenga su `Dockerfile` — ya incluyen las variables de entorno esperadas y quedan
en la misma red que la base de datos.

```bash
docker compose down       # detiene todo, conserva los datos
docker compose down -v    # detiene todo y borra el volumen (reinicia la base desde cero)
```

## Cómo levantar cada parte

Ver el `README.md` dentro de cada carpeta (`frontend/`, `ms-usuarios/`, `ms-catalogo/`, `ms-pujas/`, `db/`)
para instrucciones y contrato específico de cada una.
