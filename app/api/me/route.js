import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, MAX_AGE, hashPassword, signToken, verifyPassword, sessionCookieOptions } from '../../../lib/auth';
import { query } from '../../../lib/db';
import { LOCALE_COOKIE, normalizeLocale } from '../../../lib/i18n';
import { apiError, ERR } from '../../../lib/api-error';
import { bumpSessionVersion, verifySessionWithCapabilities } from '../../../lib/session';
import { checkRateLimit, clientIpFromRequest } from '../../../lib/rate-limit';

async function requireSession(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!payload?.userId) return { error: apiError(request, ERR.UNAUTHORIZED, 401) };
  return { payload };
}

function setSessionCookies(response, payload, locale) {
  response.cookies.set(
    COOKIE_NAME,
    signToken({
      userId: payload.userId,
      role: payload.role,
      companyId: payload.companyId ?? null,
      locale,
      sv: payload.sv,
    }),
    sessionCookieOptions({ maxAge: MAX_AGE })
  );
  response.cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    secure: sessionCookieOptions().secure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });
}

/** GET /api/me — perfil do usuário logado */
export async function GET(request) {
  const { payload, error } = await requireSession(request);
  if (error) return error;

  const res = await query(
    `SELECT u.id, u.email, u.role, u.locale, u.display_name AS "displayName",
            u.company_id AS "companyId", u.last_login_at AS "lastLoginAt",
            c.name AS "companyName"
     FROM users u
     LEFT JOIN companies c ON c.id = u.company_id AND c.deleted = FALSE
     WHERE u.id = $1 AND u.deleted = FALSE AND u.active = TRUE
     LIMIT 1`,
    [payload.userId]
  );
  if (res.rowCount === 0) return apiError(request, ERR.USER_NOT_FOUND, 404);

  return NextResponse.json({ user: res.rows[0] });
}

/**
 * PATCH /api/me — edita displayName, locale, email (próprio) e senha (com senha atual).
 * Não altera role / company_id / active.
 */
export async function PATCH(request) {
  const { payload, error } = await requireSession(request);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  if (body.newPassword != null && String(body.newPassword).length > 0) {
    const ip = clientIpFromRequest(request);
    const rl = await checkRateLimit(`me-password:${payload.userId}:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.ok) {
      return apiError(request, ERR.RATE_LIMIT, 429, {}, { headers: { 'Retry-After': String(rl.retryAfterSec) } });
    }
  }

  const current = await query(
    `SELECT id, email, role, company_id AS "companyId", password_hash AS "passwordHash", locale
     FROM users WHERE id = $1 AND deleted = FALSE LIMIT 1`,
    [payload.userId]
  );
  if (current.rowCount === 0) return apiError(request, ERR.USER_NOT_FOUND, 404);
  const row = current.rows[0];

  const sets = [];
  const params = [];
  let n = 1;
  let nextLocale = row.locale || 'pt-BR';

  if (body.displayName !== undefined) {
    const name = String(body.displayName || '').trim().slice(0, 120);
    sets.push(`display_name = $${n++}`);
    params.push(name || null);
  }

  if (body.locale !== undefined) {
    nextLocale = normalizeLocale(body.locale);
    sets.push(`locale = $${n++}`);
    params.push(nextLocale);
  }

  if (body.email !== undefined) {
    const email = String(body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return apiError(request, ERR.EMAIL_REQUIRED, 400);
    const clash = await query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND deleted = FALSE AND id <> $2 LIMIT 1`,
      [email, payload.userId]
    );
    if (clash.rowCount > 0) return apiError(request, ERR.EMAIL_TAKEN, 409);
    sets.push(`email = $${n++}`);
    params.push(email);
  }

  if (body.newPassword != null && String(body.newPassword).length > 0) {
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    if (!currentPassword) return apiError(request, ERR.CURRENT_PASSWORD_REQUIRED, 400);
    if (newPassword.length < 8) return apiError(request, ERR.PASSWORD_TOO_SHORT, 400);
    const ok = await verifyPassword(currentPassword, row.passwordHash);
    if (!ok) return apiError(request, ERR.INVALID_CURRENT_PASSWORD, 403);
    sets.push(`password_hash = $${n++}`);
    params.push(await hashPassword(newPassword));
  }

  if (!sets.length) return apiError(request, ERR.NOTHING_TO_UPDATE, 400);

  params.push(payload.userId);
  await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${n} AND deleted = FALSE`,
    params
  );

  let nextSv = payload.sv;
  if (body.newPassword != null && String(body.newPassword).length > 0) {
    const bumped = await bumpSessionVersion(payload.userId);
    if (bumped != null) nextSv = bumped;
  }

  const refreshed = await query(
    `SELECT u.id, u.email, u.role, u.locale, u.display_name AS "displayName",
            u.company_id AS "companyId", u.last_login_at AS "lastLoginAt",
            c.name AS "companyName"
     FROM users u
     LEFT JOIN companies c ON c.id = u.company_id AND c.deleted = FALSE
     WHERE u.id = $1 AND u.deleted = FALSE AND u.active = TRUE
     LIMIT 1`,
    [payload.userId]
  );

  const response = NextResponse.json({ ok: true, user: refreshed.rows[0] });
  setSessionCookies(response, { ...payload, role: refreshed.rows[0].role, companyId: refreshed.rows[0].companyId, sv: nextSv }, nextLocale);
  return response;
}
