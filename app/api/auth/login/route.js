import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { verifyPassword, signToken, COOKIE_NAME, MAX_AGE } from '../../../../lib/auth';
import { audit } from '../../../../lib/audit';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 });
    }

    const res = await query(
      `SELECT id, email, password_hash AS "passwordHash", role, active, company_id AS "companyId"
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email.trim()]
    );

    if (res.rowCount === 0 || !res.rows[0].active) {
      // Delay para dificultar brute force
      await new Promise(r => setTimeout(r, 500));
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const u = res.rows[0];
    const valid = await verifyPassword(password, u.passwordHash);
    if (!valid) {
      await new Promise(r => setTimeout(r, 500));
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    // Update last login (best-effort)
    try {
      await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [u.id]);
    } catch {}

    const token = signToken({ userId: u.id, role: u.role, companyId: u.companyId ?? null });
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
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
