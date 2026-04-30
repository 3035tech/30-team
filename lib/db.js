import { Pool } from 'pg';
import { getPgBaseConfig, getPgReadBaseConfig } from './pg-config.js';

const globalForPg = globalThis;

function parsePoolMax() {
  const raw = process.env.PG_POOL_MAX ?? process.env.POSTGRES_POOL_MAX;
  const n = raw != null && String(raw).trim() !== '' ? parseInt(String(raw), 10) : 10;
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 500) : 10;
}

const poolMax = parsePoolMax();

if (!globalForPg._pgPool) {
  const base = getPgBaseConfig();
  globalForPg._pgPool = new Pool({
    ...base,
    max: poolMax,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export const pool = globalForPg._pgPool;

const readBase = getPgReadBaseConfig();
if (readBase && !globalForPg._pgPoolRead) {
  globalForPg._pgPoolRead = new Pool({
    ...readBase,
    max: poolMax,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

/** Pool só-leitura; null se POSTGRES_READ_HOST não estiver definido. */
export const poolRead = globalForPg._pgPoolRead ?? null;

/**
 * Escritas e leituras que precisam de consistência imediata no primário.
 * Usa `pool.query` (uma operação por chamada — menos overhead que connect manual).
 */
export function query(text, params) {
  return pool.query(text, params);
}

/**
 * Leituras que toleram lag de réplica. Sem réplica configurada, usa o pool primário.
 */
export function queryRead(text, params) {
  const p = poolRead ?? pool;
  return p.query(text, params);
}

export function getPoolStats() {
  const snap = (p) => ({
    totalCount: p.totalCount,
    idleCount: p.idleCount,
    waitingCount: p.waitingCount,
  });
  return {
    primary: snap(pool),
    read: poolRead ? snap(poolRead) : null,
    poolMax,
    readReplicaConfigured: Boolean(poolRead),
  };
}
