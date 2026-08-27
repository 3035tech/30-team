import { Pool } from 'pg';
import { getPgBaseConfig, getPgReadBaseConfig } from './pg-config.js';
import { logger, slowThresholdMs } from './monitoring.js';

const globalForPg = globalThis;

function parsePoolMax() {
  const raw = process.env.PG_POOL_MAX ?? process.env.POSTGRES_POOL_MAX;
  const n = raw != null && String(raw).trim() !== '' ? parseInt(String(raw), 10) : 10;
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 500) : 10;
}

const poolMax = parsePoolMax();

function attachPoolLogging(pool, label) {
  if (!pool || pool.__team30LogAttached) return;
  pool.__team30LogAttached = true;
  pool.on('error', (err) => {
    logger.error('Postgres pool error', {
      pool: label,
      error: err?.message || String(err),
      code: err?.code,
    });
  });
  pool.on('connect', () => {
    logger.debug('Postgres client connected', { pool: label });
  });
}

function logPoolBoot(label, cfg) {
  logger.info('Postgres pool ready', {
    pool: label,
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    ssl: Boolean(cfg.ssl),
    poolMax,
  });
}

if (!globalForPg._pgPool) {
  const base = getPgBaseConfig();
  globalForPg._pgPool = new Pool({
    ...base,
    max: poolMax,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  attachPoolLogging(globalForPg._pgPool, 'primary');
  logPoolBoot('primary', base);
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
  attachPoolLogging(globalForPg._pgPoolRead, 'read');
  logPoolBoot('read', readBase);
}

/** Pool só-leitura; null se POSTGRES_READ_HOST não estiver definido. */
export const poolRead = globalForPg._pgPoolRead ?? null;

async function timedQuery(poolRef, label, text, params) {
  const start = Date.now();
  try {
    const result = await poolRef.query(text, params);
    const durationMs = Date.now() - start;
    if (durationMs >= slowThresholdMs()) {
      logger.warn('Slow Postgres query', {
        pool: label,
        durationMs,
        // só o início — evita vazar dados sensíveis em params
        sqlPreview: String(text || '').replace(/\s+/g, ' ').slice(0, 160),
      });
    }
    return result;
  } catch (err) {
    logger.error('Postgres query failed', {
      pool: label,
      durationMs: Date.now() - start,
      error: err?.message || String(err),
      code: err?.code,
      sqlPreview: String(text || '').replace(/\s+/g, ' ').slice(0, 160),
    });
    throw err;
  }
}

/**
 * Escritas e leituras que precisam de consistência imediata no primário.
 */
export function query(text, params) {
  return timedQuery(pool, 'primary', text, params);
}

/**
 * Leituras que toleram lag de réplica. Sem réplica configurada, usa o pool primário.
 */
export function queryRead(text, params) {
  const p = poolRead ?? pool;
  return timedQuery(p, poolRead ? 'read' : 'primary', text, params);
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
