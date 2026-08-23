/**
 * Climate surveys — company campaigns; anonymous responses via invite token.
 */

import crypto from 'crypto';
import { asDb } from '../ae/as-db.js';

const TITLE_MAX = 200;
const DESC_MAX = 4000;
const PROMPT_MAX = 500;
const LIST_CAP = 40;
const QUESTIONS_CAP = 20;
const INVITE_TTL_DAYS = 45;

const SURVEY_STATUSES = new Set(['draft', 'open', 'closed']);

/** Default Likert prompts (pt-BR) for new drafts — hedged workplace climate. */
export const DEFAULT_CLIMATE_PROMPTS_PT = Object.freeze([
  'Em geral, sinto que posso contribuir com o meu melhor no dia a dia.',
  'Tenho clareza sobre o que se espera do meu trabalho.',
  'Sinto que há espaço para falar sobre dificuldades sem retaliação.',
  'Percebo reconhecimento quando entrego resultados relevantes.',
  'O ritmo e a carga de trabalho tendem a ser sustentáveis para mim.',
]);

function normalizeTitle(raw) {
  const title = String(raw || '').trim().slice(0, TITLE_MAX);
  return title.length >= 1 ? title : null;
}

function normalizeStatus(raw, fallback = 'draft') {
  const s = String(raw || '').trim().toLowerCase();
  return SURVEY_STATUSES.has(s) ? s : fallback;
}

function mapSurveyRow(row) {
  return {
    id: row.id,
    companyId: row.companyId,
    title: row.title,
    description: row.description,
    status: row.status,
    opensAt: row.opensAt,
    closesAt: row.closesAt,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    questionCount: row.questionCount != null ? Number(row.questionCount) : undefined,
    responseCount: row.responseCount != null ? Number(row.responseCount) : undefined,
  };
}

export async function listClimateSurveys(dbOrQuery, { companyId, limit = LIST_CAP }) {
  const db = asDb(dbOrQuery);
  const cap = Math.min(Math.max(1, Number(limit) || LIST_CAP), LIST_CAP);
  const res = await db.query(
    `SELECT s.id, s.company_id AS "companyId", s.title, s.description, s.status,
            s.opens_at AS "opensAt", s.closes_at AS "closesAt",
            s.created_by_user_id AS "createdByUserId",
            s.created_at AS "createdAt", s.updated_at AS "updatedAt",
            (SELECT COUNT(*)::int FROM climate_survey_questions q
              WHERE q.survey_id = s.id AND q.active = TRUE) AS "questionCount",
            (SELECT COUNT(*)::int FROM climate_survey_responses r
              WHERE r.survey_id = s.id) AS "responseCount"
     FROM climate_surveys s
     WHERE s.company_id = $1 AND s.deleted = FALSE
     ORDER BY s.updated_at DESC, s.id DESC
     LIMIT $2`,
    [companyId, cap]
  );
  return res.rows.map(mapSurveyRow);
}

export async function getClimateSurvey(dbOrQuery, { companyId, surveyId }) {
  const db = asDb(dbOrQuery);
  const res = await db.query(
    `SELECT s.id, s.company_id AS "companyId", s.title, s.description, s.status,
            s.opens_at AS "opensAt", s.closes_at AS "closesAt",
            s.created_by_user_id AS "createdByUserId",
            s.created_at AS "createdAt", s.updated_at AS "updatedAt"
     FROM climate_surveys s
     WHERE s.id = $1 AND s.company_id = $2 AND s.deleted = FALSE
     LIMIT 1`,
    [surveyId, companyId]
  );
  if (res.rowCount === 0) return null;
  const survey = mapSurveyRow(res.rows[0]);
  const q = await db.query(
    `SELECT id, survey_id AS "surveyId", company_id AS "companyId",
            prompt, sort_order AS "sortOrder",
            scale_min AS "scaleMin", scale_max AS "scaleMax", active
     FROM climate_survey_questions
     WHERE survey_id = $1 AND company_id = $2 AND active = TRUE
     ORDER BY sort_order ASC, id ASC
     LIMIT $3`,
    [surveyId, companyId, QUESTIONS_CAP]
  );
  const counts = await db.query(
    `SELECT COUNT(*)::int AS n FROM climate_survey_responses
     WHERE survey_id = $1 AND company_id = $2`,
    [surveyId, companyId]
  );
  return {
    ...survey,
    questions: q.rows,
    responseCount: Number(counts.rows[0]?.n) || 0,
  };
}

