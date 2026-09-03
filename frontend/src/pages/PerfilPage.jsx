import { useCallback } from "react";
import { useAsync } from "../hooks/useAsync";
import { obtenerMiPerfil } from "../api/usuariosApi";
import { useAuth } from "../auth/AuthContext";

export function PerfilPage() {
  const { session } = useAuth();
  const cargarPerfil = useCallback(() => obtenerMiPerfil(session?.accessToken), [session?.accessToken]);
  const { data: perfil, loading, error } = useAsync(cargarPerfil, [session?.accessToken]);

  if (loading) return <p className="loading-state">Cargando perfil…</p>;
  if (error) return <p className="alert alert-error">No se pudo cargar el perfil: {error.message}</p>;
  if (!perfil) return null;

  return (
    <section>
      <h1>Mi perfil</h1>
      <dl>
        <dt>Nombre</dt>
        <dd>{perfil.nombre ?? "—"}</dd>
        <dt>Email</dt>
        <dd>{perfil.email ?? "—"}</dd>
        <dt>Teléfono</dt>
        <dd>{perfil.telefono ?? "—"}</dd>
        <dt>Rol</dt>
        <dd>{perfil.rol}</dd>
        <dt>Miembro desde</dt>
        <dd>{new Date(perfil.fechaRegistro).toLocaleDateString("es-CL")}</dd>
      </dl>
    </section>
  );
}
