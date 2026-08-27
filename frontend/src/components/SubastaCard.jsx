import { Link } from "react-router-dom";

const ESTADO_LABEL = {
  PROGRAMADA: "Programada",
  ABIERTA: "Abierta",
  CERRADA: "Cerrada",
  ADJUDICADA: "Adjudicada",
};

export function SubastaCard({ subasta }) {
  return (
    <div className="card">
      <h3>{subasta.lote?.titulo ?? "Lote sin título"}</h3>
      <p>
        Estado: <strong>{ESTADO_LABEL[subasta.estado] ?? subasta.estado}</strong>
      </p>
      <p>Precio base: ${subasta.lote?.precioBase?.toLocaleString("es-CL")}</p>
      <p>Cierra: {new Date(subasta.fechaCierre).toLocaleString("es-CL")}</p>
      <Link to={`/subastas/${subasta.id}`}>Ver detalle</Link>
    </div>
  );
}
