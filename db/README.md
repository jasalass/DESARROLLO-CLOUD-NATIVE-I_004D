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

Convención de nombres de archivo (estilo migración, no obligatorio pero recomendado):
`V1__init.sql`, `V2__agrega_tabla_x.sql`, etc., para que el orden de aplicación quede claro aunque no se use
una herramienta de migraciones (Flyway/Liquibase). Si el equipo prefiere usar una de esas herramientas,
documentarlo aquí.

## Cómo aplicar los scripts

**Local (con el `docker-compose.yml` de la raíz):** los scripts `V1__init.sql` de cada esquema se montan en
`docker-entrypoint-initdb.d` y se ejecutan automáticamente la primera vez que se crea el volumen de Postgres.
Si ya existe el volumen y agregas un script nuevo, no se vuelve a ejecutar solo — hay que aplicarlo a mano:

```bash
docker compose exec postgres psql -U subastalive -d subastalive -f /docker-entrypoint-initdb.d/schema_x/archivo.sql
```

o simplemente reiniciar el volumen (`docker compose down -v && docker compose up`) si no importa perder los
datos locales.

**RDS (AWS):** aplicar los scripts manualmente contra la instancia (`psql` apuntando al endpoint de RDS,
o mediante la herramienta de migraciones que el equipo decida adoptar).

## Credenciales / conexión local

Definidas en el `docker-compose.yml` de la raíz del repo:

| Variable | Valor local |
|---|---|
| Host | `localhost` (o `postgres` desde dentro de la red de Docker Compose) |
| Puerto | `5432` |
| Base de datos | `subastalive` |
| Usuario | `subastalive` |
| Password | `subastalive` (solo para desarrollo local — nunca usar en RDS real) |
