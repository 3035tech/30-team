import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import { apiError } from '../../../../../../lib/api-error';
import { audit } from '../../../../../../lib/audit';
import {
  getManagerScope,
  getSessionPayload,
  requireManagerRole,
} from '../../../../../../lib/ae/require-admin';
import { createOneOnOne, listOneOnOnes } from '../../../../../../lib/people/one-on-ones';

async function loadCandidateScope(candidateId, scope) {
  const c = await query(
    `SELECT id, company_id AS "companyId", full_name AS "fullName"
     FROM candidates WHERE id = $1 LIMIT 1`,
    [candidateId]
  );
  if (c.rowCount === 0) return { error: 'NOT_FOUND' };
  if (!scope.isAdmin && String(c.rows[0].companyId) !== String(scope.companyId)) {
    return { error: 'UNAUTHORIZED' };
  }
  return { candidate: c.rows[0] };
}

/** GET /api/admin/candidates/[id]/one-on-ones */
export async function GET(request, { params }) {
  try {
    const payload = getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const candidateId = params?.id;
    if (!candidateId) return apiError(request, 'INVALID_ID', 400);

    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) return apiError(request, loaded.error, loaded.error === 'NOT_FOUND' ? 404 : 401);

    const items = await listOneOnOnes(query, {
      candidateId,
      companyId: loaded.candidate.companyId,
      isAdmin: scope.isAdmin,
    });
    return NextResponse.json({ items });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('GET one-on-ones', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

/** POST /api/admin/candidates/[id]/one-on-ones */
export async function POST(request, { params }) {
  try {
    const payload = getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const candidateId = params?.id;
    if (!candidateId) return apiError(request, 'INVALID_ID', 400);

    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) return apiError(request, loaded.error, loaded.error === 'NOT_FOUND' ? 404 : 401);

    const body = await request.json().catch(() => ({}));
    const created = await createOneOnOne(query, {
      companyId: loaded.candidate.companyId,
      candidateId,
      meetingDate: body.meetingDate,
      notes: body.notes,
      nextSteps: body.nextSteps,
      createdByUserId: payload.userId || null,
    });
    if (!created.ok) {
      return apiError(request, created.errorCode || 'INVALID_DATA', 400);
    }

    await audit({
      actorUserId: payload.userId || null,
      action: 'one_on_one.create',
      targetType: 'candidate',
      targetId: candidateId,
      metadata: { oneOnOneId: created.item.id },
    });

    return NextResponse.json({ ok: true, item: created.item });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('POST one-on-ones', err);
    return apiError(request, 'INTERNAL', 500);
  }
}
