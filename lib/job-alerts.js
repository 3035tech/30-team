/**
 * Cadastro público de alertas de vaga (e-mail) + unsubscribe.
 * Path de cancelamento (neutro): `/a/unsubscribe?token=…`
 */

import crypto from 'crypto';
import { query, queryRead } from './db.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function jobAlertUnsubscribePath(token) {
  const tok = String(token || '').trim();
  if (!tok) return '/a/unsubscribe';
  return `/a/unsubscribe?token=${encodeURIComponent(tok)}`;
}

export function normalizeAlertEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
    .slice(0, 200);
}

/**
 * Upsert alerta ativo. Idempotente por e-mail.
 * @returns {{ ok: true, created: boolean } | { ok: false, errorCode: string }}
 */
export async function upsertJobAlert({ email, name = null, filters = {} }) {
  const em = normalizeAlertEmail(email);
  if (!em || !EMAIL_RE.test(em)) return { ok: false, errorCode: 'VALID_EMAIL_REQUIRED' };
  const nm = String(name || '').trim().slice(0, 120) || null;
  const filt = filters && typeof filters === 'object' ? filters : {};
  const token = crypto.randomBytes(24).toString('hex');

  const existing = await queryRead(
    `SELECT id, active FROM job_alerts WHERE LOWER(email) = $1 LIMIT 1`,
    [em]
  );

  if (existing.rowCount > 0) {
    await query(
      `UPDATE job_alerts
       SET active = TRUE,
           name = COALESCE($2, name),
           filters = $3::jsonb,
           unsubscribed_at = NULL,
           unsubscribe_token = CASE WHEN active = FALSE THEN $4 ELSE unsubscribe_token END
       WHERE id = $1`,
      [existing.rows[0].id, nm, JSON.stringify(filt), token]
    );
    return { ok: true, created: false };
  }

  await query(
    `INSERT INTO job_alerts (email, name, filters, unsubscribe_token)
     VALUES ($1, $2, $3::jsonb, $4)`,
    [em, nm, JSON.stringify(filt), token]
  );
  return { ok: true, created: true };
}

export async function unsubscribeJobAlert(token) {
  const tok = String(token || '').trim();
  if (!tok || tok.length < 16) return { ok: false, errorCode: 'INVALID_TOKEN' };
  const r = await query(
    `UPDATE job_alerts
     SET active = FALSE, unsubscribed_at = NOW()
     WHERE unsubscribe_token = $1 AND active = TRUE
     RETURNING id`,
    [tok]
  );
  return { ok: true, updated: r.rowCount > 0 };
}
