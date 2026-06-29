/** Normaliza IDs bigint do Postgres para chave de Map / comparação estável. */
export function aeId(value) {
  if (value == null || value === '') return '';
  return String(value);
}
