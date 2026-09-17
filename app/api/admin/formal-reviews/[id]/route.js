import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../lib/admin-api.js';
import { CAP } from '../../../../../lib/ae/require-admin.js';
import { apiError, ERR } from '../../../../../lib/api-error.js';
import { z, zPositiveInt } from '../../../../../lib/validate.js';
import { getFormalReviewDetail } from '../../../../../lib/people/formal-competency-reviews.js';
import { publicAppUrl } from '../../../../../lib/ae/require-admin.js';

const querySchema = z.object({
  companyId: zPositiveInt.optional(),
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

/** GET /api/admin/formal-reviews/[id] */
export const GET = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    query: querySchema,
    companyFrom: 'query',
    logLabel: 'formal-reviews GET',
  },
  async ({ request, companyId, params }) => {
    const reviewId = Number(params?.id);
    if (!Number.isFinite(reviewId) || reviewId <= 0) {
      return apiError(request, ERR.INVALID_ID, 400);
    }
    const review = await getFormalReviewDetail(null, { companyId, reviewId });
    if (!review) return apiError(request, ERR.NOT_FOUND, 404);
    return NextResponse.json({ ok: true, review: withInviteUrls(request, review) });
  }
);
