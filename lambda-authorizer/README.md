# lambda-authorizer

Autorizador Lambda multi-issuer para el API Gateway (`subastalive-api`), que reemplaza al
autorizador JWT nativo de Cognito en la ruta `ANY /{proxy+}`.

## Por qué existe

Un autorizador JWT nativo de API Gateway HTTP API valida contra **un solo issuer**, y cada ruta
solo puede tener **un autorizador**. Como las rutas del contrato (`/subastas`, `/lotes`, etc.) son
compartidas entre postores (Cognito) y martillero/administrador (Entra ID), no alcanza con el
autorizador nativo — ver `docs/despliegue-aws.md`, sección "Autorizador JWT", y la sección 5.6 del
plan de proyecto para la decisión de diseño completa.

Esta Lambda cuenta como "un solo autorizador" a los ojos de API Gateway (cumple el límite de la
ruta), pero por dentro decide contra cuál de los dos proveedores validar el token, mirando el
claim `iss`.

## Qué valida

1. Que el header `Authorization` sea `Bearer <jwt>`.
2. Que el `iss` del token coincida con Cognito o con Entra ID (issuers conocidos por variable de
   entorno).
3. `exp` (no vencido) y `nbf` (ya vigente).
4. `aud` contra el Client ID esperado de ese proveedor.
5. La firma RS256 contra el JWKS público del proveedor correspondiente (con caché en memoria
   mientras el contenedor de Lambda siga tibio).

No valida rol ni pertenencia — eso lo sigue resolviendo cada microservicio (RF-30, defensa en
profundidad, ver sección 5.6 del plan). Esta Lambda solo responde la pregunta "¿es un JWT legítimo
de alguno de los dos proveedores?".

## Variables de entorno

| Variable | Valor | De dónde sale |
|---|---|---|
| `COGNITO_ISSUER` | `https://cognito-idp.<región>.amazonaws.com/<User-pool-ID>` | Mismo valor que `JWT_ISSUER_URI_COGNITO` en las Task Definitions de `ms-catalogo`/`ms-pujas` |
| `COGNITO_CLIENT_ID` | el Client ID de la app `subastalive-frontend` en Cognito | Cognito → tu user pool → App integration → tu app client |
| `ENTRA_ISSUER` | `https://login.microsoftonline.com/<Tenant-ID>/v2.0` | Mismo valor que `JWT_ISSUER_URI_ENTRA` |
| `ENTRA_CLIENT_ID` | el Application (client) ID de la app registrada en Entra ID | Entra ID → App registrations → tu app |

## Cómo desplegarla (consola, sin pipeline todavía)

1. **Lambda → Create function** → Author from scratch. Nombre: `subastalive-jwt-authorizer`.
   Runtime: **Node.js 20.x**. Rol de ejecución: usa el rol existente `LabRole` (igual que el resto
   de los recursos del laboratorio).
2. Pegá el contenido de `index.js` en el editor de código inline (**Code → Code source**) —
   reemplazá el `index.mjs` de ejemplo. **Deploy**.
3. **Configuration → Environment variables** → cargá las 4 variables de la tabla de arriba.
4. **API Gateway → `subastalive-api` → Autorizadores → Crear**:
   - Tipo: **Lambda**.
   - Función: `subastalive-jwt-authorizer`.
   - Origen de identidad: `$request.header.Authorization`.
   - **Formato de carga útil del autorizador**: `2.0`.
   - **Simple responses**: activado (para que alcance con `{ isAuthorized: true/false }`).
5. **Rutas → `ANY /{proxy+}` → Autorización** → reemplazá el autorizador de Cognito por este nuevo.
   No toques la ruta `OPTIONS /{proxy+}` (esa sigue sin autorizador, es la del preflight CORS).
6. Con auto-deploy activado en el stage `$default`, no hace falta re-implementar.

## Prueba

```bash
# Token de postor (Cognito) -> 200/401 según el recurso, pero pasa el autorizador
curl https://<invoke-url>/subastas -H "Authorization: Bearer <id_token-de-Cognito>"

# Token de martillero (Entra ID) -> antes daba 401 en el autorizador; ahora debería pasar
curl https://<invoke-url>/subastas -H "Authorization: Bearer <id_token-de-Entra-ID>"

# Sin token, o con uno inventado -> sigue dando 401
curl https://<invoke-url>/subastas
```
