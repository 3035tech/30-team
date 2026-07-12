import { NextResponse } from 'next/server';
import { query } from '../../../../../../../lib/db';
import {
  getManagerScope,
  getSessionPayload,
  publicAppUrl,
  requireManagerRole,
} from '../../../../../../../lib/ae/require-admin';
import { sendTransactionalMail } from '../../../../../../../lib/mail';
import { buildMotivatorsInviteMail } from '../../../../../../../lib/motivators-invite-mail';
import { apiError, localeFromRequest } from '../../../../../../../lib/api-error';

async function loadInvite(id, { isAdmin, companyId }) {
  const params = [id];
  let scope = '';
  if (!isAdmin) {
    scope = 'AND i.company_id = $2';
    params.push(companyId);
  }
  const res = await query(
    `SELECT i.id, i.candidate_name AS "candidateName", i.candidate_email AS "candidateEmail",
            i.token, i.status, c.name AS "companyName"
     FROM ae_invites i
     JOIN companies c ON c.id = i.company_id
     WHERE i.id = $1 ${scope}
     LIMIT 1`,
    params
  );
  return res.rowCount > 0 ? res.rows[0] : null;
}

/** POST /api/admin/ae/invites/[id]/remind */
export async function POST(request, { params }) {
  try {
    const payload = getSessionPayload();
    if (!requireManagerRole(payload)) {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const invite = await loadInvite(params.id, scope);
    if (!invite) return apiError(request, 'INVITE_NOT_FOUND', 404);
    if (!['sent', 'opened'].includes(invite.status)) {
      return apiError(request, 'INVITE_NOT_PENDING', 400);
    }

    const base = publicAppUrl(request);
    if (!base) return apiError(request, 'APP_URL_MISSING', 500);

    const assessmentUrl = `${base}/assessment/motivators/${invite.token}`;
    const locale = localeFromRequest(request);
    const { subject, text, html } = buildMotivatorsInviteMail({
      candidateFullName: invite.candidateName,
      companyName: invite.companyName,
      assessmentUrl,
      locale,
    });

    await sendTransactionalMail({ to: invite.candidateEmail, subject, text, html });
    await query(
      `UPDATE ae_invites SET last_reminder_at = NOW(), reminder_count = reminder_count + 1 WHERE id = $1`,
      [invite.id]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/admin/ae/invites/[id]/remind', err);
    return apiError(request, 'MAIL_FAILED', 502);
  }
}
