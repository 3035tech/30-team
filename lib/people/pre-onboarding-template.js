/**
 * Company pre-onboarding checklist template (P0 journey).
 */

import { asDb } from '../ae/as-db.js';
import { ERR } from '../api-error-codes.js';

export const PRE_ONBOARDING_OWNER_ROLES = Object.freeze([
  'rh',
  'manager',
  'it',
  'security',
  'employee',
]);

export const DEFAULT_PRE_ONBOARDING_TEMPLATE = Object.freeze([
  {
    itemKey: 'welcome_kit',
    labelPt: 'Kit de boas-vindas',
    labelEn: 'Welcome kit',
    ownerRole: 'rh',
    sortOrder: 10,
    dueOffsetDays: 0,
    requireMeet: false,
  },
  {
    itemKey: 'access_sheet',
    labelPt: 'Acessos e ferramentas',
    labelEn: 'Access and tools',
    ownerRole: 'it',
    sortOrder: 20,
    dueOffsetDays: 0,
    requireMeet: false,
  },
  {
    itemKey: 'rh_onboarding_call',
    labelPt: 'Conversa de onboarding RH',
    labelEn: 'HR onboarding call',
    ownerRole: 'rh',
    sortOrder: 30,
    dueOffsetDays: 0,
    requireMeet: true,
  },
  {
    itemKey: 'manager_onboarding',
    labelPt: 'Onboarding com o gestor',
    labelEn: 'Manager onboarding',
    ownerRole: 'manager',
    sortOrder: 40,
    dueOffsetDays: 0,
    requireMeet: true,
  },
]);

const KEY_RE = /^[a-z][a-z0-9_]{1,40}$/;
const OWNER_SET = new Set(PRE_ONBOARDING_OWNER_ROLES);
const TEMPLATE_CAP = 30;

function clip(s, n) {
  return String(s || '').trim().slice(0, n);
}

function mapTpl(r) {
  return {
    id: Number(r.id),
    companyId: Number(r.companyId),
    itemKey: r.itemKey,
    labelPt: r.labelPt || '',
    labelEn: r.labelEn || '',
    ownerRole: r.ownerRole || 'rh',
    sortOrder: Number(r.sortOrder) || 0,
    active: r.active !== false,
    dueOffsetDays: Number(r.dueOffsetDays) || 0,
    requireMeet: Boolean(r.requireMeet),
  };
}

/**
 * Ensure company has default template rows (idempotent).
 */
export async function ensureCompanyPreOnboardingTemplate(dbOrQuery, { companyId }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) {
    return { ok: false, errorCode: ERR.INVALID_ID };
  }
  for (const row of DEFAULT_PRE_ONBOARDING_TEMPLATE) {
    await db.query(
      `INSERT INTO company_pre_onboarding_templates (
         company_id, item_key, label_pt, label_en, owner_role,
         sort_order, active, due_offset_days, require_meet
       ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8)
       ON CONFLICT (company_id, item_key) DO NOTHING`,
      [
        cid,
        row.itemKey,
        row.labelPt,
        row.labelEn,
        row.ownerRole,
        row.sortOrder,
        row.dueOffsetDays,
        row.requireMeet,
      ]
    );
  }
  return listCompanyPreOnboardingTemplate(db, { companyId: cid, includeInactive: true });
}

export async function listCompanyPreOnboardingTemplate(
  dbOrQuery,
  { companyId, includeInactive = false }
) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) {
    return { ok: false, errorCode: ERR.INVALID_ID };
  }
  try {
    const params = [cid];
    let where = 'company_id = $1';
    if (!includeInactive) where += ' AND active = TRUE';
    const r = await db.query(
      `SELECT id, company_id AS "companyId", item_key AS "itemKey",
              label_pt AS "labelPt", label_en AS "labelEn",
              owner_role AS "ownerRole", sort_order AS "sortOrder",
              active, due_offset_days AS "dueOffsetDays",
              require_meet AS "requireMeet"
       FROM company_pre_onboarding_templates
       WHERE ${where}
       ORDER BY sort_order ASC, id ASC
       LIMIT ${TEMPLATE_CAP}`,
      params
    );
    return { ok: true, items: (r.rows || []).map(mapTpl) };
  } catch (err) {
    if (err?.code === '42P01') {
      return {
        ok: true,
        items: DEFAULT_PRE_ONBOARDING_TEMPLATE.map((d, i) => ({
          id: -(i + 1),
          companyId: cid,
          itemKey: d.itemKey,
          labelPt: d.labelPt,
          labelEn: d.labelEn,
          ownerRole: d.ownerRole,
          sortOrder: d.sortOrder,
          active: true,
          dueOffsetDays: d.dueOffsetDays,
          requireMeet: d.requireMeet,
        })),
      };
    }
    throw err;
  }
}

/**
 * Replace active template set. Deactivates missing keys; upserts provided.
 */
export async function setCompanyPreOnboardingTemplate(dbOrQuery, { companyId, items = [] }) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) {
    return { ok: false, errorCode: ERR.INVALID_ID };
  }

  const raw = Array.isArray(items) ? items.slice(0, TEMPLATE_CAP) : [];
  const seen = new Set();
  const normalized = [];
  for (let i = 0; i < raw.length; i += 1) {
    const itemKey = clip(raw[i].itemKey || raw[i].key, 41).toLowerCase();
    if (!KEY_RE.test(itemKey) || seen.has(itemKey)) continue;
    seen.add(itemKey);
    const ownerRole = OWNER_SET.has(String(raw[i].ownerRole))
      ? String(raw[i].ownerRole)
      : 'rh';
    normalized.push({
      itemKey,
      labelPt: clip(raw[i].labelPt || raw[i].label || itemKey, 120),
      labelEn: clip(raw[i].labelEn || raw[i].label || itemKey, 120),
      ownerRole,
      sortOrder: Number.isFinite(Number(raw[i].sortOrder))
        ? Number(raw[i].sortOrder)
        : (i + 1) * 10,
      active: raw[i].active !== false,
      dueOffsetDays: Math.min(90, Math.max(0, Number(raw[i].dueOffsetDays) || 0)),
      requireMeet: Boolean(raw[i].requireMeet),
    });
  }
  if (!normalized.length) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  await db.query(
    `UPDATE company_pre_onboarding_templates
     SET active = FALSE, updated_at = NOW()
     WHERE company_id = $1`,
    [cid]
  );

  for (const row of normalized) {
    await db.query(
      `INSERT INTO company_pre_onboarding_templates (
         company_id, item_key, label_pt, label_en, owner_role,
         sort_order, active, due_offset_days, require_meet, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (company_id, item_key) DO UPDATE SET
         label_pt = EXCLUDED.label_pt,
         label_en = EXCLUDED.label_en,
         owner_role = EXCLUDED.owner_role,
         sort_order = EXCLUDED.sort_order,
         active = EXCLUDED.active,
         due_offset_days = EXCLUDED.due_offset_days,
         require_meet = EXCLUDED.require_meet,
         updated_at = NOW()`,
      [
        cid,
        row.itemKey,
        row.labelPt,
        row.labelEn,
        row.ownerRole,
        row.sortOrder,
        row.active,
        row.dueOffsetDays,
        row.requireMeet,
      ]
    );
  }

  return listCompanyPreOnboardingTemplate(db, { companyId: cid, includeInactive: true });
}

export function templateLabel(item, locale = 'pt-BR') {
  if (!item) return '';
  if (locale === 'en') return item.labelEn || item.labelPt || item.itemKey;
  return item.labelPt || item.labelEn || item.itemKey;
}
