import { Pool } from 'pg';
import { getPgBaseConfig } from './pg-config.js';

// Reutiliza o pool entre requests (hot reload em dev não recria)
const globalForPg = globalThis;

if (!globalForPg._pgPool) {
  const base = getPgBaseConfig();
  globalForPg._pgPool = new Pool({
    ...base,
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
