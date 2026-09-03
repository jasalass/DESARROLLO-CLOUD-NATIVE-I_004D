// src/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Creamos un "pool" de conexiones reutilizables a la base de datos
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'db_usuarios',
});

// Evento para verificar si hubo error en la conexión en segundo plano
pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de PostgreSQL:', err);
});

module.exports = pool;