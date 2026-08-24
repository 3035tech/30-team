/**
 * Keyword buckets for climate free-text answers (no LLM).
 * Hedged themes only — counts + one sample per bucket.
 */

const THEME_KEYS = ['workload', 'recognition', 'clarity', 'belonging'];

const KEYWORDS = {
  workload: [
    'carga',
    'sobrecarga',
    'horas',
    'prazo',
    'prazos',
    'pressa',
    'burnout',
    'exaust',
    'workload',
    'overwork',
    'overloaded',
    'deadline',
    'deadlines',
    'busy',
    'hours',
    'burnout',
  ],
  recognition: [
    'reconhec',
    'valoriz',
    'feedback',
    'elogio',
    'merit',
    'promo',
    'recognition',
    'appreciate',
    'appreciation',
    'praise',
    'valued',
    'acknowledge',
  ],
  clarity: [
    'clareza',
    'claro',
    'confus',
    'direção',
    'direcao',
    'expectativa',
    'objetivo',
    'prioridade',
    'clarity',
    'unclear',
    'confused',
    'direction',
    'expectation',
    'priority',
    'priorities',
    'goals',
  ],
  belonging: [
    'pertenc',
    'inclus',
    'exclu',
    'equipe',
    'time',
    'cultura',
    'acolh',
    'belong',
    'inclusion',
    'excluded',
    'team',
    'culture',
    'welcome',
    'isolation',
    'isolad',
  ],
};

function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * @param {Array<{ answers?: string[] }>|string[]} textByQuestionOrAnswers
 * @param {{ maxThemes?: number }} [opts]
 * @returns {{ themes: Array<{ key: string, count: number, sample: string }> }}
 */
export function extractClimateThemes(textByQuestionOrAnswers, { maxThemes = 4 } = {}) {
  const answers = [];
  if (Array.isArray(textByQuestionOrAnswers)) {
    for (const item of textByQuestionOrAnswers) {
      if (typeof item === 'string') {
        const t = item.trim();
        if (t) answers.push(t);
      } else if (item && Array.isArray(item.answers)) {
        for (const a of item.answers) {
          const t = String(a || '').trim();
          if (t) answers.push(t);
        }
      }
    }
  }

  const tallies = Object.fromEntries(THEME_KEYS.map((k) => [k, { count: 0, sample: '' }]));

  for (const raw of answers) {
    const norm = normalizeText(raw);
    if (!norm) continue;
    for (const key of THEME_KEYS) {
      const hits = KEYWORDS[key].some((kw) => norm.includes(normalizeText(kw)));
      if (!hits) continue;
      tallies[key].count += 1;
      if (!tallies[key].sample) {
        tallies[key].sample = raw.slice(0, 180);
      }
    }
  }

  const themes = THEME_KEYS.map((key) => ({
    key,
    count: tallies[key].count,
    sample: tallies[key].sample,
  }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, Math.max(1, Math.min(4, Number(maxThemes) || 4)));

  return { themes };
}

export const CLIMATE_THEME_KEYS = THEME_KEYS;
