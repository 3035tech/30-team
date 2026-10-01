import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import { apiError, ERR } from '../../../../../../lib/api-error';
import { CAP, getManagerScope, getSessionPayload, requireCapability } from '../../../../../../lib/ae/require-admin';
import { getFormalReviewDetail } from '../../../../../../lib/people/formal-competency-reviews';
import { DB_FANOUT_CONCURRENCY, mapWithConcurrency } from '../../../../../../lib/concurrency';

/** Completed results in the personnel profile, with the existing performance permission. */
export async function GET(request, props) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.PERFORMANCE_VIEW) || !requireCapability(payload, CAP.TEAM_VIEW)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);
    const { id } = await props.params;
    if (!/^\d+$/.test(String(id))) return apiError(request, ERR.INVALID_ID, 400);
    const candidate = await query('SELECT company_id FROM candidates WHERE id = $1', [id]);
    if (!candidate.rowCount || (!scope.isAdmin && String(candidate.rows[0].company_id) !== String(scope.companyId))) return apiError(request, ERR.NOT_FOUND, 404);
    const companyId = candidate.rows[0].company_id;
    const rows = await query(`SELECT id FROM formal_reviews WHERE company_id = $1 AND subject_candidate_id = $2 AND status IN ('finalized','sent','archived') ORDER BY finalized_at DESC NULLS LAST, id DESC LIMIT 20`, [companyId, id]);
    const details = await mapWithConcurrency(rows.rows, DB_FANOUT_CONCURRENCY,
      row => getFormalReviewDetail(query, { companyId, reviewId: row.id }));
    const results = details.map((detail) => {
      // Upward scores evaluate the manager, never the subject of this profile.
      const subjectRaters = new Set(detail.raters.filter(rater => rater.role !== 'upward').map(rater => String(rater.id)));
      const totals = new Map();
      for (const score of detail.scores) {
        if (!subjectRaters.has(String(score.raterId))) continue;
        const key = String(score.itemId);
        const acc = totals.get(key) || { sum: 0, count: 0 };
        acc.sum += Number(score.score);
        acc.count += 1;
        totals.set(key, acc);
      }
      return {
        id: detail.id, cycleTitle: detail.cycleTitle, periodStart: detail.periodStart, periodEnd: detail.periodEnd,
        finalizedAt: detail.finalizedAt, model: detail.model,
        items: detail.items.map(item => {
          const acc = totals.get(String(item.id));
          return { id: item.id, label: item.label, description: item.description,
            average: acc ? acc.sum / acc.count : null,
            responses: acc ? acc.count : 0 };
        }),
      };
    });
    return NextResponse.json({ results });
  } catch (error) {
    console.error('formal-review-results GET', error);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
