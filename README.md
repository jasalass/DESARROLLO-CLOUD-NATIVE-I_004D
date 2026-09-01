# SubastaLive

Plataforma cloud native de subastas en línea. Proyecto de la asignatura DSY1107 — Desarrollo Cloud Native I (Duoc UC, sección I_004D).

El plan de proyecto completo, con historias de usuario, requisitos y arquitectura por etapa, está en [`docs/SubastaLive_Plan_de_Proyecto_v3.pdf`](docs/SubastaLive_Plan_de_Proyecto_v3.pdf).

Para levantar toda la infraestructura de la Etapa 1 en AWS desde cero (red privada, RDS, ECR, ECS, ALB,
Cognito, Entra ID, API Gateway y el frontend — también como contenedor en ECS), sigue
[`docs/despliegue-aws.md`](docs/despliegue-aws.md) — está pensada para que cada persona del equipo la haga
una vez en su propio laboratorio, a mano, por la consola web.

Si ya recorriste esa guía una vez y quieres repetirla en otro laboratorio con menos clics, hay una
plantilla de Terraform que crea lo mismo (salvo Entra ID, que vive en Azure) en
[`infra-terraform/`](infra-terraform/README.md) — escrita a partir de esta misma infraestructura ya
construida y probada a mano, con cada gotcha real ya resuelto en el código.

## Estructura del monorepo

```
SubastaLive/
├── .github/workflows/   Pipelines CI/CD (build → ECR → deploy ECS), uno por microservicio
├── frontend/        SPA — login dual Cognito / Entra ID (implementado, desplegado en ECS)
├── ms-usuarios/     Microservicio — perfil de dominio del usuario           (stub liviano Node/Express)
├── ms-catalogo/     Microservicio — lotes, subastas y estados               (stub liviano Node/Express)
├── ms-pujas/        Microservicio — recepción y validación de pujas        (implementado en Spring Boot, desplegado en ECS)
├── local-gateway/   Nginx que unifica los microservicios bajo un solo origen para pruebas locales
├── db/              Scripts SQL por esquema para la instancia RDS (PostgreSQL)
├── docker-compose.yml   Entorno local completo: Postgres + Adminer + los 3 microservicios + gateway + frontend
└── docs/            Documentación del proyecto
```

Esta es la estructura de la **Etapa 1** (arquitectura base, identidad federada y exposición segura); las
etapas 2 y 3 agregarán mensajería (RabbitMQ) y streaming (Kafka) sin modificar lo ya construido (ver sección
4 del plan).

## Estado actual: uno real, dos en contrato

`ms-pujas` ya está implementado de verdad (Spring Boot + JPA + Flyway + seguridad dual local/JWT), probado en
Docker Compose local y desplegado en ECS/Fargate en AWS. `ms-usuarios` y `ms-catalogo` todavía son **stubs
livianos en Node/Express** (mismo contrato JSON exacto, sin lógica de negocio real) — sirven para poder
levantar y probar el sistema completo de punta a punta (frontend + gateway + los tres servicios) mientras
cada equipo termina su implementación definitiva **en el stack que prefiera** (Spring Boot, Node, .NET, lo
que sea), reemplazando el stub sin tener que tocar el frontend, el gateway local ni la infraestructura de AWS.

Cada microservicio tiene un `README.md` que funciona como contrato: qué responsabilidad tiene, qué esquema de
base de datos le pertenece, qué endpoints debe exponer (con rutas, roles, y el JSON exacto de cada
request/response), y qué llamadas debe hacer a los otros microservicios (con el JSON exacto de esas llamadas
también) — el contrato entre servicios ya queda escrito y las decisiones de diseño ambiguas ya están
resueltas.

Quien reemplace un stub por la implementación real debe:
1. Leer su `README.md` completo antes de empezar.
2. Elegir stack y anotarlo en el README del servicio.
3. Si encuentra un punto no cubierto aquí, resolverlo y **documentar la decisión tomada en el mismo README**,
   para que quien construya los servicios vecinos sepa a qué atenerse.
4. Agregar sus tablas al esquema correspondiente en `db/` (ver [`db/README.md`](db/README.md)).
5. Reemplazar el `Dockerfile` del stub por el de su implementación real en `docker-compose.yml` — el bloque
   del servicio ya existe y ya está en la misma red que la base de datos, no hace falta descomentar nada.

