import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getJwtSecret } from './jwt-secret.js';
import {
  MANAGER_SESSION_MAX_AGE_SEC,
  SESSION_SLIDE_WITHIN_SEC,
  shouldSlideSession,
} from './session-ttl.js';

const COOKIE_NAME = 'team30_session';
const MAX_AGE = MANAGER_SESSION_MAX_AGE_SEC;

export { shouldSlideSession, SESSION_SLIDE_WITHIN_SEC, COOKIE_NAME, MAX_AGE };

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

/**
 * JWT de sessão. `sv` = users.session_version (revogação sem denylist).
 * @param {{ userId: number, role: string, companyId?: number|null, locale?: string, sv: number }} claims
 */
export function signToken({ userId, role, companyId = null, locale = 'pt-BR', sv }) {
  const sessionVersion = Number(sv);
  if (!Number.isFinite(sessionVersion) || sessionVersion < 1) {
    throw new Error('signToken requires positive sv (session_version)');
  }
  return jwt.sign(
    { userId, role, companyId, locale, sv: sessionVersion },
    getJwtSecret(),
    { expiresIn: MAX_AGE }
  );
}

/** Verifica e decodifica o token (sem checar DB). */
export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

/** Cookie Secure: HTTPS app URL ou COOKIE_SECURE=true. */
export function sessionCookieSecure() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  return (
    process.env.COOKIE_SECURE === 'true' ||
    (process.env.NODE_ENV === 'production' && appUrl.startsWith('https://'))
  );
}

/** Opções canônicas do cookie de sessão (set e clear). */
export function sessionCookieOptions({ maxAge = MAX_AGE } = {}) {
  return {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: 'lax',
    maxAge,
    path: '/',
  };
}
