/**
 * Nome para listagens do dashboard: prioriza o nome completo e, se longo demais,
 * mostra primeiro + segundo nome (ou inicial do segundo).
 */
export function personListName(name, maxLen = 40) {
  const trimmed = String(name ?? '').trim().replace(/\s+/g, ' ');
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
