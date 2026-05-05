import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../lib/auth';
import { query } from '../../../../../lib/db';
import { audit } from '../../../../../lib/audit';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

export async function GET(_request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireRole(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = params?.id;
  const c = await query(
    `SELECT id, company_id AS "companyId", full_name AS "fullName", email, consent_at AS "consentAt", created_at AS "createdAt"
     FROM candidates WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (c.rowCount === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  if (!isAdmin && String(c.rows[0].companyId) !== String(companyId)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const a = await query(
    `SELECT ass.id,
            ar.key AS "areaKey",
            ar.label AS "areaLabel",
            ass.top_type AS "topType",
            ass.scores,
            ass.created_at AS "createdAt",
            ass.source,
            ass.vacancy_id AS "vacancyId",
            v.title AS "vacancyTitle",
            ass.pipeline_stage AS "pipelineStage",
            ass.invite_id AS "inviteId"
     FROM assessments ass
     JOIN areas ar ON ar.id = ass.area_id
     LEFT JOIN vacancies v ON v.id = ass.vacancy_id
     WHERE ass.candidate_id = $1
     ORDER BY ass.created_at DESC`,
    [id]
  );

  await audit({
    actorUserId: payload.userId || null,
    action: 'candidate.export_json',
    targetType: 'candidate',
    targetId: id,
  });

  return NextResponse.json({ candidate: c.rows[0], assessments: a.rows });
}

export async function DELETE(_request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireRole(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = params?.id;
  if (!isAdmin) {
    const owned = await query(`SELECT id FROM candidates WHERE id = $1 AND company_id = $2 LIMIT 1`, [id, companyId]);
    if (owned.rowCount === 0) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const cand = await query(`SELECT full_name AS "fullName" FROM candidates WHERE id = $1 LIMIT 1`, [id]);
  if (cand.rowCount === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  const fullName = cand.rows?.[0]?.fullName || null;

  const del = await query(`DELETE FROM candidates WHERE id = $1 RETURNING id`, [id]);
  if (del.rowCount === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  // Best-effort cleanup: legacy table used by /api/results
  if (fullName) {
    await query(`DELETE FROM results WHERE LOWER(name) = LOWER($1)`, [fullName]);
  }

  await audit({
    actorUserId: payload.userId || null,
    action: 'candidate.delete',
    targetType: 'candidate',
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}

