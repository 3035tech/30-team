// Presentation only. IDs retain the existing server classification.
export const NINE_BOX_DISPLAY_ROWS = Object.freeze([
  Object.freeze([3, 6, 9]), Object.freeze([2, 5, 8]), Object.freeze([1, 4, 7]),
]);

export function nineBoxCellDescription(id, locale = 'pt-BR') {
  const index = Number(id) - 1;
  if (!Number.isInteger(index) || index < 0 || index > 8) return '';
  const en = locale.startsWith('en');
  const performance = Math.floor(index / 3), potential = index % 3;
  const levels = en ? ['Low', 'Medium', 'High'] : ['Baixo', 'Médio', 'Alto'];
  return en ? `${levels[performance]} performance / ${levels[potential].toLowerCase()} potential`
    : `${levels[performance]} desempenho / ${levels[potential].toLowerCase()} potencial`;
}
