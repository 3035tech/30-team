/**
 * Retention watch — Motivators-derived signals (no climate survey required).
 * Threshold override: RETENTION_WATCH_MIN_SCORE (default 55).
 */

import { asDb } from '../ae/as-db.js';

const LIST_CAP = 8;
const LOOKBACK_DAYS_MAX = 90;

/** Min dimension score (0–100) to emit a retention signal / notification. */
export function retentionWatchMinScore() {
  const n = parseInt(String(process.env.RETENTION_WATCH_MIN_SCORE || '55'), 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 100) : 55;
}

/**
 * Recent retention_watch alerts for a company (from manager_notifications).
 * Deduped by candidate; tenant via users.company_id.
 */
export async function listCompanyRetentionWatches(
  dbOrQuery,
  { companyId, days = 14, limit = 5 }
) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) return { items: [], minScore: retentionWatchMinScore() };

  const lookback = Math.min(
    Math.max(1, Number(days) || 14),
    LOOKBACK_DAYS_MAX
  );
  const cap = Math.min(Math.max(1, Number(limit) || 5), LIST_CAP);

  try {
    const res = await db.query(
      `SELECT
         n.entity_id AS "candidateId",
         MAX(n.created_at) AS "createdAt",
         (ARRAY_AGG(n.payload->>'candidateName' ORDER BY n.created_at DESC))[1] AS name,
         (ARRAY_AGG(n.payload->>'signalLabels' ORDER BY n.created_at DESC))[1] AS "signalLabels"
       FROM manager_notifications n
       JOIN users u ON u.id = n.user_id AND u.deleted = FALSE AND u.company_id = $1
       WHERE n.type = 'retention_watch'
         AND n.entity_id IS NOT NULL
         AND n.created_at > NOW() - ($2::int * INTERVAL '1 day')
       GROUP BY n.entity_id
       ORDER BY MAX(n.created_at) DESC
       LIMIT $3`,
      [cid, lookback, cap]
    );
    return {
      items: (res.rows || []).map((r) => ({
        candidateId: r.candidateId,
        name: r.name || null,
        signalLabels: r.signalLabels || null,
        createdAt: r.createdAt,
      })),
      minScore: retentionWatchMinScore(),
      lookbackDays: lookback,
    };
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') {
      return { items: [], minScore: retentionWatchMinScore() };
    }
    throw err;
  }
}
