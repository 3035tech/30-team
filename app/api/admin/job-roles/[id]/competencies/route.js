import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../../lib/admin-api.js';
import { CAP } from '../../../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../../../lib/api-error.js';
import { z, zPositiveInt } from '../../../../../../lib/validate.js';
import {
  listJobRoleCompetencies,
  setJobRoleCompetencies,
} from '../../../../../../lib/people/formal-competency-reviews.js';
import { audit } from '../../../../../../lib/audit.js';

const querySchema = z.object({
  companyId: zPositiveInt.optional(),
});

const putBodySchema = z.object({
  companyId: zPositiveInt.optional(),
  competencyIds: z.array(zPositiveInt).max(30).default([]),
});

/** GET /api/admin/job-roles/[id]/competencies */
export const GET = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    query: querySchema,
    companyFrom: 'query',
    logLabel: 'job-role-competencies GET',
  },
  async ({ companyId, params }) => {
    const jobRoleId = Number(params?.id);
    if (!Number.isFinite(jobRoleId) || jobRoleId <= 0) {
      return NextResponse.json({ ok: false, errorCode: ERR.INVALID_ID }, { status: 400 });
    }
    const items = await listJobRoleCompetencies(null, { companyId, jobRoleId });
    return NextResponse.json({ ok: true, items });
  }
);

/** PUT /api/admin/job-roles/[id]/competencies */
export const PUT = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    body: putBodySchema,
    companyFrom: 'body',
    logLabel: 'job-role-competencies PUT',
  },
  async ({ request, payload, companyId, body, params }) => {
    const jobRoleId = Number(params?.id);
    if (!Number.isFinite(jobRoleId) || jobRoleId <= 0) {
      return apiErrorFromResult(request, { ok: false, errorCode: ERR.INVALID_ID });
    }
    const result = await setJobRoleCompetencies(null, {
      companyId,
      jobRoleId,
      competencyIds: body.competencyIds,
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.INVALID_DATA });
    }
    await audit({
      action: 'job_role_competencies_set',
      actorUserId: payload.userId,
      targetType: 'job_role',
      targetId: jobRoleId,
      metadata: { companyId, count: result.items?.length || 0 },
    });
    return NextResponse.json({ ok: true, items: result.items });
  }
);
