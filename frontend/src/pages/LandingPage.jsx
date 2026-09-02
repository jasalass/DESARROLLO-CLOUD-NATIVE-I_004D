import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { listarSubastas } from "../api/catalogoApi";
import { SubastaCard } from "../components/SubastaCard";

const CATEGORIAS = [
  { icono: "🎨", nombre: "Arte & Antigüedades" },
  { icono: "⌚", nombre: "Relojes & Joyas" },
  { icono: "🚗", nombre: "Vehículos clásicos" },
  { icono: "🍷", nombre: "Vinos & Coleccionables" },
  { icono: "💻", nombre: "Tecnología" },
  { icono: "🏠", nombre: "Inmuebles" },
];

const PASOS = [
  {
    numero: "01",
    titulo: "Explora",
    texto: "Filtra por categoría y revisa el precio base, el incremento mínimo y el estado de cada lote.",
  },
  {
    numero: "02",
    titulo: "Puja",
    texto: "Oferta en vivo. El precio vigente se actualiza al instante para todos los que están mirando.",
  },
  {
    numero: "03",
    titulo: "Gana",
    texto: "Si tu oferta es la más alta al cierre, el lote queda adjudicado a tu nombre.",
  },
];

const VALORES = [
  {
    icono: "🔒",
    titulo: "Identidad verificada",
    texto: "Login federado con Amazon Cognito y Microsoft Entra ID — sin contraseñas propias que administrar.",
  },
  {
    icono: "⚡",
    titulo: "Pujas en tiempo real",
    texto: "El precio vigente y el historial de ofertas se actualizan al instante en cada subasta.",
  },
  {
    icono: "🧾",
    titulo: "Trazabilidad total",
    texto: "Cada puja queda registrada de forma auditable, de principio a fin.",
  },
  {
    icono: "🛡️",
    titulo: "Defensa en profundidad",
    texto: "El token se valida en el borde y en cada microservicio, no una sola vez.",
  },
];

export function LandingPage() {
  const { isAuthenticated, session } = useAuth();

  // Sin sesión no se llama a la API (evita el 401 esperado por RF-29) — se muestra un CTA a loguearse.
  const cargarDestacadas = useCallback(
    () => (isAuthenticated ? listarSubastas(session?.accessToken) : Promise.resolve([])),
    [isAuthenticated, session?.accessToken]
  );
  const { data: subastas } = useAsync(cargarDestacadas, [isAuthenticated, session?.accessToken]);
  const destacadas = subastas?.slice(0, 3) ?? [];

  return (
    <>
      <section className="landing-hero">
        <span className="hero-eyebrow hero-eyebrow-dark">Subastas en línea, en tiempo real</span>
        <h1 className="landing-hero-title">
          El martillo cae en segundos.
          <br />
          No te lo pierdas.
        </h1>
        <p className="landing-hero-subtitle">
          SubastaLive conecta postores y martilleros verificados en una sola plataforma: pujas en vivo,
          identidad federada y adjudicación transparente, de punta a punta.
        </p>
        <div className="landing-hero-cta">
          <Link to="/subastas" className="btn-lg btn-lg-primary">
            Ver subastas en vivo
          </Link>
          <Link to="/login" className="btn-lg btn-lg-ghost">
            Quiero vender un lote
          </Link>
        </div>
      </section>

      <section className="stats-strip">
        <div className="stat-item">
          <strong>+1.200</strong>
          <span>lotes rematados</span>
        </div>
        <div className="stat-item">
          <strong>24/7</strong>
          <span>pujas en tiempo real</span>
        </div>
        <div className="stat-item">
          <strong>2</strong>
          <span>proveedores de identidad verificados</span>
        </div>
        <div className="stat-item">
          <strong>100%</strong>
          <span>trazabilidad de cada puja</span>
        </div>
      </section>

      <section className="landing-section">
        <h2>Cómo funciona</h2>
        <div className="steps-grid">
          {PASOS.map((paso) => (
            <div className="step-card" key={paso.numero}>
              <span className="step-number" aria-hidden="true">
                {paso.numero}
              </span>
              <h3>{paso.titulo}</h3>
              <p>{paso.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <h2>Categorías</h2>
        <div className="category-grid">
          {CATEGORIAS.map((categoria) => (
            <div className="category-chip" key={categoria.nombre}>
              <span aria-hidden="true">{categoria.icono}</span>
              {categoria.nombre}
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-header">
          <h2>Subastas destacadas</h2>
          <Link to="/subastas" className="card-link">
            Ver todas →
          </Link>
        </div>

        {isAuthenticated && destacadas.length > 0 && (
          <div className="card-grid">
            {destacadas.map((subasta) => (
              <SubastaCard key={subasta.id} subasta={subasta} />
            ))}
          </div>
        )}

        {isAuthenticated && destacadas.length === 0 && (
          <p className="empty-state">No hay subastas publicadas todavía.</p>
        )}

        {!isAuthenticated && (
          <div className="landing-cta-card">
            <p>Inicia sesión para ver el precio vigente y el historial de cada lote en vivo.</p>
            <Link to="/login">Iniciar sesión →</Link>
          </div>
        )}
      </section>

      <section className="landing-section">
        <h2>Por qué SubastaLive</h2>
        <div className="value-grid">
          {VALORES.map((valor) => (
            <div className="value-card" key={valor.titulo}>
              <span className="value-icon" aria-hidden="true">
                {valor.icono}
              </span>
              <h3>{valor.titulo}</h3>
              <p>{valor.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <h2>¿Listo para tu primera puja?</h2>
        <p>Crear una cuenta toma menos de un minuto.</p>
        <Link to="/login" className="btn-lg btn-lg-primary">
          Crear cuenta gratis
        </Link>
      </section>
    </>
  );
}
