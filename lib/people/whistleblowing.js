/**
 * B-3005 — Ouvidoria / canal de denúncias (não mistura com clima).
 */

import crypto from 'crypto';
import { asDb } from '../ae/as-db.js';
import { query } from '../db.js';
import { ERR } from '../api-error-codes.js';
import {
  WHISTLEBLOWING_CATEGORIES,
  WHISTLEBLOWING_REPORT_STATUS,
  WHISTLEBLOWING_REPORT_STATUSES,
} from '../domain-status.js';

export const WHISTLE_BODY_MIN = 20;
export const WHISTLE_BODY_MAX = 4000;
export const WHISTLE_LIST_CAP = 100;
export const WHISTLE_DUE_DAYS_DEFAULT = 15;

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function mapChannel(r) {
  return {
    id: Number(r.id),
    companyId: Number(r.companyId),
    title: r.title,
    token: r.token,
    dueDays: Number(r.dueDays) || WHISTLE_DUE_DAYS_DEFAULT,
    active: r.active !== false,
    createdAt: r.createdAt,
    publicPath: `/ouvidoria/${r.token}`,
  };
}

function mapReport(r) {
  return {
    id: Number(r.id),
    companyId: Number(r.companyId),
    channelId: Number(r.channelId),
    channelTitle: r.channelTitle || null,
    category: r.category,
    body: r.body,
    anonymous: r.anonymous !== false,
    reporterCandidateId: r.reporterCandidateId != null ? Number(r.reporterCandidateId) : null,
    status: r.status,
    dueAt: r.dueAt || null,
    triageNotes: r.triageNotes || '',
    responseNotes: r.responseNotes || '',
    respondedAt: r.respondedAt || null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/**
 * @returns {Promise<{ ok: true, channels: object[] } | { ok: false, errorCode }>}
 */
export async function listWhistleblowingChannels(dbOrQuery, { companyId, includeInactive = false }) {
  const db = asDb(dbOrQuery || query);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) return { ok: false, errorCode: ERR.COMPANY_REQUIRED };

  try {
    const res = await db.query(
      `SELECT id, company_id AS "companyId", title, token,
              due_days AS "dueDays", active, created_at AS "createdAt"
       FROM whistleblowing_channels
       WHERE company_id = $1 AND deleted = FALSE
         AND ($2::boolean OR active = TRUE)
       ORDER BY created_at DESC, id DESC
       LIMIT 40`,
      [cid, includeInactive === true]
    );
    return { ok: true, channels: res.rows.map(mapChannel) };
  } catch (err) {
    if (err?.code === '42P01') return { ok: true, channels: [] };
    throw err;
  }
}

export async function createWhistleblowingChannel(dbOrQuery, {
  companyId,
  title,
  dueDays = WHISTLE_DUE_DAYS_DEFAULT,
  createdByUserId = null,
}) {
  const db = asDb(dbOrQuery || query);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  const t = String(title || '').trim().slice(0, 200);
  if (t.length < 1) return { ok: false, errorCode: ERR.INVALID_DATA };
  let days = Number(dueDays);
  if (!Number.isFinite(days) || days < 1) days = WHISTLE_DUE_DAYS_DEFAULT;
  days = Math.min(90, Math.max(1, Math.round(days)));
  const token = generateToken();
  const uid =
    createdByUserId != null && Number.isFinite(Number(createdByUserId))
      ? Number(createdByUserId)
      : null;

  try {
    const res = await db.query(
      `INSERT INTO whistleblowing_channels (
         company_id, title, token, due_days, created_by_user_id
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING id, company_id AS "companyId", title, token,
                 due_days AS "dueDays", active, created_at AS "createdAt"`,
      [cid, t, token, days, uid]
    );
    return { ok: true, channel: mapChannel(res.rows[0]) };
  } catch (err) {
    if (err?.code === '42P01') return { ok: false, errorCode: ERR.SCHEMA_NOT_INITIALIZED };
    throw err;
  }
}

export async function resolveWhistleblowingChannelByToken(dbOrQuery, token) {
  const db = asDb(dbOrQuery || query);
  const tok = String(token || '').trim();
  if (tok.length < 24) return { ok: false, errorCode: ERR.INVALID_TOKEN };

  try {
    const res = await db.query(
      `SELECT id, company_id AS "companyId", title, token,
              due_days AS "dueDays", active, created_at AS "createdAt"
       FROM whistleblowing_channels
       WHERE token = $1 AND deleted = FALSE AND active = TRUE
       LIMIT 1`,
      [tok]
    );
    if (!res.rowCount) return { ok: false, errorCode: ERR.INVALID_TOKEN };
    return {
      ok: true,
      channel: mapChannel(res.rows[0]),
      categories: [...WHISTLEBLOWING_CATEGORIES],
    };
  } catch (err) {
    if (err?.code === '42P01') return { ok: false, errorCode: ERR.SCHEMA_NOT_INITIALIZED };
    throw err;
  }
}

/**
 * Public or employee submit. When anonymous, never store reporter id.
 */
export async function submitWhistleblowingReport(dbOrQuery, {
  token,
  category,
  body,
  anonymous = true,
  reporterCandidateId = null,
}) {
  const db = asDb(dbOrQuery || query);
  const resolved = await resolveWhistleblowingChannelByToken(db, token);
  if (!resolved.ok) return resolved;

  const cat = String(category || '').toLowerCase();
  if (!WHISTLEBLOWING_CATEGORIES.includes(cat)) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }
  const text = String(body || '').trim();
  if (text.length < WHISTLE_BODY_MIN || text.length > WHISTLE_BODY_MAX) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  const isAnon = anonymous !== false;
  let reporterId = null;
  if (!isAnon) {
    const rid = Number(reporterCandidateId);
    if (!Number.isFinite(rid) || rid <= 0) {
      return { ok: false, errorCode: ERR.INVALID_DATA };
    }
    const check = await db.query(
      `SELECT id FROM candidates WHERE id = $1 AND company_id = $2 LIMIT 1`,
      [rid, resolved.channel.companyId]
    );
    if (!check.rowCount) return { ok: false, errorCode: ERR.INVALID_DATA };
    reporterId = rid;
  }

  const due = new Date();
  due.setUTCDate(due.getUTCDate() + (resolved.channel.dueDays || WHISTLE_DUE_DAYS_DEFAULT));

  try {
    const res = await db.query(
      `INSERT INTO whistleblowing_reports (
         company_id, channel_id, category, body, anonymous,
         reporter_candidate_id, status, due_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at AS "createdAt", due_at AS "dueAt"`,
      [
        resolved.channel.companyId,
        resolved.channel.id,
        cat,
        text,
        isAnon,
        reporterId,
        WHISTLEBLOWING_REPORT_STATUS.NEW,
        due.toISOString(),
      ]
    );
    return {
      ok: true,
      id: Number(res.rows[0].id),
      createdAt: res.rows[0].createdAt,
      dueAt: res.rows[0].dueAt,
    };
  } catch (err) {
    if (err?.code === '42P01') return { ok: false, errorCode: ERR.SCHEMA_NOT_INITIALIZED };
    throw err;
  }
}

