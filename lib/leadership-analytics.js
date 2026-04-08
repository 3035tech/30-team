import { computeAreaScore010 } from './area-fit.js';

function toNum(x) {
  const n = typeof x === 'number' ? x : parseFloat(x);
  return Number.isFinite(n) ? n : 0;
}

/** @param {Record<number, number>} countsByType */
export function normalizeTypeShares(countsByType) {
  let total = 0;
  for (let t = 1; t <= 9; t++) total += countsByType[t] || 0;
  if (!total) return {};
  const out = {};
  for (let t = 1; t <= 9; t++) out[t] = (countsByType[t] || 0) / total;
  return out;
}

/** Shannon entropy normalized to 0..1 (max = log(9) for 9 types). */
export function cognitiveDiversity01(countsByType) {
  const p = normalizeTypeShares(countsByType);
  let h = 0;
  for (let t = 1; t <= 9; t++) {
    const pi = p[t] || 0;
    if (pi > 0) h -= pi * Math.log(pi);
  }
  const maxH = Math.log(9);
  return maxH > 0 ? Math.min(1, h / maxH) : 0;
}

/**
 * @param {Array<{ scores: object, areaKey: string }>} rows
 * @param {Record<string, object>} rubricByAreaKey
 */
export function averageFit010ForRows(rows, rubricByAreaKey) {
  const vals = [];
  for (const r of rows) {
    const w = rubricByAreaKey[r.areaKey] || {};
    const { score010 } = computeAreaScore010(r.scores, w);
    if (score010 != null) vals.push(score010);
  }
  if (!vals.length) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg * 10) / 10;
}

/**
 * @param {Array<{ areaKey: string, areaLabel: string, topType: number, cnt: number }>} distRows
 * @param {Array<{ key: string, label: string }>} areasList
 * @param {Record<string, Array<{ scores: object }>>} [scoresRowsByKey]
 * @param {Record<string, object>} [rubricByAreaKey]
 */
export function buildAreaSummaries(distRows, areasList, scoresRowsByKey = null, rubricByAreaKey = null) {
  const byKey = {};
  for (const a of areasList) {
    byKey[a.key] = {
      areaKey: a.key,
      areaLabel: a.label,
      topTypeCounts: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, 0])),
      n: 0,
    };
  }
  for (const row of distRows) {
    const k = byKey[row.areaKey];
    if (!k) continue;
    k.topTypeCounts[row.topType] = row.cnt;
    k.n += row.cnt;
  }
  const out = [];
  for (const k of Object.values(byKey)) {
    if (k.n === 0) continue;
    let dominantType = null;
    let maxC = 0;
    for (let t = 1; t <= 9; t++) {
      const c = k.topTypeCounts[t] || 0;
      if (c > maxC) {
        maxC = c;
        dominantType = t;
      }
    }
    const rows = (scoresRowsByKey && scoresRowsByKey[k.areaKey]) || [];
    const avgFit010 =
      rubricByAreaKey && rows.length
        ? averageFit010ForRows(
            rows.map((r) => ({ scores: r.scores, areaKey: k.areaKey })),
            rubricByAreaKey
          )
        : null;
    out.push({
      ...k,
      dominantType,
      diversity01: cognitiveDiversity01(k.topTypeCounts),
      avgFit010,
    });
  }
  out.sort((a, b) => b.n - a.n);
  return out;
}

/**
 * Share of assessments whose top type is among the highest-weighted rubric types.
 * @param {Record<number, number>} topTypeCounts
 * @param {object} weights
 */
export function rubricAlignmentShare(topTypeCounts, weights) {
  const w = weights && Object.keys(weights).length ? weights : null;
  if (!w) return null;
  let n = 0;
  for (let t = 1; t <= 9; t++) n += topTypeCounts[t] || 0;
  if (!n) return null;
  let maxW = 0;
  for (let t = 1; t <= 9; t++) maxW = Math.max(maxW, toNum(w[String(t)] ?? w[t] ?? 0));
  if (maxW <= 0) return null;
  const aligned = [];
  for (let t = 1; t <= 9; t++) {
    if (toNum(w[String(t)] ?? w[t] ?? 0) >= maxW * 0.92) aligned.push(t);
  }
  if (!aligned.length) return null;
  let c = 0;
  for (const t of aligned) c += topTypeCounts[t] || 0;
  return Math.round((c / n) * 1000) / 10;
}

/** Global top-type counts from dist rows */
export function globalTopTypeCounts(distRows) {
  const topTypeCounts = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, 0]));
  for (const row of distRows) {
    topTypeCounts[row.topType] = (topTypeCounts[row.topType] || 0) + row.cnt;
  }
  return topTypeCounts;
}
