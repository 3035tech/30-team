/** Estágios do funil de recrutamento + motivos de rejeição / contratação. */

export const PIPELINE_STAGES = [
  'new',
  'test_completed',
  'screening',
  'interview',
  'approved',
  'hired',
  'rejected',
  'archived',
];

export const PIPELINE_STAGE_SET = new Set(PIPELINE_STAGES);

export const REJECTION_REASONS = [
  'salary',
  'profile_fit',
  'experience',
  'culture',
  'timing',
  'competition',
  'no_show',
  'withdrew',
  'other',
];

export const REJECTION_REASON_SET = new Set(REJECTION_REASONS);

export function normalizeRejectionReason(value) {
  if (value == null || value === '') return null;
  const code = String(value).trim().toLowerCase();
  return REJECTION_REASON_SET.has(code) ? code : null;
}

export function normalizeStartDate(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export function rejectionReasonLabelKey(code) {
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
  return map[code] || 'recruiting.rejectOther';
}
