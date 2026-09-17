import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../lib/admin-api.js';
import { CAP } from '../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../lib/api-error.js';
import { z, zPositiveInt } from '../../../../lib/validate.js';
import {
  listCompanyPipelineStages,
  createCompanyPipelineStage,
  readCompanyStageUsageMap,
  PIPELINE_CANONICAL_KEYS,
} from '../../../../lib/company-pipeline-stages.js';

const listQuerySchema = z.object({
  companyId: zPositiveInt.optional(),
  includeCounts: z.enum(['1', 'true']).optional(),
});

const createBodySchema = z.object({
  companyId: zPositiveInt.optional(),
  labelPt: z.string().trim().min(1).max(60),
  labelEn: z.string().trim().min(1).max(60).optional(),
  canonicalKey: z.enum(/** @type {[string, ...string[]]} */ (PIPELINE_CANONICAL_KEYS)).optional(),
});

/**
 * GET  /api/admin/pipeline-stages  — list stages (with lazy seed) + optional counts
 * POST /api/admin/pipeline-stages  — create custom stage
 *
 * Cap: vacancies.manage (admin/direction/hr only).
 */

export const GET = withAdminApi(
  {
    cap: CAP.VACANCIES_MANAGE,
    query: listQuerySchema,
    companyFrom: 'query',
    logLabel: 'pipeline-stages GET',
  },
  async ({ companyId, query }) => {
    const stages = await listCompanyPipelineStages(companyId);
    const includeCounts = query.includeCounts === '1' || query.includeCounts === 'true';
    if (!includeCounts) {
      return NextResponse.json({ ok: true, stages }, { status: 200 });
    }
    const usage = await readCompanyStageUsageMap(companyId);
    const decorated = stages.map((s) => ({ ...s, count: usage[s.stageKey] || 0 }));
    return NextResponse.json({ ok: true, stages: decorated }, { status: 200 });
  }
);

export const POST = withAdminApi(
  {
    cap: CAP.VACANCIES_MANAGE,
    body: createBodySchema,
    companyFrom: 'body',
    logLabel: 'pipeline-stages POST',
  },
  async ({ request, companyId, body }) => {
    const result = await createCompanyPipelineStage({
      companyId,
      labelPt: body.labelPt,
      labelEn: body.labelEn ?? body.labelPt,
      canonicalKey: body.canonicalKey,
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.CREATE_FAILED });
    }
    return NextResponse.json({ ok: true, stage: result.stage }, { status: 201 });
  }
);
