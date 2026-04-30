import { jwtVerify } from 'jose';
import { getJwtSecret } from './jwt-secret';

function getSecretKey() {
  return new TextEncoder().encode(getJwtSecret());
}

export async function verifyTokenEdge(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch {
    return null;
  }
}

