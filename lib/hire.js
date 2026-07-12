import { query, queryRead } from './db';
import { normalizeRejectionReason, normalizeStartDate } from './pipeline';

/**
 * Após marcar hired em uma vaga: fecha automaticamente se preenchimentos >= positions_count.
 */
export async function maybeCloseVacancyIfFilled(vacancyId) {
  if (!vacancyId) return { closed: false };
  const vac = await queryRead(
    `SELECT id, positions_count AS "positionsCount", status
     FROM vacancies WHERE id = $1 AND deleted = FALSE LIMIT 1`,
    [vacancyId]
  );
  if (vac.rowCount === 0) return { closed: false };
  const need = Math.max(1, Number(vac.rows[0].positionsCount) || 1);
  if (vac.rows[0].status === 'closed') return { closed: false, alreadyClosed: true };

  const filled = await queryRead(
    `SELECT COUNT(*)::int AS n FROM (
       SELECT candidate_id FROM assessments
       WHERE vacancy_id = $1 AND pipeline_stage = 'hired'
       UNION
       SELECT candidate_id FROM vacancy_candidates
       WHERE vacancy_id = $1 AND pipeline_stage = 'hired'
     ) x`,
    [vacancyId]
  );
  const n = filled.rows[0]?.n ?? 0;
  if (n < need) return { closed: false, filled: n, need };

  await query(`UPDATE vacancies SET status = 'closed' WHERE id = $1 AND deleted = FALSE`, [vacancyId]);
  return { closed: true, filled: n, need };
}

export async function markCandidateHired({ candidateId, vacancyId, startDate }) {
  const sd = normalizeStartDate(startDate) || new Date().toISOString().slice(0, 10);
  await query(
    `UPDATE candidates SET
       employment_status = 'employee',
       hired_at = COALESCE(hired_at, NOW()),
       start_date = COALESCE($2::date, start_date),
       hired_vacancy_id = COALESCE($3::bigint, hired_vacancy_id)
     WHERE id = $1`,
    [candidateId, sd, vacancyId || null]
  );
  return { startDate: sd };
}

