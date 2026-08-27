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

export const entraSettings = {
  authority: import.meta.env.VITE_ENTRA_AUTHORITY,
  client_id: import.meta.env.VITE_ENTRA_CLIENT_ID,
  redirect_uri: `${window.location.origin}/auth/callback/staff`,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code",
  scope: "openid profile email",
};

// El nombre exacto del claim de rol dentro del token todavía no está confirmado (depende de cómo se
// configuren los custom attributes en Cognito y los app roles en Entra ID). Se centraliza acá para
// ajustarlo en un solo lugar una vez que se sepa el nombre real.
export function extraerRol(claims) {
  return claims?.["custom:rol"] || claims?.role || claims?.roles?.[0] || null;
}
