/**
 * Climate surveys — company campaigns; anonymous responses via invite token.
 */

import crypto from 'crypto';
import { asDb } from '../ae/as-db.js';
import { ERR } from '../api-error-codes.js';
import { CLIMATE_SURVEY_STATUS } from '../domain-status.js';
import { isMailConfigured, sendTransactionalMail } from '../mail.js';
import { extractClimateThemes } from './climate-themes.js';

export { climateMeanLevel, buildClimateTrendChart } from './climate-viz.js';

const TITLE_MAX = 200;
const DESC_MAX = 4000;
const PROMPT_MAX = 500;
const LIST_CAP = 40;
const QUESTIONS_CAP = 20;
const INVITE_TTL_DAYS = 45;
const INVITE_BATCH_CAP = 50;
const TEXT_ANSWER_MAX = 1500;
const TEXT_ANSWER_MIN = 5;
const TEXT_ANSWERS_CAP = 200;
const QUESTION_KINDS = new Set(['likert', 'text']);
/** B-506 — hide means until this many responses (override via CLIMATE_MIN_RESPONSES). */
export function climateMinResponses() {
  const n = parseInt(String(process.env.CLIMATE_MIN_RESPONSES || '5'), 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 100) : 5;
}

/** Default Likert prompts (pt-BR) for new drafts — hedged workplace climate. */

const SURVEY_STATUSES = new Set(Object.values(CLIMATE_SURVEY_STATUS));

/** Default Likert prompts (pt-BR) for new drafts — hedged workplace climate. */
export const DEFAULT_CLIMATE_PROMPTS_PT = Object.freeze([
  'Em geral, sinto que posso contribuir com o meu melhor no dia a dia.',
  'Tenho clareza sobre o que se espera do meu trabalho.',
  'Sinto que há espaço para falar sobre dificuldades sem retaliação.',
  'Percebo reconhecimento quando entrego resultados relevantes.',
  'O ritmo e a carga de trabalho tendem a ser sustentáveis para mim.',
]);

/** Default open-text prompts (pt-BR) — qualitative insights beyond Likert. */
export const DEFAULT_CLIMATE_TEXT_PROMPTS_PT = Object.freeze([
  'Se quiser, conte em poucas palavras o que mais ajuda você a trabalhar bem por aqui.',
  'O que tende a dificultar o seu dia a dia no trabalho, se houver algo relevante?',
]);

function normalizeQuestionKind(raw, fallback = 'likert') {
  const k = String(raw || '').trim().toLowerCase();
  return QUESTION_KINDS.has(k) ? k : fallback;
}

function mapQuestionRow(row) {
  return {
    id: row.id,
    surveyId: row.surveyId,
    companyId: row.companyId,
    prompt: row.prompt,
    sortOrder: row.sortOrder,
    scaleMin: row.scaleMin,
    scaleMax: row.scaleMax,
    active: row.active,
    questionKind: normalizeQuestionKind(row.questionKind, 'likert'),
  };
}

function shuffleCopy(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function normalizeTitle(raw) {
  const title = String(raw || '').trim().slice(0, TITLE_MAX);
  return title.length >= 1 ? title : null;
}

function normalizeStatus(raw, fallback = CLIMATE_SURVEY_STATUS.DRAFT) {
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
            scale_min AS "scaleMin", scale_max AS "scaleMax", active,
            COALESCE(question_kind, 'likert') AS "questionKind"
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
    questions: q.rows.map(mapQuestionRow),
    responseCount: Number(counts.rows[0]?.n) || 0,
  };
}

async function insertQuestions(db, { surveyId, companyId, items }) {
  const list = (Array.isArray(items) ? items : [])
    .map((raw) => {
      if (raw && typeof raw === 'object') {
        return {
          prompt: String(raw.prompt || '').trim().slice(0, PROMPT_MAX),
          kind: normalizeQuestionKind(raw.kind || raw.questionKind, 'likert'),
        };
      }
      return {
        prompt: String(raw || '').trim().slice(0, PROMPT_MAX),
        kind: 'likert',
      };
    })
    .filter((x) => x.prompt)
    .slice(0, QUESTIONS_CAP);
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    const r = await db.query(
      `INSERT INTO climate_survey_questions (
         survey_id, company_id, prompt, sort_order, scale_min, scale_max, question_kind
       ) VALUES ($1, $2, $3, $4, 1, 5, $5)
       RETURNING id, survey_id AS "surveyId", company_id AS "companyId",
                 prompt, sort_order AS "sortOrder",
                 scale_min AS "scaleMin", scale_max AS "scaleMax", active,
                 COALESCE(question_kind, 'likert') AS "questionKind"`,
      [surveyId, companyId, list[i].prompt, i, list[i].kind]
    );
    out.push(mapQuestionRow(r.rows[0]));
  }
  return out;
}

