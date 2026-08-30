/**
 * B-3001 — Calibration queue for submitted performance reviews.
 * Hedged: overall / 9Box cell are conversation aids, not promotion labels.
 */

import { asDb } from '../ae/as-db.js';
import { ERR } from '../api-error-codes.js';
import { PERFORMANCE_REVIEW_STATUS } from '../domain-status.js';

export const CALIBRATION_LIST_CAP = 80;

const OUTCOME_SCORE = Object.freeze({
  exceeded: 100,
  met: 75,
  develop: 50,
  not_met: 25,
});

/**
 * Derive overall 0–100 from goal outcomes map.
 * @param {Record<string, { outcome?: string }>|null|undefined} outcomes
 */
export function deriveOverallScoreFromOutcomes(outcomes) {
  const entries = Object.values(outcomes && typeof outcomes === 'object' ? outcomes : {});
  const scored = entries
    .map((o) => OUTCOME_SCORE[String(o?.outcome || '').toLowerCase()])
    .filter((n) => Number.isFinite(n));
  if (!scored.length) return null;
  const avg = scored.reduce((a, b) => a + b, 0) / scored.length;
  return Math.round(Math.max(0, Math.min(100, avg)) * 10) / 10;
}

/**
 * Submitted reviews for a cycle (calibration session list).
 */
export async function listCalibrationQueue(dbOrQuery, { companyId, cycleId, limit = CALIBRATION_LIST_CAP }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const cyc = Number(cycleId);
  if (!Number.isFinite(cid) || cid <= 0 || !Number.isFinite(cyc) || cyc <= 0) {
    return { ok: false, errorCode: ERR.INVALID_ID };
  }
  const cap = Math.min(CALIBRATION_LIST_CAP, Math.max(1, Number(limit) || CALIBRATION_LIST_CAP));
  const res = await db.query(
    `SELECT r.id, r.cycle_id AS "cycleId", r.company_id AS "companyId",
            r.candidate_id AS "candidateId", r.reviewer_user_id AS "reviewerUserId",
            r.outcomes, r.overall_notes AS "overallNotes",
            r.overall_score AS "overallScore", r.nine_box_cell AS "nineBoxCell",
            r.calibrated_at AS "calibratedAt", r.calibrated_by_user_id AS "calibratedByUserId",
            r.calibration_notes AS "calibrationNotes",
            r.status, r.submitted_at AS "submittedAt", r.updated_at AS "updatedAt",
            c.full_name AS "candidateName", c.email AS "candidateEmail"
     FROM performance_reviews r
     JOIN candidates c ON c.id = r.candidate_id AND c.company_id = r.company_id
     WHERE r.cycle_id = $1 AND r.company_id = $2
       AND r.status = '${PERFORMANCE_REVIEW_STATUS.SUBMITTED}'
     ORDER BY r.submitted_at DESC NULLS LAST, r.id DESC
     LIMIT $3`,
    [cyc, cid, cap]
  );
  const items = (res.rows || []).map((row) => {
    const derived = deriveOverallScoreFromOutcomes(row.outcomes);
    return {
      ...row,
      id: Number(row.id),
      cycleId: Number(row.cycleId),
      companyId: Number(row.companyId),
      candidateId: Number(row.candidateId),
      overallScore: row.overallScore != null ? Number(row.overallScore) : derived,
      derivedOverallScore: derived,
      nineBoxCell: row.nineBoxCell != null ? Number(row.nineBoxCell) : null,
      calibratedByUserId:
        row.calibratedByUserId != null ? Number(row.calibratedByUserId) : null,
    };
  });
  return { ok: true, items, cap };
}

/**
 * RH calibration adjust on a submitted review (audit caller records before/after).
 */
