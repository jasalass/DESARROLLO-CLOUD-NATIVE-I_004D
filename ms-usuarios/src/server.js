// STUB liviano de ms-usuarios, solo para poder probar el frontend contra algo real en local.
// No es la implementación final — quien construya ms-usuarios de verdad reemplaza esta carpeta entera.
// Sin base de datos: el perfil se arma leyendo el token local (formato "local:<sub>:<ROL>", ver
// ms-pujas/src/main/java/.../security/LocalTokenAuthFilter.java) y el historial se pide a ms-pujas.
// Contrato completo: ver README.md de esta carpeta.

import express from "express";

const PORT = process.env.SERVER_PORT || 8081;
const MS_PUJAS_BASE_URL = process.env.MS_PUJAS_BASE_URL || "http://localhost:8083";

const app = express();

function error(res, status, codigo, mensaje) {
  res.status(status).json({ codigo, mensaje, detalles: null });
}

function usuarioDesdeToken(authorizationHeader) {
  if (authorizationHeader?.startsWith("Bearer local:")) {
    const [sub, rol] = authorizationHeader.slice("Bearer local:".length).split(":");
    return { sub, rol };
  }
  return null;
}

app.get("/health", (req, res) => res.send("ms-usuarios (stub) up"));

app.get("/usuarios/me", (req, res) => {
  const usuario = usuarioDesdeToken(req.headers.authorization);
  if (!usuario) return error(res, 401, "NO_AUTENTICADO", "Token ausente o inválido.");
  res.json({
    sub: usuario.sub,
    rol: usuario.rol,
    nombre: `${usuario.rol.charAt(0)}${usuario.rol.slice(1).toLowerCase()} de Prueba`,
    email: `${usuario.rol.toLowerCase()}@example.com`,
    fechaRegistro: "2026-08-20T14:03:00Z",
  });
});

app.get("/usuarios/:sub/historial", async (req, res) => {
  try {
    const respuesta = await fetch(`${MS_PUJAS_BASE_URL}/pujas?usuarioSub=${req.params.sub}`, {
      headers: { Authorization: req.headers.authorization ?? "" },
    });
    if (!respuesta.ok) return error(res, 502, "PUJAS_NO_DISPONIBLE", "No se pudo obtener el historial.");
    const pujas = await respuesta.json();
    const data = pujas.map(({ id, subastaId, monto, fecha }) => ({ pujaId: id, subastaId, monto, fecha }));
    res.json({ usuarioSub: req.params.sub, pujas: data });
  } catch {
    error(res, 502, "PUJAS_NO_DISPONIBLE", "No se pudo obtener el historial.");
  }
});

app.listen(PORT, () => console.log(`ms-usuarios (stub) escuchando en :${PORT}`));
