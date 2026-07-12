/**
 * Nome para listagens do dashboard: prioriza o nome completo e, se longo demais,
 * mostra primeiro + segundo nome (ou inicial do segundo).
 */
export function titleCasePersonName(name) {
  const trimmed = String(name ?? '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return trimmed
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((part) => {
          if (!part) return part;
          return part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1).toLocaleLowerCase('pt-BR');
        })
        .join('-')
    )
    .join(' ');
}

export function personListName(name, maxLen = 40) {
  const trimmed = titleCasePersonName(name);
  if (!trimmed) return '';
  if (trimmed.length <= maxLen) return trimmed;

  const parts = trimmed.split(' ');
  if (parts.length >= 2) {
    const firstTwo = `${parts[0]} ${parts[1]}`;
    if (firstTwo.length <= maxLen) return firstTwo;
    const abbreviated = `${parts[0]} ${parts[1].charAt(0)}.`;
    if (abbreviated.length <= maxLen) return abbreviated;
  }

  return `${trimmed.slice(0, maxLen - 1)}…`;
}

export function personSortKey(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}
