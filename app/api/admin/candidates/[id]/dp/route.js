import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db.js';
import { apiError, apiErrorFromResult, ERR } from '../../../../../../lib/api-error.js';
import {
  CAP,
  getManagerScope,
  getSessionPayload,
  requireAnyCapability,
} from '../../../../../../lib/ae/require-admin.js';
import {
  getDpProfile,
  listDpDocuments,
  listLeaveRequests,
  upsertDpProfile,
  ensureDpDocuments,
} from '../../../../../../lib/people/employee-dp.js';

const DP_OR_TEAM = Object.freeze([CAP.DP_VIEW, CAP.TEAM_VIEW]);

async function loadCandidateScope(candidateId, scope) {
  const c = await query(
    `SELECT id, company_id AS "companyId",
            employment_status AS "employmentStatus"
     FROM candidates WHERE id = $1 LIMIT 1`,
    [candidateId]
  );
  if (c.rowCount === 0) return { error: ERR.NOT_FOUND };
  if (!scope.isAdmin && String(c.rows[0].companyId) !== String(scope.companyId)) {
    return { error: ERR.UNAUTHORIZED };
  }
  return { candidate: c.rows[0] };
}

/** GET /api/admin/candidates/[id]/dp — profile + docs + leaves */
export async function GET(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireAnyCapability(payload, DP_OR_TEAM)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const candidateId = params?.id;
    if (!candidateId) return apiError(request, ERR.INVALID_ID, 400);
    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) {
      return apiError(request, loaded.error, loaded.error === ERR.NOT_FOUND ? 404 : 401);
    }
    const companyId = loaded.candidate.companyId;
    await ensureDpDocuments({ query }, { companyId, candidateId });
    const [profile, docs, leaves] = await Promise.all([
      getDpProfile({ query }, { companyId, candidateId }),
      listDpDocuments({ query }, { companyId, candidateId }),
      listLeaveRequests({ query }, {
        companyId,
        candidateId,
        page: 1,
        pageSize: 50,
        status: 'all',
      }),
    ]);
    if (!profile.ok) return apiErrorFromResult(request, profile);
    if (!docs.ok) return apiErrorFromResult(request, docs);
    return NextResponse.json({
      profile: profile.profile,
      documents: docs.items,
      leaves: leaves.items,
      employmentStatus: loaded.candidate.employmentStatus,
    });
  } catch (err) {
    console.error('GET /api/admin/candidates/[id]/dp', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/** PATCH — upsert DP profile */
export async function PATCH(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireAnyCapability(payload, DP_OR_TEAM)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const candidateId = params?.id;
    if (!candidateId) return apiError(request, ERR.INVALID_ID, 400);
    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) {
      return apiError(request, loaded.error, loaded.error === ERR.NOT_FOUND ? 404 : 401);
    }

    const body = await request.json().catch(() => ({}));
    const result = await upsertDpProfile({ query }, {
      companyId: loaded.candidate.companyId,
      candidateId,
      userId: payload.userId,
      allowAlumni: true,
      emergencyName: body.emergencyName,
      emergencyPhone: body.emergencyPhone,
      emergencyRelation: body.emergencyRelation,
      addressLine: body.addressLine,
      addressCity: body.addressCity,
      addressState: body.addressState,
      addressPostal: body.addressPostal,
      internalNotes: body.internalNotes,
    });
    if (!result.ok) return apiErrorFromResult(request, result);
    return NextResponse.json({ ok: true, profile: result.profile });
  } catch (err) {
    console.error('PATCH /api/admin/candidates/[id]/dp', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