/** Monta timeline unificada do candidato (eventos ordenados). */
export async function buildCandidateTimeline(candidateId) {
  const events = [];

  const cand = await queryRead(
    `SELECT id, full_name AS "fullName", created_at AS "createdAt",
            employment_status AS "employmentStatus", hired_at AS "hiredAt",
            start_date AS "startDate", hired_vacancy_id AS "hiredVacancyId"
     FROM candidates WHERE id = $1 LIMIT 1`,
    [candidateId]
  );
  if (cand.rowCount === 0) return [];
  const c = cand.rows[0];
  events.push({
    type: 'candidate.created',
    at: c.createdAt,
    labelKey: 'recruiting.timelineCandidateCreated',
  });
  if (c.employmentStatus === 'employee' && (c.hiredAt || c.startDate)) {
    events.push({
      type: 'candidate.hired',
      at: c.hiredAt || c.startDate,
      startDate: c.startDate,
      vacancyId: c.hiredVacancyId,
      labelKey: 'recruiting.timelineCandidateHired',
    });
  }

  try {
    const vc = await queryRead(
      `SELECT vc.id, vc.vacancy_id AS "vacancyId", v.title AS "vacancyTitle",
              vc.created_at AS "createdAt", vc.pipeline_stage AS "pipelineStage",
              vc.rejection_reason AS "rejectionReason", vc.start_date AS "startDate",
              vc.hired_at AS "hiredAt"
       FROM vacancy_candidates vc
       JOIN vacancies v ON v.id = vc.vacancy_id
       WHERE vc.candidate_id = $1
       ORDER BY vc.created_at ASC`,
      [candidateId]
    );
    for (const row of vc.rows) {
      events.push({
        type: 'vacancy.registered',
        at: row.createdAt,
        vacancyId: row.vacancyId,
        vacancyTitle: row.vacancyTitle,
        labelKey: 'recruiting.timelineVacancyRegistered',
      });
    }

    const vcIds = vc.rows.map((r) => r.id);
    if (vcIds.length) {
      const vh = await queryRead(
        `SELECT h.vacancy_candidate_id AS "vacancyCandidateId",
                h.from_stage AS "fromStage", h.to_stage AS "toStage",
                h.reason, h.start_date AS "startDate", h.changed_at AS "changedAt",
                vc.vacancy_id AS "vacancyId", v.title AS "vacancyTitle"
         FROM vacancy_candidate_pipeline_history h
         JOIN vacancy_candidates vc ON vc.id = h.vacancy_candidate_id
         JOIN vacancies v ON v.id = vc.vacancy_id
         WHERE h.vacancy_candidate_id = ANY($1::bigint[])
         ORDER BY h.changed_at ASC`,
        [vcIds]
      );
      for (const row of vh.rows) {
        events.push({
          type: 'pipeline.change',
          at: row.changedAt,
          fromStage: row.fromStage,
          toStage: row.toStage,
          reason: row.reason,
          startDate: row.startDate,
          vacancyId: row.vacancyId,
          vacancyTitle: row.vacancyTitle,
          source: 'vacancy_candidate',
          labelKey: 'recruiting.timelinePipelineChange',
        });
      }
    }
  } catch {
    /* tabela pode não existir ainda */
  }

  try {
    const inv = await queryRead(
      `SELECT i.id, i.vacancy_id AS "vacancyId", v.title AS "vacancyTitle",
              i.status, i.sent_at AS "sentAt", i.opened_at AS "openedAt",
              i.completed_at AS "completedAt"
       FROM candidate_invites i
       LEFT JOIN vacancies v ON v.id = i.vacancy_id
       WHERE i.status <> 'cancelled'
         AND (
           i.candidate_id = $1
           OR (
             i.candidate_email IS NOT NULL
             AND EXISTS (
               SELECT 1 FROM candidates c
               WHERE c.id = $1 AND c.email IS NOT NULL
                 AND LOWER(c.email) = LOWER(i.candidate_email)
             )
           )
         )
       ORDER BY i.sent_at ASC`,
      [candidateId]
    );
    for (const row of inv.rows) {
      if (row.sentAt) {
        events.push({
          type: 'invite.sent',
          at: row.sentAt,
          vacancyId: row.vacancyId,
          vacancyTitle: row.vacancyTitle,
          labelKey: 'recruiting.timelineInviteSent',
        });
      }
      if (row.openedAt) {
        events.push({
          type: 'invite.opened',
          at: row.openedAt,
          vacancyId: row.vacancyId,
          vacancyTitle: row.vacancyTitle,
          labelKey: 'recruiting.timelineInviteOpened',
        });
      }
      if (row.completedAt) {
        events.push({
          type: 'invite.completed',
          at: row.completedAt,
          vacancyId: row.vacancyId,
          vacancyTitle: row.vacancyTitle,
          labelKey: 'recruiting.timelineInviteCompleted',
        });
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const ass = await queryRead(
      `SELECT ass.id, ass.created_at AS "createdAt", ass.vacancy_id AS "vacancyId",
              v.title AS "vacancyTitle", ass.pipeline_stage AS "pipelineStage",
              ass.top_type AS "topType", ass.rejection_reason AS "rejectionReason",
              ass.start_date AS "startDate", ass.hired_at AS "hiredAt"
       FROM assessments ass
       LEFT JOIN vacancies v ON v.id = ass.vacancy_id
       WHERE ass.candidate_id = $1
       ORDER BY ass.created_at ASC`,
      [candidateId]
    );
    for (const row of ass.rows) {
      events.push({
        type: 'assessment.completed',
        at: row.createdAt,
        assessmentId: row.id,
        vacancyId: row.vacancyId,
        vacancyTitle: row.vacancyTitle,
        topType: row.topType,
        labelKey: 'recruiting.timelineAssessmentCompleted',
      });
    }

    const aIds = ass.rows.map((r) => r.id);
    if (aIds.length) {
      const ah = await queryRead(
        `SELECT h.assessment_id AS "assessmentId",
                h.from_stage AS "fromStage", h.to_stage AS "toStage",
                h.reason, h.start_date AS "startDate", h.changed_at AS "changedAt",
                ass.vacancy_id AS "vacancyId", v.title AS "vacancyTitle"
         FROM assessment_pipeline_history h
         JOIN assessments ass ON ass.id = h.assessment_id
         LEFT JOIN vacancies v ON v.id = ass.vacancy_id
         WHERE h.assessment_id = ANY($1::bigint[])
         ORDER BY h.changed_at ASC`,
        [aIds]
      );
      for (const row of ah.rows) {
        events.push({
          type: 'pipeline.change',
          at: row.changedAt,
          assessmentId: row.assessmentId,
          fromStage: row.fromStage,
          toStage: row.toStage,
          reason: row.reason,
          startDate: row.startDate,
          vacancyId: row.vacancyId,
          vacancyTitle: row.vacancyTitle,
          source: 'assessment',
          labelKey: 'recruiting.timelinePipelineChange',
        });
      }
    }
  } catch {
    /* ignore */
  }

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return events;
}

export { normalizeRejectionReason, normalizeStartDate };
