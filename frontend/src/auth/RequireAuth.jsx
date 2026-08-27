import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

// roles: lista opcional de roles permitidos (ej. ["MARTILLERO", "ADMINISTRADOR"]).
// Si se omite, solo exige estar autenticado (cualquier rol).
export function RequireAuth({ roles, children }) {
  const { status, isAuthenticated, role } = useAuth();

  if (status === "loading") {
    return <p>Cargando sesión…</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(role)) {
    return (
      <div className="alert alert-error">
        No tienes permiso para ver esta página (rol requerido: {roles.join(" o ")}).
      </div>
    );
  }

  return children;
}
