# SubastaLive — Frontend

SPA construida con React + Vite (JavaScript, sin TypeScript). Ofrece una zona pública sin autenticación y dos
entradas de login diferenciadas por rol:

- **Postor** → Amazon Cognito
- **Martillero / Administrador** → Microsoft Entra ID

Ambas usan OAuth 2.0 / OIDC con flujo Authorization Code + PKCE. El token se adjunta automáticamente a las
llamadas al backend a través del API Gateway, que valida ambos emisores con un autorizador Lambda
multi-issuer (ver [`../lambda-authorizer/README.md`](../lambda-authorizer/README.md) y
[`../docs/despliegue-aws.md`](../docs/despliegue-aws.md), sección 9). Los dos flujos de login —Cognito y
Entra ID— están probados de punta a punta, en local y desplegados en AWS: un postor puede pujar y un
martillero puede publicar un lote y programar una subasta, con persistencia real en RDS.

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
├── pages/        Una página por ruta (ver tabla de rutas) — incluye LandingPage (marketing, pública)
│                 y SubastasPage (listado real, requiere sesión)
├── App.jsx       Definición de rutas (react-router-dom)
└── main.jsx      Arranque; levanta MSW antes de renderizar si corresponde
```

## Rutas

| Ruta | Página | Acceso |
|---|---|---|
| `/` | Landing de marketing (hero, cómo funciona, categorías, subastas destacadas) | Público |
| `/subastas` | Listado real de subastas | Requiere sesión (muestra invitación a loguearse si no la hay) |
| `/subastas/:id` | Detalle de subasta (+ puja si eres postor, + cambio de estado si eres martillero/admin) | Requiere sesión (misma invitación) |
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
  **El logout de Cognito es un caso especial:** el Hosted UI no expone el `end_session_endpoint` estándar de
  OIDC, así que `logout()` limpia primero la sesión local de `oidc-client-ts` y recién después redirige a mano
  al endpoint propietario de Cognito (`<dominio>/logout?client_id=...&logout_uri=...`, armado en
  `oidcConfig.js`) — si se limpia la sesión local *después* de redirigir (o no se limpia), la app vuelve a
  mostrar al usuario como autenticado al volver, porque el access token todavía no expiró.

**El backend recibe el `id_token`, no el `access_token`, como Bearer** (`sessionFromOidcUser()` en
`AuthContext.jsx`). No es una elección arbitraria: se probó primero con el `access_token` y falló para los
dos proveedores. El de Cognito no incluye el claim `aud` (usa `client_id` en su lugar, así que cualquier
validación de audiencia lo rechaza). El de Entra ID queda emitido para Microsoft Graph si la aplicación
nunca pidió un scope de API propio, y por lo tanto **no lleva el claim `roles`** — los app roles solo
aparecen en un token cuya audiencia es la aplicación misma. El `id_token` de ambos proveedores sí trae la
audiencia correcta y, en el caso de Entra ID, el rol. Como Cognito tampoco incluye ningún claim de rol en
ningún token, `sessionFromOidcUser()` asume `POSTOR` para toda sesión de Cognito — ese proveedor no se usa
para ningún otro rol en este proyecto (ver `extraerRol()` del lado del backend, que aplica el mismo
criterio en `SecurityConfig` de `ms-catalogo`/`ms-pujas`).

## Sistema de diseño

Un solo archivo, [`src/styles.css`](src/styles.css), define toda la identidad visual mediante variables CSS
(`:root`) — ningún componente usa colores sueltos, siempre referencia un token. Identidad de casa de
subastas de lujo: fondo casi negro cálido con acento dorado (funciona como color de marca y como color
funcional a la vez: enlaces, botones, precios, foco de inputs), tipografía editorial —
[Playfair Display](https://fonts.google.com/specimen/Playfair+Display) (serif) para títulos y precios,
[Outfit](https://fonts.google.com/specimen/Outfit) (sans) para el resto— y esquinas rectas con etiquetas en
mayúsculas de tracking amplio en vez de píldoras redondeadas.

| Token | Uso |
|---|---|
| `--color-bg` / `--color-surface` / `--color-surface-alt` | Fondo de página, tarjetas y paneles — tres tonos casi negros, cálidos |
| `--color-border` | Bordes finos de 1px en vez de sombras suaves — la profundidad se marca con línea, no con luz |
| `--color-gold` (= `--color-primary`) / `--color-gold-dark` / `--color-gold-bg` | Color de marca y funcional a la vez: logo, enlaces, botones, precios, foco de inputs, badge "adjudicada" (`--color-amber` es un alias) |
| `--color-success` / `--color-info` / `--color-danger` | Estados semánticos de las subastas (badges `badge-abierta`, `badge-programada`, etc.) — independientes del dorado para no perder significado |
| `--color-text` / `--color-text-muted` / `--color-text-faint` | Jerarquía tipográfica, de blanco cálido a gris-oliva apagado |
| `--font-display` / `--font-body` | Playfair Display (`h1`-`h3`, precios, valores destacados) y Outfit (todo lo demás) |
| `--radius-*` | Todas en 2px — esquinas rectas deliberadas, no el look "SaaS" de píldoras redondeadas |

Un cambio de paleta futuro es cuestión de editar estos valores una sola vez — nada más en el CSS ni en los
componentes usa colores hardcodeados.

## Variables de entorno

Copiar [`.env.example`](.env.example) a `.env.local` (no se sube al repositorio) y ajustar:

```
VITE_AUTH_MODE=mock          # "mock" o "oidc"
VITE_USE_MOCKS=true          # "false" para hablar con un backend real
VITE_API_BASE_URL=http://localhost:8080

