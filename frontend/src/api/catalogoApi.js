// Contrato completo en ../../ms-catalogo/README.md
import { request } from "./httpClient";

export function listarSubastas(token, estado) {
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : "";
  return request(`/subastas${query}`, { token });
}

export function obtenerSubasta(id, token) {
  return request(`/subastas/${id}`, { token });
}

export function obtenerLote(id, token) {
  return request(`/lotes/${id}`, { token });
}

export function crearLote(datos, token) {
  return request("/lotes", { method: "POST", body: datos, token });
}

export function programarSubasta(datos, token) {
  return request("/subastas", { method: "POST", body: datos, token });
}

export function cambiarEstadoSubasta(id, estado, token) {
  return request(`/subastas/${id}/estado`, { method: "PATCH", body: { estado }, token });
}
