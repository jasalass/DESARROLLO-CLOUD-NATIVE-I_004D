import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useAsync } from "../hooks/useAsync";
import { listarSubastas } from "../api/catalogoApi";
import { useAuth } from "../auth/AuthContext";
import { SubastaCard } from "../components/SubastaCard";

export function SubastasPage() {
  const { session, isAuthenticated } = useAuth();
  const cargarSubastas = useCallback(() => listarSubastas(session?.accessToken), [session?.accessToken]);
  const { data: subastas, loading, error } = useAsync(cargarSubastas, [session?.accessToken, isAuthenticated]);

  return (
    <section>
      <div className="hero">
        <span className="hero-eyebrow">En vivo ahora</span>
        <h1>Subastas</h1>
        <p className="hero-subtitle">
          Explora los lotes disponibles, sigue el precio actual en tiempo real y participa antes de que
          cierre el martillo.
        </p>
      </div>

      {!isAuthenticated && (
        <div className="alert alert-info">
          <p>
            Necesitas una cuenta para ver las subastas y pujar. <Link to="/login">Inicia sesión o regístrate</Link>{" "}
            — es gratis y toma un minuto.
          </p>
        </div>
      )}

      {isAuthenticated && loading && <p className="loading-state">Cargando subastas…</p>}
      {isAuthenticated && error && (
        <p className="alert alert-error">No se pudieron cargar las subastas: {error.message}</p>
      )}

      {isAuthenticated && subastas && subastas.length === 0 && (
        <p className="empty-state">No hay subastas publicadas todavía.</p>
      )}

      {isAuthenticated && (
        <div className="card-grid">
          {subastas?.map((subasta) => (
            <SubastaCard key={subasta.id} subasta={subasta} />
          ))}
        </div>
      )}
    </section>
  );
}
