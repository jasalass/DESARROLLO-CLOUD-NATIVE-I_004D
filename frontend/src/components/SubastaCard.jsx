import { Link } from "react-router-dom";

const ESTADO_LABEL = {
  PROGRAMADA: "Programada",
  ABIERTA: "En vivo",
  CERRADA: "Cerrada",
  ADJUDICADA: "Adjudicada",
};

export function SubastaCard({ subasta }) {
  const estadoClase = `badge-${(subasta.estado ?? "").toLowerCase()}`;
  const imagenUrl = subasta.lote?.imagenUrl;

  return (
    <div className="card">
      <div
        className="card-media"
        style={imagenUrl ? { backgroundImage: `url(${imagenUrl})` } : undefined}
        aria-hidden="true"
      >
        {!imagenUrl && "🏺"}
      </div>
      <div className="card-body">
        <div className="card-meta">
          <h3>{subasta.lote?.titulo ?? "Lote sin título"}</h3>
        </div>
        <span className={`badge ${estadoClase}`}>
          <span className="badge-dot" aria-hidden="true" />
          {ESTADO_LABEL[subasta.estado] ?? subasta.estado}
        </span>

        <div className="card-price-label">Precio base</div>
        <p className="card-price">${subasta.lote?.precioBase?.toLocaleString("es-CL")}</p>

        <div className="card-footer-row">
          <span>Cierra {new Date(subasta.fechaCierre).toLocaleString("es-CL")}</span>
        </div>
        <Link to={`/subastas/${subasta.id}`} className="card-link">
          Ver detalle →
        </Link>
      </div>
    </div>
  );
}