El frontend ya está implementado en `frontend/`; no tiene contrato aparte porque consume los mismos endpoints
documentados abajo, a través del API Gateway.

## Convenciones de API compartidas

Válidas para los tres microservicios, para no repetirlas en cada README:

- **Autenticación:** header `Authorization: Bearer <jwt>` en toda request. El JWT puede venir del user pool
  de Amazon Cognito (postores) o del tenant de Microsoft Entra ID (martilleros/administradores); cada
  servicio valida ambos issuers (RF-29, RF-33).
- **Roles** (claim dentro del JWT, no depende de qué issuer lo emitió): `POSTOR`, `MARTILLERO`, `ADMINISTRADOR`.
- **Content-Type:** `application/json` en todo body de request/response.
- **Identificadores:** UUID v4 en formato string.
- **Fechas:** ISO-8601 en UTC, con sufijo `Z` (ej. `"2026-08-27T15:30:00Z"`).
- **Montos:** `number`, sin decimales de moneda (CLP implícito).
- **Formato de error estándar** (todos los servicios, cualquier código 4xx/5xx):
  ```json
  {
    "codigo": "SUBASTA_NO_ABIERTA",
    "mensaje": "La subasta 1e77c3b0-... no está en estado ABIERTA.",
    "detalles": null
  }
  ```
  `detalles` es opcional (objeto libre con contexto adicional, o `null`). `codigo` es un string estable en
  mayúsculas y guion bajo, pensado para que el frontend pueda reaccionar sin parsear `mensaje`.
- **Códigos HTTP:** `400` validación de entrada, `401` sin token / token inválido, `403` rol no autorizado o
  recurso ajeno, `404` no encontrado, `409` conflicto de estado (transición inválida, recurso duplicado),
  `500` error interno no controlado.
- **Rutas relativas:** las rutas documentadas en cada servicio (`/subastas`, `/pujas`, etc.) son internas al
  servicio. El prefijo final con el que las expone el API Gateway (por ejemplo `/api/catalogo/subastas`) se
  define al configurar el Gateway y no es responsabilidad del microservicio.

## Referencia rápida de endpoints

| Servicio | Método | Ruta | Rol | Para qué |
|---|---|---|---|---|
| ms-usuarios | `GET` | `/usuarios/me` | Cualquiera autenticado | Perfil propio (auto-provisiona si no existe) |
| ms-usuarios | `GET` | `/usuarios/{sub}/historial` | Postor (propio), Admin | Historial de pujas del usuario |
| ms-catalogo | `GET` | `/subastas` | Cualquiera autenticado | Listado de subastas |
| ms-catalogo | `GET` | `/subastas/{id}` | Cualquiera autenticado | Detalle + precio vigente (llama a ms-pujas) |
| ms-catalogo | `GET` | `/subastas/{id}/reglas` | Cualquiera autenticado | Uso interno: validación para ms-pujas |
| ms-catalogo | `GET` | `/lotes/{id}` | Cualquiera autenticado | Detalle de un lote |
| ms-catalogo | `POST` | `/lotes` | Martillero, Admin | Crear lote |
| ms-catalogo | `POST` | `/subastas` | Martillero, Admin | Programar subasta |
| ms-catalogo | `PATCH` | `/subastas/{id}/estado` | Martillero, Admin | Transicionar estado |
| ms-pujas | `POST` | `/pujas` | Postor | Emitir una puja |
| ms-pujas | `GET` | `/pujas?subastaId=` | Cualquiera autenticado | Historial de pujas de una subasta |
| ms-pujas | `GET` | `/pujas/{subastaId}/actual` | Cualquiera autenticado | Uso interno: precio vigente para ms-catalogo |
| ms-pujas | `GET` | `/pujas?usuarioSub=` | Cualquiera autenticado | Uso interno: historial para ms-usuarios |

El JSON exacto de cada request/response, con ejemplos, está en el README de cada microservicio (secciones
"Modelo de datos" y "Endpoints que debe exponer").

## Comunicación entre microservicios (Etapa 1)

Todavía no existe RabbitMQ ni Kafka, así que en esta etapa los microservicios que necesitan datos de otro se
llaman **por HTTP síncrono** (no hay cola ni tópico de por medio). El detalle completo — incluyendo el JSON
exacto de cada llamada — está en la sección "Comunicación con otros microservicios" de cada README. En
resumen:

