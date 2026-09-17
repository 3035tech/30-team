/**
 * Unit: B-RH2-16 climate archive / question lock / i18n.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ERR } from '../../lib/api-error-codes.js';
import { CLIMATE_SURVEY_STATUS } from '../../lib/domain-status.js';
import {
  climateQuestionsEditable,
  archiveClimateSurvey,
  versionClimateSurvey,
} from '../../lib/people/climate-surveys.js';
import { t } from '../../lib/i18n.js';

describe('B-RH2-16 climate archive', () => {
  it('exposes SURVEY_QUESTIONS_LOCKED and SURVEY_ARCHIVED', () => {
    assert.equal(ERR.SURVEY_QUESTIONS_LOCKED, 'SURVEY_QUESTIONS_LOCKED');
    assert.equal(ERR.SURVEY_ARCHIVED, 'SURVEY_ARCHIVED');
  });

  it('CLIMATE_SURVEY_STATUS includes archived', () => {
    assert.equal(CLIMATE_SURVEY_STATUS.ARCHIVED, 'archived');
  });

  it('questions editable only while draft', () => {
    assert.equal(climateQuestionsEditable(CLIMATE_SURVEY_STATUS.DRAFT), true);
    assert.equal(climateQuestionsEditable(CLIMATE_SURVEY_STATUS.OPEN), false);
    assert.equal(climateQuestionsEditable(CLIMATE_SURVEY_STATUS.CLOSED), false);
    assert.equal(climateQuestionsEditable(CLIMATE_SURVEY_STATUS.ARCHIVED), false);
  });

  it('exports archiveClimateSurvey / versionClimateSurvey', () => {
    assert.equal(typeof archiveClimateSurvey, 'function');
    assert.equal(typeof versionClimateSurvey, 'function');
  });

  it('climate archive / version UI keys exist pt-BR + en', () => {
    for (const loc of ['pt-BR', 'en']) {
      assert.ok(t(loc, 'panel.climate.status.archived').length > 2);
      assert.ok(t(loc, 'panel.climate.listFilter.archived').length > 2);
      assert.ok(t(loc, 'panel.climate.questionsLocked').length > 10);
      assert.ok(t(loc, 'panel.climate.versionBtn').length > 2);
      assert.ok(t(loc, 'panel.climate.versionOf', { id: 9 }).includes('9'));
      assert.ok(t(loc, 'panel.climate.emptyAllTitle').length > 2);
      assert.ok(t(loc, 'panel.climate.inviteStats', { total: 1, used: 0, pending: 1 }).includes('1'));
      assert.ok(t(loc, 'errors.SURVEY_QUESTIONS_LOCKED').length > 5);
      assert.ok(t(loc, 'errors.SURVEY_ARCHIVED').length > 3);
    }
  });
});
