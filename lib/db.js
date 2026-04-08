import { Pool } from 'pg';

// Reutiliza o pool entre requests (hot reload em dev não recria)
const globalForPg = globalThis;

if (!globalForPg._pgPool) {
  globalForPg._pgPool = new Pool({
    host:     process.env.POSTGRES_HOST     || 'localhost',
    port:     parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB       || 'enneagram',
    user:     process.env.POSTGRES_USER     || 'enneagram_user',
    password: process.env.POSTGRES_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export const pool = globalForPg._pgPool;

/** Wrapper para queries simples */
export async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}
