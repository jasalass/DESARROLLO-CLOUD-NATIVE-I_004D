import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="hero" style={{ textAlign: "center", padding: "3rem 0" }}>
      <span className="hero-eyebrow">Error 404</span>
      <h1>Este lote no existe</h1>
      <p className="hero-subtitle" style={{ margin: "0 auto 1.25rem" }}>
        La página que buscas no existe o ya se retiró de la sala de subastas.
      </p>
      <Link to="/">← Volver al inicio</Link>
    </section>
  );
}
