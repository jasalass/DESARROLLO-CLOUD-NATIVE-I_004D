# db — scripts de la base RDS

SubastaLive usa **una sola instancia PostgreSQL (Amazon RDS en producción, un contenedor Postgres en local)
con un esquema separado por microservicio** (RNF-06, sección 5.2 del plan). Cada microservicio es dueño de
su esquema; ningún otro microservicio debe leer o escribir sobre un esquema que no es el suyo — si necesita
esos datos, los pide por API al servicio dueño.

```
Amazon RDS - PostgreSQL
├── schema_usuarios  → ms-usuarios
├── schema_catalogo  → ms-catalogo
└── schema_pujas     → ms-pujas
```

## Contenido de esta carpeta

Cada subcarpeta (`schema_usuarios/`, `schema_catalogo/`, `schema_pujas/`) contiene un `V1__init.sql` que crea
el esquema **y** un primer set de tablas, derivado directamente del modelo JSON documentado en el `README.md`
de cada microservicio (secciones "Modelo de datos"):

| Script | Tablas | Basado en |
|---|---|---|
| `schema_usuarios/V1__init.sql` | `usuarios` | `Usuario` en [`../ms-usuarios/README.md`](../ms-usuarios/README.md) |
| `schema_catalogo/V1__init.sql` | `lotes`, `subastas` | `Lote`, `Subasta` en [`../ms-catalogo/README.md`](../ms-catalogo/README.md) |
| `schema_pujas/V1__init.sql` | `pujas` | `Puja` en [`../ms-pujas/README.md`](../ms-pujas/README.md) |

Es un punto de partida avanzado, no un modelo cerrado: **quien implemente cada microservicio puede ajustar
tipos, agregar columnas o crear tablas adicionales** dentro de su propio esquema a medida que lo necesite —
solo debe mantener actualizado tanto el script SQL como el modelo JSON del README para que ambos no se
desincronicen.

Ningún script crea claves foráneas hacia un esquema que no es el suyo (por ejemplo, `schema_pujas.pujas` no
tiene FK real hacia `schema_catalogo.subastas`, solo la columna `subasta_id`) — es una **referencia lógica**,
no física, consistente con que cada microservicio es dueño exclusivo de su esquema (RNF-06). La validación de
que esos IDs existen y son coherentes se hace vía las llamadas HTTP entre servicios documentadas en cada
README, no vía integridad referencial de base de datos.

Los nombres de archivo (`V1__init.sql`) ya siguen la convención de **Flyway** a propósito — es la herramienta
elegida para las migraciones (ver siguiente sección). El `V1__init.sql` de cada carpeta es la **primera
migración** de ese servicio: no se aplica a mano contra RDS en ningún momento — se copia dentro del propio
microservicio y Flyway la ejecuta sola la primera vez que ese servicio se despliega. De ahí en adelante, las
migraciones nuevas se agregan dentro de *su propio* código, no acá.

## Migraciones automáticas una vez que el microservicio exista (Flyway)

Igual que las imágenes Docker viajan con el código y se actualizan solas en cada deploy, el esquema de la
base de datos puede hacer lo mismo — **no hace falta correr nada a mano contra RDS, ni siquiera la primera
vez**. Cuando quien construya `ms-usuarios`/`ms-catalogo`/`ms-pujas` arranque su proyecto Spring Boot:

1. Agregar la dependencia `flyway-core` (y `flyway-database-postgresql` en versiones recientes de Flyway).
2. Copiar el `V1__init.sql` correspondiente de esta carpeta a
   `src/main/resources/db/migration/V1__init.sql` dentro del propio microservicio.
3. Configurar en `application.yml`:
   ```yaml
   spring:
     flyway:
       schemas: schema_usuarios   # el que corresponda a cada servicio
       default-schema: schema_usuarios
   ```
4. Listo — de ahí en adelante, cualquier cambio de esquema es simplemente un archivo nuevo
   `V2__agrega_tabla_x.sql`, `V3__...sql`, etc., commiteado junto con el código. Al arrancar, Flyway revisa
   una tabla de control (`flyway_schema_history`, dentro del propio esquema del servicio) y aplica solo las
   migraciones que todavía no corrió, en orden.

Como la tarea de ECS ya vive en la misma subred privada con acceso a RDS (necesita conectarse a la base para
funcionar de todos modos), la migración se aplica **como parte del mismo despliegue automático** — el mismo
`git push` que actualiza el código Java actualiza el esquema. No hay ningún paso manual contra RDS en ningún
momento: ni ahora, ni en el primer deploy de cada servicio, ni en los siguientes. RDS no tiene ninguna vía de
acceso abierta salvo desde las propias tareas de ECS (ver `docs/despliegue-aws.md`, sección 3) — no existe un
bastión ni acceso administrativo permanente en esta arquitectura.

## Cómo aplicar los scripts

**Local (con el `docker-compose.yml` de la raíz):** los scripts `V1__init.sql` de cada esquema se montan en
`docker-entrypoint-initdb.d` y se ejecutan automáticamente la primera vez que se crea el volumen de Postgres.
Si ya existe el volumen y agregas un script nuevo, no se vuelve a ejecutar solo — hay que aplicarlo a mano:

```bash
docker compose exec postgres psql -U subastalive -d subastalive -f /docker-entrypoint-initdb.d/schema_x/archivo.sql
```

o simplemente reiniciar el volumen (`docker compose down -v && docker compose up`) si no importa perder los
datos locales.

**RDS (AWS):** no se aplica nada a mano en ningún momento. La instancia se crea privada y vacía (ver
[`../docs/despliegue-aws.md`](../docs/despliegue-aws.md), sección 3), y cada esquema aparece solo cuando el
microservicio correspondiente se despliega por primera vez con Flyway ya integrado (ver sección de arriba).

## Credenciales / conexión local

Definidas en el `docker-compose.yml` de la raíz del repo:

| Variable | Valor local |
|---|---|
| Host | `localhost` (o `postgres` desde dentro de la red de Docker Compose) |
| Puerto | `5432` |
| Base de datos | `subastalive` |
| Usuario | `subastalive` |
| Password | `subastalive` (solo para desarrollo local — nunca usar en RDS real) |
