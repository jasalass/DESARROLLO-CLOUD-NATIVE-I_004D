import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { obtenerMiPerfil } from "../api/usuariosApi";

// Solo se usa en modo "oidc": Entra ID redirige aquí después del login con el "code" en la URL.
export function CallbackStaffPage() {
  const { completarCallbackStaff } = useAuth();
  const [estado, setEstado] = useState("procesando");

  useEffect(() => {
    completarCallbackStaff()
      .then((sesion) => {
        // Mismo criterio que CallbackPostorPage.jsx: provisiona el perfil en ms-usuarios desde el
        // primer login (martillero o administrador), sin bloquear la redirección si falla.
        obtenerMiPerfil(sesion.accessToken).catch((error) => {
          console.error("No se pudo provisionar el perfil en ms-usuarios:", error);
        });
        setEstado("listo");
      })
      .catch((error) => {
        console.error("Error completando el login de Entra ID:", error);
        setEstado("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (estado === "listo") return <Navigate to="/subastas" replace />;
  if (estado === "error") return <p className="alert alert-error">No se pudo completar el inicio de sesión.</p>;
  return <p>Completando inicio de sesión…</p>;
}
