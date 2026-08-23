import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import { apiError } from '../../../../../../lib/api-error';
import { audit } from '../../../../../../lib/audit';
import { CAP, getManagerScope, getSessionPayload, requireCapability } from '../../../../../../lib/ae/require-admin';
import {
  listRetentionFollowUps,
  openRetentionFollowUp,
} from '../../../../../../lib/people/retention-followups';

async function loadCandidateScope(candidateId, scope) {
  const c = await query(
    `SELECT id, company_id AS "companyId" FROM candidates WHERE id = $1 LIMIT 1`,
    [candidateId]
  );
  if (c.rowCount === 0) return { error: 'NOT_FOUND' };
  if (!scope.isAdmin && String(c.rows[0].companyId) !== String(scope.companyId)) {
    return { error: 'UNAUTHORIZED' };
  }
  return { candidate: c.rows[0] };
}

/** GET /api/admin/candidates/[id]/retention-followups */
export async function GET(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.TEAM_VIEW)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const candidateId = params?.id;
    if (!candidateId) return apiError(request, 'INVALID_ID', 400);
    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) return apiError(request, loaded.error, loaded.error === 'NOT_FOUND' ? 404 : 401);

    const items = await listRetentionFollowUps(query, {
      companyId: loaded.candidate.companyId,
      candidateId,
    });
    return NextResponse.json({ items });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('GET retention-followups', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

/** POST /api/admin/candidates/[id]/retention-followups — open actionable plan */
export async function POST(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.TEAM_VIEW)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const candidateId = params?.id;
    if (!candidateId) return apiError(request, 'INVALID_ID', 400);
    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) return apiError(request, loaded.error, loaded.error === 'NOT_FOUND' ? 404 : 401);

    const body = await request.json().catch(() => ({}));
    const opened = await openRetentionFollowUp(query, {
      companyId: loaded.candidate.companyId,
      candidateId,
      signals: body.signals,
      explanation: body.explanation,
      suggestedQuestion: body.suggestedQuestion,
      reviewDue: body.reviewDue,
      createdByUserId: payload.userId || null,
      locale: body.locale || payload.locale || 'pt-BR',
    });
    if (!opened.ok) return apiError(request, opened.errorCode || 'INVALID_DATA', 400);

    await audit({
      actorUserId: payload.userId || null,
      action: 'retention_followup.open',
      targetType: 'candidate',
      targetId: candidateId,
      metadata: { followUpId: opened.followUp?.id, planId: opened.plan?.id },
    });

    return NextResponse.json(
      { ok: true, followUp: opened.followUp, plan: opened.plan },
      { status: 201 }
    );
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('POST retention-followups', err);
    return apiError(request, 'INTERNAL', 500);
  }
}
