import { API_BASE_URL } from "./config";

// Cliente HTTP mínimo. Los tres microservicios comparten el mismo formato de error
// (ver README principal, "Convenciones de API compartidas"): { codigo, mensaje, detalles }.
export async function request(path, { method = "GET", body, token, headers } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const error = new Error(payload?.mensaje || `Error ${response.status} al llamar a ${path}`);
    error.status = response.status;
    error.codigo = payload?.codigo;
    error.detalles = payload?.detalles;
    throw error;
  }

  return payload;
}
