/**
 * Convite de acesso ao painel: token para o usuário definir a própria senha.
 * Sem senha temporária no e-mail.
 */

import crypto from 'crypto';
import { query } from './db.js';
import { enqueueTransactionalMail, isMailConfigured } from './mail.js';
import { buildUserPasswordInviteMail } from './user-access-mail.js';

/** Validade do link de definir senha. */
export const PASSWORD_SETUP_TTL_MS = 72 * 60 * 60 * 1000;

export function generatePasswordSetupToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function passwordSetupExpiresAt(from = new Date()) {
  return new Date(from.getTime() + PASSWORD_SETUP_TTL_MS);
}

/** Hash aleatório — não há senha conhecida até o convite ser concluído. */
export async function hashUnusablePassword() {
  const { hashPassword } = await import('./auth.js');
  return hashPassword(crypto.randomBytes(32).toString('base64url'));
}

export function maskEmail(email) {
  const raw = String(email || '').trim().toLowerCase();
  const at = raw.indexOf('@');
  if (at < 1) return '***';
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}***@${domain}`;
}

/**
 * Emite (ou reemite) token de setup e envia e-mail.
 * @returns {Promise<{ ok: true, emailSent: true, expiresAt: Date } | { ok: false, code: string }>}
 */
export async function issuePasswordSetupInvite(userId, { appUrl, locale = 'pt-BR' } = {}) {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) return { ok: false, code: 'INVALID_USER' };
  if (!isMailConfigured()) return { ok: false, code: 'SMTP_NOT_CONFIGURED' };

  const base = String(appUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (!base) return { ok: false, code: 'APP_URL_REQUIRED' };

  const token = generatePasswordSetupToken();
  const expiresAt = passwordSetupExpiresAt();

  const up = await query(
    `UPDATE users
     SET password_setup_token = $2,
         password_setup_expires_at = $3,
         must_change_password = FALSE
     WHERE id = $1 AND deleted = FALSE AND active = TRUE
     RETURNING id, email`,
    [id, token, expiresAt.toISOString()]
  );
  if (up.rowCount === 0) return { ok: false, code: 'USER_NOT_FOUND' };

  const email = up.rows[0].email;
  const setupUrl = `${base}/a/set-password?token=${encodeURIComponent(token)}`;
  const mail = buildUserPasswordInviteMail({
    email,
    setupUrl,
    locale,
  });
  enqueueTransactionalMail({ to: email, ...mail });

  return { ok: true, emailSent: true, expiresAt };
}

/**
 * @returns {Promise<{ ok: true, email: string, maskedEmail: string } | { ok: false, code: string }>}
 */
export async function peekPasswordSetupToken(rawToken) {
  const token = String(rawToken || '').trim();
  if (!token || token.length < 16) return { ok: false, code: 'INVALID_TOKEN' };

  const r = await query(
    `SELECT id, email, password_setup_expires_at AS "expiresAt", active, deleted
     FROM users
     WHERE password_setup_token = $1
     LIMIT 1`,
    [token]
  );
  if (r.rowCount === 0) return { ok: false, code: 'INVALID_TOKEN' };
  const row = r.rows[0];
  if (!row.active || row.deleted) return { ok: false, code: 'INVALID_TOKEN' };
  if (!row.expiresAt || new Date(row.expiresAt).getTime() <= Date.now()) {
    return { ok: false, code: 'TOKEN_EXPIRED' };
  }
  return { ok: true, email: row.email, maskedEmail: maskEmail(row.email), userId: row.id };
}

/**
 * Define senha e consome o token.
 * @returns {Promise<{ ok: true } | { ok: false, code: string }>}
 */
export async function completePasswordSetup(rawToken, newPassword) {
  const password = String(newPassword || '');
  if (password.length < 8) return { ok: false, code: 'PASSWORD_TOO_SHORT' };

  const peek = await peekPasswordSetupToken(rawToken);
  if (!peek.ok) return peek;

  const { hashPassword } = await import('./auth.js');
  const passwordHash = await hashPassword(password);
  const up = await query(
    `UPDATE users
     SET password_hash = $2,
         password_setup_token = NULL,
         password_setup_expires_at = NULL,
         must_change_password = FALSE
     WHERE id = $1
       AND password_setup_token = $3
       AND deleted = FALSE
       AND active = TRUE
     RETURNING id`,
    [peek.userId, passwordHash, String(rawToken || '').trim()]
  );
  if (up.rowCount === 0) return { ok: false, code: 'INVALID_TOKEN' };
  return { ok: true };
}
