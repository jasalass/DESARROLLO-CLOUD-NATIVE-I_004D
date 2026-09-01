// Contrato completo en ../../ms-pujas/README.md
import { request } from "./httpClient";

export function emitirPuja(datos, token) {
  return request("/pujas", { method: "POST", body: datos, token });
}

export function listarPujasDeSubasta(subastaId, token) {
  return request(`/pujas?subastaId=${encodeURIComponent(subastaId)}`, { token });
}
