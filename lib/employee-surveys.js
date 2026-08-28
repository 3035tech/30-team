/**
 * Clima / pulso autenticados para colaborador (B-2501).
 * Respostas permanecem anônimas nos agregados; o colaborador vê histórico próprio.
 */

import crypto from 'crypto';
import { asDb } from './ae/as-db.js';
import { ERR } from './api-error-codes.js';
import { CLIMATE_SURVEY_STATUS } from './domain-status.js';
import {
  resolveClimateInviteByToken,
  submitClimateResponse,
} from './people/climate-surveys.js';
import {
  getPublicTeamPulseByToken,
  submitPublicTeamPulse,
} from './people/team-pulses.js';

const INVITE_TTL_DAYS = 45;

async function latestAssessmentId(db, { companyId, candidateId }) {
  const res = await db.query(
    `SELECT a.id
     FROM assessments a
     JOIN candidates c ON c.id = a.candidate_id
     WHERE a.candidate_id = $1 AND c.company_id = $2
     ORDER BY a.created_at DESC NULLS LAST, a.id DESC
     LIMIT 1`,
    [candidateId, companyId]
  );
  return res.rows[0]?.id ?? null;
}

async function isInPulseGroup(db, { companyId, teamGroupId, assessmentId }) {
  if (!assessmentId || !teamGroupId) return false;
  const res = await db.query(
    `SELECT 1 FROM team_groups g
     WHERE g.id = $1 AND g.company_id = $2 AND g.deleted = FALSE
       AND (
         g.base_assessment_id = $3
         OR $3 = ANY(COALESCE(g.member_assessment_ids, '{}'::bigint[]))
       )
     LIMIT 1`,
    [teamGroupId, companyId, assessmentId]
  );
  return res.rowCount > 0;
}

async function ensureClimateInvite(db, { companyId, candidateId, surveyId }) {
  const existing = await db.query(
    `SELECT id, token, used_at AS "usedAt", expires_at AS "expiresAt"
     FROM climate_survey_invites
     WHERE survey_id = $1 AND company_id = $2 AND candidate_id = $3
     LIMIT 1`,
    [surveyId, companyId, candidateId]
  );
  if (existing.rowCount > 0) return existing.rows[0];

  const token = crypto.randomBytes(24).toString('hex');
  const ins = await db.query(
    `INSERT INTO climate_survey_invites (survey_id, company_id, token, expires_at, candidate_id)
     VALUES ($1, $2, $3, NOW() + ($4::int * INTERVAL '1 day'), $5)
     RETURNING id, token, used_at AS "usedAt", expires_at AS "expiresAt"`,
    [surveyId, companyId, token, INVITE_TTL_DAYS, candidateId]
  );
  return ins.rows[0];
}

async function ensurePulseInvite(db, { companyId, candidateId, pulseId }) {
  const existing = await db.query(
    `SELECT id, token, used_at AS "usedAt", expires_at AS "expiresAt"
     FROM team_pulse_invites
     WHERE pulse_id = $1 AND company_id = $2 AND candidate_id = $3
     LIMIT 1`,
    [pulseId, companyId, candidateId]
  );
  if (existing.rowCount > 0) return existing.rows[0];

  const token = crypto.randomBytes(24).toString('hex');
  const ins = await db.query(
    `INSERT INTO team_pulse_invites (pulse_id, company_id, token, expires_at, candidate_id)
     VALUES ($1, $2, $3, NOW() + ($4::int * INTERVAL '1 day'), $5)
     RETURNING id, token, used_at AS "usedAt", expires_at AS "expiresAt"`,
    [pulseId, companyId, token, 21, candidateId]
  );
  return ins.rows[0];
}

/**
 * @returns {Promise<{ openClimate: object[], openPulse: object[], history: object[] }>}
 */
