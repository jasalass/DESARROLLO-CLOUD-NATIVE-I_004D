import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useAsync } from "../hooks/useAsync";
import { obtenerHistorial } from "../api/usuariosApi";
import { useAuth } from "../auth/AuthContext";

export function HistorialPage() {
  const { session } = useAuth();
  const cargarHistorial = useCallback(
    () => obtenerHistorial(session.sub, session.accessToken),
    [session?.sub, session?.accessToken]
  );
  const { data: historial, loading, error } = useAsync(cargarHistorial, [session?.sub, session?.accessToken]);

  if (loading) return <p className="loading-state">Cargando historial…</p>;
  if (error) return <p className="alert alert-error">No se pudo cargar el historial: {error.message}</p>;

  return (
    <section>
      <div className="hero">
        <h1>Mi historial de pujas</h1>
      </div>

      {!historial?.pujas?.length && <p className="empty-state">Todavía no has emitido ninguna puja.</p>}

      <ul>
        {historial?.pujas?.map((item) => (
          <li key={item.pujaId}>
            <span>
              <strong>${item.monto.toLocaleString("es-CL")}</strong> — {new Date(item.fecha).toLocaleString("es-CL")}
            </span>
            <Link to={`/subastas/${item.subastaId}`}>Ver subasta →</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
