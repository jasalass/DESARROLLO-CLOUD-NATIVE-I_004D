// Autorizador Lambda (HTTP API, formato de respuesta simple) que valida JWT de dos issuers
// distintos — Amazon Cognito (postores) y Microsoft Entra ID (martillero/administrador) — en la
// misma ruta compartida. Un autorizador JWT nativo de API Gateway solo admite un issuer por ruta
// (ver README principal y docs/despliegue-aws.md, seccion "Autorizador JWT"); esta Lambda cuenta
// como "un solo autorizador" para el limite de la ruta, pero por dentro decide contra cual de los
// dos proveedores validar segun el claim `iss` del token.
//
// Sin dependencias externas a proposito: usa solo los modulos nativos `crypto` y `https` de Node,
// para poder pegar este archivo directo en el editor inline de la consola de Lambda, sin zip ni
// node_modules.
//
// Variables de entorno esperadas (ver README de esta carpeta):
//   COGNITO_ISSUER, COGNITO_CLIENT_ID
//   ENTRA_ISSUER, ENTRA_CLIENT_ID

const https = require("https");
const crypto = require("crypto");

const ISSUERS = [
  {
    issuer: process.env.COGNITO_ISSUER,
    jwksUri: `${process.env.COGNITO_ISSUER}/.well-known/jwks.json`,
    audience: process.env.COGNITO_CLIENT_ID,
  },
  {
    issuer: process.env.ENTRA_ISSUER,
    jwksUri: `${(process.env.ENTRA_ISSUER || "").replace(/\/v2\.0$/, "")}/discovery/v2.0/keys`,
    audience: process.env.ENTRA_CLIENT_ID,
  },
];

// Cache en memoria del contenedor de Lambda (se reutiliza mientras el contenedor siga tibio) para
// no pedir el JWKS de cada proveedor en cada invocacion.
const jwksCache = new Map();

function base64UrlDecode(value) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

async function getSigningKey(jwksUri, kid) {
  const cached = jwksCache.get(jwksUri);
  const vigente = cached && cached.expiresAt > Date.now();
  const { keys } = vigente ? cached : await fetchJson(jwksUri);
  if (!vigente) {
    jwksCache.set(jwksUri, { keys, expiresAt: Date.now() + 10 * 60 * 1000 });
  }
  return keys.find((key) => key.kid === kid);
}

function verificarFirma(headerB64, payloadB64, signatureB64, jwk) {
  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const datosFirmados = Buffer.from(`${headerB64}.${payloadB64}`);
  const firma = base64UrlDecode(signatureB64);
  return crypto.verify("RSA-SHA256", datosFirmados, publicKey, firma);
}

exports.handler = async (event) => {
  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return { isAuthorized: false };
    }

    const token = authHeader.slice("Bearer ".length);
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) {
      return { isAuthorized: false };
    }

    const header = JSON.parse(base64UrlDecode(headerB64));
    const payload = JSON.parse(base64UrlDecode(payloadB64));

    const proveedor = ISSUERS.find((p) => p.issuer && p.issuer === payload.iss);
    if (!proveedor) {
      console.warn("Issuer no reconocido:", payload.iss);
      return { isAuthorized: false };
    }

    const ahora = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < ahora) {
      return { isAuthorized: false };
    }
    if (payload.nbf && payload.nbf > ahora) {
      return { isAuthorized: false };
    }
    if (proveedor.audience && payload.aud !== proveedor.audience) {
      console.warn("Audience no coincide para issuer", proveedor.issuer);
      return { isAuthorized: false };
    }

    const jwk = await getSigningKey(proveedor.jwksUri, header.kid);
    if (!jwk) {
      console.warn("No se encontro una clave con kid", header.kid, "en", proveedor.jwksUri);
      return { isAuthorized: false };
    }

    const firmaValida = verificarFirma(headerB64, payloadB64, signatureB64, jwk);
    return { isAuthorized: firmaValida };
  } catch (err) {
    console.error("Error validando el token", err);
    return { isAuthorized: false };
  }
};
