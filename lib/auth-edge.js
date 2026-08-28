import { jwtVerify } from 'jose';
import { getJwtSecret } from './jwt-secret.js';
import { EMPLOYEE_KIND } from './employee-auth-constants.js';

function getSecretKey() {
  try {
    return new TextEncoder().encode(getJwtSecret());
  } catch {
    const raw = String(process.env.JWT_SECRET || '').trim();
    if (raw.length >= 32) return new TextEncoder().encode(raw);
    return null;
  }
}

export async function verifyTokenEdge(token) {
  try {
    const key = getSecretKey();
    if (!key) return null;
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch {
    return null;
  }
}

/** Collaborator JWT (kind=employee). Does not grant manager /dashboard. */
export async function verifyEmployeeTokenEdge(token) {
  const payload = await verifyTokenEdge(token);
  if (!payload || payload.kind !== EMPLOYEE_KIND) return null;
  const candidateId = Number(payload.candidateId);
  const companyId = Number(payload.companyId);
  if (!Number.isFinite(candidateId) || !Number.isFinite(companyId)) return null;
  return {
    kind: EMPLOYEE_KIND,
    candidateId,
    companyId,
    email: payload.email || null,
    locale: payload.locale === 'en' ? 'en' : 'pt-BR',
  };
}

