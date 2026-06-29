/**
 * Aplica migrations SQL pendentes em migrations/*.sql
 */
import { createRequire } from 'node:module';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { getPgBaseConfig } from '../lib/pg-config.js';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function main() {
  const client = new Client(getPgBaseConfig());
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    const applied = new Set(
      (await client.query(`SELECT name FROM schema_migrations`)).rows.map((r) => r.name)
    );
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      process.stdout.write(`Applying ${file}…\n`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(`INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING`, [file]);
        await client.query('COMMIT');
        process.stdout.write(`  OK\n`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    process.stdout.write('Migrations complete.\n');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('db:migrate failed:', e.message || e);
  process.exitCode = 1;
});
