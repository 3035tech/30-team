import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../../lib/admin-api.js';
import { CAP } from '../../../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../../../lib/api-error.js';
import { z, zPositiveInt } from '../../../../../../lib/validate.js';
import {
  FORMAL_LIKERT_MAX,
  FORMAL_LIKERT_MIN,
} from '../../../../../../lib/domain-status.js';
import { submitManagerRatings } from '../../../../../../lib/people/formal-competency-reviews.js';
import { audit } from '../../../../../../lib/audit.js';

const scoreRow = z.object({
  itemId: zPositiveInt,
  score: z.coerce.number().int().min(FORMAL_LIKERT_MIN).max(FORMAL_LIKERT_MAX),
  notes: z.string().max(2000).optional().nullable(),
});

const bodySchema = z.object({
  companyId: zPositiveInt.optional(),
  scores: z.array(scoreRow).min(1).max(30),
  overallNotes: z.string().max(4000).optional().nullable(),
});

/** POST /api/admin/formal-reviews/[id]/manager-scores */
export const POST = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    body: bodySchema,
    companyFrom: 'body',
    logLabel: 'formal-review-manager-scores POST',
  },
  async ({ request, payload, companyId, body, params }) => {
    const reviewId = Number(params?.id);
    if (!Number.isFinite(reviewId) || reviewId <= 0) {
      return apiErrorFromResult(request, { ok: false, errorCode: ERR.INVALID_ID });
    }
    const result = await submitManagerRatings(null, {
      companyId,
      reviewId,
      managerUserId: payload.userId,
      scores: body.scores,
      overallNotes: body.overallNotes || '',
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.INVALID_DATA });
    }
    await audit({
      action: 'formal_review_manager_scores',
      actorUserId: payload.userId,
      targetType: 'formal_review',
      targetId: reviewId,
      metadata: { companyId },
    });
    return NextResponse.json({ ok: true, review: result.review });
  }
);
