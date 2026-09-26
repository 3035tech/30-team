import assert from 'node:assert/strict';
import { test } from 'node:test';
import { suggestSelfAssessment } from '../../lib/people/self-assessment-suggestion.js';

test('self-assessment suggestions preserve content while changing known sentence subjects', () => {
  const source = 'Demonstra respeito. Busca aprender. Compartilha conhecimentos.';
  assert.equal(suggestSelfAssessment(source, 'Respeito'), 'Demonstro respeito. Busco aprender. Compartilho conhecimentos.');
  assert.equal(source, 'Demonstra respeito. Busca aprender. Compartilha conhecimentos.');
  assert.equal(suggestSelfAssessment('Texto específico para revisão.', 'Comunicação'), 'Demonstro a competência “Comunicação” no meu trabalho.');
});
