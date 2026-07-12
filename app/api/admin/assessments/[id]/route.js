import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../lib/auth';
import { query, queryRead } from '../../../../../lib/db';
import { audit } from '../../../../../lib/audit';
import { apiError } from '../../../../../lib/api-error';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

const PIPELINE = new Set([
  'new',
  'test_completed',
  'screening',
  'interview',
  'approved',
  'rejected',
  'archived',
]);

export async function PATCH(request, { params }) {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value;
    const payload = session ? verifyToken(session) : null;
    if (!requireRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);

    const isAdmin = payload?.role === 'admin';
    const companyId = payload?.companyId ?? null;
    if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

    const id = params?.id;
    if (!id) return apiError(request, 'INVALID_ID', 400);

    const body = await request.json().catch(() => ({}));
    const stage = body.pipelineStage != null ? String(body.pipelineStage).trim() : null;
    if (stage == null || !PIPELINE.has(stage)) {
      return apiError(request, 'INVALID_PIPELINE_STAGE', 400);
    }

    const own = await queryRead(
      `SELECT ass.id, ass.pipeline_stage AS "currentStage" FROM assessments ass
       WHERE ass.id = $1 ${!isAdmin ? 'AND ass.company_id = $2' : ''}
       LIMIT 1`,
      !isAdmin ? [id, companyId] : [id]
    );
    if (own.rowCount === 0) return apiError(request, 'NOT_FOUND', 404);
    const currentStage = own.rows[0]?.currentStage || null;

    const up = await query(
      `UPDATE assessments SET pipeline_stage = $2 WHERE id = $1 RETURNING id, pipeline_stage AS "pipelineStage"`,
      [id, stage]
    );

    await query(
      `INSERT INTO assessment_pipeline_history (assessment_id, from_stage, to_stage, changed_by_user_id)
       VALUES ($1, $2, $3, $4)`,
      [id, currentStage, stage, payload.userId || null]
    ).catch(() => {});

    await audit({
      actorUserId: payload.userId || null,
      action: 'assessment.pipeline_update',
      targetType: 'assessment',
      targetId: String(id),
      metadata: { pipelineStage: stage },
    });

    return NextResponse.json(up.rows[0]);
  } catch (e) {
    console.error(e);
    return apiError(request, 'INTERNAL', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value;
    const payload = session ? verifyToken(session) : null;
    if (!requireRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);

    const isAdmin = payload?.role === 'admin';
    const companyId = payload?.companyId ?? null;
    if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

    const id = params?.id;
    if (!id) return apiError(request, 'INVALID_ID', 400);

    const row = await queryRead(
      `SELECT ass.id, ass.invite_id AS "inviteId"
       FROM assessments ass
       WHERE ass.id = $1 ${!isAdmin ? 'AND ass.company_id = $2' : ''}
       LIMIT 1`,
      !isAdmin ? [id, companyId] : [id]
    );
    if (row.rowCount === 0) return apiError(request, 'NOT_FOUND', 404);

    const inviteId = row.rows[0]?.inviteId;

    await query(`DELETE FROM assessments WHERE id = $1`, [id]);

    if (inviteId != null) {
      await query(
        `UPDATE candidate_invites SET status = 'opened', completed_at = NULL WHERE id = $1`,
        [inviteId]
      );
    }

    await audit({
      actorUserId: payload.userId || null,
      action: 'assessment.delete_retake',
      targetType: 'assessment',
      targetId: String(id),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return apiError(request, 'INTERNAL', 500);
  }
}
