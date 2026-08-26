/**
 * Unit: team behavioral intelligence v3.
 * Run: node test/unit/team-behavioral-intel.js
 */
import assert from 'node:assert/strict';
import {
  dominantTypesFromScores,
  secondaryTypeFromScores,
  tertiaryTypeFromScores,
  buildProfileBars,
  buildTypePresence,
  buildMotivatorRanking,
  buildTeamBehavioralIntel,
  pickTopRules,
  motivatorDiversityKind,
} from '../../lib/people/team-behavioral-intel.js';

assert.deepEqual(dominantTypesFromScores({ 1: 10, 2: 10, 3: 5 }, 1).sort(), [1, 2]);
assert.equal(secondaryTypeFromScores({ 1: 20, 5: 18, 3: 5 }, 1), 5);
assert.equal(secondaryTypeFromScores({ 1: 20, 5: 10 }, 1), null);
assert.equal(tertiaryTypeFromScores({ 1: 20, 5: 18, 3: 16 }), 3);
assert.equal(tertiaryTypeFromScores({ 1: 20, 5: 10, 3: 8 }), null);

const people = [
  { topType: 1, scores: { 1: 20, 2: 10, 5: 17 } },
  { topType: 1, scores: { 1: 15, 3: 15 } },
  { topType: 2, scores: { 2: 18, 3: 16 } },
  { topType: 3, scores: { 3: 16, 8: 14 } },
  { topType: 9, scores: { 9: 19, 2: 17 } },
];
const bars = buildProfileBars(people);
assert.equal(bars.nPeople, 5);
const presence = buildTypePresence(people);
assert.ok(presence.presence[5] > 0);
assert.ok(Object.keys(presence.blends).length >= 1);

const attempts = [
  {
    dimensionScores: {
      flexibilidade: 80,
      desenvolvimento: 40,
      crescimento: 75,
      autonomia: 30,
      reconhecimento: 90,
      financeiro: 20,
      proposito: 15,
      relacionamentos: 25,
      seguranca: 35,
      lideranca: 12,
      desafio: 70,
      criatividade: 45,
      equilibrio: 22,
    },
    ranking: ['reconhecimento', 'flexibilidade', 'crescimento', 'desafio', 'criatividade'],
  },
  {
    dimensionScores: {
      flexibilidade: 75,
      desenvolvimento: 35,
      crescimento: 70,
      autonomia: 25,
      reconhecimento: 20,
      financeiro: 20,
      proposito: 30,
      relacionamentos: 35,
      seguranca: 25,
      lideranca: 40,
      desafio: 65,
      criatividade: 50,
      equilibrio: 40,
    },
    ranking: ['flexibilidade', 'crescimento', 'desafio', 'criatividade', 'lideranca'],
  },
  {
    dimensionScores: {
      flexibilidade: 60,
      desenvolvimento: 55,
      crescimento: 50,
      autonomia: 45,
      reconhecimento: 40,
      financeiro: 35,
      proposito: 55,
      relacionamentos: 48,
      seguranca: 30,
      lideranca: 28,
      desafio: 42,
      criatividade: 38,
      equilibrio: 50,
    },
    ranking: ['flexibilidade', 'proposito', 'desenvolvimento', 'equilibrio', 'crescimento'],
  },
  {
    dimensionScores: {
      flexibilidade: 50,
      desenvolvimento: 48,
      crescimento: 52,
      autonomia: 60,
      reconhecimento: 55,
      financeiro: 45,
      proposito: 40,
      relacionamentos: 58,
      seguranca: 33,
      lideranca: 35,
      desafio: 47,
      criatividade: 44,
      equilibrio: 36,
    },
    ranking: ['autonomia', 'relacionamentos', 'reconhecimento', 'crescimento', 'flexibilidade'],
  },
  {
    dimensionScores: {
      flexibilidade: 55,
      desenvolvimento: 62,
      crescimento: 58,
      autonomia: 40,
      reconhecimento: 30,
      financeiro: 70,
      proposito: 25,
      relacionamentos: 40,
      seguranca: 50,
      lideranca: 22,
      desafio: 38,
      criatividade: 33,
      equilibrio: 28,
    },
    ranking: ['financeiro', 'desenvolvimento', 'crescimento', 'flexibilidade', 'seguranca'],
  },
];
const mot = buildMotivatorRanking(attempts);
assert.equal(mot.nPeople, 5);
assert.ok(typeof mot.items[0].dispersion === 'number');

const intel = buildTeamBehavioralIntel({
  eneagramPeople: people,
  motivatorAttempts: attempts,
  locale: 'pt-BR',
});
assert.ok(!intel.meta.empty);
assert.equal(intel.forces.length, 5, `forces ${intel.forces.length}`);
assert.equal(intel.attentions.length, 5, `attentions ${intel.attentions.length}`);
assert.ok(intel.actions.length >= 4 && intel.actions.length <= 6);
assert.ok(intel.topMovers.length === 5);

const filled = pickTopRules(
  [
    { id: 'a', score: () => 50 },
    { id: 'b', score: () => 40 },
    { id: 'c', score: () => 5 },
    { id: 'd', score: () => 4 },
    { id: 'e', score: () => 0 },
  ],
  { nEneagram: 8, nMotivators: 8 },
  5,
  10,
  0
);
assert.equal(filled.length, 5);

assert.equal(motivatorDiversityKind([]), 'empty');

console.log('team-behavioral-intel: ok');
