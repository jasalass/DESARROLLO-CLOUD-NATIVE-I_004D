import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { programarSubasta } from "../api/catalogoApi";

export function ProgramarSubastaPage() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();

  const [loteId, setLoteId] = useState(searchParams.get("loteId") ?? "");
  const [fechaApertura, setFechaApertura] = useState("");
  const [fechaCierre, setFechaCierre] = useState("");
  const [subastaCreada, setSubastaCreada] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const subasta = await programarSubasta(
        {
          loteId,
          fechaApertura: new Date(fechaApertura).toISOString(),
          fechaCierre: new Date(fechaCierre).toISOString(),
        },
        session?.accessToken
      );
      setSubastaCreada(subasta);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section>
      <div className="hero">
        <span className="hero-eyebrow">Panel de martillero</span>
        <h1>Programar subasta</h1>
        <p className="hero-subtitle">
          No hay un listado de "mis lotes" todavía (no está en el contrato de ms-catalogo) — pega el id del
          lote que quieres subastar. Si vienes de "Crear lote", ya viene precargado.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <label htmlFor="loteId">ID del lote</label>
        <input id="loteId" value={loteId} onChange={(e) => setLoteId(e.target.value)} required />

        <label htmlFor="fechaApertura">Fecha y hora de apertura</label>
        <input
          id="fechaApertura"
          type="datetime-local"
          value={fechaApertura}
          onChange={(e) => setFechaApertura(e.target.value)}
          required
        />

        <label htmlFor="fechaCierre">Fecha y hora de cierre</label>
        <input
          id="fechaCierre"
          type="datetime-local"
          value={fechaCierre}
          onChange={(e) => setFechaCierre(e.target.value)}
          required
        />

        <button type="submit" disabled={enviando}>
          {enviando ? "Programando…" : "Programar subasta"}
        </button>
      </form>

      {error && <p className="alert alert-error">{error}</p>}

      {subastaCreada && (
        <div className="alert alert-info">
          <p>Subasta programada.</p>
          <Link to={`/subastas/${subastaCreada.id}`}>Ver subasta</Link>
        </div>
      )}
    </section>
  );
}
