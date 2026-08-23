/**
 * Parse rich-text “next steps” into short PDI item titles.
 * Also small cycle helpers (safe for client bundles).
 */

import { htmlToPlainText } from '../sanitize-html.js';

const LINE_MAX = 8;
const TITLE_MAX = 300;

/**
 * @param {string|null|undefined} html
 * @param {{ max?: number }} [opts]
 * @returns {string[]}
 */
export function parseActionLinesFromRichText(html, opts = {}) {
  const max = Math.min(Math.max(1, Number(opts.max) || LINE_MAX), LINE_MAX);
  const plain = htmlToPlainText(html || '');
  if (!plain) return [];

  const lines = plain
    .split(/\n+/)
    .map((line) =>
      String(line || '')
        .replace(/^[\s•\-\*\d.\)\]]+/u, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((line) => line.length >= 2)
    .map((line) => line.slice(0, TITLE_MAX));

  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= max) break;
  }
  return out;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function isPlanPeriodOverdue(plan, today = todayIsoDate()) {
  if (!plan || plan.status !== 'active') return false;
  const end = plan.periodEnd ? String(plan.periodEnd).slice(0, 10) : null;
  return Boolean(end && end < today);
}

export function isItemDueOverdue(item, today = todayIsoDate()) {
  if (!item || item.status === 'done') return false;
  const due = item.dueDate ? String(item.dueDate).slice(0, 10) : null;
  return Boolean(due && due < today);
}
