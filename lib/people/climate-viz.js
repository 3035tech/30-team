/**
 * Climate survey UI helpers — client-safe (no Node/mail/db).
 * Keep server orchestration in climate-surveys.js.
 */

/**
 * Prefer opensAt (campaign start), else createdAt — for timeline / list labels.
 */
export function climateSurveyAnchorDate(survey) {
  if (!survey || typeof survey !== 'object') return null;
  return survey.opensAt || survey.createdAt || survey.updatedAt || null;
}

/**
 * Map Likert mean to a hedged visual level (bar % + semantic tone).
 * Not a clinical score — UI helper only.
 */
export function climateMeanLevel(mean, scaleMin = 1, scaleMax = 5) {
  const m = Number(mean);
  const lo = Number(scaleMin);
  const hi = Number(scaleMax);
  if (!Number.isFinite(m) || !Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) {
    return null;
  }
  const pct = Math.min(100, Math.max(0, ((m - lo) / (hi - lo)) * 100));
  let level = 'high';
  let tone = 'success';
  if (pct < 40) {
    level = 'low';
    tone = 'danger';
  } else if (pct < 65) {
    level = 'mid';
    tone = 'warning';
  }
  return { pct: Math.round(pct), level, tone };
}

/**
 * Chronological trend points for SVG (oldest → newest). Pure / UI-safe.
 * @returns {{ points: Array<{ surveyId: number, title: string, mean: number, x: number, y: number, level: string|null }>, path: string|null, areaPath: string|null, w: number, h: number, pad: object } | null}
 */
export function buildClimateTrendChart(surveys, {
  scaleMin = 1,
  scaleMax = 5,
  width = 320,
  height = 96,
} = {}) {
  const pad = { top: 12, right: 12, bottom: 28, left: 28 };
  const rows = (Array.isArray(surveys) ? surveys : [])
    .filter((s) => s && s.overallMean != null && Number.isFinite(Number(s.overallMean)))
    .map((s) => ({
      surveyId: Number(s.surveyId),
      title: String(s.title || '').trim() || '—',
      mean: Number(s.overallMean),
      at: climateSurveyAnchorDate(s),
      updatedAt: s.updatedAt || null,
    }));
  // API returns newest first — chart wants oldest → newest
  rows.reverse();
  if (rows.length < 2) return null;

  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const span = Math.max(1e-6, scaleMax - scaleMin);
  const n = rows.length;
  const points = rows.map((r, i) => {
    const x = pad.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = pad.top + (1 - (r.mean - scaleMin) / span) * innerH;
    const level = climateMeanLevel(r.mean, scaleMin, scaleMax);
    return { ...r, x, y, level: level?.level || null, tone: level?.tone || null };
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const baselineY = pad.top + innerH;
  const areaPath = `${path} L${points[points.length - 1].x.toFixed(1)},${baselineY} L${points[0].x.toFixed(1)},${baselineY} Z`;
  return {
    points,
    path,
    areaPath,
    w: width,
    h: height,
    pad,
    scaleMin,
    scaleMax,
    innerH,
    guides: [2, 3, 4].filter((g) => g > scaleMin && g < scaleMax).map((g) => ({
      value: g,
      y: pad.top + (1 - (g - scaleMin) / span) * innerH,
    })),
  };
}
