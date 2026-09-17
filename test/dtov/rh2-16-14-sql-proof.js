/**
 * DTOV SQL proof: B-RH2-16 climate archive/version + B-RH2-14 benefit assign.
 */
import assert from 'node:assert/strict';
import { query } from '../../lib/db.js';
import { CLIMATE_SURVEY_STATUS, EMPLOYMENT_STATUS } from '../../lib/domain-status.js';
import {
  addClimateSurveyQuestion,
  archiveClimateSurvey,
  createClimateSurvey,
  createClimateSurveyInvite,
  updateClimateSurvey,
  versionClimateSurvey,
} from '../../lib/people/climate-surveys.js';
import {
  assignEmployeeBenefit,
  endEmployeeBenefitAssignment,
  listEmployeeBenefitAssignments,
} from '../../lib/people/employee-benefit-assignments.js';
import { ERR } from '../../lib/api-error-codes.js';

async function companyId() {
  const r = await query(
    `SELECT id FROM companies
     WHERE deleted = FALSE AND name ILIKE '%Todos os Dados%'
     ORDER BY id ASC LIMIT 1`
  );
  if (r.rowCount > 0) return r.rows[0].id;
  const fallback = await query(
    `SELECT c.id FROM companies c
     JOIN candidates cand ON cand.company_id = c.id AND cand.employment_status = $1
     WHERE c.deleted = FALSE
     GROUP BY c.id
     ORDER BY COUNT(*) DESC
     LIMIT 1`,
    [EMPLOYMENT_STATUS.EMPLOYEE]
  );
  assert.ok(fallback.rowCount > 0, 'need company with employees');
  return fallback.rows[0].id;
}

async function employeeId(cid) {
  const r = await query(
    `SELECT id FROM candidates
     WHERE company_id = $1 AND employment_status = $2
     ORDER BY id ASC LIMIT 1`,
    [cid, EMPLOYMENT_STATUS.EMPLOYEE]
  );
  assert.ok(r.rowCount > 0, 'need employee');
  return r.rows[0].id;
}

async function benefitId(cid) {
  const r = await query(
    `SELECT id FROM company_benefits WHERE company_id = $1 AND active = TRUE ORDER BY id ASC LIMIT 1`,
    [cid]
  );
  if (r.rowCount > 0) return r.rows[0].id;
  const ins = await query(
    `INSERT INTO company_benefits (company_id, name, description, benefit_type, active)
     VALUES ($1, 'DTOV Benefit RH2', 'seed', 'other', TRUE)
     RETURNING id`,
    [cid]
  );
  return ins.rows[0].id;
}

async function main() {
  const cid = await companyId();

  // Climate
  const created = await createClimateSurvey(query, {
    companyId: cid,
    title: 'DTOV RH2-16 climate',
    seedDefaultQuestions: true,
  });
  assert.equal(created.ok, true);
  const sid = created.survey.id;

  const opened = await updateClimateSurvey(query, {
    companyId: cid,
    surveyId: sid,
    status: CLIMATE_SURVEY_STATUS.OPEN,
  });
  assert.equal(opened.ok, true);

  const locked = await addClimateSurveyQuestion(query, {
    companyId: cid,
    surveyId: sid,
    prompt: 'should fail',
  });
  assert.equal(locked.ok, false);
  assert.equal(locked.errorCode, ERR.SURVEY_QUESTIONS_LOCKED);

  const inv = await createClimateSurveyInvite(query, { companyId: cid, surveyId: sid });
  assert.equal(inv.ok, true);
  assert.ok(inv.invite?.token);

  const versioned = await versionClimateSurvey(query, {
    companyId: cid,
    surveyId: sid,
  });
  assert.equal(versioned.ok, true);
  assert.equal(versioned.survey.status, CLIMATE_SURVEY_STATUS.DRAFT);
  assert.equal(Number(versioned.sourceSurveyId), Number(sid));

  const archived = await archiveClimateSurvey(query, { companyId: cid, surveyId: sid });
  assert.equal(archived.ok, true);
  assert.equal(archived.survey.status, CLIMATE_SURVEY_STATUS.ARCHIVED);

  // Benefits
  const cand = await employeeId(cid);
  const bid = await benefitId(cid);
  const assigned = await assignEmployeeBenefit(query, {
    companyId: cid,
    candidateId: cand,
    benefitId: bid,
    valueNote: 'DTOV R$ 10',
  });
  assert.equal(assigned.ok, true, assigned.errorCode);
  const dup = await assignEmployeeBenefit(query, {
    companyId: cid,
    candidateId: cand,
    benefitId: bid,
  });
  assert.equal(dup.ok, false);
  assert.equal(dup.errorCode, ERR.BENEFIT_ALREADY_ASSIGNED);

  const listed = await listEmployeeBenefitAssignments(query, {
    companyId: cid,
    candidateId: cand,
  });
  assert.equal(listed.ok, true);
  assert.ok(listed.items.some((x) => x.active && Number(x.benefitId) === Number(bid)));

  const ended = await endEmployeeBenefitAssignment(query, {
    companyId: cid,
    candidateId: cand,
    assignmentId: assigned.item.id,
  });
  assert.equal(ended.ok, true);

  console.log('rh2-16+14 DTOV SQL proof ok');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