export async function listWhistleblowingReports(dbOrQuery, {
  companyId,
  status = 'all',
  limit = 40,
}) {
  const db = asDb(dbOrQuery || query);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  const cap = Math.min(WHISTLE_LIST_CAP, Math.max(1, Number(limit) || 40));
  const params = [cid];
  let statusClause = '';
  if (status !== 'all' && WHISTLEBLOWING_REPORT_STATUSES.includes(status)) {
    params.push(status);
    statusClause = `AND r.status = $${params.length}`;
  }
  params.push(cap);

  try {
    const res = await db.query(
      `SELECT r.id, r.company_id AS "companyId", r.channel_id AS "channelId",
              c.title AS "channelTitle", r.category, r.body, r.anonymous,
              r.reporter_candidate_id AS "reporterCandidateId",
              r.status, r.due_at AS "dueAt",
              r.triage_notes AS "triageNotes", r.response_notes AS "responseNotes",
              r.responded_at AS "respondedAt",
              r.created_at AS "createdAt", r.updated_at AS "updatedAt"
       FROM whistleblowing_reports r
       JOIN whistleblowing_channels c ON c.id = r.channel_id AND c.company_id = r.company_id
       WHERE r.company_id = $1 ${statusClause}
       ORDER BY
         CASE r.status
           WHEN 'new' THEN 0
           WHEN 'triaging' THEN 1
           WHEN 'responded' THEN 2
           ELSE 3
         END,
         r.due_at ASC NULLS LAST,
         r.created_at DESC
       LIMIT $${params.length}`,
      params
    );
    return { ok: true, reports: res.rows.map(mapReport) };
  } catch (err) {
    if (err?.code === '42P01') return { ok: true, reports: [] };
    throw err;
  }
}