async function insertQuestions(db, { surveyId, companyId, prompts }) {
  const list = (Array.isArray(prompts) ? prompts : [])
    .map((p) => String(p || '').trim().slice(0, PROMPT_MAX))
    .filter(Boolean)
    .slice(0, QUESTIONS_CAP);
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    const r = await db.query(
      `INSERT INTO climate_survey_questions (
         survey_id, company_id, prompt, sort_order, scale_min, scale_max
       ) VALUES ($1, $2, $3, $4, 1, 5)
       RETURNING id, survey_id AS "surveyId", company_id AS "companyId",
                 prompt, sort_order AS "sortOrder",
                 scale_min AS "scaleMin", scale_max AS "scaleMax", active`,
      [surveyId, companyId, list[i], i]
    );
    out.push(r.rows[0]);
  }
  return out;
}

export async function createClimateSurvey(dbOrQuery, {
  companyId,
  title,
  description = '',
  status = 'draft',
  createdByUserId = null,
  seedDefaultQuestions = true,
  prompts = null,
}) {
  const db = asDb(dbOrQuery);
  const safeTitle = normalizeTitle(title);
  if (!safeTitle) return { ok: false, errorCode: 'TITLE_REQUIRED' };
  const safeDesc = String(description || '').trim().slice(0, DESC_MAX);
  const safeStatus = normalizeStatus(status, 'draft');

  const res = await db.query(
    `INSERT INTO climate_surveys (
       company_id, title, description, status, created_by_user_id
     ) VALUES ($1, $2, $3, $4, $5)
     RETURNING id, company_id AS "companyId", title, description, status,
               opens_at AS "opensAt", closes_at AS "closesAt",
               created_by_user_id AS "createdByUserId",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [companyId, safeTitle, safeDesc, safeStatus, createdByUserId || null]
  );
  const survey = mapSurveyRow(res.rows[0]);
  const seed =
    Array.isArray(prompts) && prompts.length
      ? prompts
      : seedDefaultQuestions
        ? [...DEFAULT_CLIMATE_PROMPTS_PT]
        : [];
  const questions = await insertQuestions(db, {
    surveyId: survey.id,
    companyId,
    prompts: seed,
  });
  return { ok: true, survey: { ...survey, questions, responseCount: 0 } };
}

export async function updateClimateSurvey(dbOrQuery, {
  companyId,
  surveyId,
  title,
  description,
  status,
  opensAt,
  closesAt,
}) {
  const db = asDb(dbOrQuery);
  const existing = await getClimateSurvey(db, { companyId, surveyId });
  if (!existing) return { ok: false, errorCode: 'NOT_FOUND' };

  const nextTitle = title !== undefined ? normalizeTitle(title) : existing.title;
  if (!nextTitle) return { ok: false, errorCode: 'TITLE_REQUIRED' };
  const nextDesc =
    description !== undefined
      ? String(description || '').trim().slice(0, DESC_MAX)
      : existing.description;
  const nextStatus =
    status !== undefined ? normalizeStatus(status, existing.status) : existing.status;

  const res = await db.query(
    `UPDATE climate_surveys
     SET title = $3, description = $4, status = $5,
         opens_at = COALESCE($6::timestamptz, opens_at),
         closes_at = COALESCE($7::timestamptz, closes_at),
         updated_at = NOW()
     WHERE id = $1 AND company_id = $2 AND deleted = FALSE
     RETURNING id, company_id AS "companyId", title, description, status,
               opens_at AS "opensAt", closes_at AS "closesAt",
               created_by_user_id AS "createdByUserId",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      surveyId,
      companyId,
      nextTitle,
      nextDesc,
      nextStatus,
      opensAt != null && opensAt !== '' ? opensAt : null,
      closesAt != null && closesAt !== '' ? closesAt : null,
    ]
  );
  return {
    ok: true,
    survey: {
      ...mapSurveyRow(res.rows[0]),
      questions: existing.questions,
      responseCount: existing.responseCount,
    },
  };
}

