import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../lib/admin-api.js';
import { CAP } from '../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../lib/api-error.js';
import { z, zPositiveInt, zQueryBool } from '../../../../lib/validate.js';
import {
  listCompanyCompetencies,
  createCompanyCompetency,
} from '../../../../lib/people/formal-competency-reviews.js';
import { audit } from '../../../../lib/audit.js';

const listQuerySchema = z.object({
  companyId: zPositiveInt.optional(),
  includeInactive: zQueryBool,
  limit: z.coerce.number().int().min(1).max(40).optional().default(40),
});

const createBodySchema = z.object({
  companyId: zPositiveInt.optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
});

/** GET /api/admin/formal-competencies */
export const GET = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    query: listQuerySchema,
    companyFrom: 'query',
    logLabel: 'formal-competencies GET',
  },
  async ({ companyId, query }) => {
    const competencies = await listCompanyCompetencies(null, {
      companyId,
      includeInactive: query.includeInactive,
      limit: query.limit,
    });
    return NextResponse.json({ ok: true, competencies });
  }
);

/** POST /api/admin/formal-competencies */
export const POST = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    body: createBodySchema,
    companyFrom: 'body',
    logLabel: 'formal-competencies POST',
  },
  async ({ request, payload, companyId, body }) => {
    const result = await createCompanyCompetency(null, {
      companyId,
      name: body.name,
      description: body.description || '',
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.CREATE_FAILED });
    }
    await audit({
      action: 'formal_competency_create',
      actorUserId: payload.userId,
      targetType: 'company_competency',
      targetId: result.competency.id,
      metadata: { companyId, name: result.competency.name },
    });
    return NextResponse.json({ ok: true, competency: result.competency }, { status: 201 });
  }
);
