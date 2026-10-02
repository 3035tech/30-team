/**
 * Unit proof — kinship normalization (DP emergency contact + dependents).
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  kinshipLabel,
  kinshipOptions,
  normalizeDependentRelation,
  normalizeEmergencyRelation,
  normalizeKinshipRelation,
} from '../../lib/kinship-relation.js';
import {
  DEPENDENT_KINSHIP_RELATIONS,
  EMERGENCY_KINSHIP_RELATIONS,
  KINSHIP_RELATIONS,
} from '../../lib/domain-status.js';

test('keys pass through and empty stays not informed', () => {
  for (const k of KINSHIP_RELATIONS) assert.equal(normalizeKinshipRelation(k), k);
  assert.equal(normalizeKinshipRelation(''), '');
  assert.equal(normalizeKinshipRelation(null), '');
  assert.equal(normalizeKinshipRelation('   '), '');
});

test('legacy free text maps to keys', () => {
  assert.equal(normalizeEmergencyRelation('Cônjuge'), 'spouse');
  assert.equal(normalizeEmergencyRelation('esposa'), 'spouse');
  assert.equal(normalizeEmergencyRelation('MÃE'), 'mother');
  assert.equal(normalizeEmergencyRelation('irmão(ã)'), 'sibling');
  assert.equal(normalizeEmergencyRelation('Irmã mais velha'), 'sibling');
  assert.equal(normalizeEmergencyRelation('sogra'), 'in_law');
  assert.equal(normalizeEmergencyRelation('Amiga'), 'friend');
  assert.equal(normalizeEmergencyRelation('wife'), 'spouse');
  assert.equal(normalizeDependentRelation('filho'), 'child');
  assert.equal(normalizeDependentRelation('Enteada'), 'stepchild');
  assert.equal(normalizeDependentRelation('menor sob guarda'), 'ward');
});

test('unknown text and out-of-scope keys become other', () => {
  assert.equal(normalizeEmergencyRelation('familiar'), 'other');
  assert.equal(normalizeEmergencyRelation('ward'), 'other');
  assert.equal(normalizeDependentRelation('amigo'), 'other');
  assert.equal(normalizeDependentRelation('tio'), 'other');
});

test('subsets are consistent', () => {
  assert.ok(!EMERGENCY_KINSHIP_RELATIONS.includes('ward'));
  assert.ok(DEPENDENT_KINSHIP_RELATIONS.includes('ward'));
  for (const k of DEPENDENT_KINSHIP_RELATIONS) assert.ok(KINSHIP_RELATIONS.includes(k));
});

test('migration 141 stays in sync with the JS domain', async () => {
  const sql = await readFile(new URL('../../migrations/141_dp_kinship_relation.sql', import.meta.url), 'utf8');
  const list = (text) => [...text.matchAll(/'([a-z_]*)'/g)].map((m) => m[1]);

  const emergencyCheck = sql.match(/emergency_relation_domain CHECK \(emergency_relation IN \(([\s\S]*?)\)\);/);
  assert.ok(emergencyCheck, 'emergency CHECK found');
  assert.deepEqual(list(emergencyCheck[1]).sort(), ['', ...EMERGENCY_KINSHIP_RELATIONS].sort());

  const dependentCheck = sql.match(/dependents_relation_domain CHECK \([\s\S]*?'\$\[\*\] \? \(([\s\S]*?)\)'/);
  assert.ok(dependentCheck, 'dependents CHECK found');
  const dependentKeys = [...dependentCheck[1].matchAll(/@\.relation == "([a-z_]*)"/g)].map((m) => m[1]);
  assert.deepEqual(dependentKeys.sort(), ['', ...DEPENDENT_KINSHIP_RELATIONS].sort());

  const keysArray = sql.match(/keys CONSTANT TEXT\[\] := ARRAY\[([\s\S]*?)\];/);
  assert.deepEqual(list(keysArray[1]).sort(), [...KINSHIP_RELATIONS].sort());

  const synonymRows = [...sql.matchAll(/WHEN cand IN \(([^)]*)\) THEN '([a-z_]+)'/g)];
  assert.ok(synonymRows.length >= 10, 'synonym table found');
  for (const [, words, key] of synonymRows) {
    for (const word of [...words.matchAll(/'([^']+)'/g)].map((m) => m[1])) {
      assert.equal(normalizeKinshipRelation(word), key, `SQL synonym "${word}"`);
    }
  }
});

test('labels resolve in every locale', () => {
  for (const loc of ['pt-BR', 'en-US', 'fr-FR', 'de-DE']) {
    for (const k of KINSHIP_RELATIONS) {
      const label = kinshipLabel(loc, k);
      assert.ok(label && !label.startsWith('panel.'), `${loc} ${k}`);
      assert.ok(!label.includes(' — '), `${loc} ${k}`);
    }
    const opts = kinshipOptions(loc, EMERGENCY_KINSHIP_RELATIONS);
    assert.equal(opts[0].value, '');
    assert.equal(opts.length, EMERGENCY_KINSHIP_RELATIONS.length + 1);
  }
  assert.equal(kinshipLabel('pt-BR', 'mãe'), 'Mãe');
  assert.equal(kinshipLabel('pt-BR', ''), '');
});
