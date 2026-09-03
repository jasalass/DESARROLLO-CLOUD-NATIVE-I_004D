import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

import { verificarToken } from './middlewares/auth.js';
import { pool, migrar } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || process.env.PORT || 8081;
const MS_PUJAS_BASE_URL = process.env.MS_PUJAS_BASE_URL || 'http://localhost:8083';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'ms-usuarios' });
});

// GET /usuarios/me - Devuelve (y auto-provisiona) el perfil
app.get('/usuarios/me', verificarToken, async (req, res) => {
  const { sub, rol, nombre, email } = req.user;

  try {
    const existente = await pool.query(
      'SELECT sub, rol, nombre, email, fecha_registro FROM schema_usuarios.usuarios WHERE sub = $1',
      [sub]
    );

    if (existente.rows.length > 0) {
      return res.status(200).json(mapearUsuario(existente.rows[0]));
    }

    const insertado = await pool.query(
      `INSERT INTO schema_usuarios.usuarios (sub, rol, nombre, email)
       VALUES ($1, $2, $3, $4)
       RETURNING sub, rol, nombre, email, fecha_registro`,
      [sub, rol, nombre, email]
    );
    return res.status(201).json(mapearUsuario(insertado.rows[0]));
  } catch (error) {
    console.error('Error consultando/creando el usuario en la base:', error.message);
    return res.status(500).json({ codigo: 'ERROR_INTERNO', mensaje: 'No se pudo obtener el perfil.' });
  }
});

// GET /usuarios/:sub/historial
app.get('/usuarios/:sub/historial', verificarToken, async (req, res) => {
  const requestedSub = req.params.sub;
  const { sub: currentSub, rol: currentRol } = req.user;

  const esPropio = currentSub === requestedSub;
  const esAdministrador = currentRol === 'ADMINISTRADOR';
  if (!esPropio && !esAdministrador) {
    return res.status(403).json({
      codigo: 'FORBIDDEN',
      mensaje: 'No tienes permiso para consultar el historial de otro usuario.',
    });
  }

  const limit = req.query.limit || 20;
  const offset = req.query.offset || 0;

  try {
    const respuesta = await axios.get(`${MS_PUJAS_BASE_URL}/pujas`, {
      params: { usuarioSub: requestedSub, limit, offset },
      headers: { Authorization: req.headers.authorization },
    });

    const pujas = (respuesta.data || []).map((p) => ({
      pujaId: p.id || p.pujaId,
      subastaId: p.subastaId,
      monto: p.monto,
      fecha: p.fecha,
    }));

    return res.status(200).json({ usuarioSub: requestedSub, pujas });
  } catch (error) {
    console.error('No se pudo obtener el historial desde ms-pujas:', error.message);
    return res.status(502).json({
      codigo: 'PUJAS_NO_DISPONIBLE',
      mensaje: 'No se pudo obtener el historial en este momento.',
    });
  }
});

function mapearUsuario(row) {
  return {
    sub: row.sub,
    rol: row.rol,
    nombre: row.nombre,
    email: row.email,
    fechaRegistro: new Date(row.fecha_registro).toISOString(),
  };
}

migrar()
  .catch((err) => console.error('No se pudo verificar/crear el esquema schema_usuarios:', err.message))
  .finally(() => {
    app.listen(PORT, () => console.log(`ms-usuarios escuchando en puerto ${PORT}`));
  });