# Solo si VITE_AUTH_MODE=oidc:
VITE_COGNITO_AUTHORITY=
VITE_COGNITO_CLIENT_ID=
VITE_COGNITO_DOMAIN=       # dominio del Hosted UI, con https:// — necesario para el logout real, ver abajo
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
S3+CloudFront — se cambió porque el laboratorio de AWS Academy usado en este proyecto no permite usar
CloudFront en absoluto, ni siquiera con un origen ALB que no necesita Origin Access Control). El `Dockerfile`
de esta carpeta hace el build de Vite en una etapa y sirve el resultado con Nginx —`nginx.conf` incluye el
`try_files` necesario para que las rutas de React Router funcionen al refrescar la página, y sirve `index.html`
con `Cache-Control: no-cache` (para que un deploy nuevo no quede pisado por una copia vieja en el navegador,
mientras que los archivos hasheados bajo `/assets/` sí se cachean agresivo, un año, porque su nombre cambia si
su contenido cambia).

**Cognito exige HTTPS para el callback en cualquier dominio que no sea `localhost`.** Sin dominio propio ni
CloudFront disponibles, el ALB del frontend en AWS usa un **certificado autofirmado** importado a ACM — el
navegador muestra una advertencia que hay que aceptar una vez, pero el login funciona igual. Ver
[`../docs/despliegue-aws.md`](../docs/despliegue-aws.md), sección 8, para los comandos de OpenSSL y los pasos
exactos en la consola.

