/**
 * LGPD retention purge — batched hard deletes to avoid long locks / OOM.
 * Scope matches historical admin purge: old assessments + orphan candidates.
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
 * @param {{ days: number, batchSize?: number, maxBatches?: number }} opts
 */
export async function purgeExpiredAssessmentsAndOrphans(opts) {
  const days = Number(opts.days);
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error('INVALID_RETENTION_DAYS');
  }
  const bs = opts.batchSize || batchSize();
  const maxB = opts.maxBatches || maxBatches();

  const cutoffRes = await query(
    `SELECT NOW() - ($1::text || ' days')::interval AS cutoff`,
    [String(days)]
  );
  const cutoffTs = cutoffRes.rows[0].cutoff;

  let deletedAssessments = 0;
  let assessmentBatches = 0;
  let assessmentsTruncated = false;

  for (let i = 0; i < maxB; i += 1) {
    const del = await query(
      `WITH doomed AS (
         SELECT id FROM assessments
         WHERE created_at < $1
         ORDER BY created_at ASC
         LIMIT $2
       )
       DELETE FROM assessments a
       USING doomed d
       WHERE a.id = d.id
       RETURNING a.id`,
      [cutoffTs, bs]
    );
    assessmentBatches += 1;
    deletedAssessments += del.rowCount;
    if (del.rowCount < bs) break;
    if (i === maxB - 1) assessmentsTruncated = true;
  }

  let deletedCandidates = 0;
  let candidateBatches = 0;
  let candidatesTruncated = false;

  for (let i = 0; i < maxB; i += 1) {
    const del = await query(
      `WITH doomed AS (
         SELECT c.id
         FROM candidates c
         WHERE NOT EXISTS (SELECT 1 FROM assessments a WHERE a.candidate_id = c.id)
           AND NOT EXISTS (SELECT 1 FROM ae_attempts ae WHERE ae.candidate_id = c.id)
           AND NOT EXISTS (SELECT 1 FROM one_on_ones o WHERE o.candidate_id = c.id)
         ORDER BY c.id ASC
         LIMIT $1
       )
       DELETE FROM candidates c
       USING doomed d
       WHERE c.id = d.id
       RETURNING c.id`,
      [bs]
    );
    candidateBatches += 1;
    deletedCandidates += del.rowCount;
    if (del.rowCount < bs) break;
    if (i === maxB - 1) candidatesTruncated = true;
  }

  return {
    days,
    cutoff: cutoffTs,
    deletedAssessments,
    deletedCandidates,
    assessmentBatches,
    candidateBatches,
    batchSize: bs,
    truncated: assessmentsTruncated || candidatesTruncated,
  };
}
