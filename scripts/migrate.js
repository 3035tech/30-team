import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { getPgBaseConfig } from '../lib/pg-config.js';

const require = createRequire(import.meta.url);
// Use CJS entry for compatibility with Next standalone output.
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.resolve(__dirname, '..', 'migrations');

function getClient() {
  return new Client(getPgBaseConfig());
}

function quoteIdent(ident) {
  return `"${String(ident).replace(/"/g, '""')}"`;
}

async function ensureSearchPath(client) {
  const schema = String(process.env.POSTGRES_SCHEMA || '').trim();
  if (!schema) return;
  // Mantém public como fallback para extensões/objetos existentes.
  await client.query(`SET search_path TO ${quoteIdent(schema)}, public;`);
}

function listMigrations() {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort()
    .map((f) => ({
      name: f,
      fullPath: path.join(migrationsDir, f),
      sql: fs.readFileSync(path.join(migrationsDir, f), 'utf8'),
    }));
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function alreadyApplied(client) {
  const r = await client.query(`SELECT name FROM schema_migrations ORDER BY name ASC`);
  return new Set(r.rows.map((x) => x.name));
}

async function applyMigration(client, m) {
  await client.query('BEGIN');
  try {
    await client.query(m.sql);
    await client.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [m.name]);
    await client.query('COMMIT');
    process.stdout.write(`Applied migration: ${m.name}\n`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
}

async function ensureBootstrapAdmin(client) {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = (process.env.BOOTSTRAP_ADMIN_PASSWORD || '').trim();
  if (!email || !password) return;

  const existing = await client.query(`SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`, [email]);
  if (existing.rowCount > 0) return;

  const hash = await bcrypt.hash(password, 10);
  await client.query(
    `INSERT INTO users (email, password_hash, role, active)
     VALUES ($1, $2, 'admin', TRUE)`,
    [email, hash]
  );
  process.stdout.write(`Bootstrapped admin user: ${email}\n`);
}

async function main() {
  const migrations = listMigrations();
  if (migrations.length === 0) {
    process.stdout.write('No migrations found.\n');
    return;
  }

  const client = getClient();
  await client.connect();
  try {
    await ensureSearchPath(client);
    await ensureMigrationsTable(client);
    const applied = await alreadyApplied(client);
    for (const m of migrations) {
      if (applied.has(m.name)) continue;
      await applyMigration(client, m);
    }
    await ensureBootstrapAdmin(client);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});

