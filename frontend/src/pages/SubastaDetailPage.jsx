import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
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

export function SubastaDetailPage() {
  const { id } = useParams();
  const { session, role } = useAuth();
  const [version, setVersion] = useState(0);

  const cargarSubasta = useCallback(() => obtenerSubasta(id, session?.accessToken), [id, session?.accessToken, version]);
  const { data: subasta, loading, error } = useAsync(cargarSubasta, [id, session?.accessToken, version]);

  const cargarPujas = useCallback(() => listarPujasDeSubasta(id, session?.accessToken), [id, session?.accessToken, version]);
  const { data: pujas } = useAsync(cargarPujas, [id, session?.accessToken, version]);

  async function handleCambiarEstado(nuevoEstado) {
    await cambiarEstadoSubasta(id, nuevoEstado, session?.accessToken);
    setVersion((v) => v + 1);
  }

  if (loading) return <p>Cargando subasta…</p>;
  if (error) return <p className="alert alert-error">No se pudo cargar la subasta: {error.message}</p>;
  if (!subasta) return null;

  const esMartillero = role === "MARTILLERO" || role === "ADMINISTRADOR";
  const transicionesDisponibles = TRANSICIONES[subasta.estado] ?? [];

  return (
    <section>
      <h1>{subasta.lote?.titulo}</h1>
      <p>{subasta.lote?.descripcion}</p>
      <p>Estado: <strong>{subasta.estado}</strong></p>
      <p>Precio actual: ${subasta.precioActual?.toLocaleString("es-CL")}</p>
      <p>Total de pujas: {subasta.totalPujas}</p>
      <p>Cierra: {new Date(subasta.fechaCierre).toLocaleString("es-CL")}</p>

      {role === "POSTOR" && (
        <PujaForm subasta={subasta} onPujaCreada={() => setVersion((v) => v + 1)} />
      )}

      {esMartillero && transicionesDisponibles.length > 0 && (
        <div className="form">
          <p>Acciones de martillero:</p>
          {transicionesDisponibles.map((estado) => (
            <button key={estado} type="button" onClick={() => handleCambiarEstado(estado)}>
              Cambiar a {estado}
            </button>
          ))}
        </div>
      )}

      <h2>Historial de pujas</h2>
      {!pujas?.length && <p>Todavía no hay pujas en esta subasta.</p>}
      <ul>
        {pujas?.map((puja) => (
          <li key={puja.id}>
            ${puja.monto.toLocaleString("es-CL")} — {new Date(puja.fecha).toLocaleString("es-CL")}
          </li>
        ))}
      </ul>
    </section>
  );
}
