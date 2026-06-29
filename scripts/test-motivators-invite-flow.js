/**
 * Teste de ponta a ponta: bootstrap + convite (sem HTTP).
 * Uso: node scripts/test-motivators-invite-flow.js
 * Requer POSTGRES_* no .env e migrations 010/011 aplicadas.
 */
import { createRequire } from 'node:module';
import crypto from 'crypto';
import { getPgBaseConfig } from '../lib/pg-config.js';
import { bootstrapMotivators } from '../lib/ae/bootstrap-motivators.js';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

async function main() {
  const client = new Client(getPgBaseConfig());
  await client.connect();
  const q = (text, params) => client.query(text, params);

  try {
    process.stdout.write('1. Bootstrap motivadores…\n');
    const boot = await bootstrapMotivators(q);
    process.stdout.write(`   OK definitionId=${boot.definitionId} questions=${boot.questionsTotal}\n`);

    const company = await q(`SELECT id, name FROM companies WHERE deleted = FALSE ORDER BY id LIMIT 1`);
    if (company.rowCount === 0) throw new Error('Nenhuma empresa no banco.');
    const companyId = company.rows[0].id;
    const companyName = company.rows[0].name;

    const def = await q(`SELECT id FROM ae_definitions WHERE LOWER(slug) = 'motivators' LIMIT 1`);
    const definitionId = def.rows[0].id;

    const token = crypto.randomBytes(24).toString('hex');
    const email = `test-motivators-${Date.now()}@example.com`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    process.stdout.write('2. Inserir convite…\n');
    const ins = await q(
      `INSERT INTO ae_invites (
         definition_id, company_id, candidate_name, candidate_email, token, status, expires_at
       ) VALUES ($1, $2, $3, $4, $5, 'sent', $6)
       RETURNING id`,
      [definitionId, companyId, 'Teste Automático', email, token, expiresAt]
    );

    const inviteId = ins.rows[0].id;
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/assessment/motivators/${token}`;

    process.stdout.write(`3. Convite criado id=${inviteId} empresa=${companyName}\n`);
    process.stdout.write(`   URL: ${url}\n`);
    process.stdout.write('Teste OK — fluxo de dados funcionando.\n');

    await q(`DELETE FROM ae_invites WHERE id = $1`, [inviteId]);
    process.stdout.write('4. Convite de teste removido.\n');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Teste falhou:', e.message || e);
  if (e.code === '42P01') {
    console.error('→ Rode: npm run db:migrate');
  }
  process.exitCode = 1;
});
