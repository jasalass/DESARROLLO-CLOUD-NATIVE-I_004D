# SubastaLive — Frontend

SPA construida con React + Vite (JavaScript, sin TypeScript). Ofrece una zona pública sin autenticación y dos
entradas de login diferenciadas por rol:

- **Postor** → Amazon Cognito
- **Martillero / Administrador** → Microsoft Entra ID

Ambas usan OAuth 2.0 / OIDC con flujo Authorization Code + PKCE. El token se adjunta automáticamente a las
llamadas al backend a través del API Gateway. Diseño únicamente funcional por ahora — sin trabajo visual
todavía.

## Desarrollo local

```bash
npm install
npm run dev
```

Por defecto la app corre en **modo mock**: no necesita ningún backend, IdP ni variable de entorno para
funcionar. El login es instantáneo (sin redirigir a ningún IdP real) y todos los datos (subastas, lotes,
pujas, perfil) los sirve [MSW](https://mswjs.io/) desde `src/mocks/`, con la misma forma JSON exacta
documentada en los README de `ms-usuarios`, `ms-catalogo` y `ms-pujas`. Es la forma de probar toda la app —
rutas, roles, formularios — sin esperar a que esos backends existan.

## Estructura

```
src/
├── api/          Clientes HTTP hacia cada microservicio (un archivo por servicio, calcado del contrato)
├── auth/         AuthContext (dual mock/oidc), config de Cognito/Entra ID, guard de rutas por rol
├── components/   Navbar, tarjeta de subasta, formulario de puja
├── hooks/        useAsync — fetch con estado loading/error
├── mocks/        Handlers y datos de ejemplo para MSW (ver más abajo)
├── pages/        Una página por ruta (ver tabla de rutas)
├── App.jsx       Definición de rutas (react-router-dom)
└── main.jsx      Arranque; levanta MSW antes de renderizar si corresponde
```

## Rutas

| Ruta | Página | Acceso |
|---|---|---|
| `/` | Listado de subastas | Público |
| `/subastas/:id` | Detalle de subasta (+ puja si eres postor, + cambio de estado si eres martillero/admin) | Público |
| `/login` | Elegir cómo ingresar | Público |
| `/auth/callback/postor`, `/auth/callback/staff` | Callbacks de OIDC | Internas (redirect de los IdP) |
| `/perfil` | Mi perfil (`GET /usuarios/me`) | Cualquier rol autenticado |
| `/historial` | Mi historial de pujas | Solo POSTOR |
| `/martillero/lotes/nuevo` | Crear lote | MARTILLERO, ADMINISTRADOR |
| `/martillero/subastas/nueva` | Programar subasta (recibe `?loteId=` opcional) | MARTILLERO, ADMINISTRADOR |

## Autenticación: dos modos, misma interfaz (`useAuth()`)

`VITE_AUTH_MODE` controla el modo; el resto de la app (páginas, `RequireAuth`) no sabe ni le importa cuál está
activo — ambos exponen el mismo `AuthContext` (`session`, `role`, `loginPostor()`, `loginStaff()`, `logout()`).

- **`mock`** (default): `loginPostor()`/`loginStaff()` crean una sesión falsa al instante (guardada en
  `localStorage`), sin red ni redirect. En la página de login, "martillero" y "administrador" son botones
  separados (para poder probar ambos roles), a diferencia del modo real donde ambos comparten el mismo botón
  porque el rol lo decide el token de Entra ID, no el usuario.
- **`oidc`**: usa `oidc-client-ts` con **dos `UserManager` independientes**, uno por proveedor, porque Cognito
  y Entra ID son dos issuers distintos con distintas apps registradas. `loginPostor()`/`loginStaff()` hacen
  `signinRedirect()`; las páginas `/auth/callback/*` completan el flujo con `signinRedirectCallback()`.

**Pendiente de confirmar una vez existan los recursos reales:** el nombre exacto del claim de rol dentro del
token (Cognito custom attribute vs. Entra ID app role) — está centralizado en `src/auth/oidcConfig.js`
(`extraerRol`), es el único lugar que hay que tocar cuando se sepa.

## Variables de entorno

Copiar [`.env.example`](.env.example) a `.env.local` (no se sube al repositorio) y ajustar:

```
VITE_AUTH_MODE=mock          # "mock" o "oidc"
VITE_USE_MOCKS=true          # "false" para hablar con un backend real
VITE_API_BASE_URL=http://localhost:8080

# Solo si VITE_AUTH_MODE=oidc:
VITE_COGNITO_AUTHORITY=
VITE_COGNITO_CLIENT_ID=
VITE_ENTRA_AUTHORITY=
VITE_ENTRA_CLIENT_ID=
```

## Probar contra un backend real

Cuando `ms-usuarios`, `ms-catalogo` o `ms-pujas` ya existan (aunque sea uno solo, no hace falta que estén los
tres): poner `VITE_USE_MOCKS=false` y `VITE_API_BASE_URL` apuntando al backend (directo al servicio en local,
o al API Gateway en un entorno desplegado). Las llamadas que no tengan backend real detrás simplemente
fallarán con error de red — no hace falta apagar el mock "a medias", cada `api/*Api.js` llama a rutas
absolutas sobre `VITE_API_BASE_URL`.

## Despliegue

Se despliega como **contenedor en ECS/Fargate**, igual que los tres microservicios (no como sitio estático en
S3+CloudFront — se cambió porque el laboratorio de AWS Academy usado en este proyecto no permite crear Origin
Access Control de CloudFront). El `Dockerfile` de esta carpeta hace el build de Vite en una etapa y sirve el
resultado con Nginx (`nginx.conf` incluye el `try_files` necesario para que las rutas de React Router
funcionen al refrescar la página).

Como las variables `VITE_*` se incrustan en el bundle en tiempo de build (no son variables de entorno del
contenedor en ejecución), se pasan como `--build-arg` — ver
[`../.github/workflows/deploy-frontend.yml`](../.github/workflows/deploy-frontend.yml). El resto del pipeline,
los prerrequisitos de infraestructura y los Secrets/Variables de GitHub están en la sección "CI/CD" del
[README principal](../README.md#cicd--despliegue-automático-a-aws-github-actions) y en
[`../docs/despliegue-aws.md`](../docs/despliegue-aws.md).
