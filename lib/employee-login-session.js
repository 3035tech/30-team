import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  EMPLOYEE_COOKIE_NAME,
  employeeSessionCookieOptions,
  signEmployeeToken,
} from './employee-auth.js';
import { LOCALE_COOKIE, normalizeLocale } from './i18n.js';
import { sessionCookieSecure } from './auth.js';

/**
 * Emite cookie de sessão colaborador após login ou verificação 2FA.
 */
export function buildEmployeeLoginResponse({ candidateId, companyId, email, locale, fullName }) {
  const loc = normalizeLocale(locale);
  const jwt = signEmployeeToken({
    candidateId,
    companyId,
    email,
    locale: loc,
  });
  const jar = cookies();
  jar.set(EMPLOYEE_COOKIE_NAME, jwt, employeeSessionCookieOptions());
  jar.set(LOCALE_COOKIE, loc, {
    httpOnly: false,
    secure: sessionCookieSecure(),
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });

  return NextResponse.json({
    ok: true,
    candidateId,
    companyId,
    fullName: fullName || null,
  });
}
