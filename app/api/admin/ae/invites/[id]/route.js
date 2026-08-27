import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import { CAP, getManagerScope, getSessionPayload, requireCapability } from '../../../../../../lib/ae/require-admin';
import { apiError, ERR } from '../../../../../../lib/api-error';

async function loadInvite(id, { isAdmin, companyId }) {
  const params = [id];
  let scope = '';
  if (!isAdmin) {
    scope = 'AND i.company_id = $2';
    params.push(companyId);
  }
  const res = await query(
    `SELECT i.id, i.company_id AS "companyId", i.candidate_name AS "candidateName",
            i.candidate_email AS "candidateEmail", i.token, i.status,
            c.name AS "companyName"
     FROM ae_invites i
     JOIN companies c ON c.id = i.company_id
     WHERE i.id = $1 ${scope}
     LIMIT 1`,
    params
  );
  return res.rowCount > 0 ? res.rows[0] : null;
}

/** DELETE /api/admin/ae/invites/[id] */
export async function DELETE(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.MOTIVATORS_VIEW)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const invite = await loadInvite(params.id, scope);
    if (!invite) return apiError(request, ERR.INVITE_NOT_FOUND, 404);
    if (invite.status === 'completed') {
      return apiError(request, ERR.INVITE_ALREADY_COMPLETED, 400);
    }

    await query(`UPDATE ae_invites SET status = 'cancelled' WHERE id = $1`, [invite.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/ae/invites/[id]', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
