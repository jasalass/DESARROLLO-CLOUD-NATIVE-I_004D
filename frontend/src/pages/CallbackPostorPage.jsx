import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

// Solo se usa en modo "oidc": Cognito redirige aquí después del login con el "code" en la URL.
export function CallbackPostorPage() {
  const { completarCallbackPostor } = useAuth();
  const [estado, setEstado] = useState("procesando");

  useEffect(() => {
    completarCallbackPostor()
      .then(() => setEstado("listo"))
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
