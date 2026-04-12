/**
 * Crea la base de datos avarunners en PostgreSQL si no existe.
 * Usa DATABASE_URL del .env (conecta a "postgres" para crear avarunners).
 */
require('dotenv').config();
const { Client } = require('pg');

const url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/avarunners';
const dbName = 'avarunners';

// Conectar a la BD por defecto "postgres" para poder crear avarunners
function getPostgresUrl() {
  try {
    const u = new URL(url);
    u.pathname = '/postgres';
    return u.toString();
  } catch {
    return 'postgresql://postgres:postgres@localhost:5432/postgres';
  }
}

async function main() {
  const client = new Client({ connectionString: getPostgresUrl() });
  try {
    await client.connect();
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    if (res.rows.length === 0) {
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Base de datos "${dbName}" creada.`);
    } else {
      console.log(`Base de datos "${dbName}" ya existe.`);
    }
  } catch (e) {
    console.error('Error creando la base de datos:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
