import process from 'node:process';
import { createRequire } from 'node:module';
import { getPgBaseConfig } from '../lib/pg-config.js';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

function getClient() {
  return new Client(getPgBaseConfig());
}

async function main() {
  const client = getClient();
  await client.connect();
  // Delete in FK-safe order and reset sequences
  await client.query('BEGIN');
  try {
    await client.query(`DELETE FROM audit_log`);
    await client.query(`DELETE FROM area_stats`);
    // keep area_rubrics + areas
    await client.query(`DELETE FROM assessments`);
    await client.query(`DELETE FROM candidates`);
    await client.query(`DELETE FROM results`);
    await client.query(`DELETE FROM users`);

    // Reset identity / sequences
    await client.query(`ALTER SEQUENCE IF EXISTS candidates_id_seq RESTART WITH 1`);
    await client.query(`ALTER SEQUENCE IF EXISTS assessments_id_seq RESTART WITH 1`);
    await client.query(`ALTER SEQUENCE IF EXISTS results_id_seq RESTART WITH 1`);
    await client.query(`ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1`);
    await client.query(`ALTER SEQUENCE IF EXISTS audit_log_id_seq RESTART WITH 1`);

    await client.query('COMMIT');
    await client.end();
    process.stdout.write('Clear complete.\n');
  } catch (e) {
    await client.query('ROLLBACK');
    await client.end();
    throw e;
  }
}

main()
  .catch((e) => {
    console.error('Clear failed:', e);
    process.exitCode = 1;
  });

