/**
 * Unit: B-RH2-20 Motivators copy + sync-without-DELETE guarantees.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  generateMotivatorsQuestionBank,
  getQuestionBankStats,
  validateMotivatorsRespondentCopy,
} from '../../lib/ae/motivators-question-bank.js';
import { MOTIVATORS_RESULT_TEMPLATES } from '../../lib/ae/motivators-result-templates-data.js';
import { toPublicQuestions } from '../../lib/ae/to-public-questions.js';
import { t } from '../../lib/i18n.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('B-RH2-20 motivators copy', () => {
  it('bank has expected mix and passes respondent-copy validation', () => {
    const stats = getQuestionBankStats();
    assert.ok(stats.total >= 70);
    assert.ok(stats.forcedChoice >= 20);
    assert.ok(stats.ranking >= 4);
    assert.ok(stats.likert >= 30);
    const v = validateMotivatorsRespondentCopy();
    assert.equal(v.ok, true, JSON.stringify(v.issues || [], null, 2));
  });

  it('public payload strips weights', () => {
    const bank = generateMotivatorsQuestionBank().slice(0, 5).map((q, i) => ({
      ...q,
      id: i + 1,
      options: (q.options || []).map((o, j) => ({ ...o, id: j + 1 })),
    }));
    const pub = toPublicQuestions(bank, 'pt-BR');
    assert.equal(pub.length, bank.length);
    for (const q of pub) {
      assert.equal(q.dimensionWeights, undefined);
      for (const o of q.options || []) {
        assert.equal(o.weights, undefined);
      }
    }
  });

  it('sync module deactivates questions instead of DELETE FROM ae_questions', () => {
    const src = readFileSync(join(root, 'lib/ae/sync-question-bank.js'), 'utf8');
    assert.match(src, /SET active = FALSE/);
    assert.doesNotMatch(src, /DELETE FROM ae_questions/i);
  });

  it('manager templates are hedged and bilingual', () => {
    const profiles = MOTIVATORS_RESULT_TEMPLATES.filter((row) => row.templateType === 'profile_summary');
    assert.ok(profiles.length >= 5);
    for (const row of profiles) {
      assert.ok(row.textPt && row.textEn);
      assert.ok(
        /tendem|tende a|roteiro|hipótese|há indícios|tend to|conversation|hypothesis|hypotheses|guide/i.test(
          `${row.textPt} ${row.textEn}`
        ),
        row.textPt
      );
      assert.ok(!/\s—\s/.test(row.textPt));
      assert.ok(!/\s—\s/.test(row.textEn));
      assert.ok(!/^Tendência:|^Tendency:/i.test(row.textPt));
      assert.ok(!/^Tendência:|^Tendency:/i.test(row.textEn));
    }
    const actions = MOTIVATORS_RESULT_TEMPLATES.filter(
      (row) => row.templateType === 'manager_do' || row.templateType === 'manager_avoid'
    );
    for (const row of actions) {
      assert.ok(row.textEn, row.textPt);
      assert.ok(!/^Tendência:|^Tendency:/i.test(row.textPt));
      assert.ok(!/\s—\s/.test(row.textPt + row.textEn));
    }
  });

  it('fallback recommendations have no em dash and use labels', async () => {
    const { resolveResultTexts } = await import('../../lib/ae/templates.js');
    const out = resolveResultTexts([], {
      dimensionScores: { desafio: 80, crescimento: 75 },
      ranking: ['desafio', 'crescimento'],
      locale: 'pt-BR',
    });
    assert.ok(!/\s—\s/.test(out.profileSummary));
    assert.ok(out.profileSummary.includes('Desafio') || out.profileSummary.includes('desafio'));
    assert.ok(!/\s—\s/.test(out.managerRecommendations.avoid.join(' ')));
  });

  it('chrome i18n exists pt-BR + en', () => {
    for (const loc of ['pt-BR', 'en']) {
      assert.ok(t(loc, 'motivators.rankingInstruction').length > 20);
      assert.ok(t(loc, 'motivators.likertMin').length > 3);
      assert.ok(t(loc, 'panel.help.motivatorsTitle').length > 3);
    }
  });
});
