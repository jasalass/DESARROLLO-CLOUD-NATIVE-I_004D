# SubastaLive

Plataforma cloud native de subastas en línea. Proyecto de la asignatura DSY1107 — Desarrollo Cloud Native I (Duoc UC, sección I_004D).

El plan de proyecto completo, con historias de usuario, requisitos y arquitectura por etapa, está en [`docs/SubastaLive_Plan_de_Proyecto_v3.pdf`](docs/SubastaLive_Plan_de_Proyecto_v3.pdf).

Para levantar toda la infraestructura de la Etapa 1 en AWS desde cero (RDS, ECR, ECS, ALB, Cognito, Entra ID,
API Gateway y el frontend en S3+CloudFront), sigue [`docs/despliegue-aws.md`](docs/despliegue-aws.md) — está
pensada para que cada persona del equipo la haga una vez en su propio laboratorio.

## Estructura del monorepo

```
SubastaLive/
├── .github/workflows/   Pipelines CI/CD (build → ECR → deploy ECS), uno por microservicio
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
le pertenece, qué endpoints debe exponer (con rutas, roles, y el JSON exacto de cada request/response), y qué
llamadas debe hacer a los otros microservicios (con el JSON exacto de esas llamadas también). La idea es que
cada persona del equipo pueda tomar un microservicio y construirlo **en el stack que prefiera** (Spring Boot,
Node, .NET, lo que sea) sin tener que coordinar cada detalle en vivo — el contrato entre servicios ya queda
escrito y las decisiones de diseño ambiguas ya están resueltas.

Quien implemente un microservicio debe:
1. Leer su `README.md` completo antes de empezar.
2. Elegir stack y anotarlo en el README del servicio.
3. Si encuentra un punto no cubierto aquí, resolverlo y **documentar la decisión tomada en el mismo README**,
   para que quien construya los servicios vecinos sepa a qué atenerse.
4. Agregar sus tablas al esquema correspondiente en `db/` (ver [`db/README.md`](db/README.md)).
5. Agregar un `Dockerfile` a su carpeta y descomentar su bloque en `docker-compose.yml`.

El frontend lo construye el equipo directamente sobre `frontend/`; no tiene contrato aparte porque consume
los mismos endpoints documentados abajo, a través del API Gateway.

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

## CI/CD — despliegue automático a AWS (GitHub Actions)

Hay cuatro workflows en [`.github/workflows/`](.github/workflows/), uno por cada parte desplegable del
monorepo, y cada uno se activa **solo** por cambios en su propia carpeta — se despliegan de forma
independiente entre sí, consistente con que cada pieza escala y se despliega por separado (RNF-01).

### Microservicios (`deploy-ms-usuarios.yml`, `deploy-ms-catalogo.yml`, `deploy-ms-pujas.yml`)

Al hacer push a `main` que toque archivos dentro de la carpeta de un microservicio (o disparándolo a mano
desde la pestaña **Actions** de GitHub):

1. Construye la imagen Docker del servicio (`docker build ./ms-x`).
2. La sube a **Amazon ECR**, con dos tags: el SHA del commit (trazabilidad/rollback) y `latest`.
3. Ejecuta `aws ecs update-service --force-new-deployment` sobre el servicio de **ECS** correspondiente, que
   vuelve a desplegar la tarea tirando la imagen `latest` recién publicada.

**Importante:** el workflow asume que ya existe un `Dockerfile` en la carpeta del microservicio. Hasta que
alguien lo agregue, el workflow existe pero fallará si se dispara (no hay nada que construir) — es
intencional, queda listo para activarse solo cuando el servicio tenga código.

### Frontend (`deploy-frontend.yml`)

El frontend no va a ECS/ECR: se despliega como **sitio estático en S3, servido a través de CloudFront**
(sección 6.3 del plan). Al hacer push a `main` que toque `frontend/**`:

1. Instala dependencias (`npm ci`) y genera el build de producción (`npm run build`, que deja los archivos
   estáticos en `frontend/dist/`).
2. Sincroniza `dist/` al bucket S3 con `aws s3 sync --delete` (sube lo nuevo/cambiado, borra lo que ya no
   está).
3. Si hay una distribución de CloudFront configurada, invalida su caché (`aws cloudfront create-invalidation
   --paths "/*"`) para que dejen de servirse versiones viejas cacheadas.

Este paso 3 se salta automáticamente si no se define la variable `CLOUDFRONT_DISTRIBUTION_ID` (por ejemplo,
mientras se prueba solo con el bucket S3 sin CDN delante todavía).

### Prerrequisitos de infraestructura (manuales, una sola vez)

**Para cada microservicio**, debe existir en AWS:

1. **Un repositorio en Amazon ECR** (ej. `subastalive/ms-usuarios`, `subastalive/ms-catalogo`, `subastalive/ms-pujas`).
2. **Un cluster de ECS** (puede ser uno solo, compartido por los tres servicios) y, dentro de él, **una task definition + un service de ECS por microservicio**, con el contenedor de la task definition apuntando a `<ECR_REGISTRY>/<repositorio>:latest` — el workflow no crea ni actualiza la task definition, solo fuerza a ECS a re-halar la imagen `latest`.
3. Un **Application Load Balancer** y su target group asociados al service de ECS (para que el API Gateway pueda enrutar hacia él), según la sección 5.1 del plan.

**Para el frontend:**

1. **Un bucket S3** para alojar los archivos estáticos — recomendado **privado**, sin acceso público directo.
2. **Una distribución de CloudFront** con el bucket como origen, usando **Origin Access Control (OAC)** para
   que solo CloudFront pueda leer del bucket (nadie llega directo al S3).
3. **Manejo de rutas de SPA:** como el ruteo lo resuelve React Router en el cliente, hay que configurar en
   CloudFront una *custom error response* que mapee `403` y `404` a `/index.html` con status `200` — si no,
   refrescar la página en una ruta interna (ej. `/subastas/123`) rompe con error en vez de cargar la app.
4. (Opcional, recomendado) Certificado en **ACM** + dominio propio si se quiere servir bajo un dominio propio
   en vez de la URL default de CloudFront.

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
| `S3_BUCKET_FRONTEND` | Variable | Nombre del bucket S3 donde se sube el build del frontend |
| `CLOUDFRONT_DISTRIBUTION_ID` | Variable | ID de la distribución de CloudFront a invalidar (dejar vacía/sin crear si aún no hay CDN delante del bucket) |

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
- **Seguimiento:** pestaña **Actions** para ver el log del pipeline; para los microservicios, consola de ECS
  (o CloudWatch Logs de la task definition) para ver si el contenedor nuevo levantó bien; para el frontend,
  la URL de CloudFront (o del bucket) directamente.

## Cómo levantar cada parte

Ver el `README.md` dentro de cada carpeta (`frontend/`, `ms-usuarios/`, `ms-catalogo/`, `ms-pujas/`, `db/`)
para instrucciones y contrato específico de cada una.
