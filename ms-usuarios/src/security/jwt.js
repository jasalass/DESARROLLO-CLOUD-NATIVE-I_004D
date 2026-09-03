import jwt from 'jsonwebtoken';
import { createPublicKey } from 'node:crypto';
import https from 'node:https';

const ISSUER_COGNITO = process.env.JWT_ISSUER_URI_COGNITO || null;
const ISSUER_ENTRA = process.env.JWT_ISSUER_URI_ENTRA || null;

const PROVEEDORES = [
  ISSUER_COGNITO && { issuer: ISSUER_COGNITO, jwksUri: `${ISSUER_COGNITO}/.well-known/jwks.json` },
  ISSUER_ENTRA && { issuer: ISSUER_ENTRA, jwksUri: `${ISSUER_ENTRA.replace(/\/v2\.0$/, '')}/discovery/v2.0/keys` },
].filter(Boolean);

const cacheJwks = new Map();
const TTL_CACHE_MS = 10 * 60 * 1000;

function obtenerJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

async function obtenerClave(jwksUri, kid) {
  const cacheado = cacheJwks.get(jwksUri);
  const vigente = cacheado && cacheado.expiraEn > Date.now();
  const { keys } = vigente ? cacheado : await obtenerJson(jwksUri);
  if (!vigente) cacheJwks.set(jwksUri, { keys, expiraEn: Date.now() + TTL_CACHE_MS });

  const jwk = keys.find((k) => k.kid === kid);
  return jwk ? createPublicKey({ key: jwk, format: 'jwk' }) : null;
}

// Decide el proveedor por el claim iss, busca su clave publica en el JWKS correspondiente
// y verifica firma + expiracion + issuer. Mismo criterio que el autorizador Lambda del API
// Gateway y que JwtIssuerAuthenticationManagerResolver en ms-pujas/ms-catalogo.
export async function verificarJwt(token) {
  const partes = token.split('.');
  if (partes.length !== 3) throw new Error('Token con formato invalido.');

  const header = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8'));
  const payloadSinVerificar = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));

  const proveedor = PROVEEDORES.find((p) => p.issuer === payloadSinVerificar.iss);
  if (!proveedor) throw new Error(`Issuer no reconocido: ${payloadSinVerificar.iss}`);

  const clave = await obtenerClave(proveedor.jwksUri, header.kid);
  if (!clave) throw new Error(`No se encontro una clave con kid ${header.kid} en el JWKS del issuer.`);

  return jwt.verify(token, clave, { algorithms: ['RS256'], issuer: proveedor.issuer });
}

// Cognito no emite ningun claim de rol para los postores; Entra ID si, en `roles`. Mismo
// criterio que extraerRol() en SecurityConfig.java (ms-pujas/ms-catalogo) y oidcConfig.js (frontend).
export function extraerRol(payload) {
  if (Array.isArray(payload.roles) && payload.roles.length > 0) return payload.roles[0];
  if (payload.iss === ISSUER_COGNITO) return 'POSTOR';
  return null;
}

// El sub de Entra ID es un identificador pairwise (no UUID); se usa oid en su lugar. Mismo
// criterio que resolverIdentificador() en CurrentUser.java (ms-pujas/ms-catalogo).
export function extraerSub(payload) {
  return payload.oid || payload.sub;
}
