import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { obtenerMiPerfil } from "../api/usuariosApi";

// Solo se usa en modo "oidc": Cognito redirige aquí después del login con el "code" en la URL.
export function CallbackPostorPage() {
  const { completarCallbackPostor } = useAuth();
  const [estado, setEstado] = useState("procesando");

  useEffect(() => {
    completarCallbackPostor()
      .then((sesion) => {
        // Registrarse en Cognito no crea nada en la base de ms-usuarios — GET /usuarios/me es lo que
        // provisiona el perfil (es idempotente, así que llamarlo acá no duplica nada si el usuario
        // ya existía). Se dispara sin bloquear la redirección: si falla, PerfilPage.jsx lo reintenta
        // igual la primera vez que el usuario entra a "Mi perfil".
        obtenerMiPerfil(sesion.accessToken).catch((error) => {
          console.error("No se pudo provisionar el perfil en ms-usuarios:", error);
        });
        setEstado("listo");
      })
      .catch((error) => {
        console.error("Error completando el login de Cognito:", error);
        setEstado("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (estado === "listo") return <Navigate to="/subastas" replace />;
  if (estado === "error") return <p className="alert alert-error">No se pudo completar el inicio de sesión.</p>;
  return <p>Completando inicio de sesión…</p>;
}
