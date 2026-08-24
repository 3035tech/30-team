/**
 * Hedged Overview type-mix composition (B-410) — pure, no DB.
 */

function dominantFromTypeCount(typeCount) {
  let best = null;
  let bestN = 0;
  for (const [k, v] of Object.entries(typeCount || {})) {
    const n = Number(v) || 0;
    if (n > bestN) {
      bestN = n;
      best = parseInt(k, 10);
    }
  }
  return bestN > 0 && best >= 1 && best <= 9 ? best : null;
}

/**
 * @returns {{ kind: 'empty'|'balanced'|'concentrated'|'gap', missingTypes: number[], dominantType: number|null, pct: number }}
 */
export function buildTypeMixCompositionAdvice(typeCount = {}) {
  const counts = {};
  let total = 0;
  for (let t = 1; t <= 9; t += 1) {
    const n = Number(typeCount[t] ?? typeCount[String(t)] ?? 0) || 0;
    counts[t] = n;
    total += n;
  }
  if (total <= 0) {
    return { kind: 'empty', missingTypes: [1, 2, 3, 4, 5, 6, 7, 8, 9], dominantType: null, pct: 0 };
  }
  const dominantType = dominantFromTypeCount(counts);
  const dominantN = dominantType ? counts[dominantType] : 0;
  const pct = Math.round((dominantN / total) * 100);
  const missingTypes = [];
  for (let t = 1; t <= 9; t += 1) {
    if (counts[t] === 0) missingTypes.push(t);
  }
  if (pct >= 45 && dominantType) {
    return { kind: 'concentrated', missingTypes, dominantType, pct };
  }
  if (missingTypes.length >= 4) {
    return { kind: 'gap', missingTypes: missingTypes.slice(0, 5), dominantType, pct };
  }
  return { kind: 'balanced', missingTypes, dominantType, pct };
}

/**
 * Internal Δ: compare two type-count windows (e.g. last 90d vs prior 90d).
 * @returns {{ available: boolean, recentDominant?: number|null, priorDominant?: number|null, recentPct?: number, priorPct?: number, pctDelta?: number, dominantChanged?: boolean }}
 */
export function buildTypeMixWindowDelta(recentCount = {}, priorCount = {}) {
  const recent = buildTypeMixCompositionAdvice(recentCount);
  const prior = buildTypeMixCompositionAdvice(priorCount);
  if (recent.kind === 'empty' || prior.kind === 'empty') {
    return { available: false };
  }
  return {
    available: true,
    recentDominant: recent.dominantType,
    priorDominant: prior.dominantType,
    recentPct: recent.pct,
    priorPct: prior.pct,
    pctDelta: Math.round((recent.pct || 0) - (prior.pct || 0)),
    dominantChanged: recent.dominantType !== prior.dominantType,
  };
}

export { dominantFromTypeCount };
