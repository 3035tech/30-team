/**
 * DTOV: B-2722 hour bank (enable, manual, generate from punches, approve, CSV).
 */
import assert from 'node:assert/strict';
import { query } from '../../lib/db.js';
import {
  HOUR_BANK_ENTRY_KIND,
  HOUR_BANK_STATUS,
  TIME_PUNCH_KIND,
  TIME_PUNCH_SOURCE,
} from '../../lib/domain-status.js';
import {
  createHourBankManualEntry,
  decideHourBankEntry,
  exportHourBankCsv,
  generateHourBankForCompanyDay,
  getHourBankBalance,
  listHourBankBalances,
} from '../../lib/people/hour-bank.js';
import {
  createTimePunch,
  upsertCompanyTimeSchedule,
} from '../../lib/people/time-clock.js';

async function main() {
  const co = await query(
    `SELECT id FROM companies WHERE deleted = FALSE AND slug = 'todos-os-dados-demo' LIMIT 1`
  );
  assert.ok(co.rowCount, 'demo company missing — run dtov:reset');
  const companyId = co.rows[0].id;

  const emp = await query(
    `SELECT id FROM candidates
     WHERE company_id = $1 AND email = 'colaborador@todos-os-dados.demo'
     LIMIT 1`,
    [companyId]
  );
  assert.ok(emp.rowCount, 'demo collaborator missing');
  const candidateId = emp.rows[0].id;

  const hr = await query(
    `SELECT id AS "userId" FROM users
     WHERE company_id = $1 AND email = 'hr@todos-os-dados.demo' AND deleted = FALSE
     LIMIT 1`,
    [companyId]
  );
  const userId = hr.rows[0]?.userId || null;

  await query(`DELETE FROM employee_hour_bank_entries WHERE company_id = $1 AND candidate_id = $2`, [
    companyId,
    candidateId,
  ]);
  await query(`DELETE FROM employee_time_punches WHERE company_id = $1 AND candidate_id = $2`, [
    companyId,
    candidateId,
  ]);

  const disabled = await createHourBankManualEntry({ query }, {
    companyId,
    candidateId,
    entryKind: HOUR_BANK_ENTRY_KIND.CREDIT,
    minutes: 60,
    workOn: '2030-07-01',
    createdByUserId: userId,
  });
  assert.equal(disabled.ok, false);
  assert.equal(disabled.errorCode, 'HOUR_BANK_DISABLED');

  const sched = await upsertCompanyTimeSchedule({ query }, {
    companyId,
    workdayStart: '09:00',
    workdayEnd: '18:00',
    breakMinutes: 60,
    timezone: 'UTC',
    lateGraceMinutes: 5,
    hourBankEnabled: true,
    hourBankMaxMinutes: 2400,
    updatedByUserId: userId,
  });
  assert.equal(sched.ok, true, sched.errorCode);
  assert.equal(sched.schedule.hourBankEnabled, true);

  const credit = await createHourBankManualEntry({ query }, {
    companyId,
    candidateId,
    entryKind: HOUR_BANK_ENTRY_KIND.CREDIT,
    minutes: 120,
    workOn: '2030-07-01',
    note: 'manual',
    createdByUserId: userId,
  });
  assert.equal(credit.ok, true, credit.errorCode);
  assert.equal(credit.entry.status, HOUR_BANK_STATUS.APPROVED);

  const bal = await getHourBankBalance({ query }, { companyId, candidateId });
  assert.equal(bal.ok, true);
  assert.equal(bal.balanceMinutes, 120);

  // Long day: 09:00–19:00 UTC = 600m worked vs 480 expected → 120 OT
  await createTimePunch({ query }, {
    companyId,
    candidateId,
    punchKind: TIME_PUNCH_KIND.IN,
    source: TIME_PUNCH_SOURCE.WEB,
    punchedAt: '2030-07-02T09:00:00.000Z',
  });
  await createTimePunch({ query }, {
    companyId,
    candidateId,
    punchKind: TIME_PUNCH_KIND.OUT,
    source: TIME_PUNCH_SOURCE.WEB,
    punchedAt: '2030-07-02T19:00:00.000Z',
  });

  const gen = await generateHourBankForCompanyDay({ query }, {
    companyId,
    day: '2030-07-02',
    createdByUserId: userId,
  });
  assert.equal(gen.ok, true, gen.errorCode);
  assert.ok(gen.created >= 1, `expected created>=1 got ${gen.created}`);

  const gen2 = await generateHourBankForCompanyDay({ query }, {
    companyId,
    day: '2030-07-02',
    createdByUserId: userId,
  });
  assert.equal(gen2.ok, true);
  assert.equal(gen2.duplicates >= 1, true);

  const pendingList = await query(
    `SELECT id, minutes, status FROM employee_hour_bank_entries
     WHERE company_id = $1 AND candidate_id = $2 AND work_on = '2030-07-02'
       AND status = 'pending' AND source = 'time_clock'
     LIMIT 1`,
    [companyId, candidateId]
  );
  assert.ok(pendingList.rowCount, 'pending clock credit missing');
  assert.equal(Number(pendingList.rows[0].minutes), 120);

  const decided = await decideHourBankEntry({ query }, {
    companyId,
    entryId: pendingList.rows[0].id,
    status: HOUR_BANK_STATUS.APPROVED,
    decidedByUserId: userId,
  });
  assert.equal(decided.ok, true, decided.errorCode);

  const bal2 = await getHourBankBalance({ query }, { companyId, candidateId });
  assert.equal(bal2.balanceMinutes, 240);

  const balances = await listHourBankBalances({ query }, { companyId, q: 'colaborador' });
  assert.equal(balances.ok, true);
  assert.ok(balances.items.some((i) => i.candidateId === candidateId && i.balanceMinutes === 240));

  const csv = await exportHourBankCsv({ query }, { companyId, month: '2030-07' });
  assert.equal(csv.ok, true, csv.errorCode);
  assert.ok(csv.csv.includes('candidate_id'));
  assert.ok(csv.count >= 2);

  console.log('hour-bank.dtov.test.js OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
