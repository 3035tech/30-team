/** Normaliza IDs bigint do Postgres para chave de Map / comparação estável. */
export function aeId(value) {
  if (value == null || value === '') return '';
  return String(value);
}

/** Aceita bigint[] do node-pg ou literal string `{1,2,3}`. */
export function normalizePgBigintArray(value) {
  if (Array.isArray(value)) return value.map(aeId).filter(Boolean);
  if (typeof value === 'string') {
    const inner = value.replace(/^\{|\}$/g, '').trim();
    if (!inner) return [];
    return inner.split(',').map((s) => aeId(s.trim())).filter(Boolean);
  }
  return [];
}

/** Identificador da versão do motor de scoring (confirma deploy). */
export const AE_SCORING_ENGINE_VERSION = 'ae-scoring-v2';
