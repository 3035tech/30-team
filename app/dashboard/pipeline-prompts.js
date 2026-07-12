'use client';

import { REJECTION_REASONS, REJECTION_REASON_SET, normalizeStartDate } from '../../lib/pipeline';
import { t } from '../../lib/i18n';

/** Pede motivo de rejeição ou data de início conforme o estágio. Retorna payload extra ou null se cancelado. */
export function promptPipelineExtras(locale, stage) {
  if (stage === 'rejected') {
    const raw = window.prompt(t(locale, 'recruiting.rejectReasonPrompt'), 'profile_fit');
    if (raw == null) return null;
    const code = String(raw).trim().toLowerCase();
    if (!REJECTION_REASON_SET.has(code)) {
      window.alert(t(locale, 'recruiting.rejectReasonRequired'));
      return null;
    }
    return { rejectionReason: code };
  }
  if (stage === 'hired') {
    const today = new Date().toISOString().slice(0, 10);
    const raw = window.prompt(t(locale, 'recruiting.hireStartDatePrompt'), today);
    if (raw == null) return null;
    const startDate = normalizeStartDate(raw);
    if (!startDate) {
      window.alert(t(locale, 'recruiting.hireStartDateRequired'));
      return null;
    }
    return { startDate };
  }
  return {};
}

export function rejectionReasonLabel(locale, code) {
  if (!code) return null;
  const map = {
    salary: 'recruiting.rejectSalary',
    profile_fit: 'recruiting.rejectProfileFit',
    experience: 'recruiting.rejectExperience',
    culture: 'recruiting.rejectCulture',
    timing: 'recruiting.rejectTiming',
    competition: 'recruiting.rejectCompetition',
    no_show: 'recruiting.rejectNoShow',
    withdrew: 'recruiting.rejectWithdrew',
    other: 'recruiting.rejectOther',
  };
  return t(locale, map[code] || 'recruiting.rejectOther');
}

export { REJECTION_REASONS };
