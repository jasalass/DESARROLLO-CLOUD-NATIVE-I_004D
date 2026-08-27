import { http, HttpResponse } from "msw";
import { API_BASE_URL } from "../api/config";
import { lotes, subastas, pujas } from "./fixtures";

function loteResumen(lote) {
  if (!lote) return null;
  return { id: lote.id, titulo: lote.titulo, precioBase: lote.precioBase, imagenUrl: lote.imagenUrl };
}

function precioActualDeSubasta(subastaId) {
  const pujasOrdenadas = pujas
    .filter((p) => p.subastaId === subastaId)
    .sort((a, b) => b.monto - a.monto);
  return pujasOrdenadas[0]?.monto ?? null;
}

function errorJson(codigo, mensaje, status, detalles = null) {
  return HttpResponse.json({ codigo, mensaje, detalles }, { status });
}

export const handlers = [
  // ---- ms-catalogo ----
  http.get(`${API_BASE_URL}/subastas`, ({ request }) => {
    const url = new URL(request.url);
    const estado = url.searchParams.get("estado");
    const data = subastas
      .filter((s) => !estado || s.estado === estado)
      .map((s) => ({ ...s, lote: loteResumen(lotes.find((l) => l.id === s.loteId)) }));
    return HttpResponse.json(data);
  }),

  http.get(`${API_BASE_URL}/subastas/:id`, ({ params }) => {
    const subasta = subastas.find((s) => s.id === params.id);
    if (!subasta) return errorJson("NO_ENCONTRADO", "Subasta no encontrada.", 404);
    const lote = lotes.find((l) => l.id === subasta.loteId);
    const totalPujas = pujas.filter((p) => p.subastaId === subasta.id).length;
    const precioActual = precioActualDeSubasta(subasta.id) ?? lote.precioBase;
    return HttpResponse.json({ ...subasta, lote, precioActual, totalPujas });
  }),

  http.get(`${API_BASE_URL}/lotes/:id`, ({ params }) => {
    const lote = lotes.find((l) => l.id === params.id);
    if (!lote) return errorJson("NO_ENCONTRADO", "Lote no encontrado.", 404);
    return HttpResponse.json(lote);
  }),

  http.post(`${API_BASE_URL}/lotes`, async ({ request }) => {
    const body = await request.json();
    if (!body.titulo || !body.precioBase || body.precioBase <= 0) {
      return errorJson("VALIDACION", "titulo y precioBase (> 0) son obligatorios.", 400, { campo: "precioBase" });
    }
    const nuevoLote = {
      id: crypto.randomUUID(),
      martilleroSub: "mock-martillero-0000-0000-000000000001",
      titulo: body.titulo,
      descripcion: body.descripcion ?? "",
      precioBase: body.precioBase,
      incrementoMinimo: body.incrementoMinimo ?? 1000,
      imagenUrl: body.imagenUrl ?? null,
    };
    lotes.push(nuevoLote);
    return HttpResponse.json(nuevoLote, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/subastas`, async ({ request }) => {
    const body = await request.json();
    const lote = lotes.find((l) => l.id === body.loteId);
    if (!lote) return errorJson("VALIDACION", "loteId no existe.", 400);
    const nuevaSubasta = {
      id: crypto.randomUUID(),
      loteId: body.loteId,
      estado: "PROGRAMADA",
      fechaApertura: body.fechaApertura,
      fechaCierre: body.fechaCierre,
    };
    subastas.push(nuevaSubasta);
    return HttpResponse.json(nuevaSubasta, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/subastas/:id/estado`, async ({ params, request }) => {
    const subasta = subastas.find((s) => s.id === params.id);
    if (!subasta) return errorJson("NO_ENCONTRADO", "Subasta no encontrada.", 404);
    const { estado } = await request.json();
    subasta.estado = estado;
    return HttpResponse.json(subasta);
  }),

  // ---- ms-pujas ----
  http.post(`${API_BASE_URL}/pujas`, async ({ request }) => {
    const body = await request.json();
    const subasta = subastas.find((s) => s.id === body.subastaId);
    if (!subasta) return errorJson("NO_ENCONTRADO", "Subasta no encontrada.", 404);
    if (subasta.estado !== "ABIERTA") {
      return errorJson("SUBASTA_NO_ABIERTA", `La subasta ${subasta.id} no está en estado ABIERTA.`, 409);
    }
    const lote = lotes.find((l) => l.id === subasta.loteId);
    const precioActual = precioActualDeSubasta(subasta.id) ?? lote.precioBase;
    const montoMinimoRequerido = precioActual + lote.incrementoMinimo;
    if (body.monto < montoMinimoRequerido) {
      return errorJson(
        "MONTO_INSUFICIENTE",
        `El monto debe ser al menos ${montoMinimoRequerido}.`,
        400,
        { montoMinimoRequerido }
      );
    }
    const nuevaPuja = {
      id: crypto.randomUUID(),
      subastaId: body.subastaId,
      usuarioSub: "mock-postor-0000-0000-0000-000000000001",
      monto: body.monto,
      fecha: new Date().toISOString(),
    };
    pujas.push(nuevaPuja);
    return HttpResponse.json(nuevaPuja, { status: 201 });
  }),

  http.get(`${API_BASE_URL}/pujas`, ({ request }) => {
    const url = new URL(request.url);
    const subastaId = url.searchParams.get("subastaId");
    const usuarioSub = url.searchParams.get("usuarioSub");

    if (subastaId) {
      const data = pujas
        .filter((p) => p.subastaId === subastaId)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      return HttpResponse.json(data);
    }

    if (usuarioSub) {
      const data = pujas
        .filter((p) => p.usuarioSub === usuarioSub)
        .map(({ id, subastaId: sId, monto, fecha }) => ({ id, subastaId: sId, monto, fecha }));
      return HttpResponse.json(data);
    }

    return HttpResponse.json(pujas);
  }),

  // ---- ms-usuarios ----
  http.get(`${API_BASE_URL}/usuarios/me`, () => {
    return HttpResponse.json({
      sub: "mock-postor-0000-0000-0000-000000000001",
      rol: "POSTOR",
      nombre: "Postor de Prueba",
      email: "postor@example.com",
      fechaRegistro: "2026-08-20T14:03:00Z",
    });
  }),

  http.get(`${API_BASE_URL}/usuarios/:sub/historial`, ({ params }) => {
    const data = pujas
      .filter((p) => p.usuarioSub === params.sub)
      .map(({ id, subastaId, monto, fecha }) => ({ pujaId: id, subastaId, monto, fecha }));
    return HttpResponse.json({ usuarioSub: params.sub, pujas: data });
  }),
];
