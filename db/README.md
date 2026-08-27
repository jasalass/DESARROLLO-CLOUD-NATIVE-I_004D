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

Cada subcarpeta (`schema_usuarios/`, `schema_catalogo/`, `schema_pujas/`) contiene el script SQL que crea el
esquema. **Cada equipo/persona a cargo de un microservicio agrega aquí las tablas de su propio esquema** a
medida que las define — este repositorio solo deja creado el esquema vacío como punto de partida, para no
imponer un modelo de datos que le corresponde decidir a quien implemente cada servicio.

Convención de nombres de archivo sugerida (estilo migración, no obligatorio pero recomendado):
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
