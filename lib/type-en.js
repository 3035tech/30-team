import { TYPE_DATA } from './data';
import { getTypeData } from './i18n-data';
import { normalizeLocale } from './i18n';

/** English display labels for Enneagram types T1–T9 (TYPE_DATA stays PT for the public test). */
export const TYPE_EN = {
  1: { short: 'Perfectionist', name: 'The Perfectionist' },
  2: { short: 'Helper', name: 'The Helper' },
  3: { short: 'Achiever', name: 'The Achiever' },
  4: { short: 'Individualist', name: 'The Individualist' },
  5: { short: 'Investigator', name: 'The Investigator' },
  6: { short: 'Loyalist', name: 'The Loyalist' },
  7: { short: 'Enthusiast', name: 'The Enthusiast' },
  8: { short: 'Challenger', name: 'The Challenger' },
  9: { short: 'Peacemaker', name: 'The Peacemaker' },
};

export function typeShortLabel(typeNum, locale) {
  const d = TYPE_DATA[typeNum];
  if (!d) return `T${typeNum}`;
  const useEn = normalizeLocale(locale) === 'en';
  const en = TYPE_EN[typeNum];
  return useEn ? (en?.short ?? d.short) : d.short;
}

export function typeFullName(typeNum, locale) {
  const d = TYPE_DATA[typeNum];
  if (!d) return `T${typeNum}`;
  const useEn = normalizeLocale(locale) === 'en';
  const en = TYPE_EN[typeNum];
  return useEn ? (en?.name ?? d.name) : d.name;
}

/**
 * Native tooltip / aria-label for T1–T9 references (managers + public).
 * Uses localized TYPE_DATA desc + team context.
 */
export function typeHintTooltip(typeNum, locale = 'pt-BR') {
  const n = Number(typeNum);
  if (!Number.isFinite(n) || n < 1 || n > 9) return typeNum != null ? `T${typeNum}` : '';
  const map = getTypeData(locale);
  const d = map[n];
  const name = typeFullName(n, locale);
  if (!d) return `T${n}`;
  const workLabel = normalizeLocale(locale) === 'en' ? 'At work' : 'No trabalho';
  const bits = [`T${n} · ${name}`];
  if (d.desc) bits.push(d.desc);
  if (d.team) bits.push(`${workLabel}: ${d.team}`);
  return bits.join(' — ');
}

/** @deprecated prefer typeHintTooltip */
export function typeTitleTooltip(typeNum, locale) {
  return typeHintTooltip(typeNum, locale);
}
