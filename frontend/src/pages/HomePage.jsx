import { useCallback } from "react";
import { useAsync } from "../hooks/useAsync";
import { listarSubastas } from "../api/catalogoApi";
import { useAuth } from "../auth/AuthContext";
import { SubastaCard } from "../components/SubastaCard";

export function HomePage() {
  const { session } = useAuth();
  const cargarSubastas = useCallback(() => listarSubastas(session?.accessToken), [session?.accessToken]);
  const { data: subastas, loading, error } = useAsync(cargarSubastas, [session?.accessToken]);

  return (
    <section>
      <h1>Subastas</h1>

      {loading && <p>Cargando subastas…</p>}
      {error && <p className="alert alert-error">No se pudieron cargar las subastas: {error.message}</p>}

      {subastas && subastas.length === 0 && <p>No hay subastas publicadas todavía.</p>}

      <div className="card-grid">
        {subastas?.map((subasta) => (
          <SubastaCard key={subasta.id} subasta={subasta} />
        ))}
      </div>
    </section>
  );
}