Como las variables `VITE_*` se incrustan en el bundle en tiempo de build (no son variables de entorno del
contenedor en ejecución), se pasan como `--build-arg` — ver
[`../.github/workflows/deploy-frontend.yml`](../.github/workflows/deploy-frontend.yml). El resto del pipeline,
los prerrequisitos de infraestructura y los Secrets/Variables de GitHub están en la sección "CI/CD" del
[README principal](../README.md#cicd--despliegue-automático-a-aws-github-actions) y en
[`../docs/despliegue-aws.md`](../docs/despliegue-aws.md).

## Dónde está implementado cada punto de la rúbrica (archivo:línea)

La forma de leer esta tabla: cada fila es un sub-requisito de la pauta de presentación (login OIDC, PKCE,
JWT adjunto en cada llamada, restricción por rol), con el archivo y las líneas exactas donde se resuelve —
pensada para abrirla en paralelo mientras se lee el indicador de la rúbrica y verificar el código real, no
una promesa de diseño. Todo lo de la tabla está probado en producción, no solo en local: un postor real
(Cognito) emitiendo una puja y un martillero real (Entra ID) publicando un lote, los dos de punta a punta
contra AWS.

| Qué exige la pauta | Dónde | Qué hace exactamente |
|---|---|---|
| Inicia el flujo de login (botones "Ingresar como...") | [`src/pages/LoginPage.jsx:9-17`](src/pages/LoginPage.jsx#L9-L17) | `handlePostor()`/`handleStaff()` llaman a `loginPostor()`/`loginStaff()` del contexto de auth |
| Flujo OIDC "Authorization Code con PKCE" | [`src/auth/AuthContext.jsx:114-122`](src/auth/AuthContext.jsx#L114-L122) y [`src/auth/oidcConfig.js:5-12`](src/auth/oidcConfig.js#L5-L12) | `loginPostor()`/`loginStaff()` llaman a `signinRedirect()` de `oidc-client-ts`, configurado con `response_type: "code"` — la librería genera el `code_verifier`/`code_challenge` (PKCE) y valida `state` internamente, no hay que armarlo a mano. Confirmado en producción con los dos proveedores |
| Completa el flujo tras volver del IdP y obtiene los tokens | [`src/pages/CallbackPostorPage.jsx:10-18`](src/pages/CallbackPostorPage.jsx#L10-L18), [`src/pages/CallbackStaffPage.jsx:10-18`](src/pages/CallbackStaffPage.jsx#L10-L18) y [`src/auth/AuthContext.jsx:124-138`](src/auth/AuthContext.jsx#L124-L138) | `completarCallbackPostor()`/`completarCallbackStaff()` llaman a `signinRedirectCallback()`, que intercambia el `code` por los tokens (id/access/refresh) |
| Extrae claims del token (rol, nombre, email, sub) | [`src/auth/AuthContext.jsx:51-66`](src/auth/AuthContext.jsx#L51-L66) y [`src/auth/oidcConfig.js:44-46`](src/auth/oidcConfig.js#L44-L46) | `sessionFromOidcUser()` arma la sesión desde `user.profile` y decide qué token mandar al backend (ver "Autenticación" más arriba); `extraerRol()` centraliza de dónde sale el rol (`roles[0]` para Entra ID; Cognito no tiene claim de rol, se asume `POSTOR` por proveedor) |
| Adjunta el JWT a las llamadas al backend | [`src/api/httpClient.js:5-14`](src/api/httpClient.js#L5-L14) | Header `Authorization: Bearer <token>` agregado automáticamente en `request()`, usado por todos los `api/*Api.js` — el token es el `id_token`, no el `access_token` (ver más arriba por qué) |
| Restringe rutas por rol en el frontend | [`src/auth/RequireAuth.jsx:6-26`](src/auth/RequireAuth.jsx#L6-L26) | Redirige a `/login` si no hay sesión; muestra "sin permiso" si el rol no está en la lista permitida de la ruta |
| Logout real (no solo local) | [`src/auth/oidcConfig.js:14-26`](src/auth/oidcConfig.js#L14-L26) y [`src/auth/AuthContext.jsx:140-167`](src/auth/AuthContext.jsx#L140-L167) | Cognito no expone el `end_session_endpoint` estándar de OIDC — `logout()` limpia la sesión local de `oidc-client-ts` y redirige a mano al `/logout` propietario de Cognito (`cognitoLogoutUrl()`) |
| Consume el backend a través del API Manager, con JWT multi-issuer aceptado | [`src/api/config.js`](src/api/config.js) (`VITE_API_BASE_URL` apunta a la Invoke URL del API Gateway, no a un microservicio directo) | El Gateway valida el JWT con un autorizador Lambda (`../lambda-authorizer/`) que acepta Cognito y Entra ID en la misma ruta — probado desde el navegador con los dos roles: un postor emitiendo una puja y un martillero publicando un lote, ambos de punta a punta contra AWS real |
