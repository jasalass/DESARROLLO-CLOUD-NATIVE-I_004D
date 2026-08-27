import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { emitirPuja } from "../api/pujasApi";

export function PujaForm({ subasta, onPujaCreada }) {
  const { session } = useAuth();
  const [monto, setMonto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const montoMinimoSugerido = (subasta.precioActual ?? subasta.lote?.precioBase ?? 0) + (subasta.lote?.incrementoMinimo ?? 0);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const puja = await emitirPuja({ subastaId: subasta.id, monto: Number(monto) }, session.accessToken);
      setMonto("");
      onPujaCreada?.(puja);
    } catch (err) {
      setError(err.detalles?.montoMinimoRequerido ? `${err.message} (mínimo: $${err.detalles.montoMinimoRequerido.toLocaleString("es-CL")})` : err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (subasta.estado !== "ABIERTA") {
    return <p>Esta subasta no está abierta para recibir pujas.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label htmlFor="monto">Tu oferta (mínimo sugerido: ${montoMinimoSugerido.toLocaleString("es-CL")})</label>
      <input
        id="monto"
        type="number"
        min={montoMinimoSugerido}
        step="1"
        value={monto}
        onChange={(e) => setMonto(e.target.value)}
        required
      />
      <button type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Pujar"}
      </button>
      {error && <p className="alert alert-error">{error}</p>}
    </form>
  );
}
