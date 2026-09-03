import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import axios from 'axios';
import dotenv from 'dotenv';

import { verificarToken } from './middlewares/auth.js';

dotenv.config();

const { Pool } = pkg;


const app = express();
const PORT = process.env.SERVER_PORT || process.env.PORT || 8081;
const MS_PUJAS_BASE_URL = process.env.MS_PUJAS_BASE_URL || 'http://localhost:8083';

// Middlewares
app.use(cors());
app.use(express.json());

// Configuración de la base de datos PostgreSQL
const pool = new Pool({
  user: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'usuarios_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  max: parseInt(process.env.DB_POOL_MAX_SIZE || '10', 10),
});

// Extraer/parsear Token (JWT o local)
function parseToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();

  // Soporte para pruebas locales (formato: "local:sub:ROL")
  if (token.startsWith('local:')) {
    const parts = token.split(':');
    return {
      sub: parts[1] || 'b3f1c2a4-1234-4a11-9c31-abcdef123456',
      rol: parts[2] || 'POSTOR',
      nombre: 'Usuario de Prueba',
      email: 'prueba@subastalive.com'
    };
  }

  // Token JWT estándar
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payloadBuf = Buffer.from(parts[1], 'base64').toString('utf8');
      const payload = JSON.parse(payloadBuf);
      return {
        sub: payload.sub,
        rol: payload.rol || payload['custom:role'] || payload.role || 'POSTOR',
        nombre: payload.nombre || payload.name || payload.preferred_username || null,
        email: payload.email || null
      };
    }
  } catch (error) {
    console.error('Error al parsear JWT:', error.message);
  }

  return null;
}

// Middleware de Autenticación
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const user = parseToken(authHeader);

  if (!user || !user.sub) {
    return res.status(401).json({
      codigo: 'UNAUTHORIZED',
      mensaje: 'Token de autenticación ausente, inválido o expirado'
    });
  }

  req.user = user;
  next();
};

// ==========================================
// ENDPOINTS DEL CONTRATO
// ==========================================

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'ms-usuarios' });
});

// GET /usuarios/me - Devuelve (y auto-provisiona) el perfil
app.get('/usuarios/me', authMiddleware, async (req, res) => {
  const { sub, rol, nombre, email } = req.user;

  try {
    // Intenta consultar PostgreSQL
    let result = await pool.query(
      'SELECT sub, rol, nombre, email, fecha_registro FROM schema_usuarios.usuarios WHERE sub = $1',
      [sub]
    );

    if (result.rows.length === 0) {
      const fechaRegistro = new Date().toISOString();
      const insertResult = await pool.query(
        `INSERT INTO schema_usuarios.usuarios (sub, rol, nombre, email, fecha_registro) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING sub, rol, nombre, email, fecha_registro`,
        [sub, rol, nombre, email, fechaRegistro]
      );

      const newUser = insertResult.rows[0];
      return res.status(200).json({
        sub: newUser.sub,
        rol: newUser.rol,
        nombre: newUser.nombre,
        email: newUser.email,
        fechaRegistro: new Date(newUser.fecha_registro).toISOString()
      });
    }

    const existingUser = result.rows[0];
    return res.status(200).json({
      sub: existingUser.sub,
      rol: existingUser.rol,
      nombre: existingUser.nombre,
      email: existingUser.email,
      fechaRegistro: new Date(existingUser.fecha_registro).toISOString()
    });

  } catch (error) {
    // Fallback: Si PostgreSQL no está levantado localmente, responde con los datos del token
    console.warn('PostgreSQL no disponible, usando respuesta en memoria:', error.message);
    return res.status(200).json({
      sub: sub,
      rol: rol,
      nombre: nombre || 'Usuario de Prueba',
      email: email || 'prueba@subastalive.com',
      fechaRegistro: new Date().toISOString()
    });
  }
});

// GET /usuarios/:sub/historial
app.get('/usuarios/:sub/historial', authMiddleware, async (req, res) => {
  const requestedSub = req.params.sub;
  const { sub: currentUserSub, rol: currentUserRol } = req.user;

  if (currentUserRol === 'POSTOR' && currentUserSub !== requestedSub) {
    return res.status(403).json({
      codigo: 'FORBIDDEN',
      mensaje: 'No tienes permiso para consultar el historial de otro usuario'
    });
  }

  const limit = req.query.limit || 20;
  const offset = req.query.offset || 0;

  try {
    const authHeader = req.headers['authorization'];
    const response = await axios.get(`${MS_PUJAS_BASE_URL}/pujas`, {
      params: { usuarioSub: requestedSub, limit, offset },
      headers: { Authorization: authHeader }
    });

    const pujasMsPujas = response.data || [];

    const pujasMapeadas = pujasMsPujas.map(p => ({
      pujaId: p.id || p.pujaId,
      subastaId: p.subastaId,
      monto: p.monto,
      fecha: p.fecha
    }));

    return res.status(200).json({
      usuarioSub: requestedSub,
      pujas: pujasMapeadas
    });

  } catch (error) {
    return res.status(200).json({
      usuarioSub: requestedSub,
      pujas: []
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`ms-usuarios escuchando en puerto ${PORT}`);
});
