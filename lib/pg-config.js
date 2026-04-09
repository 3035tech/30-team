/**
 * Opções TLS para node-pg. RDS costuma exigir SSL (pg_hba "hostssl" / "no encryption").
 */
export function getPgSslOption() {
  const raw = String(process.env.POSTGRES_SSL ?? '').trim().toLowerCase();
  const host = String(process.env.POSTGRES_HOST || '');

  if (raw === 'false' || raw === '0' || raw === 'off') {
    return false;
  }
  if (raw === 'true' || raw === '1' || raw === 'require') {
    return sslObjectFromEnv();
  }

  // Sem override: RDS na AWS usa hostname típico — habilita TLS para evitar "no encryption"
  if (host.includes('.rds.amazonaws.com')) {
    return sslObjectFromEnv();
  }

  return false;
}

function sslObjectFromEnv() {
  const strict = String(process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED || '').toLowerCase() === 'true';
  return strict ? { rejectUnauthorized: true } : { rejectUnauthorized: false };
}

/** Campos comuns host/port/db/user para Pool e Client */
export function getPgBaseConfig() {
  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'enneagram',
    user: process.env.POSTGRES_USER || 'enneagram_user',
    password: process.env.POSTGRES_PASSWORD,
    ssl: getPgSslOption(),
  };
}
