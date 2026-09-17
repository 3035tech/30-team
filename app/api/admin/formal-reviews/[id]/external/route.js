import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../../lib/admin-api.js';
import { CAP } from '../../../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../../../lib/api-error.js';
import { z, zPositiveInt } from '../../../../../../lib/validate.js';
import { setFormalReviewExternal } from '../../../../../../lib/people/formal-competency-reviews.js';
import { audit } from '../../../../../../lib/audit.js';
import { publicAppUrl } from '../../../../../../lib/ae/require-admin.js';

const bodySchema = z.object({
  companyId: zPositiveInt.optional(),
  externalName: z.string().trim().min(1).max(200),
  externalEmail: z.string().trim().email().max(320),
  externalTitle: z.string().trim().max(200).optional().nullable(),
});

function withInviteUrls(request, review) {
  if (!review) return review;
  const base = publicAppUrl(request);
  const raters = (review.raters || []).map((r) => {
    if (!r.token || !base) return r;
    return { ...r, inviteUrl: `${base}/formal-review/${r.token}` };
  });
  return { ...review, raters };
}

/** PATCH /api/admin/formal-reviews/[id]/external */
export const PATCH = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    body: bodySchema,
    companyFrom: 'body',
    logLabel: 'formal-review-external PATCH',
  },
  async ({ request, payload, companyId, body, params }) => {
    const reviewId = Number(params?.id);
    if (!Number.isFinite(reviewId) || reviewId <= 0) {
      return apiErrorFromResult(request, { ok: false, errorCode: ERR.INVALID_ID });
    }
    const result = await setFormalReviewExternal(null, {
      companyId,
      reviewId,
      externalName: body.externalName,
      externalEmail: body.externalEmail,
      externalTitle: body.externalTitle || '',
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.INVALID_DATA });
    }
    await audit({
      action: 'formal_review_external_set',
      actorUserId: payload.userId,
      targetType: 'formal_review',
      targetId: reviewId,
      metadata: { companyId },
    });
    return NextResponse.json({ ok: true, review: withInviteUrls(request, result.review) });
  }
);
