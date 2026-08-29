import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  EMPLOYEE_COOKIE_NAME,
  employeeSessionCookieOptions,
  signEmployeeToken,
} from './employee-auth.js';
import { LOCALE_COOKIE, normalizeLocale } from './i18n.js';
import { sessionCookieSecure } from './auth.js';
import { auditFromRequest, AUDIT_ACTOR_KIND } from './audit.js';
import { loadEmployeeSessionVersion } from './employee-session-revocation.js';

/**
 * Emite cookie de sessão colaborador após login ou verificação 2FA.
 * @param {object} opts
 * @param {Request} [opts.request] — quando presente, grava audit auth.login
 * @param {number} [opts.sv] — session_version; se omitido, lê do banco
 */
export async function buildEmployeeLoginResponse({
  candidateId,
  companyId,
  email,
  locale,
  fullName,
  request = null,
  sv = null,
}) {
  const loc = normalizeLocale(locale);
  let sessionVersion = Number(sv);
  if (!Number.isFinite(sessionVersion) || sessionVersion < 1) {
    const live = await loadEmployeeSessionVersion(candidateId, companyId);
    sessionVersion = live?.sessionVersion || 1;
  }
  const jwt = signEmployeeToken({
    candidateId,
    companyId,
    email,
    locale: loc,
    sv: sessionVersion,
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

  if (request) {
    await auditFromRequest(request, {
      actorCandidateId: candidateId,
      actorKind: AUDIT_ACTOR_KIND.EMPLOYEE,
      companyId,
      action: 'auth.login',
      targetType: 'candidate',
      targetId: candidateId,
      metadata: { email: email || null },
    });
  }

  return NextResponse.json({
    ok: true,
    candidateId,
    companyId,
    fullName: fullName || null,
  });
}
