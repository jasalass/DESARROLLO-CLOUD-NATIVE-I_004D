import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { crearLote } from "../api/catalogoApi";

const INICIAL = { titulo: "", descripcion: "", precioBase: "", incrementoMinimo: "", imagenUrl: "" };

export function CrearLotePage() {
  const { session } = useAuth();
  const [form, setForm] = useState(INICIAL);
  const [loteCreado, setLoteCreado] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  function actualizarCampo(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const lote = await crearLote(
        {
          titulo: form.titulo,
          descripcion: form.descripcion,
          precioBase: Number(form.precioBase),
          incrementoMinimo: Number(form.incrementoMinimo),
          imagenUrl: form.imagenUrl || null,
        },
        session?.accessToken
      );
      setLoteCreado(lote);
      setForm(INICIAL);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section>
      <h1>Crear lote</h1>

      <form onSubmit={handleSubmit} className="form">
        <label htmlFor="titulo">Título</label>
        <input id="titulo" value={form.titulo} onChange={(e) => actualizarCampo("titulo", e.target.value)} required />

        <label htmlFor="descripcion">Descripción</label>
        <textarea
          id="descripcion"
          value={form.descripcion}
          onChange={(e) => actualizarCampo("descripcion", e.target.value)}
        />

        <label htmlFor="precioBase">Precio base</label>
        <input
          id="precioBase"
          type="number"
          min="1"
          value={form.precioBase}
          onChange={(e) => actualizarCampo("precioBase", e.target.value)}
          required
        />

        <label htmlFor="incrementoMinimo">Incremento mínimo</label>
        <input
          id="incrementoMinimo"
          type="number"
          min="1"
          value={form.incrementoMinimo}
          onChange={(e) => actualizarCampo("incrementoMinimo", e.target.value)}
          required
        />

        <label htmlFor="imagenUrl">URL de imagen (opcional)</label>
        <input id="imagenUrl" value={form.imagenUrl} onChange={(e) => actualizarCampo("imagenUrl", e.target.value)} />

        <button type="submit" disabled={enviando}>
          {enviando ? "Creando…" : "Crear lote"}
        </button>
      </form>

      {error && <p className="alert alert-error">{error}</p>}

      {loteCreado && (
        <div className="alert alert-info">
          <p>
            Lote creado con id <code>{loteCreado.id}</code>.
          </p>
          <Link to={`/martillero/subastas/nueva?loteId=${loteCreado.id}`}>Programar su subasta</Link>
        </div>
      )}
    </section>
  );
}
