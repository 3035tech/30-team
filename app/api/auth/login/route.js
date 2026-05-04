import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { verifyPassword, signToken, COOKIE_NAME, MAX_AGE } from '../../../../lib/auth';
import { audit } from '../../../../lib/audit';
import { checkRateLimit, clientIpFromRequest } from '../../../../lib/rate-limit';
import { LOCALE_COOKIE, normalizeLocale } from '../../../../lib/i18n';

export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request);
    const rl = checkRateLimit(`login:${ip}`, 25, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { errorCode: 'RATE_LIMIT', error: 'Muitas tentativas. Aguarde e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ errorCode: 'REQUIRED_LOGIN', error: 'Email e senha obrigatórios' }, { status: 400 });
    }

    const res = await query(
      `SELECT
         u.id,
         u.email,
         u.password_hash AS "passwordHash",
         u.role,
         u.locale,
         u.active,
         u.company_id AS "companyId",
         u.deleted AS "userDeleted",
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
      // Delay para dificultar brute force
      await new Promise(r => setTimeout(r, 500));
      return NextResponse.json({ errorCode: 'INVALID_CREDENTIALS', error: 'Credenciais inválidas' }, { status: 401 });
    }

    const u = res.rows[0];
    const valid = await verifyPassword(password, u.passwordHash);
    if (!valid) {
      await new Promise(r => setTimeout(r, 500));
      return NextResponse.json({ errorCode: 'INVALID_CREDENTIALS', error: 'Credenciais inválidas' }, { status: 401 });
    }

    // Update last login (best-effort)
    try {
      await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [u.id]);
    } catch {}

    const locale = normalizeLocale(u.locale);
    const token = signToken({ userId: u.id, role: u.role, companyId: u.companyId ?? null, locale });
    const response = NextResponse.json({ ok: true });

    // Em Docker local, o container roda com NODE_ENV=production, mas você acessa via HTTP.
    // Cookie Secure em HTTP não é aceito pelo browser, causando loop de redirect no dashboard.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const secureCookie =
      process.env.COOKIE_SECURE === 'true' ||
      (process.env.NODE_ENV === 'production' && appUrl.startsWith('https://'));

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    });
    response.cookies.set(LOCALE_COOKIE, locale, {
      httpOnly: false,
      secure: secureCookie,
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
    return NextResponse.json({ errorCode: 'INTERNAL', error: 'Erro interno' }, { status: 500 });
  }
}
