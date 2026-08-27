import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Navbar() {
  const { isAuthenticated, role, session, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        SubastaLive
      </Link>

      <div className="navbar-links">
        <Link to="/">Subastas</Link>

        {!isAuthenticated && <Link to="/login">Ingresar</Link>}

        {isAuthenticated && (
          <>
            <Link to="/perfil">Mi perfil</Link>
            {role === "POSTOR" && <Link to="/historial">Mi historial</Link>}
            {(role === "MARTILLERO" || role === "ADMINISTRADOR") && (
              <>
                <Link to="/martillero/lotes/nuevo">Crear lote</Link>
                <Link to="/martillero/subastas/nueva">Programar subasta</Link>
              </>
            )}
            <span className="navbar-user">
              {session?.nombre} ({role})
            </span>
            <button type="button" onClick={handleLogout}>
              Salir
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
