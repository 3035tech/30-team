/**
 * B-3002 — Analytic salary map by job role + raise simulation (not payroll).
 */

import { asDb } from '../ae/as-db.js';
import { ERR } from '../api-error-codes.js';
import { salaryAmountNumber } from '../br-masks.js';
import { EMPLOYMENT_STATUS } from '../domain-status.js';
import { compareAmountToMarketBand } from './employee-compensation.js';

export const SALARY_MAP_ROLE_CAP = 80;
export const SALARY_MAP_PEOPLE_CAP = 500;

/**
 * Aggregate employees by job_role vs market band.
 */
export async function listSalaryMapByJobRole(dbOrQuery, {
  companyId,
  limit = SALARY_MAP_ROLE_CAP,
} = {}) {
  const db = asDb(dbOrQuery);
  const cid = Number(companyId);
  if (!Number.isFinite(cid) || cid <= 0) {
    return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  }
  const roleCap = Math.min(SALARY_MAP_ROLE_CAP, Math.max(1, Number(limit) || SALARY_MAP_ROLE_CAP));

  const roles = await db.query(
    `SELECT jr.id, jr.name, jr.market_salary_min AS "marketSalaryMin",
            jr.market_salary_max AS "marketSalaryMax"
     FROM job_roles jr
     WHERE jr.company_id = $1 AND jr.active = TRUE
     ORDER BY jr.name ASC, jr.id ASC
     LIMIT $2`,
    [cid, roleCap]
  );

  const people = await db.query(
    `SELECT c.id AS "candidateId", c.full_name AS "candidateName", c.job_role_id AS "jobRoleId",
            cur.amount AS "currentAmount"
     FROM candidates c
     LEFT JOIN LATERAL (
       SELECT e.amount
       FROM employee_compensation_events e
       WHERE e.company_id = c.company_id AND e.candidate_id = c.id
         AND e.approval_status = 'approved'
       ORDER BY e.effective_date DESC, e.id DESC
       LIMIT 1
     ) cur ON TRUE
     WHERE c.company_id = $1
       AND c.employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
       AND c.job_role_id IS NOT NULL
     ORDER BY c.id ASC
     LIMIT $2`,
    [cid, SALARY_MAP_PEOPLE_CAP]
  );

  const byRole = new Map();
  for (const jr of roles.rows || []) {
    byRole.set(Number(jr.id), {
      jobRoleId: Number(jr.id),
      name: jr.name,
      marketSalaryMin: jr.marketSalaryMin || null,
      marketSalaryMax: jr.marketSalaryMax || null,
      headcount: 0,
      withSalary: 0,
      below: 0,
      inBand: 0,
      above: 0,
      noSalary: 0,
      payrollSum: 0,
    });
  }

  for (const p of people.rows || []) {
    const rid = Number(p.jobRoleId);
    const bucket = byRole.get(rid);
    if (!bucket) continue;
    bucket.headcount += 1;
    const compare = compareAmountToMarketBand(
      p.currentAmount,
      bucket.marketSalaryMin,
      bucket.marketSalaryMax
    );
    if (compare.status === 'no_salary') {
      bucket.noSalary += 1;
    } else {
      bucket.withSalary += 1;
      bucket.payrollSum += compare.current || 0;
      if (compare.status === 'below') bucket.below += 1;
      else if (compare.status === 'above') bucket.above += 1;
      else if (compare.status === 'in_band' || compare.status === 'no_band') bucket.inBand += 1;
    }
  }

  const items = [...byRole.values()].map((b) => ({
    ...b,
    payrollSum: Math.round(b.payrollSum * 100) / 100,
  }));

  return {
    ok: true,
    items,
    caps: { roles: roleCap, people: SALARY_MAP_PEOPLE_CAP },
  };
}

/**
 * Pure raise simulation over salary-map rows (or a single role).
 * @param {{ items: Array<{ jobRoleId: number, payrollSum: number, withSalary: number }>, jobRoleId?: number|null, mode: 'pct'|'amount', value: number }} opts
 */
export function simulateRaiseImpact({ items, jobRoleId = null, mode = 'pct', value = 0 }) {
  const rows = Array.isArray(items) ? items : [];
  const filtered =
    jobRoleId != null && Number.isFinite(Number(jobRoleId))
      ? rows.filter((r) => Number(r.jobRoleId) === Number(jobRoleId))
      : rows;
  const modeSafe = mode === 'amount' ? 'amount' : 'pct';
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  let currentPayroll = 0;
  let people = 0;
  for (const r of filtered) {
    currentPayroll += Number(r.payrollSum) || 0;
    people += Number(r.withSalary) || 0;
  }
  currentPayroll = Math.round(currentPayroll * 100) / 100;

  let delta = 0;
  if (modeSafe === 'pct') {
    delta = Math.round(currentPayroll * (v / 100) * 100) / 100;
  } else {
    delta = Math.round(v * people * 100) / 100;
  }
  const nextPayroll = Math.round((currentPayroll + delta) * 100) / 100;

  return {
    ok: true,
    mode: modeSafe,
    value: v,
    jobRoleId: jobRoleId != null ? Number(jobRoleId) : null,
    people,
    currentPayroll,
    delta,
    nextPayroll,
  };
}
