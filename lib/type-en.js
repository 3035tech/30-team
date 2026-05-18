import { TYPE_DATA } from './data';
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

export function typeTitleTooltip(typeNum, locale) {
  const name = typeFullName(typeNum, locale);
  const d = TYPE_DATA[typeNum];
  if (!d) return `T${typeNum}`;
  return `${name} (T${typeNum})`;
}
