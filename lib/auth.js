import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getJwtSecret } from './jwt-secret';

const COOKIE_NAME = 'enneagram_session';
const MAX_AGE     = 60 * 60 * 8; // 8 horas

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

/** Gera um JWT de sessão */
export function signToken({ userId, role, companyId = null }) {
  return jwt.sign({ userId, role, companyId }, getJwtSecret(), { expiresIn: MAX_AGE });
}

/** Verifica e decodifica o token */
export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

export { COOKIE_NAME, MAX_AGE };
