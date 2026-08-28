/**
 * Jornada de chegada do colaborador — read API + confirmações (D1 + D30/D60/D90).
 */

import { asDb } from '../ae/as-db.js';
import { query } from '../db.js';
import { ERR } from '../api-error-codes.js';
import { EMPLOYMENT_STATUS } from '../domain-status.js';
import { ensurePreOnboardingChecklist, listPreOnboardingItems } from './pre-onboarding.js';
import { ensureOnboardingCheckins, listOnboardingCheckins } from './onboarding-checkins.js';

const ACK_KINDS = new Set(['pre', 'checkin']);

function dateOrNull(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function daysUntil(isoDate) {
  const due = dateOrNull(isoDate);
  if (!due) return null;
  const today = new Date().toISOString().slice(0, 10);
  const a = new Date(`${today}T12:00:00Z`).getTime();
  const b = new Date(`${due}T12:00:00Z`).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function mapPreForEmployee(row) {
  const canAckPhysical = row.itemKey === 'welcome_kit' || row.itemKey === 'access_sheet';
  const isCall = row.itemKey === 'rh_onboarding_call' || row.itemKey === 'manager_onboarding';
  return {
    id: row.id,
    kind: 'pre',
    itemKey: row.itemKey,
    dueDate: row.dueDate,
    status: row.status,
    meetUrl: row.meetUrl || null,
    employeeAckAt: row.employeeAckAt || null,
    overdue: Boolean(row.overdue),
    canAck: canAckPhysical || isCall,
    ackType: canAckPhysical ? 'received' : isCall ? 'call' : null,
    hrDone: row.status === 'done' || row.status === 'skipped',
  };
}

function mapCheckinForEmployee(row) {
  return {
    id: row.id,
    kind: 'checkin',
    milestoneDays: row.milestoneDays,
    dueDate: row.dueDate,
    status: row.status,
    meetUrl: row.meetUrl || null,
    employeeAckAt: row.employeeAckAt || null,
    overdue: Boolean(row.overdue),
    canAck: true,
    ackType: 'call',
    hrDone: row.status === 'done' || row.status === 'skipped',
  };
}

/**
 * @returns {Promise<{ ok: true, startDate, preItems, checkins, hasJourney } | { ok: false, errorCode }>}
 */
export async function getEmployeeOnboardingJourney(dbOrQuery, { companyId, candidateId }) {
  const db = asDb(dbOrQuery || query);
  const cid = Number(companyId);
  const cand = Number(candidateId);
  if (!Number.isFinite(cid) || !Number.isFinite(cand)) {
    return { ok: false, errorCode: ERR.UNAUTHORIZED };
  }

  const personR = await db.query(
    `SELECT start_date AS "startDate", hired_at AS "hiredAt", employment_status AS "employmentStatus"
     FROM candidates
     WHERE id = $1 AND company_id = $2 LIMIT 1`,
    [cand, cid]
  );
  if (personR.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  if (personR.rows[0].employmentStatus !== EMPLOYMENT_STATUS.EMPLOYEE) {
    return { ok: true, startDate: null, preItems: [], checkins: [], hasJourney: false };
  }

  await ensurePreOnboardingChecklist(db, { companyId: cid, candidateId: cand });
  await ensureOnboardingCheckins(db, { companyId: cid, candidateId: cand });

  const preRaw = await listPreOnboardingItems(db, { companyId: cid, candidateId: cand });
  const checkRaw = await listOnboardingCheckins(db, { companyId: cid, candidateId: cand });

  const startDate =
    dateOrNull(personR.rows[0].startDate) ||
    (personR.rows[0].hiredAt ? String(personR.rows[0].hiredAt).slice(0, 10) : null);

  const preItems = preRaw.map(mapPreForEmployee);
  const checkins = checkRaw.map(mapCheckinForEmployee);

  return {
    ok: true,
    startDate,
    preItems,
    checkins,
    hasJourney: preItems.length > 0 || checkins.length > 0,
  };
}

/** Build employee-home tasks from journey (due within 14 days, pending). */
export function buildOnboardingTasksFromJourney(journey) {
  if (!journey?.hasJourney) return [];
  const tasks = [];
  const horizon = 14;

  for (const item of journey.preItems || []) {
    if (item.hrDone) continue;
    const days = daysUntil(item.dueDate);
    if (days != null && days > horizon) continue;
    const titleKey =
      item.itemKey === 'welcome_kit'
        ? 'employeeHome.journeyTaskKit'
        : item.itemKey === 'access_sheet'
          ? 'employeeHome.journeyTaskAccess'
          : item.itemKey === 'rh_onboarding_call'
            ? 'employeeHome.journeyTaskRhCall'
            : 'employeeHome.journeyTaskManagerCall';
    tasks.push({
      id: `journey-pre-${item.id}`,
      kind: 'onboarding_pre',
      titleKey,
      href: '#journey',
      dueDate: item.dueDate,
      meetUrl: item.meetUrl,
      overdue: item.overdue,
    });
  }

  for (const row of journey.checkins || []) {
    if (row.hrDone) continue;
    const days = daysUntil(row.dueDate);
    if (days != null && days > horizon) continue;
    tasks.push({
      id: `journey-checkin-${row.id}`,
      kind: 'onboarding_checkin',
      titleKey: 'employeeHome.journeyTaskCheckin',
      titleValues: { days: row.milestoneDays },
      href: '#journey',
      dueDate: row.dueDate,
      meetUrl: row.meetUrl,
      overdue: row.overdue,
    });
  }

  return tasks;
}

export async function employeeAckOnboardingItem(dbOrQuery, {
  companyId,
  candidateId,
  kind,
  itemId,
}) {
  const db = asDb(dbOrQuery || query);
  const k = String(kind || '').trim().toLowerCase();
  const id = Number(itemId);
  if (!ACK_KINDS.has(k) || !Number.isFinite(id)) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  const table = k === 'pre' ? 'employee_pre_onboarding_items' : 'employee_onboarding_checkins';
  const owned = await db.query(
    `SELECT id FROM ${table}
     WHERE id = $1 AND company_id = $2 AND candidate_id = $3
     LIMIT 1`,
    [id, companyId, candidateId]
  );
  if (owned.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };

  await db.query(
    `UPDATE ${table}
     SET employee_ack_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND company_id = $2 AND candidate_id = $3 AND employee_ack_at IS NULL`,
    [id, companyId, candidateId]
  );

  return { ok: true };
}
