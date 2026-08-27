/**
 * Retention watch → actionable follow-up (plan + review).
 */

import { asDb } from '../ae/as-db.js';
import { ERR } from '../api-error-codes';
import {
  createDevelopmentPlan,
  getDevelopmentPlan,
  addDevelopmentPlanItem,
  listDevelopmentPlans,
} from './development-plans.js';
import { retentionWatchMinScore } from './retention-watch.js';

const LIST_CAP = 20;

function dateOrNull(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * Open retention action: create/reuse PDI + follow-up row with review date.
 */
export async function openRetentionFollowUp(dbOrQuery, {
  companyId,
  candidateId,
  signals = [],
  explanation = '',
  suggestedQuestion = '',
  reviewDue = null,
  createdByUserId = null,
  locale = 'pt-BR',
}) {
  const db = asDb(dbOrQuery);
  const keys = (Array.isArray(signals) ? signals : [])
    .map((s) => String(s?.key || s || '').trim())
    .filter(Boolean)
    .slice(0, 6);
  const labels = (Array.isArray(signals) ? signals : [])
    .map((s) => String(s?.label || s?.key || '').trim())
    .filter(Boolean)
    .slice(0, 6);

  const plans = await listDevelopmentPlans(db, { companyId, candidateId, limit: 5 });
  let plan = plans.find((p) => p.status === 'active') || null;
  if (plan) {
    plan = await getDevelopmentPlan(db, { companyId, planId: plan.id, candidateId });
  }
  if (!plan) {
    const title =
      locale === 'en' ? 'Retention follow-up' : 'Acompanhamento de retenção';
    const created = await createDevelopmentPlan(db, {
      companyId,
      candidateId,
      title,
      objective: String(explanation || '').slice(0, 4000),
      status: 'active',
      createdByUserId,
    });
    if (!created.ok) return created;
    plan = created.plan;
  }

  const itemTitles =
    labels.length > 0
      ? labels.map((l) =>
          locale === 'en'
            ? `Check conditions for: ${l}`
            : `Checar condições em: ${l}`
        )
      : [
          locale === 'en'
            ? 'Hold retention 1:1 and capture agreements'
            : 'Fazer 1:1 de retenção e registrar combinados',
        ];

  const reviewDate =
    dateOrNull(reviewDue) ||
    (() => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + 21);
      return d.toISOString().slice(0, 10);
    })();

  for (const title of itemTitles.slice(0, 4)) {
    await addDevelopmentPlanItem(db, {
      companyId,
      planId: plan.id,
      candidateId,
      title,
      source: 'retention',
      dueDate: reviewDate,
    });
  }

  await addDevelopmentPlanItem(db, {
    companyId,
    planId: plan.id,
    candidateId,
    title:
      locale === 'en'
        ? 'Review retention signals after 1:1'
        : 'Revisar sinais de retenção após o 1:1',
    source: 'retention',
    dueDate: reviewDate,
  });

  const res = await db.query(
    `INSERT INTO retention_followups (
       company_id, candidate_id, plan_id, signal_keys, explanation,
       suggested_question, review_due, created_by_user_id
     ) VALUES ($1, $2, $3, $4::text[], $5, $6, $7::date, $8)
     RETURNING id, company_id AS "companyId", candidate_id AS "candidateId",
               plan_id AS "planId", signal_keys AS "signalKeys",
               explanation, suggested_question AS "suggestedQuestion",
               review_due AS "reviewDue", reviewed_at AS "reviewedAt",
               review_notes AS "reviewNotes",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      companyId,
      candidateId,
      plan.id,
      keys,
      String(explanation || '').slice(0, 2000),
      String(suggestedQuestion || '').slice(0, 1000),
      reviewDate,
      createdByUserId || null,
    ]
  );

  const refreshed = await getDevelopmentPlan(db, {
    companyId,
    planId: plan.id,
    candidateId,
  });
  return {
    ok: true,
    followUp: res.rows[0],
    plan: refreshed,
    minScore: retentionWatchMinScore(),
  };
}

export async function listRetentionFollowUps(dbOrQuery, { companyId, candidateId, limit = LIST_CAP }) {
  const db = asDb(dbOrQuery);
  const cap = Math.min(Math.max(1, Number(limit) || LIST_CAP), LIST_CAP);
  const res = await db.query(
    `SELECT id, company_id AS "companyId", candidate_id AS "candidateId",
            plan_id AS "planId", signal_keys AS "signalKeys",
            explanation, suggested_question AS "suggestedQuestion",
            review_due AS "reviewDue", reviewed_at AS "reviewedAt",
            review_notes AS "reviewNotes",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM retention_followups
     WHERE company_id = $1 AND candidate_id = $2
     ORDER BY created_at DESC, id DESC
     LIMIT $3`,
    [companyId, candidateId, cap]
  );
  return res.rows;
}

export async function markRetentionFollowUpReviewed(dbOrQuery, {
  companyId,
  candidateId,
  followUpId,
  reviewNotes = '',
}) {
  const db = asDb(dbOrQuery);
  const res = await db.query(
    `UPDATE retention_followups
     SET reviewed_at = NOW(),
         review_notes = $4,
         updated_at = NOW()
     WHERE id = $1 AND company_id = $2 AND candidate_id = $3
     RETURNING id, company_id AS "companyId", candidate_id AS "candidateId",
               plan_id AS "planId", signal_keys AS "signalKeys",
               explanation, suggested_question AS "suggestedQuestion",
               review_due AS "reviewDue", reviewed_at AS "reviewedAt",
               review_notes AS "reviewNotes",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [followUpId, companyId, candidateId, String(reviewNotes || '').slice(0, 4000)]
  );
  if (res.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  return { ok: true, followUp: res.rows[0] };
}
