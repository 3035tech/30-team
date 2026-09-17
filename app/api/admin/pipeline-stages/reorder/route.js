import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../lib/admin-api.js';
import { CAP } from '../../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../../lib/api-error.js';
import { z, zPositiveInt } from '../../../../../lib/validate.js';
import { reorderCompanyPipelineStages } from '../../../../../lib/company-pipeline-stages.js';
import { reorderVacancyPipelineStages } from '../../../../../lib/pipeline-templates.js';

const reorderBodySchema = z.object({
  companyId: zPositiveInt.optional(),
  orderedIds: z.array(zPositiveInt).min(1).max(50),
  vacancyId: zPositiveInt.optional(),
});

/** POST /api/admin/pipeline-stages/reorder — bulk apply DnD order. */
export const POST = withAdminApi(
  {
    cap: CAP.VACANCIES_MANAGE,
    body: reorderBodySchema,
    companyFrom: 'body',
    logLabel: 'pipeline-stages/reorder POST',
  },
  async ({ request, companyId, body }) => {
    const result = body.vacancyId
      ? await reorderVacancyPipelineStages({
        companyId,
        vacancyId: body.vacancyId,
        orderedIds: body.orderedIds,
      })
      : await reorderCompanyPipelineStages({
      companyId,
      orderedIds: body.orderedIds,
      });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.UPDATE_FAILED });
    }
    return NextResponse.json({ ok: true, stages: result.stages }, { status: 200 });
  }
);