export async function listEmployeeSurveyInbox(dbOrQuery, { companyId, candidateId, locale = 'pt-BR' }) {
  const db = asDb(dbOrQuery);
  const assessmentId = await latestAssessmentId(db, { companyId, candidateId });

  const openClimate = [];
  const climateRes = await db.query(
    `SELECT s.id, s.title, s.description
     FROM climate_surveys s
     WHERE s.company_id = $1 AND s.deleted = FALSE
       AND s.status = '${CLIMATE_SURVEY_STATUS.OPEN}'
     ORDER BY s.opens_at DESC NULLS LAST, s.id DESC
     LIMIT 10`,
    [companyId]
  );
  for (const row of climateRes.rows || []) {
    const inv = await ensureClimateInvite(db, {
      companyId,
      candidateId,
      surveyId: row.id,
    });
    if (inv.usedAt) continue;
    if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) continue;
    const resolved = await resolveClimateInviteByToken(db, inv.token);
    if (!resolved.ok) continue;
    openClimate.push({
      kind: 'climate',
      surveyId: row.id,
      title: row.title,
      description: row.description || '',
      token: inv.token,
      questions: resolved.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        scaleMin: q.scaleMin,
        scaleMax: q.scaleMax,
        questionKind: q.questionKind || 'likert',
      })),
    });
  }

  const openPulse = [];
  const pulseRes = await db.query(
    `SELECT p.id, p.title, p.team_group_id AS "teamGroupId"
     FROM team_pulses p
     WHERE p.company_id = $1 AND p.deleted = FALSE AND p.status = 'open'
     ORDER BY p.opens_at DESC NULLS LAST, p.id DESC
     LIMIT 10`,
    [companyId]
  );
  for (const row of pulseRes.rows || []) {
    const eligible = await isInPulseGroup(db, {
      companyId,
      teamGroupId: row.teamGroupId,
      assessmentId,
    });
    if (!eligible) continue;
    const inv = await ensurePulseInvite(db, {
      companyId,
      candidateId,
      pulseId: row.id,
    });
    if (inv.usedAt) continue;
    if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) continue;
    const loaded = await getPublicTeamPulseByToken(db, inv.token);
    if (!loaded.ok) continue;
    openPulse.push({
      kind: 'pulse',
      pulseId: row.id,
      title: row.title,
      token: inv.token,
      questions: loaded.pulse.questions,
    });
  }

  const history = [];
  const histClimate = await db.query(
    `SELECT s.title, i.used_at AS "submittedAt"
     FROM climate_survey_invites i
     JOIN climate_surveys s ON s.id = i.survey_id
     WHERE i.company_id = $1 AND i.candidate_id = $2 AND i.used_at IS NOT NULL
     ORDER BY i.used_at DESC
     LIMIT 15`,
    [companyId, candidateId]
  );
  for (const r of histClimate.rows || []) {
    history.push({
      kind: 'climate',
      title: r.title,
      submittedAt: r.submittedAt,
    });
  }
  const histPulse = await db.query(
    `SELECT p.title, i.used_at AS "submittedAt"
     FROM team_pulse_invites i
     JOIN team_pulses p ON p.id = i.pulse_id
     WHERE i.company_id = $1 AND i.candidate_id = $2 AND i.used_at IS NOT NULL
     ORDER BY i.used_at DESC
     LIMIT 15`,
    [companyId, candidateId]
  );
  for (const r of histPulse.rows || []) {
    history.push({
      kind: 'pulse',
      title: r.title,
      submittedAt: r.submittedAt,
    });
  }
  history.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  return { openClimate, openPulse, history };
}

export async function submitEmployeeClimateSurvey(dbOrQuery, { companyId, candidateId, token, answers }) {
  const db = asDb(dbOrQuery);
  const check = await db.query(
    `SELECT i.id FROM climate_survey_invites i
     WHERE i.token = $1 AND i.company_id = $2 AND i.candidate_id = $3
     LIMIT 1`,
    [token, companyId, candidateId]
  );
  if (check.rowCount === 0) return { ok: false, errorCode: ERR.UNAUTHORIZED };
  return submitClimateResponse(db, { token, answers });
}

export async function submitEmployeeTeamPulse(dbOrQuery, { companyId, candidateId, token, answers }) {
  const db = asDb(dbOrQuery);
  const check = await db.query(
    `SELECT i.id FROM team_pulse_invites i
     WHERE i.token = $1 AND i.company_id = $2 AND i.candidate_id = $3
     LIMIT 1`,
    [token, companyId, candidateId]
  );
  if (check.rowCount === 0) return { ok: false, errorCode: ERR.UNAUTHORIZED };
  return submitPublicTeamPulse(db, { token, answers });
}
