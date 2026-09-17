import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../lib/admin-api.js';
import { CAP } from '../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../lib/api-error.js';
import { z, zPositiveInt } from '../../../../lib/validate.js';
import {
  createPipelineTemplateFromVacancy,
  listPipelineTemplates,
} from '../../../../lib/pipeline-templates.js';

const listQuerySchema = z.object({ companyId: zPositiveInt.optional() });
const createBodySchema = z.object({
  companyId: zPositiveInt.optional(),
  vacancyId: zPositiveInt,
  name: z.string().trim().min(1).max(80),
  isDefault: z.boolean().optional(),
});

export const GET = withAdminApi(
  {
    cap: CAP.VACANCIES_MANAGE,
    query: listQuerySchema,
    companyFrom: 'query',
    logLabel: 'pipeline-templates GET',
  },
  async ({ companyId }) => NextResponse.json({
    ok: true,
    templates: await listPipelineTemplates(companyId),
  })
);

export const POST = withAdminApi(
  {
    cap: CAP.VACANCIES_MANAGE,
    body: createBodySchema,
    companyFrom: 'body',
    logLabel: 'pipeline-templates POST',
  },
  async ({ request, companyId, body }) => {
    const result = await createPipelineTemplateFromVacancy({
      companyId,
      vacancyId: body.vacancyId,
      name: body.name,
      isDefault: body.isDefault === true,
    });
    if (!result.ok) return apiErrorFromResult(request, result, { fallbackCode: ERR.CREATE_FAILED });
    return NextResponse.json(result, { status: 201 });
  }
);
