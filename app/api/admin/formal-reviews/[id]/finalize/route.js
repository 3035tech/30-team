import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../../lib/admin-api.js';
import { CAP } from '../../../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../../../lib/api-error.js';
import { z, zPositiveInt } from '../../../../../../lib/validate.js';
import { finalizeFormalReview } from '../../../../../../lib/people/formal-competency-reviews.js';
import { audit } from '../../../../../../lib/audit.js';

const bodySchema = z.object({
  companyId: zPositiveInt.optional(),
});

/** POST /api/admin/formal-reviews/[id]/finalize */
export const POST = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    body: bodySchema,
    companyFrom: 'body',
    logLabel: 'formal-review-finalize POST',
  },
  async ({ request, payload, companyId, params }) => {
    const reviewId = Number(params?.id);
    if (!Number.isFinite(reviewId) || reviewId <= 0) {
      return apiErrorFromResult(request, { ok: false, errorCode: ERR.INVALID_ID });
    }
    const result = await finalizeFormalReview(null, { companyId, reviewId });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.INVALID_DATA });
    }
    await audit({
      action: 'formal_review_finalize',
      actorUserId: payload.userId,
      targetType: 'formal_review',
      targetId: reviewId,
      metadata: { companyId },
    });
    return NextResponse.json({ ok: true, review: result.review });
  }
);
