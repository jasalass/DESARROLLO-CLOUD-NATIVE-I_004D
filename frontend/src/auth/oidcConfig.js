// "mock": login instantáneo sin IdP real, para desarrollar y probar la app hoy mismo.
// "oidc": Authorization Code + PKCE real contra Cognito / Entra ID (una vez existan esos recursos en AWS/Azure).
export const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || "mock";

export const cognitoSettings = {
  authority: import.meta.env.VITE_COGNITO_AUTHORITY,
  client_id: import.meta.env.VITE_COGNITO_CLIENT_ID,
  redirect_uri: `${window.location.origin}/auth/callback/postor`,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code",
  scope: "openid profile email",
};

// El Hosted UI de Cognito no implementa el "end_session_endpoint" estándar de OIDC — mantiene su
// propia sesión de SSO en su dominio, separada de la del navegador con la app. Sin este logout
// explícito contra /logout, cerrar sesión en la app no cierra la sesión en Cognito, y un login
// posterior vuelve a entrar solo (sin pedir credenciales) porque el IdP todavía te reconoce.
export const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;

export function cognitoLogoutUrl() {
  const params = new URLSearchParams({
    client_id: cognitoSettings.client_id,
    logout_uri: cognitoSettings.post_logout_redirect_uri,
  });
  return `${cognitoDomain}/logout?${params.toString()}`;
}

export const entraSettings = {
  authority: import.meta.env.VITE_ENTRA_AUTHORITY,
  client_id: import.meta.env.VITE_ENTRA_CLIENT_ID,
  redirect_uri: `${window.location.origin}/auth/callback/staff`,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code",
  scope: "openid profile email",
  // Sin esto, Microsoft reingresa solo con la cuenta que ya tenga sesión activa en el navegador (SSO),
  // sin dejar elegir otra — un problema real para probar distintos roles (martillero/admin) en la misma
  // sesión de navegador que usas para administrar el propio tenant de Azure.
  extraQueryParams: { prompt: "select_account" },
};

// El nombre exacto del claim de rol dentro del token todavía no está confirmado (depende de cómo se
// configuren los custom attributes en Cognito y los app roles en Entra ID). Se centraliza acá para
// ajustarlo en un solo lugar una vez que se sepa el nombre real.
export function extraerRol(claims) {
  return claims?.["custom:rol"] || claims?.role || claims?.roles?.[0] || null;
}
