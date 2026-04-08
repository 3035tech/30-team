import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-troque-em-producao';

function getSecretKey() {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function verifyTokenEdge(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch {
    return null;
  }
}