- `ms-pujas` llama a `ms-catalogo` (`GET /subastas/{id}/reglas`) para validar que una subasta esté abierta y
  conocer el precio base / incremento mínimo, antes de aceptar una puja.
- `ms-catalogo` llama a `ms-pujas` (`GET /pujas/{subastaId}/actual`) para enriquecer el detalle de una
  subasta con el precio vigente.
- `ms-usuarios` llama a `ms-pujas` (`GET /pujas?usuarioSub=`) para armar el historial de un postor.
- El frontend llama a los tres a través del API Gateway.

Nota de diseño: `ms-catalogo` y `ms-pujas` se llaman mutuamente, pero por **endpoints distintos** en cada
sentido (`/subastas/{id}/reglas` vs. `/subastas/{id}`, y `/pujas/{subastaId}/actual` no vuelve a llamar a
`ms-catalogo`) — así se evita que una puja dispare una cadena de llamadas que vuelve sobre sí misma.

Cada microservicio debe validar el JWT de forma independiente (defensa en profundidad, RF-29), aceptando
tokens tanto de Amazon Cognito como de Microsoft Entra ID.

### Ejemplo de flujo completo: emitir una puja

```
Frontend                ms-pujas                    ms-catalogo
   │  POST /pujas           │                             │
   │  { subastaId, monto }  │                             │
   ├───────────────────────►│                             │
   │                        │  GET /subastas/{id}/reglas  │
   │                        ├────────────────────────────►│
   │                        │◄────────────────────────────┤
   │                        │  { estado, precioBase,      │
   │                        │    incrementoMinimo }        │
   │                        │                             │
   │                        │  (calcula precio vigente     │
   │                        │   localmente desde su propia │
   │                        │   tabla de pujas)             │
   │                        │                             │
   │  201 { Puja creada }   │                             │
   │◄───────────────────────┤                             │
```

## Entorno local (Docker Compose)

```bash
docker compose up -d
```

Esto levanta el entorno completo:
- **Postgres** en `localhost:5432` (usuario/clave `subastalive`/`subastalive`, base `subastalive`), con los
  tres esquemas (`schema_usuarios`, `schema_catalogo`, `schema_pujas`) creados automáticamente a partir de
  los scripts en `db/` — `ms-pujas` además los mantiene al día solo con Flyway al arrancar.
