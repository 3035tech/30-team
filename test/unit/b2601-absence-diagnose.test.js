/**
 * B-2601 — list absence diagnostics (pure helpers).
 * Run: node --test test/unit/b2601-absence-diagnose.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { t } from '../../lib/i18n.js';
import { EMPLOYMENT_STATUS, ROSTER_SCOPE } from '../../lib/domain-status.js';
import {
  ABSENCE_REASON,
  ABSENCE_SUGGESTION,
  buildAbsenceDiagnostics,
  classifyRosterVisibility,
} from '../../lib/people/list-absence-diagnostics-core.js';
import { PIPELINE_STAGE_COLORS_DARK, getPipelineStageColor } from '../../lib/theme.js';

describe('B-2601 absence diagnostics', () => {
  it('classifyRosterVisibility: vacancy candidate hidden on internal', () => {
    const vis = classifyRosterVisibility(
      {
        employmentStatus: EMPLOYMENT_STATUS.CANDIDATE,
        hasCompanyAssessment: false,
        hasVacancyAssessment: true,
      },
      ROSTER_SCOPE.INTERNAL
    );
    assert.equal(vis.visible, false);
    assert.equal(vis.inRecruiting, true);
  });

  it('classifyRosterVisibility: company-link assessment visible on internal', () => {
    const vis = classifyRosterVisibility(
      {
        employmentStatus: EMPLOYMENT_STATUS.CANDIDATE,
        hasCompanyAssessment: true,
        hasVacancyAssessment: false,
      },
      ROSTER_SCOPE.INTERNAL
    );
    assert.equal(vis.visible, true);
  });

  it('buildAbsenceDiagnostics: no_match + clear_search', () => {
    const out = buildAbsenceDiagnostics({
      q: 'Zzz Nobody',
      rosterScope: ROSTER_SCOPE.INTERNAL,
      rows: [],
    });
    assert.ok(out.reasons.some((r) => r.code === ABSENCE_REASON.NO_MATCH));
    assert.ok(out.suggestions.some((s) => s.action === ABSENCE_SUGGESTION.CLEAR_SEARCH));
  });

  it('buildAbsenceDiagnostics: wrong_roster suggests recruiting', () => {
    const out = buildAbsenceDiagnostics({
      q: 'Ana',
      rosterScope: ROSTER_SCOPE.INTERNAL,
      rows: [
        {
          id: 11,
          fullName: 'Ana Silva',
          email: 'ana@ex.com',
          employmentStatus: EMPLOYMENT_STATUS.CANDIDATE,
          hasCompanyAssessment: false,
          hasVacancyAssessment: true,
          latestAssessmentId: 99,
        },
      ],
    });
    assert.ok(out.reasons.some((r) => r.code === ABSENCE_REASON.WRONG_ROSTER));
    const switchSug = out.suggestions.find((s) => s.action === ABSENCE_SUGGESTION.SWITCH_ROSTER);
    assert.equal(switchSug?.roster, ROSTER_SCOPE.RECRUITING);
    assert.equal(out.candidates.length, 1);
  });

  it('buildAbsenceDiagnostics: alumni + soft_filters', () => {
    const out = buildAbsenceDiagnostics({
      q: 'Bruno',
      rosterScope: ROSTER_SCOPE.ALL,
      listFilter: 'turnover_risk',
      rows: [
        {
          id: 22,
          fullName: 'Bruno Alumni',
          email: null,
          employmentStatus: EMPLOYMENT_STATUS.ALUMNI,
          hasCompanyAssessment: true,
          hasVacancyAssessment: false,
          latestAssessmentId: 7,
        },
      ],
    });
    assert.ok(out.reasons.some((r) => r.code === ABSENCE_REASON.ALUMNI));
    assert.ok(out.reasons.some((r) => r.code === ABSENCE_REASON.SOFT_FILTERS));
    assert.ok(out.suggestions.some((s) => s.action === ABSENCE_SUGGESTION.CLEAR_FILTERS));
  });

  for (const locale of ['pt-BR', 'en']) {
    it(`diagnose + help i18n (${locale})`, () => {
      assert.ok(String(t(locale, 'panel.team.diagnoseCta')).length > 4);
      assert.ok(String(t(locale, 'panel.team.diagnoseReason.wrong_roster')).length > 8);
      assert.ok(String(t(locale, 'panel.help.teamStep7')).length > 8);
      assert.notEqual(t(locale, 'panel.help.teamStep7'), 'panel.help.teamStep7');
    });
  }
});

describe('B-1501 pipeline dark colors', () => {
  it('dark pipeline hues differ from light for muted stages', () => {
    assert.notEqual(
      getPipelineStageColor('new', { isDark: true }),
      getPipelineStageColor('new', { isDark: false })
    );
    assert.equal(PIPELINE_STAGE_COLORS_DARK.hired, '#2DD4BF');
    assert.match(getPipelineStageColor('rejected', { isDark: true }), /^#/i);
  });
});
