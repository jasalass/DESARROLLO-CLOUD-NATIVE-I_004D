-- Esquema propiedad de ms-pujas. No debe ser accedido directamente por otros microservicios (RNF-06).
-- Estructura basada en el modelo JSON `Puja` documentado en ../../ms-pujas/README.md.

CREATE SCHEMA IF NOT EXISTS schema_pujas;

CREATE TABLE IF NOT EXISTS schema_pujas.pujas (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Referencia lógica a schema_catalogo.subastas.id; sin FK real entre esquemas (RNF-06) —
    -- la validación de que la subasta existe y está abierta se hace vía llamada HTTP a ms-catalogo.
    subasta_id    UUID NOT NULL,
    -- Referencia lógica al "sub" de schema_usuarios.usuarios; tomado del JWT, sin FK real entre esquemas.
    usuario_sub   UUID NOT NULL,
    monto         NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    fecha         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Soporta el cálculo local del precio vigente: MAX(monto) de una subasta (GET /pujas/{subastaId}/actual)
-- y el listado de pujas de una subasta ordenado por fecha (GET /pujas?subastaId=).
CREATE INDEX IF NOT EXISTS idx_pujas_subasta_monto ON schema_pujas.pujas (subasta_id, monto DESC);
CREATE INDEX IF NOT EXISTS idx_pujas_subasta_fecha ON schema_pujas.pujas (subasta_id, fecha DESC);

-- Soporta el historial de un usuario (GET /pujas?usuarioSub=).
CREATE INDEX IF NOT EXISTS idx_pujas_usuario_fecha ON schema_pujas.pujas (usuario_sub, fecha DESC);