- **Adminer** en [http://localhost:8080](http://localhost:8080) para explorar la base sin instalar nada
  (servidor: `postgres`, usuario/clave/base: `subastalive`).
- **`ms-pujas`** (Spring Boot real) en el puerto `8083`.
- **`ms-catalogo`** y **`ms-usuarios`** (stubs Node/Express con el mismo contrato) en `8082` y `8081`.
- **`local-gateway`** (Nginx) en `localhost:8090` — unifica los tres microservicios bajo un solo origen con
  CORS habilitado, haciendo de API Gateway local (sin validar JWT — eso lo hace cada microservicio, y el API
  Gateway real en AWS).
- **`frontend`** en `localhost:5173`, apuntando al gateway local (`VITE_API_BASE_URL=http://localhost:8090`).

```bash
docker compose down       # detiene todo, conserva los datos
docker compose down -v    # detiene todo y borra el volumen (reinicia la base desde cero)
```

## CI/CD — despliegue automático a AWS (GitHub Actions)

Hay cuatro workflows en [`.github/workflows/`](.github/workflows/) — uno por microservicio más uno para el
frontend — y **todos siguen exactamente el mismo patrón** (build → ECR → ECS), sin distinción entre backend y
frontend. Cada uno se activa **solo** por cambios en su propia carpeta, así que las cuatro partes se
despliegan de forma independiente entre sí, consistente con que cada una escala por separado (RNF-01).

> **Nota de diseño:** el plan original (sección 6.3) proponía el frontend como sitio estático en S3 +
> CloudFront. Se cambió a ECS/Fargate como los microservicios porque el laboratorio de AWS Academy usado para
> este proyecto no otorga permiso para usar CloudFront en absoluto — no solo Origin Access Control
> (`cloudfront:CreateOriginAccessControl` da `AccessDenied`), sino `cloudfront:CreateDistribution` en sí mismo,
> incluso probando con un origen ALB que no necesita OAC. ECR/ECS/ALB sí funcionan sin problema en esta cuenta.
> El frontend termina siendo, literalmente, "otro contenedor" — un Nginx sirviendo el build de Vite —
> desplegado igual que los tres microservicios. El detalle de cómo se resolvió el HTTPS que exige Cognito para
> el login (sin CloudFront ni dominio propio, con un certificado autofirmado en el ALB) está en
> [`docs/despliegue-aws.md`](docs/despliegue-aws.md), sección 8.

### Los cuatro workflows (`deploy-ms-usuarios.yml`, `deploy-ms-catalogo.yml`, `deploy-ms-pujas.yml`, `deploy-frontend.yml`)

Al hacer push a `main` que toque archivos dentro de la carpeta correspondiente (o disparándolo a mano desde
la pestaña **Actions** de GitHub):

1. Construye la imagen Docker (`docker build ./ms-x` o `./frontend`). Para el frontend, el `Dockerfile` hace
   el build de Vite en una etapa y sirve el resultado con Nginx en la siguiente; las variables `VITE_*` se
   pasan como `--build-arg` porque Vite las incrusta en el bundle en tiempo de build, no son variables de
   entorno del contenedor en ejecución.
2. La sube a **Amazon ECR**, con dos tags: el SHA del commit (trazabilidad/rollback) y `latest`.
3. Ejecuta `aws ecs update-service --force-new-deployment` sobre el servicio de **ECS** correspondiente, que
   vuelve a desplegar la tarea tirando la imagen `latest` recién publicada.

**Importante:** cada workflow asume que ya existe un `Dockerfile` en su carpeta. `frontend/` y `ms-pujas/` ya
lo tienen (`ms-pujas` con su implementación real en Spring Boot, ya probada tanto en Docker Compose local como
desplegada en ECS/Fargate). `ms-catalogo/` y `ms-usuarios/` traen por ahora un `Dockerfile` de un stub liviano
en Node/Express (mismo contrato JSON, sin lógica real) — se reemplaza por la implementación definitiva de
cada equipo sin tocar el workflow ni la infraestructura.

### Prerrequisitos de infraestructura (manuales, una sola vez, por cada una de las 4 partes)

Debe existir en AWS, para `ms-usuarios`, `ms-catalogo`, `ms-pujas` **y** `frontend`:

1. **Un repositorio en Amazon ECR** (ej. `subastalive/ms-usuarios`, ..., `subastalive/frontend`).
2. **Un cluster de ECS** (uno solo, compartido por las cuatro) y, dentro de él, **una task definition + un
   service por cada una**, con el contenedor apuntando a `<ECR_REGISTRY>/<repositorio>:latest` — el workflow
   no crea ni actualiza la task definition, solo fuerza a ECS a re-halar la imagen `latest`.
3. Un **Application Load Balancer** con su target group. Los tres microservicios quedan detrás del API
   Gateway (que enruta hacia el ALB, sección 5.1 del plan); el frontend tiene su **propio** ALB — más simple
   que mezclar reglas de listener por path en uno solo.

**Red:** las tareas de ECS y RDS viven en **subredes privadas** (sin IP pública ni acceso directo desde
internet); solo los ALB están en subredes públicas. Esto exige además un **NAT Gateway** para que las tareas
puedan descargar su imagen de ECR. RDS no tiene ninguna vía de administración manual — cada microservicio
crea y actualiza su propio esquema al arrancar, con Flyway (ver [`db/README.md`](db/README.md)). El detalle
completo, con los CIDR y el orden exacto, está en [`docs/despliegue-aws.md`](docs/despliegue-aws.md).

### Secrets y Variables que hay que configurar en GitHub

En el repositorio de GitHub: **Settings → Secrets and variables → Actions**. Los valores sensibles van en la
pestaña **Secrets**; los que no son sensibles (nombres, región) van en la pestaña **Variables**, para poder
leerlos sin exponerlos como secretos innecesariamente.

| Nombre | Tipo | Valor |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | Secret | Access key de la sesión del laboratorio (AWS Academy / Canvas) |
| `AWS_SECRET_ACCESS_KEY` | Secret | Secret key de la misma sesión |
| `AWS_SESSION_TOKEN` | Secret | Session token de la misma sesión — los laboratorios tipo AWS Academy entregan credenciales **temporales** de las tres, no solo access/secret key |
| `AWS_REGION` | Variable | Región donde está la infraestructura (ej. `us-east-1`) |
| `ECR_REPOSITORY_USUARIOS` | Variable | Nombre del repositorio ECR de `ms-usuarios` |
| `ECR_REPOSITORY_CATALOGO` | Variable | Nombre del repositorio ECR de `ms-catalogo` |
| `ECR_REPOSITORY_PUJAS` | Variable | Nombre del repositorio ECR de `ms-pujas` |
| `ECS_CLUSTER` | Variable | Nombre del cluster de ECS |
| `ECS_SERVICE_USUARIOS` | Variable | Nombre del service de ECS de `ms-usuarios` |
| `ECS_SERVICE_CATALOGO` | Variable | Nombre del service de ECS de `ms-catalogo` |
| `ECS_SERVICE_PUJAS` | Variable | Nombre del service de ECS de `ms-pujas` |
| `ECR_REPOSITORY_FRONTEND` | Variable | Nombre del repositorio ECR del frontend |
| `ECS_SERVICE_FRONTEND` | Variable | Nombre del service de ECS del frontend |
| `VITE_AUTH_MODE` | Variable | `mock` u `oidc` — ver [`frontend/README.md`](frontend/README.md) |
| `VITE_USE_MOCKS` | Variable | `true` o `false` |
| `VITE_API_BASE_URL` | Variable | URL del API Gateway (solo importa si `VITE_USE_MOCKS=false`) |
| `VITE_COGNITO_AUTHORITY`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_DOMAIN` | Variable | Solo si `VITE_AUTH_MODE=oidc` — el dominio es necesario para que el logout cierre la sesión de verdad, ver [`frontend/README.md`](frontend/README.md) |
| `VITE_ENTRA_AUTHORITY`, `VITE_ENTRA_CLIENT_ID` | Variable | Solo si `VITE_AUTH_MODE=oidc` |

El registro de ECR (`ECR_REGISTRY`, con forma `<id-de-cuenta>.dkr.ecr.<region>.amazonaws.com`) no se configura
a mano: la acción `aws-actions/amazon-ecr-login` lo resuelve automáticamente a partir de las credenciales.

### ⚠️ Es un laboratorio (AWS Academy / Canvas): las credenciales expiran

Como toda la infraestructura se levanta desde un **laboratorio de Canvas (AWS Academy Learner Lab)**, las
credenciales (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`) son **temporales** y caducan
cuando termina la sesión del laboratorio (normalmente unas pocas horas). Cada vez que se reinicie el
laboratorio:

