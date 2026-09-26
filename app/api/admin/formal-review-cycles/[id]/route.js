import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../lib/admin-api.js';
import { CAP } from '../../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../../lib/api-error.js';
import { z, zPositiveInt } from '../../../../../lib/validate.js';
import {
  FORMAL_REVIEW_CYCLE_STATUSES,
  FORMAL_REVIEW_MODELS,
} from '../../../../../lib/domain-status.js';
import { updateFormalReviewCycle } from '../../../../../lib/people/formal-competency-reviews.js';
import { audit } from '../../../../../lib/audit.js';
import { withTransaction } from '../../../../../lib/db.js';

const patchBodySchema = z.object({
  companyId: zPositiveInt.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(4000).optional().nullable(),
  model: z.enum(/** @type {[string, ...string[]]} */ (FORMAL_REVIEW_MODELS)).optional(),
  includeSelf: z.boolean().optional(),
  status: z.enum(/** @type {[string, ...string[]]} */ (FORMAL_REVIEW_CYCLE_STATUSES)).optional(),
  periodStart: z.string().trim().max(10).optional().nullable(),
  periodEnd: z.string().trim().max(10).optional().nullable(),
  questionnaire: z.array(z.object({ competencyId: zPositiveInt, selfDescription: z.string().max(4000).optional() }).strict()).max(30).optional(),
  instructions: z.string().max(4000).optional(),
  responseScale: z.enum(['agreement', 'frequency']).optional(),
  openQuestions: z.array(z.string().trim().min(1).max(1000)).max(10).optional(),
});

/** PATCH /api/admin/formal-review-cycles/[id] */
export const PATCH = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    body: patchBodySchema,
    companyFrom: 'body',
    logLabel: 'formal-review-cycles PATCH',
  },
  async ({ request, payload, companyId, body, params }) => {
    const cycleId = Number(params?.id);
    if (!Number.isFinite(cycleId) || cycleId <= 0) {
      return apiErrorFromResult(request, { ok: false, errorCode: ERR.INVALID_ID });
    }
    const result = await withTransaction(db => updateFormalReviewCycle(db, {
      companyId,
      cycleId,
      title: body.title,
      description: body.description,
      model: body.model,
      includeSelf: body.includeSelf,
      status: body.status,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      questionnaire: body.questionnaire,
      instructions: body.instructions,
      responseScale: body.responseScale,
      openQuestions: body.openQuestions,
    }));
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.INVALID_DATA });
    }
    await audit({
      action: 'formal_review_cycle_update',
      actorUserId: payload.userId,
      targetType: 'formal_review_cycle',
      targetId: cycleId,
      metadata: { companyId, status: result.cycle.status, model: result.cycle.model },
    });
    return NextResponse.json({ ok: true, cycle: result.cycle });
  }
);
