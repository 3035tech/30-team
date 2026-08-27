import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import {
  verifyPassword,
  signToken,
  COOKIE_NAME,
  MAX_AGE,
  sessionCookieOptions,
} from '../../../../lib/auth';
import { audit } from '../../../../lib/audit';
import { checkRateLimit, clientIpFromRequest } from '../../../../lib/rate-limit';
import { LOCALE_COOKIE, normalizeLocale } from '../../../../lib/i18n';
import { apiError, ERR } from '../../../../lib/api-error';

export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request);
    const rl = await checkRateLimit(`login:${ip}`, 25, 15 * 60 * 1000);
    if (!rl.ok) {
      return apiError(request, ERR.RATE_LIMIT, 429, {}, { headers: { 'Retry-After': String(rl.retryAfterSec) } });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return apiError(request, ERR.REQUIRED_LOGIN, 400);
    }

    const res = await query(
      `SELECT
         u.id,
         u.email,
         u.password_hash AS "passwordHash",
         u.role,
         u.locale,
         u.active,
         u.must_change_password AS "mustChangePassword",
         u.password_setup_token AS "passwordSetupToken",
         u.company_id AS "companyId",
         u.deleted AS "userDeleted",
         COALESCE(u.session_version, 1) AS "sessionVersion",
         c.deleted AS "companyDeleted"
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE LOWER(u.email) = LOWER($1)
       LIMIT 1`,
      [email.trim()]
    );

    const row0 = res.rows[0];
    const companyBlocked = row0?.role !== 'admin' && row0?.companyId && row0?.companyDeleted;
    if (res.rowCount === 0 || !row0?.active || row0?.userDeleted || companyBlocked) {
      await new Promise((r) => setTimeout(r, 500));
      return apiError(request, ERR.INVALID_CREDENTIALS, 401);
    }

    if (row0.passwordSetupToken) {
      await new Promise((r) => setTimeout(r, 500));
      return apiError(request, ERR.PASSWORD_SETUP_PENDING, 403);
    }

    const u = res.rows[0];
    const valid = await verifyPassword(password, u.passwordHash);
    if (!valid) {
      await new Promise((r) => setTimeout(r, 500));
      return apiError(request, ERR.INVALID_CREDENTIALS, 401);
    }

    try {
      await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [u.id]);
    } catch {
      /* best-effort */
    }

    const locale = normalizeLocale(u.locale);
    const sv = Number(u.sessionVersion) >= 1 ? Number(u.sessionVersion) : 1;
    const token = signToken({
      userId: u.id,
      role: u.role,
      companyId: u.companyId ?? null,
      locale,
      sv,
    });
    const response = NextResponse.json({
      ok: true,
      mustChangePassword: Boolean(u.mustChangePassword),
    });

    response.cookies.set(COOKIE_NAME, token, sessionCookieOptions({ maxAge: MAX_AGE }));
    response.cookies.set(LOCALE_COOKIE, locale, {
      httpOnly: false,
      secure: sessionCookieOptions().secure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });

    await audit({
      actorUserId: u.id,
      action: 'auth.login',
      targetType: 'user',
      targetId: u.id,
      metadata: { email: u.email, role: u.role },
    });

    return response;
  } catch (error) {
    console.error('Erro no login:', error);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