1. Abrir el panel **AWS Details** del laboratorio en Canvas y copiar el nuevo Access Key ID, Secret Access
   Key y Session Token.
2. Actualizar esos tres valores en **Settings → Secrets and variables → Actions → Secrets** del repositorio
   (sobrescribir los que ya existen, GitHub no permite verlos, solo reemplazarlos).
3. Si el laboratorio genera una cuenta de AWS nueva (cambia el ID de cuenta), los repositorios ECR y el
   cluster/servicios de ECS también quedan en una cuenta nueva — hay que recrearlos y, si cambiaron de
   nombre, actualizar las Variables de la tabla de arriba.

Si no se actualizan estas credenciales antes de hacer push, el workflow falla en el paso "Configurar
credenciales AWS" con un error de autenticación — es la causa más común de que el pipeline deje de funcionar
de un día para otro en este tipo de laboratorio.

### Disparar un despliegue

- **Automático:** `git push` a `main` con cambios dentro de `ms-usuarios/`, `ms-catalogo/`, `ms-pujas/` o `frontend/`.
- **Manual:** pestaña **Actions** del repositorio → elegir el workflow correspondiente → **Run workflow**.
- **Seguimiento:** pestaña **Actions** para ver el log del pipeline; consola de ECS (o CloudWatch Logs de la
  task definition) para ver si el contenedor nuevo levantó bien; el DNS del ALB del frontend directamente en
  el navegador.

## Cómo levantar cada parte

Ver el `README.md` dentro de cada carpeta (`frontend/`, `ms-usuarios/`, `ms-catalogo/`, `ms-pujas/`, `db/`)
para instrucciones y contrato específico de cada una.
