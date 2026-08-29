/**
 * Template canônico da descrição de vaga (HTML) — o que o candidato precisa saber.
 * Usado no drawer (inserir estrutura) e como guia da IA (criar / melhorar).
 */

import { htmlToPlainText } from './sanitize-html.js';
import { normalizeLocale } from './i18n.js';

/** Texto mínimo para considerar que já há conteúdo a melhorar (não só espaços). */
export const VACANCY_DESC_SPARSE_CHARS = 40;

export function isVacancyDescriptionSparse(html) {
  return htmlToPlainText(html || '').trim().length < VACANCY_DESC_SPARSE_CHARS;
}

/**
 * Resolve modo da IA: draft (criar base) | improve (corrigir/melhorar).
 * @param {'auto'|'draft'|'improve'|string} requested
 * @param {string} descriptionHtml
 */
export function resolveVacancyDescriptionMode(requested, descriptionHtml) {
  const m = String(requested || 'auto').trim().toLowerCase();
  if (m === 'draft' || m === 'improve') return m;
  return isVacancyDescriptionSparse(descriptionHtml) ? 'draft' : 'improve';
}

/**
 * Estrutura vazia com seções relevantes para o candidato.
 * Placeholders curtos para o RH completar (ou a IA preencher).
 */
export function buildVacancyDescriptionTemplate(locale = 'pt-BR') {
  const en = normalizeLocale(locale) === 'en';
  if (en) {
    return `<h2>About the role</h2>
<p>What this role exists for and the main outcome expected…</p>
<h2>What you will do</h2>
<ul>
<li>…</li>
<li>…</li>
<li>…</li>
</ul>
<h2>What we look for</h2>
<ul>
<li>Must-have skills / experience…</li>
<li>…</li>
</ul>
<h2>Nice to have</h2>
<ul>
<li>…</li>
</ul>
<h2>How we work</h2>
<ul>
<li>Employment type / location / cadence…</li>
</ul>
<h2>What we offer</h2>
<ul>
<li>Only list benefits you can confirm…</li>
</ul>
<h2>Selection process</h2>
<p>Next steps (interview, assessments, timeline)…</p>`;
  }
  return `<h2>Sobre a vaga</h2>
<p>Para que essa vaga existe e qual resultado principal esperamos…</p>
<h2>O que você vai fazer</h2>
<ul>
<li>…</li>
<li>…</li>
<li>…</li>
</ul>
<h2>O que buscamos</h2>
<ul>
<li>Requisitos essenciais (skills / experiência)…</li>
<li>…</li>
</ul>
<h2>Diferenciais</h2>
<ul>
<li>…</li>
</ul>
<h2>Como trabalhamos</h2>
<ul>
<li>Formato de contratação / local / ritmo…</li>
</ul>
<h2>O que oferecemos</h2>
<ul>
<li>Liste só benefícios que puder confirmar…</li>
</ul>
<h2>Processo seletivo</h2>
<p>Próximos passos (entrevista, testes, prazo)…</p>`;
}

/** Instruções de seção para o prompt da IA (mesmo mapa do template). */
export function vacancyDescriptionSectionGuide(locale = 'pt-BR') {
  const en = normalizeLocale(locale) === 'en';
  return en
    ? `Required HTML sections (use <h2> titles exactly like this):
1) About the role: purpose and main outcome
2) What you will do: 3–6 concrete responsibilities
3) What we look for: must-haves only
4) Nice to have: optional
5) How we work: employment type, location/remote, cadence (use vacancy facts; do not invent)
6) What we offer: only confirmed items; if unknown write a short line asking RH to confirm
7) Selection process: next steps in plain language
Use <p> and <ul><li> only (plus <h2> for section titles). No Markdown, no code fences, no bold/italic/links. No fake salary/benefits. Hedging language OK.`
    : `Seções HTML obrigatórias (use <h2> com estes títulos):
1) Sobre a vaga: propósito e resultado principal
2) O que você vai fazer: 3–6 responsabilidades concretas
3) O que buscamos: só o essencial
4) Diferenciais: opcional
5) Como trabalhamos: contratação, local/remoto, ritmo (use os dados da vaga; não invente)
6) O que oferecemos: só o que puder confirmar; se não souber, uma linha pedindo confirmação do RH
7) Processo seletivo: próximos passos em linguagem clara
Use só <p> e <ul><li> (e <h2> nos títulos). Sem Markdown, sem cercas, sem negrito/itálico/links. Sem salário/benefícios inventados. Hedging ok.`;
}
