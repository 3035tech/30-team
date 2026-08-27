/**
 * Smoke B-1900 — narrative + workbench pure builders (+ interpret mock).
 * Run: node --test test/unit/b1900-packaging.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTeamTensionNarrative } from '../../lib/people/team-tension-narrative.js';
import { buildMultiSignalWorkbench } from '../../lib/people/multi-signal-workbench.js';
import { interpretPeopleSignalsAi } from '../../lib/people/interpret-ai.js';

describe('B-1900 packaging', () => {
  it('buildTeamTensionNarrative empty', () => {
    const n = buildTeamTensionNarrative(null);
    assert.equal(n.empty, true);
    assert.ok(n.ctas.includes('group'));
  });

  it('buildTeamTensionNarrative packs forces and attentions', () => {
    const n = buildTeamTensionNarrative({
      forces: [{ id: 'delivery' }, { id: 'analysis' }],
      attentions: [{ id: 'pace' }, { id: 'feedback' }],
      topMovers: [{ key: 'autonomia', label: 'Autonomia' }],
      meta: { empty: false, nEneagram: 8, nMotivators: 6 },
    });
    assert.equal(n.empty, false);
    assert.ok(n.lines.length >= 3);
    assert.ok(n.lines.some((l) => l.source === 'force'));
    assert.ok(n.lines.some((l) => l.source === 'attention'));
  });

  it('buildMultiSignalWorkbench patterns', () => {
    const w = buildMultiSignalWorkbench({
      climate: { latestMean: 2.8, openSurveys: 1 },
      pdi: { overdueItemCount: 2, noPlanEmployeeCount: 1 },
      retentionCount: 2,
      intel: { attentions: [{ id: 'a' }, { id: 'b' }], forces: [{ id: 'f' }], meta: { empty: false } },
      hr: { avgScore: 50, total: 10 },
      turnover: { highCount: 1, mediumCount: 2 },
    });
    assert.equal(w.empty, false);
    assert.ok(w.patterns.some((p) => p.id === 'climate_low'));
    assert.ok(w.patterns.some((p) => p.id === 'turnover_high'));
    assert.ok(w.ctas.includes('team') || w.ctas.includes('climate'));
  });

  it('interpretPeopleSignalsAi mock', async () => {
    process.env.DTOV = '1';
    const out = await interpretPeopleSignalsAi({
      kind: 'person',
      locale: 'pt-BR',
      signals: { profile: { hasEnneagram: true }, hrScore: { score: 70 } },
    });
    assert.equal(out.ok, true);
    assert.ok(String(out.summary || '').length > 10);
    assert.ok(Array.isArray(out.recommendations));
  });
});
