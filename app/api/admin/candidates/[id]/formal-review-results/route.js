import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import { apiError, ERR } from '../../../../../../lib/api-error';
import { CAP, getManagerScope, getSessionPayload, requireCapability } from '../../../../../../lib/ae/require-admin';
import { getFormalReviewDetail } from '../../../../../../lib/people/formal-competency-reviews';

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
    const results = [];
    for (const row of rows.rows) {
      const detail = await getFormalReviewDetail(query, { companyId, reviewId: row.id });
      // Upward scores evaluate the manager, never the subject of this profile.
      const subjectRaters = new Set(detail.raters.filter(rater => rater.role !== 'upward').map(rater => String(rater.id)));
      results.push({
        id: detail.id, cycleTitle: detail.cycleTitle, periodStart: detail.periodStart, periodEnd: detail.periodEnd,
        finalizedAt: detail.finalizedAt, model: detail.model,
        items: detail.items.map(item => {
          const scores = detail.scores.filter(score => String(score.itemId) === String(item.id) && subjectRaters.has(String(score.raterId)));
          return { id: item.id, label: item.label, description: item.description,
            average: scores.length ? scores.reduce((sum, score) => sum + Number(score.score), 0) / scores.length : null,
            responses: scores.length };
        }),
      });
    }
    return NextResponse.json({ results });
  } catch (error) {
    console.error('formal-review-results GET', error);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
