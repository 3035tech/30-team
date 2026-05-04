import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, MAX_AGE, signToken, verifyToken } from '../../../../lib/auth';
import { query } from '../../../../lib/db';
import { LOCALE_COOKIE, normalizeLocale } from '../../../../lib/i18n';

export async function PATCH(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) return NextResponse.json({ errorCode: 'UNAUTHORIZED', error: 'Não autorizado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const locale = normalizeLocale(body.locale);

  await query(`UPDATE users SET locale = $2 WHERE id = $1 AND deleted = FALSE`, [payload.userId, locale]);

  const response = NextResponse.json({ ok: true, locale });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const secureCookie =
    process.env.COOKIE_SECURE === 'true' ||
    (process.env.NODE_ENV === 'production' && appUrl.startsWith('https://'));

  response.cookies.set(
    COOKIE_NAME,
    signToken({ userId: payload.userId, role: payload.role, companyId: payload.companyId ?? null, locale }),
    {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    }
  );
  response.cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    secure: secureCookie,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });

  return response;
}
