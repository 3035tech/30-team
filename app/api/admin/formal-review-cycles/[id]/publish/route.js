import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../../lib/admin-api.js';
import { CAP } from '../../../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../../../lib/api-error.js';
import { z, zPositiveInt } from '../../../../../../lib/validate.js';
import { withTransaction } from '../../../../../../lib/db.js';
import { openFormalReview } from '../../../../../../lib/people/formal-competency-reviews.js';
import { audit } from '../../../../../../lib/audit.js';

export const POST = withAdminApi({ cap: CAP.PERFORMANCE_VIEW, body: z.object({ companyId: zPositiveInt.optional() }), companyFrom: 'body', logLabel: 'formal-cycle-publish' }, async ({ request, payload, companyId, params }) => {
  const cycleId = Number(params?.id);
  if (!Number.isSafeInteger(cycleId) || cycleId <= 0) return apiErrorFromResult(request, { ok: false, errorCode: ERR.INVALID_ID });
  try {
    const count = await withTransaction(async db => {
      const cycle = await db.query('SELECT status, period_start, period_end FROM formal_review_cycles WHERE id = $1 AND company_id = $2 FOR UPDATE', [cycleId, companyId]);
      const fail = errorCode => { const error = new Error('Cycle publication rejected'); error.publicationResult = { ok: false, errorCode }; throw error; };
      if (!cycle.rowCount) fail(ERR.NOT_FOUND);
      if (cycle.rows[0].status !== 'draft') fail(ERR.INVALID_STATUS);
      if (!cycle.rows[0].period_start || !cycle.rows[0].period_end) fail(ERR.INVALID_DATA);
      const competencies = await db.query('SELECT id FROM formal_cycle_competencies WHERE cycle_id = $1 AND company_id = $2', [cycleId, companyId]);
      if (!competencies.rowCount) fail(ERR.INVALID_DATA);
      const reviews = await db.query('SELECT id FROM formal_reviews WHERE cycle_id = $1 AND company_id = $2 ORDER BY id', [cycleId, companyId]);
      if (!reviews.rowCount) fail(ERR.INVALID_DATA);
      for (const review of reviews.rows) {
        const result = await openFormalReview(db, { companyId, reviewId: review.id, managerUserId: payload.userId });
        if (!result.ok) fail(result.errorCode);
      }
      return reviews.rowCount;
    });
    await audit({ actorUserId: payload.userId, action: 'formal_review_cycle_publish', targetType: 'formal_review_cycle', targetId: cycleId, metadata: { companyId, count } });
    return NextResponse.json({ ok: true, count });
  } catch (error) {
    if (error.publicationResult) return apiErrorFromResult(request, error.publicationResult);
    throw error;
  }
});
