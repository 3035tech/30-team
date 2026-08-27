/**
 * Narrativa de complementaridade / tensão de time (B-1902).
 * Empacota forces + attentions do intel comportamental em 3–5 linhas demoáveis.
 * Copy hedged via chaves i18n existentes do BCI — sem novo instrumento.
 */

/**
 * @param {{
 *   forces?: Array<{ id: string }>,
 *   attentions?: Array<{ id: string }>,
 *   meta?: { empty?: boolean, nEneagram?: number, nMotivators?: number, smallSample?: boolean },
 *   topMovers?: Array<{ key: string, label?: string }>,
 * }} intel
 * @returns {{
 *   empty: boolean,
 *   smallSample: boolean,
 *   lines: Array<{ tone: 'force'|'attention'|'neutral', source: 'force'|'attention'|'summary'|'motivator', id: string }>,
 *   ctas: Array<'compat'|'group'|'team'|'climate'>,
 * }}
 */
export function buildTeamTensionNarrative(intel = null) {
  if (!intel || intel.meta?.empty) {
    return {
      empty: true,
      smallSample: false,
      lines: [],
      ctas: ['group', 'team'],
    };
  }

  const forces = Array.isArray(intel.forces) ? intel.forces : [];
  const attentions = Array.isArray(intel.attentions) ? intel.attentions : [];
  const movers = Array.isArray(intel.topMovers) ? intel.topMovers : [];
  const lines = [];

  for (const f of forces.slice(0, 2)) {
    if (!f?.id) continue;
    lines.push({ tone: 'force', source: 'force', id: String(f.id) });
  }
  for (const a of attentions.slice(0, 2)) {
    if (!a?.id) continue;
    lines.push({ tone: 'attention', source: 'attention', id: String(a.id) });
  }

  if (lines.length < 3 && movers[0]?.key) {
    lines.push({
      tone: 'neutral',
      source: 'motivator',
      id: String(movers[0].key),
      label: movers[0].label || movers[0].key,
    });
  }

  if (lines.length === 0) {
    lines.push({ tone: 'neutral', source: 'summary', id: 'sparse' });
  } else if (lines.length < 3) {
    lines.push({ tone: 'neutral', source: 'summary', id: 'balance' });
  }

  const ctas = ['compat', 'group'];
  if (attentions.length > 0) ctas.push('team');
  if (attentions.some((a) => String(a.id || '').includes('climate') || String(a.id || '').includes('retention'))) {
    ctas.push('climate');
  }

  return {
    empty: false,
    smallSample: Boolean(intel.meta?.smallSample || intel.meta?.smallSampleMotivators),
    lines: lines.slice(0, 5),
    ctas: [...new Set(ctas)].slice(0, 4),
    meta: {
      nEneagram: intel.meta?.nEneagram ?? 0,
      nMotivators: intel.meta?.nMotivators ?? 0,
      forceCount: forces.length,
      attentionCount: attentions.length,
    },
  };
}
