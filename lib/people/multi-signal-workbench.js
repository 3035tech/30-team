/**
 * Workbench leve multi-sinal (B-1903) — padrões hedged a partir de sinais já no Overview.
 * Não é BI genérico: 4–6 padrões + CTAs.
 */

/**
 * @param {{
 *   climate?: { latestMean?: number|null, deltaVsPrevious?: number|null, openSurveys?: number }|null,
 *   pdi?: { overdueItemCount?: number, overduePlanCount?: number, noPlanEmployeeCount?: number, activePlanCount?: number }|null,
 *   retentionCount?: number,
 *   intel?: { attentions?: Array<{ id: string }>, forces?: Array<{ id: string }>, meta?: object }|null,
 *   hr?: { avgScore?: number, total?: number, lowScoreCount?: number }|null,
 *   turnover?: { highCount?: number, mediumCount?: number }|null,
 * }} input
 * @returns {{
 *   empty: boolean,
 *   patterns: Array<{ id: string, severity: 'info'|'watch'|'alert', signals: string[] }>,
 *   ctas: Array<'team'|'climate'|'performance'|'overview'|'compat'>,
 * }}
 */
export function buildMultiSignalWorkbench(input = {}) {
  const climate = input.climate && typeof input.climate === 'object' ? input.climate : null;
  const pdi = input.pdi && typeof input.pdi === 'object' ? input.pdi : null;
  const intel = input.intel && typeof input.intel === 'object' ? input.intel : null;
  const hr = input.hr && typeof input.hr === 'object' ? input.hr : null;
  const turnover = input.turnover && typeof input.turnover === 'object' ? input.turnover : null;
  const retentionCount = Math.max(0, Number(input.retentionCount) || 0);

  const patterns = [];
  const push = (id, severity, signals) => {
    if (patterns.some((p) => p.id === id)) return;
    patterns.push({ id, severity, signals: signals.slice(0, 4) });
  };

  const mean = climate?.latestMean != null ? Number(climate.latestMean) : null;
  const delta = climate?.deltaVsPrevious != null ? Number(climate.deltaVsPrevious) : null;
  if (mean != null && Number.isFinite(mean) && mean < 3.2) {
    push('climate_low', 'alert', ['climate', 'profile']);
  } else if (delta != null && Number.isFinite(delta) && delta <= -0.25) {
    push('climate_drop', 'watch', ['climate']);
  } else if ((Number(climate?.openSurveys) || 0) > 0) {
    push('climate_open', 'info', ['climate']);
  }

  const overdue =
    (Number(pdi?.overdueItemCount) || 0) + (Number(pdi?.overduePlanCount) || 0);
  if (overdue > 0) {
    push('pdi_overdue', 'watch', ['performance', 'profile']);
  }
  if ((Number(pdi?.noPlanEmployeeCount) || 0) > 0) {
    push('pdi_gaps', 'info', ['performance']);
  }

  if (retentionCount > 0) {
    push('retention_watch', 'alert', ['motivators', 'profile']);
  }

  const attentions = Array.isArray(intel?.attentions) ? intel.attentions : [];
  if (attentions.length >= 2) {
    push('team_tension', 'watch', ['profile', 'leadership']);
  } else if ((Array.isArray(intel?.forces) ? intel.forces : []).length >= 2) {
    push('team_strength', 'info', ['profile']);
  }

  const highTo = Number(turnover?.highCount) || 0;
  const medTo = Number(turnover?.mediumCount) || 0;
  if (highTo > 0) {
    push('turnover_high', 'alert', ['climate', 'motivators', 'performance']);
  } else if (medTo > 0) {
    push('turnover_medium', 'watch', ['climate', 'motivators']);
  }

  const avg = hr?.avgScore != null ? Number(hr.avgScore) : null;
  if (avg != null && Number.isFinite(avg) && avg > 0 && avg < 55) {
    push('hr_score_soft', 'watch', ['performance', 'profile']);
  }

  if (patterns.length === 0) {
    if (intel && !intel.meta?.empty) {
      push('stable_read', 'info', ['profile']);
    } else {
      return {
        empty: true,
        patterns: [],
        ctas: ['team', 'climate'],
      };
    }
  }

  const ctas = [];
  for (const p of patterns) {
    if (p.signals.includes('climate')) ctas.push('climate');
    if (p.signals.includes('performance')) ctas.push('performance');
    if (p.signals.includes('profile') || p.signals.includes('leadership')) ctas.push('team');
    if (p.id.startsWith('team_')) ctas.push('compat');
  }
  ctas.push('overview');

  return {
    empty: false,
    patterns: patterns.slice(0, 6),
    ctas: [...new Set(ctas.filter((c) => c !== 'analytics'))].slice(0, 5),
  };
}
