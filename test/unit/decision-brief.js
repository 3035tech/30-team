/**
 * Prova estrutural do briefing (sem carregar data.js via Node ESM/Next).
 * Uso: node test/unit/decision-brief.js
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = await readFile(join(root, 'lib/people/decision-brief.js'), 'utf8');
assert.match(src, /export function buildNucleusCompositionAdvice/);
assert.match(src, /export function buildDecisionBrief/);
assert.match(src, /export function buildInterviewQuestions/);
assert.match(src, /export function buildTeamCompositionHints/);
assert.match(src, /INTERVIEW_BY_TYPE/);
assert.match(src, /getCompat/);

const briefUi = await readFile(join(root, 'app/_components/HrActionBrief.jsx'), 'utf8');
assert.match(briefUi, /briefInterview/);
assert.match(briefUi, /briefAlerts/);

const peopleBrief = await readFile(join(root, 'lib/people/candidate-people-brief.js'), 'utf8');
assert.match(peopleBrief, /decisionBrief/);
assert.match(peopleBrief, /loadColleagueTypesForBrief/);

console.log('decision-brief source OK');
