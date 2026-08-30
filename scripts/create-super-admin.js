/**
 * Cria (ou promove) um super admin: role=admin e company_id NULL.
 *
 * Uso:
 *   SUPER_ADMIN_EMAIL=admin@exemplo.com SUPER_ADMIN_PASSWORD='SenhaForte123!' \
 *     npm run db:create-super-admin
 *
 * Opcionais:
 *   SUPER_ADMIN_NAME='Super Admin'
 *   SUPER_ADMIN_LOCALE=pt-BR|en
 *   SUPER_ADMIN_UPDATE=1   → se o e-mail já existir, atualiza senha/role/company_id
 *
 * Alternativa SQL (pgAdmin): scripts/create-super-admin.sql
 */

import process from 'node:process';
import { createRequire } from 'node:module';
import { getPgBaseConfig } from '../lib/pg-config.js';

const require = createRequire(import.meta.url);
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const email = String(process.env.SUPER_ADMIN_EMAIL || '')
  .trim()
  .toLowerCase();
const password = String(process.env.SUPER_ADMIN_PASSWORD || '');
const displayName = String(process.env.SUPER_ADMIN_NAME || 'Super Admin').trim().slice(0, 120);
const localeRaw = String(process.env.SUPER_ADMIN_LOCALE || 'pt-BR').trim();
const locale = localeRaw === 'en' ? 'en' : 'pt-BR';
const allowUpdate = process.env.SUPER_ADMIN_UPDATE === '1';

function fail(msg) {
  console.error(`[create-super-admin] ${msg}`);
  process.exitCode = 1;
}

async function main() {
  if (!email || !email.includes('@')) {
    fail('Defina SUPER_ADMIN_EMAIL (e-mail válido).');
    return;
  }
  if (password.length < 8) {
    fail('Defina SUPER_ADMIN_PASSWORD com pelo menos 8 caracteres.');
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const client = new Client(getPgBaseConfig());
  await client.connect();

  try {
    const existing = await client.query(
      `SELECT id, role, company_id AS "companyId", deleted, active
       FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );

    if (existing.rowCount === 0) {
      const ins = await client.query(
        `INSERT INTO users (
           company_id, email, password_hash, role, locale, display_name,
           active, deleted, must_change_password
         ) VALUES (
           NULL, $1, $2, 'admin', $3, $4, TRUE, FALSE, FALSE
         )
         RETURNING id, email, role`,
        [email, hash, locale, displayName || null]
      );
      console.log('[create-super-admin] criado', {
        id: ins.rows[0].id,
        email: ins.rows[0].email,
        role: ins.rows[0].role,
        companyId: null,
      });
      return;
    }

    const row = existing.rows[0];
    if (!allowUpdate) {
      fail(
        `E-mail já existe (id=${row.id}, role=${row.role}, company_id=${row.companyId}). ` +
          'Use SUPER_ADMIN_UPDATE=1 para promover a super admin e resetar a senha.'
      );
      return;
    }

    const upd = await client.query(
      `UPDATE users SET
         company_id = NULL,
         password_hash = $2,
         role = 'admin',
         locale = $3,
         display_name = COALESCE(NULLIF($4, ''), display_name),
         active = TRUE,
         deleted = FALSE,
         must_change_password = FALSE,
         password_setup_token = NULL,
         password_setup_expires_at = NULL
       WHERE id = $1
       RETURNING id, email, role`,
      [row.id, hash, locale, displayName]
    );
    console.log('[create-super-admin] atualizado / promovido', {
      id: upd.rows[0].id,
      email: upd.rows[0].email,
      role: upd.rows[0].role,
      companyId: null,
      previousRole: row.role,
      previousCompanyId: row.companyId,
    });
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error('[create-super-admin]', err?.message || err);
  process.exitCode = 1;
});
