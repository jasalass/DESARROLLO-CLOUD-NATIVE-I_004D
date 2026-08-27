import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { UserManager } from "oidc-client-ts";
import { AUTH_MODE, cognitoSettings, entraSettings, extraerRol } from "./oidcConfig";

const AuthContext = createContext(null);

const MOCK_SESSION_KEY = "subastalive.mockSession";

const MOCK_USERS = {
  POSTOR: {
    role: "POSTOR",
    sub: "mock-postor-0000-0000-0000-000000000001",
    nombre: "Postor de Prueba",
    email: "postor@example.com",
    accessToken: "mock-access-token-postor",
  },
  MARTILLERO: {
    role: "MARTILLERO",
    sub: "mock-martillero-0000-0000-000000000001",
    nombre: "Martillero de Prueba",
    email: "martillero@example.com",
    accessToken: "mock-access-token-martillero",
  },
  ADMINISTRADOR: {
    role: "ADMINISTRADOR",
    sub: "mock-admin-0000-0000-0000-000000000001",
    nombre: "Administrador de Prueba",
    email: "admin@example.com",
    accessToken: "mock-access-token-admin",
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

  function logout() {
    if (AUTH_MODE === "mock") {
      localStorage.removeItem(MOCK_SESSION_KEY);
      setSession(null);
      setStatus("anonymous");
      return;
    }
    getCognitoUserManager().removeUser();
    getEntraUserManager().removeUser();
    setSession(null);
    setStatus("anonymous");
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
