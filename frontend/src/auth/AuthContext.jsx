import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { UserManager } from "oidc-client-ts";
import { AUTH_MODE, cognitoSettings, entraSettings, extraerRol, cognitoLogoutUrl } from "./oidcConfig";

const AuthContext = createContext(null);

const MOCK_SESSION_KEY = "subastalive.mockSession";

// El sub debe ser un UUID válido de verdad: en modo local, el backend real (ms-pujas) lo parsea como
// UUID (matching schema_pujas.pujas.usuario_sub) — un string tipo "mock-postor-..." rompería ahí.
// El accessToken sigue el formato "local:<sub>:<ROL>" que entiende LocalTokenAuthFilter en ms-pujas
// cuando corre con el perfil "local" (ver docker-compose.yml) — no es un JWT real, es solo para pruebas.
const MOCK_USERS = {
  POSTOR: {
    role: "POSTOR",
    sub: "b3f1c2a4-0000-4000-8000-000000000001",
    nombre: "Postor de Prueba",
    email: "postor@example.com",
    accessToken: "local:b3f1c2a4-0000-4000-8000-000000000001:POSTOR",
  },
  MARTILLERO: {
    role: "MARTILLERO",
    sub: "d81fa021-0000-4000-8000-000000000001",
    nombre: "Martillero de Prueba",
    email: "martillero@example.com",
    accessToken: "local:d81fa021-0000-4000-8000-000000000001:MARTILLERO",
  },
  ADMINISTRADOR: {
    role: "ADMINISTRADOR",
    sub: "e5f2b132-0000-4000-8000-000000000001",
    nombre: "Administrador de Prueba",
    email: "admin@example.com",
    accessToken: "local:e5f2b132-0000-4000-8000-000000000001:ADMINISTRADOR",
  },
};

// UserManagers de oidc-client-ts se crean una sola vez, uno por proveedor. Solo se usan en modo "oidc".
let cognitoUserManager = null;
let entraUserManager = null;

function getCognitoUserManager() {
  if (!cognitoUserManager) cognitoUserManager = new UserManager(cognitoSettings);
  return cognitoUserManager;
}

function getEntraUserManager() {
  if (!entraUserManager) entraUserManager = new UserManager(entraSettings);
  return entraUserManager;
}

function sessionFromOidcUser(user, providerRoleHint) {
  const claims = user.profile || {};
  return {
    role: extraerRol(claims) || providerRoleHint || null,
    sub: claims.sub,
    nombre: claims.name || claims.given_name || null,
    email: claims.email || null,
    accessToken: user.access_token,
  };
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState("loading");
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (AUTH_MODE === "mock") {
      const stored = localStorage.getItem(MOCK_SESSION_KEY);
      if (stored) {
        setSession(JSON.parse(stored));
        setStatus("authenticated");
      } else {
        setStatus("anonymous");
      }
      return;
    }

    // Modo oidc: revisa si ya hay una sesión activa en cualquiera de los dos proveedores.
    Promise.all([getCognitoUserManager().getUser(), getEntraUserManager().getUser()])
      .then(([cognitoUser, entraUser]) => {
        if (cognitoUser && !cognitoUser.expired) {
          setSession(sessionFromOidcUser(cognitoUser, "POSTOR"));
          setStatus("authenticated");
        } else if (entraUser && !entraUser.expired) {
          setSession(sessionFromOidcUser(entraUser, null));
          setStatus("authenticated");
        } else {
          setStatus("anonymous");
        }
      })
      .catch(() => setStatus("anonymous"));
  }, []);

  function loginPostorMock() {
    const nuevaSesion = MOCK_USERS.POSTOR;
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(nuevaSesion));
    setSession(nuevaSesion);
    setStatus("authenticated");
  }

  function loginStaffMock(rol) {
    const nuevaSesion = MOCK_USERS[rol] || MOCK_USERS.MARTILLERO;
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(nuevaSesion));
    setSession(nuevaSesion);
    setStatus("authenticated");
  }

  function loginPostor() {
    if (AUTH_MODE === "mock") return loginPostorMock();
    return getCognitoUserManager().signinRedirect();
  }

  function loginStaff(rolMock) {
    if (AUTH_MODE === "mock") return loginStaffMock(rolMock);
    return getEntraUserManager().signinRedirect();
  }

  async function completarCallbackPostor() {
    const user = await getCognitoUserManager().signinRedirectCallback();
    const nuevaSesion = sessionFromOidcUser(user, "POSTOR");
    setSession(nuevaSesion);
    setStatus("authenticated");
    return nuevaSesion;
  }

  async function completarCallbackStaff() {
    const user = await getEntraUserManager().signinRedirectCallback();
    const nuevaSesion = sessionFromOidcUser(user, null);
    setSession(nuevaSesion);
    setStatus("authenticated");
    return nuevaSesion;
  }

  async function logout() {
    if (AUTH_MODE === "mock") {
      localStorage.removeItem(MOCK_SESSION_KEY);
      setSession(null);
      setStatus("anonymous");
      return;
    }

    const rolActual = session?.role;
    setSession(null);
    setStatus("anonymous");
    await getEntraUserManager().removeUser();

    if (rolActual === "POSTOR") {
      // Limpia también la sesión local de oidc-client-ts ANTES de redirigir — si no, al volver de
      // Cognito la app encuentra el usuario guardado en storage (con el access token todavía
      // vigente, dura 60 minutos) y lo sigue tratando como autenticado, aunque Cognito ya haya
      // cerrado la sesión del lado servidor.
      await getCognitoUserManager().removeUser();
      window.location.href = cognitoLogoutUrl();
      return;
    }

    await getCognitoUserManager().removeUser();
  }

  const value = useMemo(
    () => ({
      status,
      session,
      isAuthenticated: status === "authenticated",
      role: session?.role ?? null,
      loginPostor,
      loginStaff,
      completarCallbackPostor,
      completarCallbackStaff,
      logout,
    }),
    [status, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return context;
}
