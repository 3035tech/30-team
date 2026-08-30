/**
 * Motivators radar series helpers (Equipe / dossier).
 */

import { MOTIVATORS_DIMENSIONS, motivatorDimensionLabel } from './motivators-dimensions.js';

/** Short axis labels for dense 13-spoke radar (pt-BR / en). */
const SHORT = Object.freeze({
  reconhecimento: { 'pt-BR': 'Rec.', en: 'Rec.' },
  financeiro: { 'pt-BR': 'Fin.', en: 'Fin.' },
  crescimento: { 'pt-BR': 'Cresc.', en: 'Grow.' },
  desenvolvimento: { 'pt-BR': 'Des.', en: 'Dev.' },
  autonomia: { 'pt-BR': 'Aut.', en: 'Aut.' },
  flexibilidade: { 'pt-BR': 'Flex.', en: 'Flex.' },
  proposito: { 'pt-BR': 'Prop.', en: 'Purp.' },
  relacionamentos: { 'pt-BR': 'Rel.', en: 'Rel.' },
  seguranca: { 'pt-BR': 'Seg.', en: 'Sec.' },
  lideranca: { 'pt-BR': 'Lid.', en: 'Lead.' },
  desafio: { 'pt-BR': 'Desaf.', en: 'Chal.' },
  criatividade: { 'pt-BR': 'Criat.', en: 'Creat.' },
  equilibrio: { 'pt-BR': 'Equil.', en: 'Bal.' },
});

export function motivatorDimensionShortLabel(key, locale = 'pt-BR') {
  const row = SHORT[key];
  if (!row) return motivatorDimensionLabel(key, locale);
  return locale === 'en' ? row.en : row['pt-BR'];
}

/**
 * @param {Record<string, number>|null|undefined} dimensionScores
 * @param {string} [locale]
 * @returns {Array<{ key: string, label: string, shortLabel: string, score: number, color: string|null }>}
 */
export function buildMotivatorsRadarPoints(dimensionScores, locale = 'pt-BR') {
  const scores = dimensionScores && typeof dimensionScores === 'object' ? dimensionScores : {};
  return MOTIVATORS_DIMENSIONS.map((d) => {
    const raw = Number(scores[d.key]);
    return {
      key: d.key,
      label: motivatorDimensionLabel(d.key, locale),
      shortLabel: motivatorDimensionShortLabel(d.key, locale),
      score: Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0,
      color: d.color || null,
    };
  });
}

/**
 * Highest-scoring dimensions for chips under the radar.
 * @param {Array<{ key: string, label: string, score: number, color?: string|null }>} points
 * @param {number} [limit=3]
 */
export function pickMotivatorsRadarPeaks(points, limit = 3) {
  const n = Math.max(0, Math.min(Number(limit) || 0, 13));
  if (!Array.isArray(points) || !n) return [];
  return [...points]
    .filter((p) => Number(p?.score) > 0)
    .sort((a, b) => Number(b.score) - Number(a.score) || String(a.key).localeCompare(String(b.key)))
    .slice(0, n);
}