export async function softDeleteClimateSurvey(dbOrQuery, { companyId, surveyId }) {
  const db = asDb(dbOrQuery);
  const res = await db.query(
    `UPDATE climate_surveys
     SET deleted = TRUE, status = 'closed', updated_at = NOW()
     WHERE id = $1 AND company_id = $2 AND deleted = FALSE
     RETURNING id`,
    [surveyId, companyId]
  );
  if (res.rowCount === 0) return { ok: false, errorCode: 'NOT_FOUND' };
  return { ok: true };
}

/**
 * Create anonymous invite token (one response per invite).
 */
export async function createClimateSurveyInvite(dbOrQuery, {
  companyId,
  surveyId,
  ttlDays = INVITE_TTL_DAYS,
}) {
  const db = asDb(dbOrQuery);
  const survey = await getClimateSurvey(db, { companyId, surveyId });
  if (!survey) return { ok: false, errorCode: 'NOT_FOUND' };
  if (survey.status === 'closed') return { ok: false, errorCode: 'SURVEY_CLOSED' };
  if (survey.status !== 'open') return { ok: false, errorCode: 'SURVEY_NOT_OPEN' };
  if (!survey.questions.length) return { ok: false, errorCode: 'NO_QUESTIONS' };

  const token = crypto.randomBytes(24).toString('hex');
  const days = Math.min(Math.max(1, Number(ttlDays) || INVITE_TTL_DAYS), 90);
  const res = await db.query(
    `INSERT INTO climate_survey_invites (survey_id, company_id, token, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4::int * INTERVAL '1 day'))
     RETURNING id, survey_id AS "surveyId", company_id AS "companyId",
               token, expires_at AS "expiresAt", used_at AS "usedAt", created_at AS "createdAt"`,
    [surveyId, companyId, token, days]
  );
  return { ok: true, invite: res.rows[0], survey };
}

/**
 * Public resolve — no session. Never returns PII.
 */
export async function resolveClimateInviteByToken(dbOrQuery, tokenRaw) {
  const db = asDb(dbOrQuery);
  const token = String(tokenRaw || '').trim();
  if (token.length < 16) return { ok: false, errorCode: 'INVALID_TOKEN' };

  const res = await db.query(
    `SELECT i.id AS "inviteId", i.token, i.expires_at AS "expiresAt", i.used_at AS "usedAt",
            s.id AS "surveyId", s.company_id AS "companyId", s.title, s.description, s.status,
            s.deleted, c.deleted AS "companyDeleted"
     FROM climate_survey_invites i
     JOIN climate_surveys s ON s.id = i.survey_id
     JOIN companies c ON c.id = s.company_id
     WHERE i.token = $1
     LIMIT 1`,
    [token]
  );
  if (res.rowCount === 0) return { ok: false, errorCode: 'INVALID_TOKEN' };
  const row = res.rows[0];
  if (row.deleted || row.companyDeleted) return { ok: false, errorCode: 'EXPIRED_LINK' };
  if (row.usedAt) return { ok: false, errorCode: 'ALREADY_SUBMITTED' };
  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
    return { ok: false, errorCode: 'EXPIRED_LINK' };
  }
  if (row.status !== 'open') return { ok: false, errorCode: 'SURVEY_NOT_OPEN' };

  const q = await db.query(
    `SELECT id, prompt, sort_order AS "sortOrder",
            scale_min AS "scaleMin", scale_max AS "scaleMax"
     FROM climate_survey_questions
     WHERE survey_id = $1 AND company_id = $2 AND active = TRUE
     ORDER BY sort_order ASC, id ASC
     LIMIT $3`,
    [row.surveyId, row.companyId, QUESTIONS_CAP]
  );
  return {
    ok: true,
    inviteId: row.inviteId,
    surveyId: row.surveyId,
    companyId: row.companyId,
    title: row.title,
    description: row.description,
    questions: q.rows,
  };
}

