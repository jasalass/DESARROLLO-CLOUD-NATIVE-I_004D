# SubastaLive — Frontend

SPA construida con React + Vite. Ofrece una zona pública sin autenticación y dos entradas de login diferenciadas por rol:

- **Postor** → Amazon Cognito
- **Martillero / Administrador** → Microsoft Entra ID

Ambas usan OAuth 2.0 / OIDC con flujo Authorization Code + PKCE. El token se adjunta automáticamente a las llamadas al backend a través del API Gateway.

## Desarrollo local

```bash
npm install
npm run dev
```

## Variables de entorno

Crear un `.env.local` (no se sube al repositorio) con, al menos:

```
VITE_API_BASE_URL=
VITE_COGNITO_AUTHORITY=
VITE_COGNITO_CLIENT_ID=
VITE_ENTRA_AUTHORITY=
VITE_ENTRA_CLIENT_ID=
```
