import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../../lib/admin-api.js';
import { CAP } from '../../../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../../../lib/api-error.js';
import { z, zPositiveInt } from '../../../../../../lib/validate.js';
import { addFormalReviewItem } from '../../../../../../lib/people/formal-competency-reviews.js';
import { audit } from '../../../../../../lib/audit.js';

const bodySchema = z.object({
  companyId: zPositiveInt.optional(),
  label: z.string().trim().min(1).max(200),
  competencyId: zPositiveInt.optional().nullable(),
});

/** POST /api/admin/formal-reviews/[id]/items */
export const POST = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    body: bodySchema,
    companyFrom: 'body',
    logLabel: 'formal-review-items POST',
  },
  async ({ request, payload, companyId, body, params }) => {
    const reviewId = Number(params?.id);
    if (!Number.isFinite(reviewId) || reviewId <= 0) {
      return apiErrorFromResult(request, { ok: false, errorCode: ERR.INVALID_ID });
    }
    const result = await addFormalReviewItem(null, {
      companyId,
      reviewId,
      label: body.label,
      competencyId: body.competencyId,
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.CREATE_FAILED });
    }
    await audit({
      action: 'formal_review_item_add',
      actorUserId: payload.userId,
      targetType: 'formal_review',
      targetId: reviewId,
      metadata: { companyId, itemId: result.item.id },
    });
    return NextResponse.json({ ok: true, item: result.item }, { status: 201 });
  }
);
