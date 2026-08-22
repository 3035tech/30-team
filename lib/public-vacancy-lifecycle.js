/**
 * Helpers puros da página pública (sem DB) — seguros para client components.
 */

import { normalizeLocale } from './i18n.js';

/** YYYY-MM-DD from Date or string (DATE column). */
export function toVacancyDateYmd(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

/**
 * target_date já passou (dia civil). Sem data → não expirada.
 * @param {unknown} targetDate
 * @param {Date} [now]
 */
export function isVacancyTargetDatePast(targetDate, now = new Date()) {
  const day = toVacancyDateYmd(targetDate);
  if (!day) return false;
  const today = toVacancyDateYmd(now);
  if (!today) return false;
  return day < today;
}

/** Status closed OU prazo (target_date) vencido — experiência de “encerrada”. */
export function publicVacancyShowsClosedExperience(posting, now = new Date()) {
  if (!posting) return true;
  if (String(posting.status || '') !== 'open') return true;
  return isVacancyTargetDatePast(posting.targetDate, now);
}

/** Candidatura pública: aberta, prazo ok e link /v ativo. */
export function publicVacancyCanApply(posting, now = new Date()) {
  return (
    !publicVacancyShowsClosedExperience(posting, now) &&
    Boolean(posting?.applyPath || posting?.applyUrl)
  );
}

/**
 * Title de documento: `{Título} | {Empresa}` (sem local no schema).
 * Encerrada: `{Título} — vaga encerrada`.
 */
export function postingDocumentTitle(posting, locale = 'pt-BR') {
  const en = normalizeLocale(locale) === 'en';
  const title = String(posting?.title || (en ? 'Open role' : 'Vaga aberta')).trim();
  if (publicVacancyShowsClosedExperience(posting)) {
    return en ? `${title} — role closed` : `${title} — vaga encerrada`;
  }
  const company =
    posting?.showCompany && posting?.company?.name
      ? String(posting.company.name).trim()
      : '';
  if (company) return `${title} | ${company}`;
  return title;
}

/** Data curta para chips da página pública. */
export function formatPublicVacancyDate(value, locale = 'pt-BR') {
  const ymd = toVacancyDateYmd(value);
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map((n) => Number(n));
  if (!y || !m || !d) return '';
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  try {
    return new Intl.DateTimeFormat(normalizeLocale(locale) === 'en' ? 'en-US' : 'pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(dt);
  } catch {
    return ymd;
  }
}

/** Motivo da experiência encerrada: closed | expired | null. */
export function publicVacancyClosedReason(posting, now = new Date()) {
  if (!posting) return 'closed';
  if (String(posting.status || '') !== 'open') return 'closed';
  if (isVacancyTargetDatePast(posting.targetDate, now)) return 'expired';
  return null;
}
