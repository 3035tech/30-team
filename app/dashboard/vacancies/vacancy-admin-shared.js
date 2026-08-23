import { t, localeHtmlLang } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { formatSalaryBr } from '../../../lib/br-masks';

export function formatVacancySalaryRange(locale, min, max) {
  const a = min ? formatSalaryBr(min) : '';
  const b = max ? formatSalaryBr(max) : '';
  if (a && b) return t(locale, 'recruiting.salaryRangeDisplay', { min: a, max: b });
  if (a) return t(locale, 'recruiting.salaryFromDisplay', { min: a });
  if (b) return t(locale, 'recruiting.salaryUpToDisplay', { max: b });
  return null;
}

/** Tailwind classes for description assist buttons (template / AI). */
export function descAssistBtnClass(opts = {}) {
  return cn(
    'inline-flex min-h-[36px] items-center justify-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[11px]',
    opts.primary
      ? 'border border-brand-500/35 bg-brand-500/[0.09] text-brand-500'
      : 'border border-ink/12 bg-white text-ink',
    opts.busy ? 'cursor-wait opacity-100' : opts.disabled ? 'cursor-default opacity-55' : 'cursor-pointer'
  );
}

export function inviteStatusLabel(locale, status) {
  const s = String(status || '');
  if (s === 'opened') return t(locale, 'recruiting.inviteOpened');
  if (s === 'completed') return t(locale, 'recruiting.inviteCompleted');
  if (s === 'cancelled') return t(locale, 'recruiting.inviteCancelled');
  return t(locale, 'recruiting.inviteSent');
}

export function formatRelativeAgo(dateLike, locale = 'pt-BR') {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return null;
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return t(locale, 'recruiting.timeJustNow');
  if (min < 60) return t(locale, 'recruiting.timeMinutesAgo', { min });
  if (hr < 48) return t(locale, 'recruiting.timeHoursAgo', { hr });
  if (day < 30) return t(locale, 'recruiting.timeDaysAgo', { day });
  return d.toLocaleDateString(localeHtmlLang(locale), { day: '2-digit', month: '2-digit' });
}

/** Days in current pipeline stage (B-406). */
export function daysInStage(dateLike) {
  if (!dateLike) return null;
  const t0 = new Date(dateLike).getTime();
  if (!Number.isFinite(t0)) return null;
  return Math.max(0, Math.floor((Date.now() - t0) / 86400000));
}

/** Aging tone for open stages: warn ≥7d, danger ≥14d. */
export function stageAgingTone(days, pipelineStage) {
  if (days == null) return null;
  const s = String(pipelineStage || '');
  if (s === 'hired' || s === 'rejected' || s === 'archived') return null;
  if (days >= 14) return 'danger';
  if (days >= 7) return 'warning';
  return null;
}

export function inviteStatusShort(locale, status) {
  const s = String(status || '');
  if (s === 'opened') return t(locale, 'recruiting.inviteOpened');
  if (s === 'completed') return t(locale, 'recruiting.inviteCompleted');
  if (s === 'sent') return t(locale, 'recruiting.inviteSent');
  if (s === 'cancelled') return t(locale, 'recruiting.inviteCancelled');
  return null;
}

export function fitBandLabel(locale, code) {
  if (code === 'high') return t(locale, 'recruiting.fitHigh');
  if (code === 'medium') return t(locale, 'recruiting.fitMedium');
  if (code === 'low') return t(locale, 'recruiting.fitLow');
  return null;
}

export function pipelineStageLabel(locale, code) {
  const map = {
    new: 'recruiting.pipelineNew',
    interview: 'recruiting.pipelineInterview',
    test_completed: 'recruiting.pipelineTestCompleted',
    screening: 'recruiting.pipelineScreening',
    approved: 'recruiting.pipelineApproved',
    hired: 'recruiting.pipelineHired',
    rejected: 'recruiting.pipelineRejected',
    archived: 'recruiting.pipelineArchived',
  };
  return t(locale, map[code] || 'recruiting.pipelineNew');
}

export function toDatetimeLocalValue(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  // datetime-local (horário local do navegador)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
