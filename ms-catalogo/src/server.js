// STUB liviano de ms-catalogo, solo para poder probar ms-pujas y el frontend contra algo real en local.
// No es la implementación final — quien construya ms-catalogo de verdad reemplaza esta carpeta entera.
// Datos en memoria (se pierden al reiniciar), sin base de datos, sin validación real de JWT.
// Contrato completo: ver README.md de esta carpeta.

import express from "express";
import { randomUUID } from "node:crypto";
import { lotes, subastas } from "./fixtures.js";

const PORT = process.env.SERVER_PORT || 8082;
const MS_PUJAS_BASE_URL = process.env.MS_PUJAS_BASE_URL || "http://localhost:8083";

const app = express();
app.use(express.json());

function error(res, status, codigo, mensaje, detalles = null) {
  res.status(status).json({ codigo, mensaje, detalles });
}

function loteResumen(lote) {
  if (!lote) return null;
  return { id: lote.id, titulo: lote.titulo, precioBase: lote.precioBase, imagenUrl: lote.imagenUrl };
}

app.get("/health", (req, res) => res.send("ms-catalogo (stub) up"));

app.get("/subastas", (req, res) => {
  const { estado } = req.query;
  const data = subastas
    .filter((s) => !estado || s.estado === estado)
    .map((s) => ({ ...s, lote: loteResumen(lotes.find((l) => l.id === s.loteId)) }));
  res.json(data);
});

app.get("/subastas/:id/reglas", (req, res) => {
  const subasta = subastas.find((s) => s.id === req.params.id);
  if (!subasta) return error(res, 404, "NO_ENCONTRADO", "Subasta no encontrada.");
  const lote = lotes.find((l) => l.id === subasta.loteId);
  res.json({
    id: subasta.id,
    estado: subasta.estado,
    precioBase: lote.precioBase,
    incrementoMinimo: lote.incrementoMinimo,
  });
});

app.get("/subastas/:id", async (req, res) => {
  const subasta = subastas.find((s) => s.id === req.params.id);
  if (!subasta) return error(res, 404, "NO_ENCONTRADO", "Subasta no encontrada.");
  const lote = lotes.find((l) => l.id === subasta.loteId);

  let precioActual = lote.precioBase;
  let totalPujas = 0;
  try {
    const respuesta = await fetch(`${MS_PUJAS_BASE_URL}/pujas/${subasta.id}/actual`, {
      headers: { Authorization: req.headers.authorization ?? "" },
    });
    if (respuesta.ok) {
      const actual = await respuesta.json();
      precioActual = actual.montoActual ?? lote.precioBase;
      totalPujas = actual.totalPujas ?? 0;
    }
  } catch {
    // ms-pujas no disponible: no se cae el endpoint completo, se responde con el precio base.
  }

  res.json({ ...subasta, lote, precioActual, totalPujas });
});

app.get("/lotes/:id", (req, res) => {
  const lote = lotes.find((l) => l.id === req.params.id);
  if (!lote) return error(res, 404, "NO_ENCONTRADO", "Lote no encontrado.");
  res.json(lote);
});

app.post("/lotes", (req, res) => {
  const { titulo, descripcion, precioBase, incrementoMinimo, imagenUrl } = req.body ?? {};
  if (!titulo || !precioBase || precioBase <= 0) {
    return error(res, 400, "VALIDACION", "titulo y precioBase (> 0) son obligatorios.", { campo: "precioBase" });
  }
  const nuevoLote = {
    id: randomUUID(),
    martilleroSub: "d81fa021-0000-4000-8000-000000000001",
    titulo,
    descripcion: descripcion ?? "",
    precioBase,
    incrementoMinimo: incrementoMinimo ?? 1000,
    imagenUrl: imagenUrl ?? null,
  };
  lotes.push(nuevoLote);
  res.status(201).json(nuevoLote);
});

app.post("/subastas", (req, res) => {
  const { loteId, fechaApertura, fechaCierre } = req.body ?? {};
  if (!lotes.find((l) => l.id === loteId)) {
    return error(res, 400, "VALIDACION", "loteId no existe.");
  }
  const nuevaSubasta = { id: randomUUID(), loteId, estado: "PROGRAMADA", fechaApertura, fechaCierre };
  subastas.push(nuevaSubasta);
  res.status(201).json(nuevaSubasta);
});

app.patch("/subastas/:id/estado", (req, res) => {
  const subasta = subastas.find((s) => s.id === req.params.id);
  if (!subasta) return error(res, 404, "NO_ENCONTRADO", "Subasta no encontrada.");
  subasta.estado = req.body?.estado;
  res.json(subasta);
});

app.listen(PORT, () => console.log(`ms-catalogo (stub) escuchando en :${PORT}`));
