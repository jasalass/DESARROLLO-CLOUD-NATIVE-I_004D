// Contrato completo en ../../ms-usuarios/README.md
import { request } from "./httpClient";

export function obtenerMiPerfil(token) {
  return request("/usuarios/me", { token });
}

export function obtenerHistorial(sub, token) {
  return request(`/usuarios/${sub}/historial`, { token });
}
