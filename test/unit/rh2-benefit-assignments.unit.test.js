/**
 * Unit: B-RH2-14 employee benefit assignments.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ERR } from '../../lib/api-error-codes.js';
import {
  assignEmployeeBenefit,
  endEmployeeBenefitAssignment,
  listEmployeeBenefitAssignments,
} from '../../lib/people/employee-benefit-assignments.js';
import { t } from '../../lib/i18n.js';

describe('B-RH2-14 benefit assignments', () => {
  it('exposes BENEFIT_ALREADY_ASSIGNED', () => {
    assert.equal(ERR.BENEFIT_ALREADY_ASSIGNED, 'BENEFIT_ALREADY_ASSIGNED');
  });

  it('exports assignment helpers', () => {
    assert.equal(typeof listEmployeeBenefitAssignments, 'function');
    assert.equal(typeof assignEmployeeBenefit, 'function');
    assert.equal(typeof endEmployeeBenefitAssignment, 'function');
  });

  it('assign rejects invalid ids without DB', async () => {
    const r = await assignEmployeeBenefit(
      { query: async () => ({ rowCount: 0, rows: [] }) },
      {
        companyId: undefined,
        candidateId: 1,
        benefitId: 1,
      }
    );
    assert.equal(r.ok, false);
    assert.equal(r.errorCode, ERR.INVALID_ID);
  });

  it('i18n keys exist pt-BR + en', () => {
    for (const loc of ['pt-BR', 'en']) {
      assert.ok(t(loc, 'panel.benefitAssign.title').length > 3);
      assert.ok(t(loc, 'panel.benefitAssign.assignBtn').length > 2);
      assert.ok(t(loc, 'panel.benefitAssign.historyTitle').length > 3);
      assert.ok(t(loc, 'panel.benefitAssign.alumniReadOnly').length > 5);
      assert.ok(t(loc, 'errors.BENEFIT_ALREADY_ASSIGNED').length > 5);
    }
  });
});
