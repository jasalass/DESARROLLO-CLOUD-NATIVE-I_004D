import { verificarJwt, extraerRol, extraerSub, extraerTelefono } from '../security/jwt.js';

// Middleware de autenticacion: exige un JWT valido de Cognito o Entra ID (verificado contra su
// JWKS, no solo decodificado), salvo el formato "local:<sub>:<ROL>" reservado para pruebas locales
// (mismo esquema que ya soportaba el stub original y que usa el docker-compose de desarrollo).
export async function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization || '';

  if (authHeader.startsWith('Bearer local:')) {
    const [, sub, rol] = authHeader.substring('Bearer '.length).split(':');
    if (!sub || !rol) {
      return res.status(401).json({ codigo: 'UNAUTHORIZED', mensaje: 'Token local invalido.' });
    }
    req.user = { sub, rol, nombre: null, email: null, telefono: null };
    return next();
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ codigo: 'UNAUTHORIZED', mensaje: 'Token de autenticacion ausente.' });
  }

  const token = authHeader.substring('Bearer '.length).trim();

  try {
    const payload = await verificarJwt(token);
    req.user = {
      sub: extraerSub(payload),
      rol: extraerRol(payload),
      nombre: payload.name || payload.given_name || null,
      email: payload.email || payload.preferred_username || null,
      telefono: extraerTelefono(payload),
    };
    next();
  } catch (error) {
    console.error('Token rechazado:', error.message);
    return res.status(401).json({ codigo: 'UNAUTHORIZED', mensaje: 'Token de autenticacion invalido o expirado.' });
  }
}