export async function calibratePerformanceReview(dbOrQuery, {
  companyId,
  reviewId,
  overallScore,
  nineBoxCell = undefined,
  calibrationNotes = undefined,
  calibratedByUserId = null,
}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  const rid = Number(reviewId);
  if (!Number.isFinite(cid) || cid <= 0 || !Number.isFinite(rid) || rid <= 0) {
    return { ok: false, errorCode: ERR.INVALID_ID };
  }

  const existing = await db.query(
    `SELECT id, overall_score AS "overallScore", nine_box_cell AS "nineBoxCell",
            calibration_notes AS "calibrationNotes", status, outcomes
     FROM performance_reviews
     WHERE id = $1 AND company_id = $2
     LIMIT 1`,
    [rid, cid]
  );
  if (existing.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  const before = existing.rows[0];
  if (before.status !== PERFORMANCE_REVIEW_STATUS.SUBMITTED) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  let nextScore = before.overallScore != null ? Number(before.overallScore) : null;
  if (overallScore !== undefined) {
    if (overallScore === null || overallScore === '') {
      nextScore = deriveOverallScoreFromOutcomes(before.outcomes);
    } else {
      const n = Number(overallScore);
      if (!Number.isFinite(n) || n < 0 || n > 100) return { ok: false, errorCode: ERR.INVALID_DATA };
      nextScore = Math.round(n * 10) / 10;
    }
  }

  let nextCell = before.nineBoxCell != null ? Number(before.nineBoxCell) : null;
  if (nineBoxCell !== undefined) {
    if (nineBoxCell === null || nineBoxCell === '') {
      nextCell = null;
    } else {
      const n = Number(nineBoxCell);
      if (!Number.isFinite(n) || n < 1 || n > 9) return { ok: false, errorCode: ERR.INVALID_DATA };
      nextCell = Math.round(n);
    }
  }

  let nextNotes =
    before.calibrationNotes != null ? String(before.calibrationNotes) : '';
  if (calibrationNotes !== undefined) {
    nextNotes = String(calibrationNotes || '').trim().slice(0, 2000);
  }

  const res = await db.query(
    `UPDATE performance_reviews
     SET overall_score = $3,
         nine_box_cell = $4,
         calibration_notes = $5,
         calibrated_at = NOW(),
         calibrated_by_user_id = $6,
         updated_at = NOW()
     WHERE id = $1 AND company_id = $2
       AND status = '${PERFORMANCE_REVIEW_STATUS.SUBMITTED}'
     RETURNING id, cycle_id AS "cycleId", company_id AS "companyId",
               candidate_id AS "candidateId",
               overall_score AS "overallScore", nine_box_cell AS "nineBoxCell",
               calibration_notes AS "calibrationNotes",
               calibrated_at AS "calibratedAt", calibrated_by_user_id AS "calibratedByUserId",
               status, submitted_at AS "submittedAt", updated_at AS "updatedAt"`,
    [rid, cid, nextScore, nextCell, nextNotes, calibratedByUserId || null]
  );
  if (res.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  const after = res.rows[0];
  return {
    ok: true,
    review: {
      ...after,
      id: Number(after.id),
      overallScore: after.overallScore != null ? Number(after.overallScore) : null,
      nineBoxCell: after.nineBoxCell != null ? Number(after.nineBoxCell) : null,
    },
    before: {
      overallScore: before.overallScore != null ? Number(before.overallScore) : null,
      nineBoxCell: before.nineBoxCell != null ? Number(before.nineBoxCell) : null,
      calibrationNotes: before.calibrationNotes || '',
    },
  };
}

/**
 * Persist derived overall on submit (idempotent helper).
 */
export async function stampOverallScoreOnSubmit(dbOrQuery, { companyId, reviewId, outcomes }) {
  const db = asDb(dbOrQuery);
  const score = deriveOverallScoreFromOutcomes(outcomes);
  if (score == null) return { ok: true, overallScore: null };
  await db.query(
    `UPDATE performance_reviews
     SET overall_score = COALESCE(overall_score, $3), updated_at = NOW()
     WHERE id = $1 AND company_id = $2`,
    [Number(reviewId), Number(companyId), score]
  );
  return { ok: true, overallScore: score };
}
