import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AUTH_MODE } from "../auth/oidcConfig";

export function LoginPage() {
  const { loginPostor, loginStaff } = useAuth();
  const navigate = useNavigate();

  function handlePostor() {
    loginPostor();
    if (AUTH_MODE === "mock") navigate("/");
  }

  function handleStaff(rolMock) {
    loginStaff(rolMock);
    if (AUTH_MODE === "mock") navigate("/");
  }

  return (
    <section>
      <div className="hero">
        <span className="hero-eyebrow">Bienvenido</span>
        <h1>Ingresar a SubastaLive</h1>
        <p className="hero-subtitle">Elige cómo quieres participar en la plataforma.</p>
      </div>

      {AUTH_MODE === "mock" && (
        <p className="alert alert-info">
          Modo de desarrollo sin proveedores reales (VITE_AUTH_MODE=mock). El login es instantáneo, sin
          redirigir a Cognito ni Entra ID.
        </p>
      )}

      <div className="login-options">
        <div className="card">
          <div className="login-icon" aria-hidden="true">
            🏷️
          </div>
          <h2>Postor</h2>
          <p>Participa en subastas emitiendo pujas.</p>
          <button type="button" onClick={handlePostor}>
            Ingresar como postor
          </button>
        </div>

        <div className="card">
          <div className="login-icon" aria-hidden="true">
            🔨
          </div>
          <h2>Martillero / Administrador</h2>
          <p>Publica lotes, programa subastas y administra la plataforma.</p>
          {AUTH_MODE === "mock" ? (
            <>
              <button type="button" onClick={() => handleStaff("MARTILLERO")}>
                Ingresar como martillero
              </button>
              <button type="button" onClick={() => handleStaff("ADMINISTRADOR")}>
                Ingresar como administrador
              </button>
            </>
          ) : (
            <button type="button" onClick={() => handleStaff()}>
              Ingresar como martillero / administrador
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
