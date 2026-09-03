import pkg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'subastalive',
  password: process.env.DB_PASSWORD || 'subastalive',
  database: process.env.DB_NAME || 'subastalive',
  max: parseInt(process.env.DB_POOL_MAX_SIZE || '5', 10),
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err.message);
});

// No hay Flyway en Node: se aplica el mismo V1__init.sql que usan ms-pujas/ms-catalogo a mano en
// cada arranque. CREATE SCHEMA/TABLE IF NOT EXISTS lo vuelve seguro de repetir.
export async function migrar() {
  const sql = fs.readFileSync(path.join(__dirname, 'db', 'V1__init.sql'), 'utf8');
  await pool.query(sql);
  console.log('Esquema schema_usuarios verificado.');
}
