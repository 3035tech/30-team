import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import {
  getManagerScope,
  getSessionPayload,
  requireManagerRole,
} from '../../../../../../lib/ae/require-admin';

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
export async function DELETE(_request, { params }) {
  try {
    const payload = getSessionPayload();
    if (!requireManagerRole(payload)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const scope = getManagerScope(payload);
    if (!scope.authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const invite = await loadInvite(params.id, scope);
    if (!invite) return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 });
    if (invite.status === 'completed') {
      return NextResponse.json({ error: 'Convite já concluído.' }, { status: 400 });
    }

    await query(`UPDATE ae_invites SET status = 'cancelled' WHERE id = $1`, [invite.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/ae/invites/[id]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
