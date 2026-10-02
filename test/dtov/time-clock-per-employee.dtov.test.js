/**
 * DTOV: per-collaborator time clock (migration 140).
 * Work format default (pj/cooperative off), boolean override, company DP module,
 * employee vs manager punches, mirror without absences, people list flag.
 */
import assert from 'node:assert/strict';
import { pool, query } from '../../lib/db.js';
import { ERR } from '../../lib/api-error-codes.js';
import { TIME_PUNCH_KIND, TIME_PUNCH_SOURCE, WORK_FORMAT } from '../../lib/domain-status.js';
import { TIME_CLOCK_REASON } from '../../lib/people/time-clock-eligibility.js';
import {
  createTimePunch,
  getEmployeeTimeClockToday,
  getTimeClockAccess,
} from '../../lib/people/time-clock.js';
import { getEmployeeTimeMirror, listTimeClockPeople } from '../../lib/people/time-clock-manager.js';

async function setPerson(candidateId, workFormat, override) {
  await query(`UPDATE candidates SET work_format = $2, time_clock_override = $3 WHERE id = $1`, [
    candidateId,
    workFormat,
    override,
  ]);
}

async function main() {
  const co = await query(
    `SELECT id, enabled_modules AS "enabledModules" FROM companies
     WHERE deleted = FALSE AND slug = 'todos-os-dados-demo' LIMIT 1`
  );
  assert.ok(co.rowCount, 'demo company missing; run dtov:reset');
  const companyId = co.rows[0].id;
  const originalModules = co.rows[0].enabledModules;

  const emp = await query(
    `SELECT id, work_format AS "workFormat", time_clock_override AS "override", full_name AS "fullName"
     FROM candidates WHERE company_id = $1 AND email = 'colaborador@todos-os-dados.demo' LIMIT 1`,
    [companyId]
  );
  assert.ok(emp.rowCount, 'demo collaborator missing');
  const { id: candidateId, workFormat: originalFormat, override: originalOverride, fullName } = emp.rows[0];
  const scope = { companyId, candidateId };

  try {
    await query(`UPDATE companies SET enabled_modules = NULL WHERE id = $1`, [companyId]);

    // Default: CLT has time clock; PJ / Cooperative do not.
    await setPerson(candidateId, WORK_FORMAT.CLT, null);
    let access = await getTimeClockAccess({ query }, scope);
    assert.equal(access.enabled, true);
    assert.equal(access.reason, TIME_CLOCK_REASON.WORK_FORMAT);

    for (const wf of [WORK_FORMAT.PJ, WORK_FORMAT.COOPERATIVE]) {
      await setPerson(candidateId, wf, null);
      access = await getTimeClockAccess({ query }, scope);
      assert.equal(access.enabled, false, wf);
      assert.equal(access.reason, TIME_CLOCK_REASON.WORK_FORMAT);
    }

    const today = await getEmployeeTimeClockToday({ query }, scope);
    assert.equal(today.ok, false);
    assert.equal(today.errorCode, ERR.TIME_CLOCK_DISABLED);

    const webPunch = await createTimePunch({ query }, { ...scope, punchKind: TIME_PUNCH_KIND.IN });
    assert.equal(webPunch.ok, false);
    assert.equal(webPunch.errorCode, ERR.TIME_CLOCK_DISABLED);

    // HR can still correct a past day for someone without time clock.
    const past = new Date(Date.now() - 3 * 86_400_000);
    past.setUTCHours(15, 0, 0, 0);
    const managerPunch = await createTimePunch({ query }, {
      ...scope,
      punchKind: TIME_PUNCH_KIND.IN,
      source: TIME_PUNCH_SOURCE.MANAGER,
      punchedAt: past.toISOString(),
      notes: 'dtov per-employee',
    });
    if (!managerPunch.ok) {
      assert.equal(managerPunch.errorCode, ERR.TIME_CLOCK_PERIOD_CLOSED, managerPunch.errorCode);
    }

    // Mirror: no expected hours, so no absences / missing minutes; history still listed.
    const mirror = await getEmployeeTimeMirror({ query }, scope);
    assert.equal(mirror.ok, true, mirror.errorCode);
    assert.equal(mirror.person.timeClockEnabled, false);
    assert.equal(mirror.person.timeClockReason, TIME_CLOCK_REASON.WORK_FORMAT);
    assert.equal(mirror.totals.absences, 0);
    assert.equal(mirror.totals.missingMinutes, 0);
    assert.equal(mirror.totals.expectedMinutes, 0);
    if (managerPunch.ok) {
      assert.ok(mirror.days.some((d) => d.punches.some((p) => p.id === managerPunch.punch.id)));
    }

    const people = await listTimeClockPeople({ query }, { companyId, q: fullName, pageSize: 50 });
    assert.equal(people.ok, true, people.errorCode);
    const row = people.items.find((p) => p.candidateId === Number(candidateId));
    assert.ok(row, 'collaborator missing from people list');
    assert.equal(row.timeClockEnabled, false);

    // Manual exception wins over work format, both ways.
    await setPerson(candidateId, WORK_FORMAT.PJ, true);
    access = await getTimeClockAccess({ query }, scope);
    assert.equal(access.enabled, true);
    assert.equal(access.reason, TIME_CLOCK_REASON.OVERRIDE);
    assert.equal((await getEmployeeTimeClockToday({ query }, scope)).ok, true);

    await setPerson(candidateId, WORK_FORMAT.CLT, false);
    access = await getTimeClockAccess({ query }, scope);
    assert.equal(access.enabled, false);
    assert.equal(access.reason, TIME_CLOCK_REASON.OVERRIDE);

    // Company without the DP module: refused even for CLT (gap closed).
    await setPerson(candidateId, WORK_FORMAT.CLT, null);
    await query(`UPDATE companies SET enabled_modules = ARRAY['core']::text[] WHERE id = $1`, [companyId]);
    access = await getTimeClockAccess({ query }, scope);
    assert.equal(access.moduleEnabled, false);
    assert.equal(access.enabled, false);
    const noModule = await createTimePunch({ query }, { ...scope, punchKind: TIME_PUNCH_KIND.IN });
    assert.equal(noModule.errorCode, ERR.TIME_CLOCK_DISABLED);

    if (managerPunch.ok) {
      await query(`DELETE FROM employee_time_punches WHERE id = $1`, [managerPunch.punch.id]);
    }
  } finally {
    await query(`UPDATE companies SET enabled_modules = $2 WHERE id = $1`, [companyId, originalModules]);
    await setPerson(candidateId, originalFormat, originalOverride);
  }

  console.log('time-clock-per-employee.dtov.test.js OK');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end().catch(() => {}));
