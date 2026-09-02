import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAsync } from "../hooks/useAsync";
import { obtenerSubasta, cambiarEstadoSubasta } from "../api/catalogoApi";
import { listarPujasDeSubasta } from "../api/pujasApi";
import { useAuth } from "../auth/AuthContext";
import { PujaForm } from "../components/PujaForm";

const TRANSICIONES = {
  PROGRAMADA: ["ABIERTA"],
  ABIERTA: ["CERRADA"],
  CERRADA: ["ADJUDICADA"],
  ADJUDICADA: [],
};

const ESTADO_LABEL = {
  PROGRAMADA: "Programada",
  ABIERTA: "En vivo",
  CERRADA: "Cerrada",
  ADJUDICADA: "Adjudicada",
};

export function SubastaDetailPage() {
  const { id } = useParams();
  const { session, role, isAuthenticated } = useAuth();
  const [version, setVersion] = useState(0);

  // Sin sesión no se llama a la API (evita el 401 esperado por RF-29) — se muestra un CTA a loguearse.
  const cargarSubasta = useCallback(
    () => (isAuthenticated ? obtenerSubasta(id, session?.accessToken) : Promise.resolve(null)),
    [id, isAuthenticated, session?.accessToken, version]
  );
  const { data: subasta, loading, error } = useAsync(cargarSubasta, [id, isAuthenticated, session?.accessToken, version]);

  const cargarPujas = useCallback(
    () => (isAuthenticated ? listarPujasDeSubasta(id, session?.accessToken) : Promise.resolve([])),
    [id, isAuthenticated, session?.accessToken, version]
  );
  const { data: pujas } = useAsync(cargarPujas, [id, isAuthenticated, session?.accessToken, version]);

  async function handleCambiarEstado(nuevoEstado) {
    await cambiarEstadoSubasta(id, nuevoEstado, session?.accessToken);
    setVersion((v) => v + 1);
  }

  if (!isAuthenticated) {
    return (
      <div className="alert alert-info">
        <p>
          Necesitas una cuenta para ver el detalle de esta subasta. <Link to="/login">Inicia sesión o regístrate</Link>
          .
        </p>
      </div>
    );
  }

  if (loading) return <p className="loading-state">Cargando subasta…</p>;
  if (error) return <p className="alert alert-error">No se pudo cargar la subasta: {error.message}</p>;
  if (!subasta) return null;

  const esMartillero = role === "MARTILLERO" || role === "ADMINISTRADOR";
  const transicionesDisponibles = TRANSICIONES[subasta.estado] ?? [];
  const estadoClase = `badge-${(subasta.estado ?? "").toLowerCase()}`;

  return (
    <section>
      <div className="hero">
        <span className={`badge ${estadoClase}`}>
          <span className="badge-dot" aria-hidden="true" />
          {ESTADO_LABEL[subasta.estado] ?? subasta.estado}
        </span>
        <h1 style={{ marginTop: "0.6rem" }}>{subasta.lote?.titulo}</h1>
        <p className="hero-subtitle">{subasta.lote?.descripcion}</p>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <div className="detail-stats">
            <div className="detail-stat">
              <div className="detail-stat-label">Precio actual</div>
              <div className="detail-stat-value">${subasta.precioActual?.toLocaleString("es-CL")}</div>
            </div>
            <div className="detail-stat">
              <div className="detail-stat-label">Total de pujas</div>
              <div className="detail-stat-value">{subasta.totalPujas}</div>
            </div>
            <div className="detail-stat">
              <div className="detail-stat-label">Cierra</div>
              <div className="detail-stat-value" style={{ fontSize: "1rem" }}>
                {new Date(subasta.fechaCierre).toLocaleString("es-CL")}
              </div>
            </div>
            <div className="detail-stat">
              <div className="detail-stat-label">Incremento mínimo</div>
              <div className="detail-stat-value" style={{ fontSize: "1rem" }}>
                ${subasta.lote?.incrementoMinimo?.toLocaleString("es-CL") ?? "—"}
              </div>
            </div>
          </div>

          {esMartillero && transicionesDisponibles.length > 0 && (
            <div style={{ marginTop: "0.5rem" }}>
              <p style={{ fontWeight: 600, marginBottom: "0.35rem" }}>Acciones de martillero:</p>
              {transicionesDisponibles.map((estado) => (
                <button key={estado} type="button" onClick={() => handleCambiarEstado(estado)}>
                  Cambiar a {ESTADO_LABEL[estado] ?? estado}
                </button>
              ))}
            </div>
          )}

          <h2>Historial de pujas</h2>
          {!pujas?.length && <p className="empty-state">Todavía no hay pujas en esta subasta.</p>}
          <ul>
            {pujas?.map((puja) => (
              <li key={puja.id}>
                <strong>${puja.monto.toLocaleString("es-CL")}</strong>
                <span>{new Date(puja.fecha).toLocaleString("es-CL")}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="detail-side">
          {role === "POSTOR" && <PujaForm subasta={subasta} onPujaCreada={() => setVersion((v) => v + 1)} />}
        </div>
      </div>
    </section>
  );
}
