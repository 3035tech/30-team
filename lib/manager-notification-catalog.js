/**
 * Catálogo de tipos de notificação (sem I/O).
 * Seguro para UI cliente e para o fan-out em lib/manager-notifications.js.
 */

export const NOTIF = {
  ENNEAGRAM_COMPLETED: 'enneagram_completed',
  MOTIVATORS_COMPLETED: 'motivators_completed',
  RETENTION_WATCH: 'retention_watch',
  HIRE_ONBOARDING_KIT: 'hire_onboarding_kit',
  VACANCY_DEADLINE_APPROACHING: 'vacancy_deadline_approaching',
  VACANCY_CLOSED: 'vacancy_closed',
};

export const NOTIF_TYPES = new Set(Object.values(NOTIF));

/** @deprecated */
export const NOTIF_ENNEAGRAM = NOTIF.ENNEAGRAM_COMPLETED;
/** @deprecated */
export const NOTIF_MOTIVATORS = NOTIF.MOTIVATORS_COMPLETED;

/**
 * @param {string} type
 * @param {Record<string, unknown>} payload
 */
export function notificationHref(type, payload = {}) {
  if (type === NOTIF.MOTIVATORS_COMPLETED && payload.attemptId) {
    return `/dashboard?tab=motivators&motivatorsView=results&attempt=${encodeURIComponent(payload.attemptId)}`;
  }
  if (
    (type === NOTIF.ENNEAGRAM_COMPLETED
      || type === NOTIF.RETENTION_WATCH
      || type === NOTIF.HIRE_ONBOARDING_KIT)
    && payload.candidateId
  ) {
    return `/dashboard?tab=team&candidate=${encodeURIComponent(payload.candidateId)}`;
  }
  if (
    (type === NOTIF.VACANCY_DEADLINE_APPROACHING || type === NOTIF.VACANCY_CLOSED)
    && payload.vacancyId
  ) {
    return `/dashboard?tab=vacancies&vacancyDetail=${encodeURIComponent(payload.vacancyId)}`;
  }
  if (payload.candidateId) {
    return `/dashboard?tab=team&candidate=${encodeURIComponent(payload.candidateId)}`;
  }
  if (payload.vacancyId) {
    return `/dashboard?tab=vacancies&vacancyDetail=${encodeURIComponent(payload.vacancyId)}`;
  }
  return '/dashboard';
}

/**
 * @returns {{
 *   titleKey: string,
 *   bodyKey: string|null,
 *   values: Record<string, string|number>,
 *   category: 'assessment' | 'vacancy_deadline' | 'vacancy_status' | 'retention' | 'generic',
 *   tone: 'neutral' | 'attention' | 'success',
 * }}
 */
export function notificationCopySpec(type, payload = {}) {
  const name = payload.candidateName || null;
  const title = payload.vacancyTitle || null;
  const date = payload.targetDate || null;
  const dims = payload.signalLabels || payload.dims || null;

  switch (type) {
    case NOTIF.ENNEAGRAM_COMPLETED:
      return {
        titleKey: 'dashboard.notifEnneagramTitle',
        bodyKey: payload.topType ? 'dashboard.notifEnneagramBody' : null,
        values: { name: name || '—', type: payload.topType || '' },
        category: 'assessment',
        tone: 'neutral',
      };
    case NOTIF.MOTIVATORS_COMPLETED:
      return {
        titleKey: 'dashboard.notifMotivatorsTitle',
        bodyKey: 'dashboard.notifMotivatorsBody',
        values: { name: name || '—' },
        category: 'assessment',
        tone: 'neutral',
      };
    case NOTIF.RETENTION_WATCH:
      return {
        titleKey: 'dashboard.notifRetentionTitle',
        bodyKey: 'dashboard.notifRetentionBody',
        values: { name: name || '—', dims: dims || '—' },
        category: 'retention',
        tone: 'attention',
      };
    case NOTIF.HIRE_ONBOARDING_KIT:
      return {
        titleKey: 'dashboard.notifHireKitTitle',
        bodyKey: 'dashboard.notifHireKitBody',
        values: {
          name: name || '—',
          title: title || '—',
        },
        category: 'assessment',
        tone: 'success',
      };
    case NOTIF.VACANCY_DEADLINE_APPROACHING:
      return {
        titleKey: 'dashboard.notifVacancyDeadlineTitle',
        bodyKey: 'dashboard.notifVacancyDeadlineBody',
        values: { title: title || '—', date: date || '—' },
        category: 'vacancy_deadline',
        tone: 'attention',
      };
    case NOTIF.VACANCY_CLOSED:
      return {
        titleKey: 'dashboard.notifVacancyClosedTitle',
        bodyKey: 'dashboard.notifVacancyClosedBody',
        values: { title: title || '—' },
        category: 'vacancy_status',
        tone: 'success',
      };
    default:
      return {
        titleKey: 'dashboard.notifGenericTitle',
        bodyKey: null,
        values: {},
        category: 'generic',
        tone: 'neutral',
      };
  }
}

/** Visual meta for inbox UI (icon family + optional urgency tone). */
export function notificationVisual(type, payload = {}) {
  const { category, tone } = notificationCopySpec(type, payload);
  return { category, tone };
}