export async function updateWhistleblowingReport(dbOrQuery, {
  companyId,
  reportId,
  status,
  triageNotes,
  responseNotes,
  respondedByUserId = null,
}) {
  const db = asDb(dbOrQuery || query);
  const cid = Number(companyId);
  const rid = Number(reportId);
  if (!Number.isFinite(cid) || cid <= 0) return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  if (!Number.isFinite(rid) || rid <= 0) return { ok: false, errorCode: ERR.NOT_FOUND };

  const nextStatus = status != null ? String(status) : null;
  if (nextStatus && !WHISTLEBLOWING_REPORT_STATUSES.includes(nextStatus)) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  const sets = ['updated_at = NOW()'];
  const params = [];
  if (nextStatus) {
    params.push(nextStatus);
    sets.push(`status = $${params.length}`);
    if (
      nextStatus === WHISTLEBLOWING_REPORT_STATUS.RESPONDED ||
      nextStatus === WHISTLEBLOWING_REPORT_STATUS.CLOSED
    ) {
      sets.push('responded_at = COALESCE(responded_at, NOW())');
      if (respondedByUserId != null && Number.isFinite(Number(respondedByUserId))) {
        params.push(Number(respondedByUserId));
        sets.push(`responded_by_user_id = $${params.length}`);
      }
    }
  }
  if (triageNotes != null) {
    params.push(String(triageNotes).trim().slice(0, 2000));
    sets.push(`triage_notes = $${params.length}`);
  }
  if (responseNotes != null) {
    params.push(String(responseNotes).trim().slice(0, 4000));
    sets.push(`response_notes = $${params.length}`);
  }
  if (sets.length <= 1) return { ok: false, errorCode: ERR.INVALID_DATA };

  params.push(cid, rid);
  try {
    const res = await db.query(
      `UPDATE whistleblowing_reports SET ${sets.join(', ')}
       WHERE company_id = $${params.length - 1} AND id = $${params.length}
       RETURNING id, company_id AS "companyId", channel_id AS "channelId",
                 NULL::text AS "channelTitle", category, body, anonymous,
                 reporter_candidate_id AS "reporterCandidateId",
                 status, due_at AS "dueAt",
                 triage_notes AS "triageNotes", response_notes AS "responseNotes",
                 responded_at AS "respondedAt",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      params
    );
    if (!res.rowCount) return { ok: false, errorCode: ERR.NOT_FOUND };
    return { ok: true, report: mapReport(res.rows[0]) };
  } catch (err) {
    if (err?.code === '42P01') return { ok: false, errorCode: ERR.SCHEMA_NOT_INITIALIZED };
    throw err;
  }
}

/**
 * Company aggregates for lean viz (B-3027). Counts only — never report body text.
 * @returns {Promise<{ ok: true, total: number, byStatus: Array<{status:string,count:number}>, byCategory: Array<{category:string,count:number}> } | { ok: false, errorCode }>}
 */
export async function aggregateWhistleblowingReports(dbOrQuery, { companyId }) {
  const db = asDb(dbOrQuery || query);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) return { ok: false, errorCode: ERR.COMPANY_REQUIRED };

  try {
    const [statusRes, catRes] = await Promise.all([
      db.query(
        `SELECT r.status, COUNT(*)::int AS count
         FROM whistleblowing_reports r
         WHERE r.company_id = $1
         GROUP BY r.status`,
        [cid]
      ),
      db.query(
        `SELECT r.category, COUNT(*)::int AS count
         FROM whistleblowing_reports r
         WHERE r.company_id = $1
         GROUP BY r.category
         ORDER BY COUNT(*) DESC, r.category ASC
         LIMIT 12`,
        [cid]
      ),
    ]);

    const byStatus = statusRes.rows.map((r) => ({
      status: String(r.status),
      count: Number(r.count) || 0,
    }));
    const byCategory = catRes.rows.map((r) => ({
      category: String(r.category),
      count: Number(r.count) || 0,
    }));
    const total = byStatus.reduce((n, r) => n + r.count, 0);

    return { ok: true, total, byStatus, byCategory };
  } catch (err) {
    if (err?.code === '42P01') {
      return { ok: true, total: 0, byStatus: [], byCategory: [] };
    }
    throw err;
  }
}
