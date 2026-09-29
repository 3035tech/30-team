/**
 * LGPD retention purge — batched hard deletes to avoid long locks / OOM.
 * Explicit tenant scope; never infer that a person is disposable from missing assessments.
 */

import { query } from './db.js';

export const RETENTION_BATCH_DEFAULT = 500;
export const RETENTION_MAX_BATCHES_DEFAULT = 200;

function batchSize() {
  const n = parseInt(process.env.RETENTION_BATCH_SIZE || '', 10);
  if (Number.isFinite(n) && n > 0) return Math.min(n, 5000);
  return RETENTION_BATCH_DEFAULT;
}

function maxBatches() {
  const n = parseInt(process.env.RETENTION_MAX_BATCHES || '', 10);
  if (Number.isFinite(n) && n > 0) return Math.min(n, 2000);
  return RETENTION_MAX_BATCHES_DEFAULT;
}

/**
 * @param {{ days: number, companyId: number, dryRun?: boolean, batchSize?: number, maxBatches?: number }} opts
 */
export async function purgeExpiredAssessmentsAndOrphans(opts) {
  const days = Number(opts.days);
  if (!Number.isSafeInteger(days) || days <= 0) {
    throw new Error('INVALID_RETENTION_DAYS');
  }
  const companyId = Number(opts.companyId);
  if (!Number.isSafeInteger(companyId) || companyId <= 0) throw new Error('INVALID_COMPANY_ID');
  const dryRun = opts.dryRun !== false;
  const bs = Number.isSafeInteger(opts.batchSize) && opts.batchSize > 0 ? Math.min(opts.batchSize, 5000) : batchSize();
  const maxB = Number.isSafeInteger(opts.maxBatches) && opts.maxBatches > 0 ? Math.min(opts.maxBatches, 2000) : maxBatches();

  const cutoffRes = await query(
    `SELECT NOW() - ($1::text || ' days')::interval AS cutoff`,
    [String(days)]
  );
  const cutoffTs = cutoffRes.rows[0].cutoff;

  const eligible = await query(
    `SELECT COUNT(*)::int AS count FROM assessments a
     JOIN candidates c ON c.id = a.candidate_id
     WHERE c.company_id = $1 AND a.created_at < $2`, [companyId, cutoffTs]
  );
  if (dryRun) return { days, companyId, dryRun: true, cutoff: cutoffTs,
    eligibleAssessments: eligible.rows[0].count, deletedAssessments: 0, deletedCandidates: 0, truncated: false };

  let deletedAssessments = 0;
  let assessmentBatches = 0;
  let assessmentsTruncated = false;

  for (let i = 0; i < maxB; i += 1) {
    const del = await query(
      `WITH doomed AS (
         SELECT a.id FROM assessments a
         JOIN candidates c ON c.id = a.candidate_id
         WHERE a.created_at < $1 AND c.company_id = $3
         ORDER BY a.created_at ASC
         LIMIT $2
       )
       DELETE FROM assessments a
       USING doomed d
       WHERE a.id = d.id
       RETURNING a.id`,
      [cutoffTs, bs, companyId]
    );
    assessmentBatches += 1;
    deletedAssessments += del.rowCount;
    if (del.rowCount < bs) break;
    if (i === maxB - 1) assessmentsTruncated = true;
  }


  return {
    days,
    companyId,
    dryRun: false,
    cutoff: cutoffTs,
    deletedAssessments,
    deletedCandidates: 0,
    assessmentBatches,
    candidateBatches: 0,
    batchSize: bs,
    truncated: assessmentsTruncated,
  };
}
