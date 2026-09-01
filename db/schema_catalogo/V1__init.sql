-- Esquema propiedad de ms-catalogo. No debe ser accedido directamente por otros microservicios (RNF-06).
-- Estructura basada en los modelos JSON `Lote` y `Subasta` documentados en ../../ms-catalogo/README.md.

CREATE SCHEMA IF NOT EXISTS schema_catalogo;

CREATE TABLE IF NOT EXISTS schema_catalogo.lotes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- sub del martillero que lo creó (claim del JWT); referencia lógica a schema_usuarios.usuarios,
    -- sin FK real entre esquemas (RNF-06).
    martillero_sub      UUID NOT NULL,
    titulo              VARCHAR(200) NOT NULL,
    descripcion         TEXT,
    precio_base         NUMERIC(12, 2) NOT NULL CHECK (precio_base > 0),
    incremento_minimo   NUMERIC(12, 2) NOT NULL CHECK (incremento_minimo > 0),
    imagen_url          TEXT
);

CREATE TABLE IF NOT EXISTS schema_catalogo.subastas (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id           UUID NOT NULL REFERENCES schema_catalogo.lotes (id),
    estado            VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADA'
                          CHECK (estado IN ('PROGRAMADA', 'ABIERTA', 'CERRADA', 'ADJUDICADA')),
    fecha_apertura    TIMESTAMPTZ NOT NULL,
    fecha_cierre      TIMESTAMPTZ NOT NULL,
    CHECK (fecha_cierre > fecha_apertura)
);

-- Un lote no puede tener más de una subasta activa (PROGRAMADA o ABIERTA) a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS uq_subasta_activa_por_lote
    ON schema_catalogo.subastas (lote_id)
    WHERE estado IN ('PROGRAMADA', 'ABIERTA');

-- Soporta GET /subastas?estado= y el scheduler de cierre automático (busca ABIERTA + fecha_cierre vencida).
CREATE INDEX IF NOT EXISTS idx_subastas_estado ON schema_catalogo.subastas (estado, fecha_cierre);