/**
 * Submit anonymous answers: { [questionId]: number }.
 */
export async function submitClimateResponse(dbOrQuery, { token, answers }) {
  const db = asDb(dbOrQuery);
  const resolved = await resolveClimateInviteByToken(db, token);
  if (!resolved.ok) return resolved;

  const allowed = new Map(
    resolved.questions.map((q) => [String(q.id), q])
  );
  const clean = {};
  for (const [k, v] of Object.entries(answers && typeof answers === 'object' ? answers : {})) {
    const q = allowed.get(String(k));
    if (!q) continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    if (n < q.scaleMin || n > q.scaleMax) continue;
    clean[String(q.id)] = Math.round(n);
  }
  if (Object.keys(clean).length !== allowed.size) {
    return { ok: false, errorCode: 'INCOMPLETE_ANSWERS' };
  }

  try {
    await db.query('BEGIN');
    const ins = await db.query(
      `INSERT INTO climate_survey_responses (survey_id, company_id, invite_id, answers)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id, submitted_at AS "submittedAt"`,
      [resolved.surveyId, resolved.companyId, resolved.inviteId, JSON.stringify(clean)]
    );
    await db.query(
      `UPDATE climate_survey_invites SET used_at = NOW() WHERE id = $1 AND used_at IS NULL`,
      [resolved.inviteId]
    );
    await db.query('COMMIT');
    return { ok: true, responseId: ins.rows[0].id, submittedAt: ins.rows[0].submittedAt };
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    if (err?.code === '23505') return { ok: false, errorCode: 'ALREADY_SUBMITTED' };
    throw err;
  }
}

/**
 * Aggregated means per question (no raw rows in response).
 */
export async function getClimateSurveyAggregate(dbOrQuery, { companyId, surveyId }) {
  const db = asDb(dbOrQuery);
  const survey = await getClimateSurvey(db, { companyId, surveyId });
  if (!survey) return { ok: false, errorCode: 'NOT_FOUND' };

  const res = await db.query(
    `SELECT answers FROM climate_survey_responses
     WHERE survey_id = $1 AND company_id = $2
     ORDER BY submitted_at DESC
     LIMIT 5000`,
    [surveyId, companyId]
  );
  const sums = {};
  const counts = {};
  for (const q of survey.questions) {
    sums[q.id] = 0;
    counts[q.id] = 0;
  }
  for (const row of res.rows) {
    const ans = row.answers && typeof row.answers === 'object' ? row.answers : {};
    for (const q of survey.questions) {
      const n = Number(ans[String(q.id)] ?? ans[q.id]);
      if (!Number.isFinite(n)) continue;
      sums[q.id] += n;
      counts[q.id] += 1;
    }
  }
  const byQuestion = survey.questions.map((q) => ({
    questionId: q.id,
    prompt: q.prompt,
    scaleMin: q.scaleMin,
    scaleMax: q.scaleMax,
    responses: counts[q.id] || 0,
    mean: counts[q.id] ? Math.round((sums[q.id] / counts[q.id]) * 10) / 10 : null,
  }));
  return {
    ok: true,
    surveyId: survey.id,
    responseCount: res.rows.length,
    byQuestion,
  };
}

export const CLIMATE_SURVEY_CAPS = { LIST_CAP, QUESTIONS_CAP, SURVEY_STATUSES };
