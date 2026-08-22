import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '../../../../../../lib/auth';
import { apiError } from '../../../../../../lib/api-error';
import { CAP, requireCapability } from '../../../../../../lib/permissions';
import { verifySessionWithCapabilities } from '../../../../../../lib/user-capabilities';
import { audit } from '../../../../../../lib/audit';
import { issuePasswordSetupInvite } from '../../../../../../lib/user-password-invite';
import { query } from '../../../../../../lib/db';

export const dynamic = 'force-dynamic';

/** POST /api/admin/users/:userId/resend-invite — reenvia e-mail para definir senha. */
export async function POST(request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!requireCapability(payload, CAP.USERS_MANAGE)) return apiError(request, 'UNAUTHORIZED', 401);

  const userId = params?.userId ? parseInt(String(params.userId), 10) : NaN;
  if (!Number.isFinite(userId)) return apiError(request, 'INVALID_USER', 400);

  const cur = await query(
    `SELECT id, email, password_setup_token AS "passwordSetupToken"
     FROM users
     WHERE id = $1 AND deleted = FALSE
     LIMIT 1`,
    [userId]
  );
  if (cur.rowCount === 0) return apiError(request, 'USER_NOT_FOUND', 404);

  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(
    /\/+$/,
    ''
  );
  const issued = await issuePasswordSetupInvite(userId, {
    appUrl,
    locale: payload?.locale || 'pt-BR',
  });
  if (!issued.ok) {
    if (issued.code === 'SMTP_NOT_CONFIGURED') return apiError(request, 'SMTP_NOT_CONFIGURED', 503);
    return apiError(request, issued.code || 'INTERNAL', 400);
  }

  await audit({
    actorUserId: payload?.userId,
    action: 'user.password_invite_resend',
    targetType: 'user',
    targetId: userId,
    metadata: { email: cur.rows[0].email },
  });

  return NextResponse.json({
    ok: true,
    inviteSent: true,
    email: cur.rows[0].email,
    expiresAt: issued.expiresAt,
  });
}