export async function createClimateSurvey(dbOrQuery, {
  companyId,
  title,
  description = '',
  status = CLIMATE_SURVEY_STATUS.DRAFT,
  createdByUserId = null,
  seedDefaultQuestions = true,
  prompts = null,
}) {
  const db = asDb(dbOrQuery);
  const safeTitle = normalizeTitle(title);
  if (!safeTitle) return { ok: false, errorCode: ERR.TITLE_REQUIRED };
  const safeDesc = String(description || '').trim().slice(0, DESC_MAX);
  const safeStatus = normalizeStatus(status, CLIMATE_SURVEY_STATUS.DRAFT);

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
  let seedItems;
  if (Array.isArray(prompts) && prompts.length) {
    seedItems = prompts;
  } else if (seedDefaultQuestions) {
    seedItems = [
      ...DEFAULT_CLIMATE_PROMPTS_PT.map((prompt) => ({ prompt, kind: 'likert' })),
      ...DEFAULT_CLIMATE_TEXT_PROMPTS_PT.map((prompt) => ({ prompt, kind: 'text' })),
    ];
  } else {
    seedItems = [];
  }
  const questions = await insertQuestions(db, {
    surveyId: survey.id,
    companyId,
    items: seedItems,
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
  if (!existing) return { ok: false, errorCode: ERR.NOT_FOUND };

  const nextTitle = title !== undefined ? normalizeTitle(title) : existing.title;
  if (!nextTitle) return { ok: false, errorCode: ERR.TITLE_REQUIRED };
  const nextDesc =
    description !== undefined
      ? String(description || '').trim().slice(0, DESC_MAX)
      : existing.description;
  const nextStatus =
    status !== undefined ? normalizeStatus(status, existing.status) : existing.status;

  let nextOpens =
    opensAt != null && opensAt !== '' ? opensAt : null;
  let nextCloses =
    closesAt != null && closesAt !== '' ? closesAt : null;
  // Stamp campaign window on status transitions so managers can compare over time.
  if (status !== undefined && nextStatus === CLIMATE_SURVEY_STATUS.OPEN && existing.status !== CLIMATE_SURVEY_STATUS.OPEN && !existing.opensAt) {
    nextOpens = nextOpens || new Date().toISOString();
  }
  if (status !== undefined && nextStatus === CLIMATE_SURVEY_STATUS.CLOSED && existing.status !== CLIMATE_SURVEY_STATUS.CLOSED && !existing.closesAt) {
    nextCloses = nextCloses || new Date().toISOString();
  }

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
      nextOpens,
      nextCloses,
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
     SET deleted = TRUE, status = '${CLIMATE_SURVEY_STATUS.CLOSED}', updated_at = NOW()
     WHERE id = $1 AND company_id = $2 AND deleted = FALSE
     RETURNING id`,
    [surveyId, companyId]
  );
  if (res.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  return { ok: true };
}

/** B-503 — add question (draft preferred; allowed while open but discouraged). */
export async function addClimateSurveyQuestion(dbOrQuery, {
  companyId,
  surveyId,
  prompt,
  sortOrder = null,
  questionKind = 'likert',
}) {
  const db = asDb(dbOrQuery);
  const survey = await getClimateSurvey(db, { companyId, surveyId });
  if (!survey) return { ok: false, errorCode: ERR.NOT_FOUND };
  if (survey.status === CLIMATE_SURVEY_STATUS.CLOSED) return { ok: false, errorCode: ERR.SURVEY_CLOSED };
  if (survey.questions.length >= QUESTIONS_CAP) return { ok: false, errorCode: ERR.QUESTIONS_CAP };
  const text = String(prompt || '').trim().slice(0, PROMPT_MAX);
  if (!text) return { ok: false, errorCode: ERR.TITLE_REQUIRED };
  const kind = normalizeQuestionKind(questionKind, 'likert');
  const order =
    sortOrder != null && Number.isFinite(Number(sortOrder))
      ? Number(sortOrder)
      : survey.questions.length;
  const r = await db.query(
    `INSERT INTO climate_survey_questions (
       survey_id, company_id, prompt, sort_order, scale_min, scale_max, question_kind
     ) VALUES ($1, $2, $3, $4, 1, 5, $5)
     RETURNING id, survey_id AS "surveyId", company_id AS "companyId",
               prompt, sort_order AS "sortOrder",
               scale_min AS "scaleMin", scale_max AS "scaleMax", active,
               COALESCE(question_kind, 'likert') AS "questionKind"`,
    [surveyId, companyId, text, order, kind]
  );
  await db.query(`UPDATE climate_surveys SET updated_at = NOW() WHERE id = $1`, [surveyId]);
  return { ok: true, question: mapQuestionRow(r.rows[0]) };
}

export async function updateClimateSurveyQuestion(dbOrQuery, {
  companyId,
  surveyId,
  questionId,
  prompt,
  sortOrder,
  active,
}) {
  const db = asDb(dbOrQuery);
  const owned = await db.query(
    `SELECT q.id, q.prompt, q.sort_order AS "sortOrder", q.active
     FROM climate_survey_questions q
     JOIN climate_surveys s ON s.id = q.survey_id
     WHERE q.id = $1 AND q.survey_id = $2 AND q.company_id = $3 AND s.deleted = FALSE
     LIMIT 1`,
    [questionId, surveyId, companyId]
  );
  if (owned.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  const cur = owned.rows[0];
  const nextPrompt =
    prompt !== undefined ? String(prompt || '').trim().slice(0, PROMPT_MAX) : cur.prompt;
  if (!nextPrompt) return { ok: false, errorCode: ERR.TITLE_REQUIRED };
  const nextOrder =
    sortOrder !== undefined && Number.isFinite(Number(sortOrder))
      ? Number(sortOrder)
      : cur.sortOrder;
  const nextActive = active !== undefined ? Boolean(active) : cur.active;
  const r = await db.query(
    `UPDATE climate_survey_questions
     SET prompt = $2, sort_order = $3, active = $4
     WHERE id = $1
     RETURNING id, survey_id AS "surveyId", company_id AS "companyId",
               prompt, sort_order AS "sortOrder",
               scale_min AS "scaleMin", scale_max AS "scaleMax", active,
               COALESCE(question_kind, 'likert') AS "questionKind"`,
    [questionId, nextPrompt, nextOrder, nextActive]
  );
  await db.query(`UPDATE climate_surveys SET updated_at = NOW() WHERE id = $1`, [surveyId]);
  return { ok: true, question: mapQuestionRow(r.rows[0]) };
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
  if (!survey) return { ok: false, errorCode: ERR.NOT_FOUND };
  if (survey.status === CLIMATE_SURVEY_STATUS.CLOSED) return { ok: false, errorCode: ERR.SURVEY_CLOSED };
  if (survey.status !== CLIMATE_SURVEY_STATUS.OPEN) return { ok: false, errorCode: ERR.SURVEY_NOT_OPEN };
  if (!survey.questions.length) return { ok: false, errorCode: ERR.NO_QUESTIONS };

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

/** B-504 — create up to INVITE_BATCH_CAP anonymous invites. */
export async function createClimateSurveyInviteBatch(dbOrQuery, {
  companyId,
  surveyId,
  count = 1,
  ttlDays = INVITE_TTL_DAYS,
}) {
  const n = Math.min(Math.max(1, Number(count) || 1), INVITE_BATCH_CAP);
  const invites = [];
  for (let i = 0; i < n; i += 1) {
    const one = await createClimateSurveyInvite(dbOrQuery, { companyId, surveyId, ttlDays });
    if (!one.ok) return one;
    invites.push(one.invite);
  }
  return { ok: true, invites, surveyId };
}

/**
 * B-504 — email anonymous unique links (one invite per address). Never includes identity in survey.
 * @returns {{ ok: true, sent: number, skipped: number, invites: object[] } | { ok: false, errorCode: string }}
 */
export async function emailClimateSurveyInvites(dbOrQuery, {
  companyId,
  surveyId,
  emails,
  appOrigin,
  locale = 'pt-BR',
  ttlDays = INVITE_TTL_DAYS,
}) {
  const list = [...new Set(
    (Array.isArray(emails) ? emails : [])
      .map((e) => String(e || '').trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
  )].slice(0, INVITE_BATCH_CAP);
  if (!list.length) return { ok: false, errorCode: ERR.INVALID_DATA };
  if (!isMailConfigured()) return { ok: false, errorCode: ERR.MAIL_NOT_CONFIGURED };

  const batch = await createClimateSurveyInviteBatch(dbOrQuery, {
    companyId,
    surveyId,
    count: list.length,
    ttlDays,
  });
  if (!batch.ok) return batch;

  const survey = await getClimateSurvey(dbOrQuery, { companyId, surveyId });
  const title = survey?.title || 'Climate';
  const origin = String(appOrigin || '').replace(/\/$/, '');
  let sent = 0;
  for (let i = 0; i < list.length; i += 1) {
    const invite = batch.invites[i];
    if (!invite?.token) continue;
    const url = `${origin}/clima/${invite.token}`;
    const subject =
      locale === 'en'
        ? `Anonymous climate survey: ${title}`
        : `Pesquisa de clima (anônima): ${title}`;
    const text =
      locale === 'en'
        ? `Please answer this anonymous climate survey (one use):\n\n${url}\n\nWe do not ask for your name or email on the form.`
        : `Responda esta pesquisa de clima anônima (um uso por link):\n\n${url}\n\nO formulário não pede nome nem e-mail.`;
    try {
      await sendTransactionalMail({ to: list[i], subject, text });
      sent += 1;
    } catch (e) {
      console.error('[climate] invite email failed', e?.message);
    }
  }
  return { ok: true, sent, skipped: list.length - sent, invites: batch.invites };
}

/**
 * Public resolve — no session. Never returns PII.
 */
export async function resolveClimateInviteByToken(dbOrQuery, tokenRaw) {
  const db = asDb(dbOrQuery);
  const token = String(tokenRaw || '').trim();
  if (token.length < 16) return { ok: false, errorCode: ERR.INVALID_TOKEN };

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
  if (res.rowCount === 0) return { ok: false, errorCode: ERR.INVALID_TOKEN };
  const row = res.rows[0];
  if (row.deleted || row.companyDeleted) return { ok: false, errorCode: ERR.EXPIRED_LINK };
  if (row.usedAt) return { ok: false, errorCode: ERR.ALREADY_SUBMITTED };
  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
    return { ok: false, errorCode: ERR.EXPIRED_LINK };
  }
  if (row.status !== CLIMATE_SURVEY_STATUS.OPEN) return { ok: false, errorCode: ERR.SURVEY_NOT_OPEN };

  const q = await db.query(
    `SELECT id, prompt, sort_order AS "sortOrder",
            scale_min AS "scaleMin", scale_max AS "scaleMax",
            COALESCE(question_kind, 'likert') AS "questionKind"
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
    questions: q.rows.map((r) => ({
      id: r.id,
      prompt: r.prompt,
      sortOrder: r.sortOrder,
      scaleMin: r.scaleMin,
      scaleMax: r.scaleMax,
      questionKind: normalizeQuestionKind(r.questionKind, 'likert'),
    })),
  };
}

/**
 * Submit anonymous answers: { [questionId]: number | string }.
 */
export async function submitClimateResponse(dbOrQuery, { token, answers }) {
  const db = asDb(dbOrQuery);
  const resolved = await resolveClimateInviteByToken(db, token);
  if (!resolved.ok) return resolved;

  const allowed = new Map(resolved.questions.map((q) => [String(q.id), q]));
  const clean = {};
  for (const [k, v] of Object.entries(answers && typeof answers === 'object' ? answers : {})) {
    const q = allowed.get(String(k));
    if (!q) continue;
    if (q.questionKind === 'text') {
      const text = String(v ?? '')
        .trim()
        .slice(0, TEXT_ANSWER_MAX);
      if (text.length < TEXT_ANSWER_MIN) continue;
      clean[String(q.id)] = text;
      continue;
    }
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    if (n < q.scaleMin || n > q.scaleMax) continue;
    clean[String(q.id)] = Math.round(n);
  }
  if (Object.keys(clean).length !== allowed.size) {
    return { ok: false, errorCode: ERR.INCOMPLETE_ANSWERS };
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
    if (err?.code === '23505') return { ok: false, errorCode: ERR.ALREADY_SUBMITTED };
    throw err;
  }
}

/**
 * Aggregated means per question (no raw rows). B-506: suppress until min responses.
 */
export async function getClimateSurveyAggregate(dbOrQuery, { companyId, surveyId }) {
  const db = asDb(dbOrQuery);
  const survey = await getClimateSurvey(db, { companyId, surveyId });
  if (!survey) return { ok: false, errorCode: ERR.NOT_FOUND };

  const res = await db.query(
    `SELECT answers FROM climate_survey_responses
     WHERE survey_id = $1 AND company_id = $2
     ORDER BY submitted_at DESC
     LIMIT 5000`,
    [surveyId, companyId]
  );
  const responseCount = res.rows.length;
  const min = climateMinResponses();
  if (responseCount < min) {
    return {
      ok: true,
      surveyId: survey.id,
      responseCount,
      minResponses: min,
      suppressed: true,
      overallMean: null,
      byQuestion: [],
      textByQuestion: [],
      themes: [],
    };
  }

  const likertQs = survey.questions.filter((q) => q.questionKind !== 'text');
  const textQs = survey.questions.filter((q) => q.questionKind === 'text');

  const sums = {};
  const counts = {};
  for (const q of likertQs) {
    sums[q.id] = 0;
    counts[q.id] = 0;
  }
  const textBuckets = {};
  for (const q of textQs) {
    textBuckets[q.id] = [];
  }

  for (const row of res.rows) {
    const ans = row.answers && typeof row.answers === 'object' ? row.answers : {};
    for (const q of likertQs) {
      const n = Number(ans[String(q.id)] ?? ans[q.id]);
      if (!Number.isFinite(n)) continue;
      sums[q.id] += n;
      counts[q.id] += 1;
    }
    for (const q of textQs) {
      const raw = ans[String(q.id)] ?? ans[q.id];
      if (typeof raw !== 'string') continue;
      const text = raw.trim().slice(0, TEXT_ANSWER_MAX);
      if (text.length < TEXT_ANSWER_MIN) continue;
      textBuckets[q.id].push(text);
    }
  }

  const byQuestion = likertQs.map((q) => ({
    questionId: q.id,
    prompt: q.prompt,
    questionKind: 'likert',
    scaleMin: q.scaleMin,
    scaleMax: q.scaleMax,
    responses: counts[q.id] || 0,
    mean: counts[q.id] ? Math.round((sums[q.id] / counts[q.id]) * 10) / 10 : null,
  }));
  const textByQuestion = textQs.map((q) => {
    const shuffled = shuffleCopy(textBuckets[q.id] || []).slice(0, TEXT_ANSWERS_CAP);
    return {
      questionId: q.id,
      prompt: q.prompt,
      questionKind: 'text',
      responses: shuffled.length,
      answers: shuffled,
    };
  });
  const means = byQuestion.map((q) => q.mean).filter((m) => m != null);
  const overallMean =
    means.length > 0
      ? Math.round((means.reduce((a, b) => a + b, 0) / means.length) * 10) / 10
      : null;
  let themes = [];
  try {
    themes = extractClimateThemes(textByQuestion).themes || [];
  } catch {
    themes = [];
  }
  return {
    ok: true,
    surveyId: survey.id,
    responseCount,
    minResponses: min,
    suppressed: false,
    overallMean,
    byQuestion,
    textByQuestion,
    themes,
  };
}

/**
 * B-505 — benchmark: closed/open surveys with enough responses, means keyed by prompt text.
 */
export async function getClimateCompanyBenchmark(dbOrQuery, { companyId, limit = 8 }) {
  const db = asDb(dbOrQuery);
  const min = climateMinResponses();
  const cap = Math.min(Math.max(1, Number(limit) || 8), LIST_CAP);
  const surveys = await listClimateSurveys(db, { companyId, limit: LIST_CAP });
  const eligible = surveys
    .filter((s) => (s.responseCount || 0) >= min)
    .slice(0, cap);
  const series = [];
  for (const s of eligible) {
    const agg = await getClimateSurveyAggregate(db, { companyId, surveyId: s.id });
    if (!agg.ok || agg.suppressed) continue;
    const byPrompt = Object.fromEntries(
      (agg.byQuestion || []).map((q) => [String(q.prompt).trim().toLowerCase(), q.mean])
    );
    series.push({
      surveyId: s.id,
      title: s.title,
      status: s.status,
      responseCount: agg.responseCount,
      overallMean: agg.overallMean ?? null,
      createdAt: s.createdAt,
      opensAt: s.opensAt,
      closesAt: s.closesAt,
      updatedAt: s.updatedAt,
      byPrompt,
      byQuestion: agg.byQuestion,
    });
  }
  // Newest first already from list — delta vs previous eligible survey
  for (let i = 0; i < series.length; i += 1) {
    const prev = series[i + 1];
    const cur = series[i].overallMean;
    const p = prev?.overallMean;
    series[i].deltaVsPrevious =
      cur != null && p != null ? Math.round((cur - p) * 10) / 10 : null;
  }
  const promptSet = new Set();
  for (const row of series) {
    for (const k of Object.keys(row.byPrompt)) promptSet.add(k);
  }
  const prompts = [...promptSet].slice(0, QUESTIONS_CAP);
  return {
    ok: true,
    minResponses: min,
    surveys: series.map(({ byPrompt: _bp, byQuestion: _bq, ...rest }) => rest),
    prompts: prompts.map((p) => {
      const label =
        series.flatMap((s) => s.byQuestion || []).find((q) => String(q.prompt).trim().toLowerCase() === p)
          ?.prompt || p;
      return {
        key: p,
        prompt: label,
        means: series.map((s) => ({
          surveyId: s.surveyId,
          title: s.title,
          mean: s.byPrompt[p] ?? null,
        })),
      };
    }),
  };
}

/**
 * Company-wide mean of Likert answers from recent closed surveys.
 * Climate responses are anonymous (no candidate_id) — company signal only.
 *
 * Cap: last 5000 responses in the window (same order of magnitude as aggregate UI).
 *
 * @param {object} dbOrQuery
 * @param {{ companyId: number, days?: number }} opts
 * @returns {Promise<number|null>}
 */
export async function getCompanyRecentLikertMean(dbOrQuery, { companyId, days = 180 } = {}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) return null;
  const dayCount = Math.min(Math.max(1, Number(days) || 180), 730);

  const res = await db.query(
    `SELECT AVG((r.answers ->> q.id::text)::numeric) AS avg_score
     FROM (
       SELECT r.survey_id, r.answers
       FROM climate_survey_responses r
       INNER JOIN climate_surveys s
         ON s.id = r.survey_id AND s.company_id = r.company_id
       WHERE r.company_id = $1
         AND s.company_id = $1
         AND s.deleted = FALSE
         AND s.status = $2
         AND r.submitted_at > NOW() - ($3::int * INTERVAL '1 day')
       ORDER BY r.submitted_at DESC
       LIMIT 5000
     ) r
     INNER JOIN climate_survey_questions q
       ON q.survey_id = r.survey_id
      AND q.active = TRUE
      AND COALESCE(q.question_kind, 'likert') <> 'text'
     WHERE jsonb_typeof(r.answers -> q.id::text) = 'number'`,
    [cid, CLIMATE_SURVEY_STATUS.CLOSED, dayCount]
  );

  const raw = res.rows[0]?.avg_score;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Company pulse for Overview — open campaigns + response progress.
 */
export async function getCompanyClimatePulse(dbOrQuery, { companyId }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) return null;
  const min = climateMinResponses();
  try {
    const res = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE s.status = '${CLIMATE_SURVEY_STATUS.OPEN}' AND s.deleted = FALSE)::int AS "openSurveys",
         COUNT(*) FILTER (WHERE s.status = '${CLIMATE_SURVEY_STATUS.DRAFT}' AND s.deleted = FALSE)::int AS "draftSurveys",
         COALESCE((
           SELECT COUNT(*)::int FROM climate_survey_responses r
           JOIN climate_surveys s2 ON s2.id = r.survey_id
           WHERE s2.company_id = $1 AND s2.status = '${CLIMATE_SURVEY_STATUS.OPEN}' AND s2.deleted = FALSE
         ), 0) AS "openResponses"
       FROM climate_surveys s
       WHERE s.company_id = $1`,
      [cid]
    );
    const row = res.rows[0] || {};
    let latestMean = null;
    let deltaVsPrevious = null;
    try {
      const bench = await getClimateCompanyBenchmark(db, { companyId: cid, limit: 2 });
      const latest = Array.isArray(bench?.surveys) ? bench.surveys[0] : null;
      if (latest) {
        latestMean = latest.overallMean ?? null;
        deltaVsPrevious = latest.deltaVsPrevious ?? null;
      }
    } catch {
      /* optional enrichment */
    }
    return {
      openSurveys: Number(row.openSurveys) || 0,
      draftSurveys: Number(row.draftSurveys) || 0,
      openResponses: Number(row.openResponses) || 0,
      minResponses: min,
      latestMean,
      deltaVsPrevious,
    };
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') return null;
    throw err;
  }
}

export const CLIMATE_SURVEY_CAPS = {
  LIST_CAP,
  QUESTIONS_CAP,
  SURVEY_STATUSES,
  INVITE_BATCH_CAP,
};
