-- Esquema propiedad de ms-usuarios. No debe ser accedido directamente por otros microservicios (RNF-06).
-- Estructura basada en el modelo JSON `Usuario` documentado en ../../ms-usuarios/README.md.

CREATE SCHEMA IF NOT EXISTS schema_usuarios;

CREATE TABLE IF NOT EXISTS schema_usuarios.usuarios (
    -- Igual al claim "sub" del JWT emitido por Cognito o Entra ID. No lo genera esta base.
    sub             UUID PRIMARY KEY,
    rol             VARCHAR(20) NOT NULL
                        CHECK (rol IN ('POSTOR', 'MARTILLERO', 'ADMINISTRADOR')),
    nombre          VARCHAR(150),
    email           VARCHAR(150),
    telefono        VARCHAR(30),
    fecha_registro  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No hay Flyway para este esquema (ver ms-usuarios/src/db.js), así que este archivo se re-ejecuta
-- en cada arranque contra una base que puede ya tener la tabla creada sin esta columna. ADD COLUMN
-- IF NOT EXISTS la agrega sin romper nada en ese caso; en una base nueva, el CREATE TABLE de arriba
-- ya la incluye y esta línea es un no-op.
ALTER TABLE schema_usuarios.usuarios ADD COLUMN IF NOT EXISTS telefono VARCHAR(30);

-- Consultas frecuentes de administración/soporte por rol.
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON schema_usuarios.usuarios (rol);
