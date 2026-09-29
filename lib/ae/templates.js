/**
 * Resolve templates de perfil e recomendações com base nas dimensões pontuadas.
 */

import { asDb } from './as-db.js';
import { motivatorDimensionLabel } from './motivators-dimensions.js';
import { t as i18nT, contentLocale } from '../i18n.js';

function matchesProfileTemplate(condition, dimensionScores, ranking) {
  if (condition.fallback) return true;
  const tops = condition.top_dimensions || [];
  const minScore = Number(condition.min_score) || 60;
  if (tops.length === 0) return false;
  const topSet = new Set(ranking.slice(0, tops.length));
  const allInTop = tops.every((d) => topSet.has(d));
  if (!allInTop) return false;
  return tops.every((d) => (dimensionScores[d] || 0) >= minScore);
}

function matchesDimensionTemplate(condition, dimensionScores) {
  const dim = condition.dimension;
  if (!dim) return false;
  const minScore = Number(condition.min_score) || 70;
  return (dimensionScores[dim] || 0) >= minScore;
}

/**
 * @param {Array<{ templateType: string, condition: object, textPt: string, textEn?: string, sortOrder: number }>} templates
 */
export function resolveResultTexts(templates, { dimensionScores, ranking, locale = 'pt-BR' }) {
  const pickText = (t) => (contentLocale(locale) === 'en' && t.textEn ? t.textEn : t.textPt);

  const profileCandidates = templates
    .filter((t) => t.templateType === 'profile_summary' && t.active !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  let profileSummary = '';
  for (const t of profileCandidates) {
    if (matchesProfileTemplate(t.condition || {}, dimensionScores, ranking)) {
      profileSummary = pickText(t);
      if (!t.condition?.fallback) break;
    }
  }
  if (!profileSummary) {
    const fallback = profileCandidates.find((t) => t.condition?.fallback);
    profileSummary = fallback ? pickText(fallback) : buildDefaultProfile(dimensionScores, ranking, locale);
  }

  const doList = [];
  const avoidList = [];

  const doTemplates = templates
    .filter((t) => t.templateType === 'manager_do' && t.active !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const avoidTemplates = templates
    .filter((t) => t.templateType === 'manager_avoid' && t.active !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  for (const t of doTemplates) {
    if (matchesDimensionTemplate(t.condition || {}, dimensionScores)) {
      doList.push(pickText(t));
    }
  }
  for (const t of avoidTemplates) {
    if (matchesDimensionTemplate(t.condition || {}, dimensionScores)) {
      avoidList.push(pickText(t));
    }
  }

  if (doList.length === 0) {
    doList.push(
      i18nT(locale, 'ui.templates.scheduleRegular11sTo')
    );
  }
  if (avoidList.length === 0) {
    avoidList.push(
      i18nT(locale, 'ui.templates.avoidAssumingMotivatorsStayFixed')
    );
  }

  return {
    profileSummary,
    managerRecommendations: { do: doList.slice(0, 6), avoid: avoidList.slice(0, 6) },
  };
}

function buildDefaultProfile(dimensionScores, ranking, locale) {
  const top = (ranking || []).slice(0, 2);
  const labels = top
    .map((d) => motivatorDimensionLabel(d, locale))
    .filter(Boolean)
    .join(i18nT(locale, 'ui.templates.and'));
  if (!labels) {
    return i18nT(locale, 'ui.templates.motivatorsLookEvenlySpreadUse');
  }
  if (contentLocale(locale) === 'en') {
    return `${labels} tend to weigh more for this person. Use as a conversation guide for recognition and development, not a label.`;
  }
  return `${labels} tendem a pesar mais para esta pessoa. Use como roteiro de conversa (reconhecimento e desenvolvimento), não como rótulo.`;
}

/** Carrega templates do banco e resolve. */
export async function resolveResultTextsFromDb(dbOrQuery, definitionId, result, locale = 'pt-BR') {
  const db = asDb(dbOrQuery);
  const res = await db.query(
    `SELECT template_type AS "templateType", condition, text_pt AS "textPt", text_en AS "textEn",
            sort_order AS "sortOrder", active
     FROM ae_result_templates
     WHERE definition_id = $1 AND active = TRUE
     ORDER BY sort_order ASC, id ASC`,
    [definitionId]
  );
  return resolveResultTexts(res.rows, { ...result, locale });
}
