/**
 * Product feedback from managers (ideas / bugs / UX) → super-admin inbox.
 */

import {
  PRODUCT_FEEDBACK_KIND,
  PRODUCT_FEEDBACK_KINDS,
  PRODUCT_FEEDBACK_STATUS,
  PRODUCT_FEEDBACK_STATUSES,
} from './domain-status.js';
import { ERR } from './api-error-codes.js';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];
const STATUS_FILTER = new Set(['all', ...PRODUCT_FEEDBACK_STATUSES]);
const KIND_FILTER = new Set(['all', ...PRODUCT_FEEDBACK_KINDS]);

/**
 * @param {URLSearchParams | Record<string, string>} searchParams
 */
export function parseProductFeedbackListParams(searchParams) {
  const get = (k, d = '') =>
    typeof searchParams?.get === 'function'
      ? (searchParams.get(k) || d).toString()
      : String(searchParams?.[k] ?? d);

  const pageRaw = parseInt(get('page', '1'), 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const sizeRaw = parseInt(get('pageSize', '20'), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(sizeRaw) ? sizeRaw : 20;
  const statusRaw = get('status', 'all').toLowerCase();
  const status = STATUS_FILTER.has(statusRaw) ? statusRaw : 'all';
  const kindRaw = get('kind', 'all').toLowerCase();
  const kind = KIND_FILTER.has(kindRaw) ? kindRaw : 'all';
  const q = get('q', '').trim().slice(0, 120);
  return { page, pageSize, status, kind, q };
}

/**
 * @param {{ query: Function }} db
 * @param {{
 *   companyId: number|null,
 *   userId: number,
 *   kind: string,
 *   message: string,
 *   activeTab?: string|null,
 *   activeSection?: string|null,
 *   contactOk?: boolean,
 * }} input
 */
export async function createProductFeedback(db, input) {
  const kind = String(input?.kind || '').toLowerCase();
  if (!PRODUCT_FEEDBACK_KINDS.includes(kind)) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }
  const message = String(input?.message || '').trim();
  if (message.length < 10 || message.length > 4000) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }
  const userId = Number(input?.userId);
  if (!Number.isFinite(userId) || userId < 1) {
    return { ok: false, errorCode: ERR.UNAUTHORIZED };
  }
  const companyIdRaw = input?.companyId;
  const companyId =
    companyIdRaw == null || companyIdRaw === ''
      ? null
      : Number(companyIdRaw);
  if (companyId != null && (!Number.isFinite(companyId) || companyId < 1)) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  const activeTab = String(input?.activeTab || '')
    .trim()
    .slice(0, 80);
  const activeSection = String(input?.activeSection || '')
    .trim()
    .slice(0, 80);
  const contactOk = input?.contactOk !== false;

  const res = await db.query(
    `INSERT INTO product_feedback (
       company_id, user_id, kind, status, message,
       active_tab, active_section, contact_ok
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, created_at AS "createdAt"`,
    [
      companyId,
      userId,
      kind,
      PRODUCT_FEEDBACK_STATUS.NEW,
      message,
      activeTab,
      activeSection,
      contactOk,
    ]
  );
  const row = res.rows[0];
  return { ok: true, id: row.id, createdAt: row.createdAt };
}

/**
 * Super-admin list (cross-tenant).
 * @param {{ query: Function }} db
 */
export async function listProductFeedback(db, opts = {}) {
  const { page, pageSize, status, kind, q } = parseProductFeedbackListParams(opts);
  const params = [];
  let where = 'TRUE';

  if (status !== 'all') {
    params.push(status);
    where += ` AND f.status = $${params.length}`;
  }
  if (kind !== 'all') {
    params.push(kind);
    where += ` AND f.kind = $${params.length}`;
  }
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    const i = params.length;
    where += ` AND (
      LOWER(f.message) LIKE $${i}
      OR LOWER(COALESCE(u.email, '')) LIKE $${i}
      OR LOWER(COALESCE(c.name, '')) LIKE $${i}
      OR LOWER(COALESCE(f.admin_notes, '')) LIKE $${i}
    )`;
  }

  const cnt = await db.query(
    `SELECT COUNT(*)::int AS n
     FROM product_feedback f
     JOIN users u ON u.id = f.user_id AND u.deleted = FALSE
     LEFT JOIN companies c ON c.id = f.company_id AND c.deleted = FALSE
     WHERE ${where}`,
    params
  );
  const total = cnt.rows[0]?.n || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  params.push(pageSize, offset);
  const lim = params.length - 1;
  const off = params.length;

  const list = await db.query(
    `SELECT
       f.id,
       f.company_id AS "companyId",
       f.user_id AS "userId",
       f.kind,
       f.status,
       f.message,
       f.active_tab AS "activeTab",
       f.active_section AS "activeSection",
       f.contact_ok AS "contactOk",
       f.admin_notes AS "adminNotes",
       f.created_at AS "createdAt",
       f.updated_at AS "updatedAt",
       u.email AS "userEmail",
       u.display_name AS "userName",
       c.name AS "companyName",
       c.slug AS "companySlug"
     FROM product_feedback f
     JOIN users u ON u.id = f.user_id AND u.deleted = FALSE
     LEFT JOIN companies c ON c.id = f.company_id AND c.deleted = FALSE
     WHERE ${where}
     ORDER BY f.created_at DESC, f.id DESC
     LIMIT $${lim} OFFSET $${off}`,
    params
  );

  return {
    items: list.rows,
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/**
 * @param {{ query: Function }} db
 * @param {{ id: number, status?: string, adminNotes?: string }} input
 */
export async function updateProductFeedback(db, input) {
  const id = Number(input?.id);
  if (!Number.isFinite(id) || id < 1) {
    return { ok: false, errorCode: ERR.INVALID_ID };
  }

  const sets = [];
  const params = [];

  if (input.status != null) {
    const status = String(input.status).toLowerCase();
    if (!PRODUCT_FEEDBACK_STATUSES.includes(status)) {
      return { ok: false, errorCode: ERR.INVALID_DATA };
    }
    params.push(status);
    sets.push(`status = $${params.length}`);
  }

  if (input.adminNotes != null) {
    const notes = String(input.adminNotes).trim().slice(0, 4000);
    params.push(notes);
    sets.push(`admin_notes = $${params.length}`);
  }

  if (!sets.length) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  sets.push('updated_at = NOW()');
  params.push(id);

  const res = await db.query(
    `UPDATE product_feedback
     SET ${sets.join(', ')}
     WHERE id = $${params.length}
     RETURNING id, status, admin_notes AS "adminNotes", updated_at AS "updatedAt"`,
    params
  );
  if (!res.rowCount) return { ok: false, errorCode: ERR.NOT_FOUND };
  return { ok: true, item: res.rows[0] };
}

export { PRODUCT_FEEDBACK_KIND, PRODUCT_FEEDBACK_STATUS };
