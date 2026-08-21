import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  verifyToken,
} from '../../../../lib/auth';
import { query } from '../../../../lib/db';
import { apiError } from '../../../../lib/api-error';
import { audit } from '../../../../lib/audit';

export async function POST(request) {
  const token = cookies().get(COOKIE_NAME)?.value;
  const session = verifyToken(token);
  if (!session?.userId) return apiError(request, 'UNAUTHORIZED', 401);

  const body = await request.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  if (!currentPassword) return apiError(request, 'CURRENT_PASSWORD_REQUIRED', 400);
  if (newPassword.length < 8) return apiError(request, 'PASSWORD_TOO_SHORT', 400);

  const result = await query(
    `SELECT password_hash AS "passwordHash"
     FROM users
     WHERE id = $1 AND active = TRUE AND deleted = FALSE
     LIMIT 1`,
    [session.userId]
  );
  if (result.rowCount === 0) return apiError(request, 'UNAUTHORIZED', 401);

  const valid = await verifyPassword(currentPassword, result.rows[0].passwordHash);
  if (!valid) return apiError(request, 'INVALID_CURRENT_PASSWORD', 400);

  const passwordHash = await hashPassword(newPassword);
  await query(
    `UPDATE users
     SET password_hash = $1, must_change_password = FALSE
     WHERE id = $2 AND deleted = FALSE`,
    [passwordHash, session.userId]
  );

  await audit({
    actorUserId: session.userId,
    action: 'auth.password_change',
    targetType: 'user',
    targetId: session.userId,
  });

  return NextResponse.json({ ok: true });
}
