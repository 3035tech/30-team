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
assert.match(src, /export function scorePersonAgainstNucleus/);
assert.match(src, /export function buildDecisionBrief/);
assert.match(src, /export function buildInterviewQuestions/);
assert.match(src, /export function buildTeamCompositionHints/);
assert.match(src, /INTERVIEW_BY_TYPE/);
assert.match(src, /getCompat/);

const briefUi = await readFile(join(root, 'app/_components/HrActionBrief.jsx'), 'utf8');
assert.match(briefUi, /briefInterview/);
assert.match(briefUi, /briefAlerts/);
assert.match(briefUi, /briefPrint/);
assert.match(briefUi, /printDecisionBrief/);

const peopleBrief = await readFile(join(root, 'lib/people/candidate-people-brief.js'), 'utf8');
assert.match(peopleBrief, /decisionBrief/);
assert.match(peopleBrief, /loadColleagueTypesForBrief/);

const briefPrint = await readFile(join(root, 'lib/people/brief-print.js'), 'utf8');
assert.match(briefPrint, /export function buildBriefPrintHtml/);
assert.match(briefPrint, /export function printDecisionBrief/);
assert.match(briefPrint, /esc\(/);

const html = (await import('../../lib/people/brief-print.js')).buildBriefPrintHtml({
  locale: 'pt-BR',
  personName: 'Ana <script>',
  brief: {
    hasAny: true,
    synthesis: { headline: 'Tende a focar' },
    alerts: [{ text: 'Atenção X' }],
    actionsDo: [{ text: 'Faça Y', dimension: 'a' }],
    actionsAvoid: [],
    interviewQuestions: [{ id: '1', text: 'Pergunta?' }],
    team: { empty: true },
    hypotheses: [{ id: 'h1', title: 'H', body: 'Body' }],
  },
  labels: {
    product: '30Team',
    title: 'Briefing',
    hint: 'hint',
    alerts: 'Alertas',
    do: 'Faça',
    avoid: 'Evite',
    interview: 'Entrevista',
    team: 'Time',
    hypotheses: 'Hip',
    footer: 'footer',
    generatedAt: 'agora',
  },
});
assert.ok(html.includes('Ana &lt;script&gt;'));
assert.ok(!html.includes('<script>'));
assert.ok(html.includes('Tende a focar'));

const nucleusSrc = await readFile(join(root, 'lib/people/company-nucleus.js'), 'utf8');
assert.match(nucleusSrc, /export async function loadCompanyInternalNucleus/);

console.log('decision-brief source OK');
