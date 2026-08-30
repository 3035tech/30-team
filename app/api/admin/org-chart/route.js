/**
 * GET  /api/admin/org-chart
 * PATCH /api/admin/org-chart — set manager (body)
 */

import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../lib/admin-api.js';
import { CAP } from '../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../lib/api-error.js';
import { audit, auditRequestContext } from '../../../../lib/audit.js';
import { z, zPositiveInt } from '../../../../lib/validate.js';
import {
  getCandidateManager,
  listOrgChart,
  setCandidateManager,
} from '../../../../lib/people/org-chart.js';

const listQuerySchema = z.object({
  companyId: zPositiveInt.optional(),
  candidateId: zPositiveInt.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const patchBodySchema = z.object({
  companyId: zPositiveInt.optional(),
  candidateId: zPositiveInt,
  managerCandidateId: zPositiveInt.nullable().optional(),
});

export const GET = withAdminApi(
  {
    cap: CAP.TEAM_VIEW,
    query: listQuerySchema,
    companyFrom: 'query',
    logLabel: 'org-chart GET',
  },
  async ({ request, companyId, query }) => {
    if (query.candidateId) {
      const one = await getCandidateManager(null, {
        companyId,
        candidateId: query.candidateId,
      });
      if (!one.ok) {
        return apiErrorFromResult(request, one, { fallbackCode: ERR.NOT_FOUND });
      }
      return NextResponse.json(one);
    }
    const result = await listOrgChart(null, {
      companyId,
      limit: query.limit,
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.COMPANY_REQUIRED });
    }
    return NextResponse.json(result);
  }
);

export const PATCH = withAdminApi(
  {
    cap: CAP.TEAM_VIEW,
    body: patchBodySchema,
    companyFrom: 'body',
    logLabel: 'org-chart PATCH',
  },
  async ({ request, companyId, body, payload }) => {
    const result = await setCandidateManager(null, {
      companyId,
      candidateId: body.candidateId,
      managerCandidateId: body.managerCandidateId ?? null,
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.INVALID_DATA });
    }
    await audit({
      actorUserId: payload.userId || null,
      action: 'org_chart.set_manager',
      companyId,
      targetType: 'candidate',
      targetId: body.candidateId,
      metadata: { managerCandidateId: result.managerCandidateId },
      ...auditRequestContext(request),
    });
    return NextResponse.json(result);
  }
);
