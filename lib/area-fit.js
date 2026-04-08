function toNum(x) {
  const n = typeof x === 'number' ? x : parseFloat(x);
  return Number.isFinite(n) ? n : 0;
}

export function computeAreaScore010(scores, desiredTypeWeights) {
  const w = desiredTypeWeights && Object.keys(desiredTypeWeights).length ? desiredTypeWeights : null;
  if (!w) return { score010: null, label: null };

  let maxScore = 0;
  for (let t = 1; t <= 9; t++) {
    const v = toNum(scores?.[t] ?? scores?.[String(t)] ?? 0);
    if (v > maxScore) maxScore = v;
  }
  if (!maxScore) return { score010: null, label: null };

  let sum = 0;
  let wsum = 0;
  for (let t = 1; t <= 9; t++) {
    const wt = toNum(w[String(t)] ?? w[t] ?? 0);
    if (wt <= 0) continue;
    const v = toNum(scores?.[t] ?? scores?.[String(t)] ?? 0);
    const nv = v / maxScore; // 0..1 relative to candidate profile
    sum += wt * nv;
    wsum += wt;
  }
  if (!wsum) return { score010: null, label: null };

  const raw = (sum / wsum) * 10;
  const score010 = Math.max(0, Math.min(10, Math.round(raw * 10) / 10)); // 1 decimal
  const label = score010 >= 7.5 ? 'Alto' : score010 >= 5 ? 'Médio' : 'Baixo';
  return { score010, label };
}

