import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../../../lib/auth';
import { query, queryRead } from '../../../../../../../lib/db';
import { audit } from '../../../../../../../lib/audit';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

export async function DELETE(_request, { params }) {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value;
    const payload = session ? verifyToken(session) : null;
    if (!requireRole(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const isAdmin = payload?.role === 'admin';
    const companyId = payload?.companyId ?? null;
    if (!isAdmin && !companyId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const vacancyId = params?.id;
    const inviteId = params?.inviteId;
    if (!vacancyId || !inviteId) return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });

    const own = await queryRead(
      `SELECT v.id FROM vacancies v WHERE v.id = $1 AND v.deleted = FALSE ${!isAdmin ? 'AND v.company_id = $2' : ''} LIMIT 1`,
      !isAdmin ? [vacancyId, companyId] : [vacancyId]
    );
    if (own.rowCount === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const inv = await queryRead(
      `SELECT ci.id, ci.status, ci.candidate_name AS "candidateName"
       FROM candidate_invites ci
       WHERE ci.id = $1 AND ci.vacancy_id = $2
       LIMIT 1`,
      [inviteId, vacancyId]
    );
    if (inv.rowCount === 0) return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 });

    const status = String(inv.rows[0].status || '');

    if (status === 'completed') {
      const assessments = await queryRead(
        `SELECT ass.id, ass.candidate_id AS "candidateId"
         FROM assessments ass
         WHERE ass.invite_id = $1 ${!isAdmin ? 'AND ass.company_id = $2' : ''}`,
        !isAdmin ? [inviteId, companyId] : [inviteId]
      );
      const candidateIds = [...new Set((assessments.rows || []).map((r) => r.candidateId).filter(Boolean))];

      for (const row of assessments.rows || []) {
        await query(`DELETE FROM assessments WHERE id = $1`, [row.id]);
      }

      await query(`DELETE FROM candidate_invites WHERE id = $1 AND vacancy_id = $2`, [inviteId, vacancyId]);

      for (const cid of candidateIds) {
        const left = await queryRead(`SELECT 1 FROM assessments WHERE candidate_id = $1 LIMIT 1`, [cid]);
        if (left.rowCount === 0) {
          const cand = await queryRead(`SELECT full_name AS "fullName" FROM candidates WHERE id = $1`, [cid]);
          const fullName = cand.rows?.[0]?.fullName ?? null;
          await query(`DELETE FROM candidates WHERE id = $1`, [cid]);
          if (fullName) {
            await query(`DELETE FROM results WHERE LOWER(name) = LOWER($1)`, [fullName]).catch(() => {});
          }
        }
      }
    } else {
      await query(`DELETE FROM candidate_invites WHERE id = $1 AND vacancy_id = $2`, [inviteId, vacancyId]);
    }

    await audit({
      actorUserId: payload.userId || null,
      action: 'candidate_invite.delete',
      targetType: 'candidate_invite',
      targetId: String(inviteId),
      metadata: { vacancyId: String(vacancyId), priorStatus: status },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
