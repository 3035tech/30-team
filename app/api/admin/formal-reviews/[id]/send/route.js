import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../../lib/admin-api.js';
import { CAP } from '../../../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../../../lib/api-error.js';
import { z, zPositiveInt } from '../../../../../../lib/validate.js';
import { sendFormalReviewToSubject } from '../../../../../../lib/people/formal-competency-reviews.js';
import { audit } from '../../../../../../lib/audit.js';

const bodySchema = z.object({
  companyId: zPositiveInt.optional(),
});

/** POST /api/admin/formal-reviews/[id]/send */
export const POST = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    body: bodySchema,
    companyFrom: 'body',
    logLabel: 'formal-review-send POST',
  },
  async ({ request, payload, companyId, params }) => {
    const reviewId = Number(params?.id);
    if (!Number.isFinite(reviewId) || reviewId <= 0) {
      return apiErrorFromResult(request, { ok: false, errorCode: ERR.INVALID_ID });
    }
    const result = await sendFormalReviewToSubject(null, { companyId, reviewId });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.INVALID_DATA });
    }
    await audit({
      action: 'formal_review_send',
      actorUserId: payload.userId,
      targetType: 'formal_review',
      targetId: reviewId,
      metadata: { companyId },
    });
    return NextResponse.json({ ok: true, review: result.review });
  }
);
