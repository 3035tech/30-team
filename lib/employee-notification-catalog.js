/**
 * Collaborator notification catalog (in-app /colaborador).
 * Separate from manager NOTIF — hrefs point to /colaborador, not /dashboard.
 */

export const EMPLOYEE_NOTIF = Object.freeze({
  LMS_ENROLLED: 'lms_enrolled',
  LMS_OVERDUE: 'lms_overdue',
  MOTIVATORS_INVITE: 'motivators_invite',
  PDI_UPDATED: 'pdi_updated',
  ACCESS_INVITED: 'access_invited',
  GENERIC: 'generic',
});

export const EMPLOYEE_NOTIF_TYPES = new Set(Object.values(EMPLOYEE_NOTIF));

/**
 * @returns {{ titleKey: string, bodyKey: string, values: object }}
 */
export function employeeNotificationCopySpec(type, payload = {}) {
  const p = payload || {};
  switch (type) {
    case EMPLOYEE_NOTIF.LMS_ENROLLED:
      return {
        titleKey: 'employeeHome.notifLmsEnrolledTitle',
        bodyKey: 'employeeHome.notifLmsEnrolledBody',
        values: { title: p.courseTitle || '—' },
      };
    case EMPLOYEE_NOTIF.LMS_OVERDUE:
      return {
        titleKey: 'employeeHome.notifLmsOverdueTitle',
        bodyKey: 'employeeHome.notifLmsOverdueBody',
        values: { title: p.courseTitle || '—', date: p.dueDate || '—' },
      };
    case EMPLOYEE_NOTIF.MOTIVATORS_INVITE:
      return {
        titleKey: 'employeeHome.notifMotivatorsTitle',
        bodyKey: 'employeeHome.notifMotivatorsBody',
        values: {},
      };
    case EMPLOYEE_NOTIF.PDI_UPDATED:
      return {
        titleKey: 'employeeHome.notifPdiTitle',
        bodyKey: 'employeeHome.notifPdiBody',
        values: { title: p.planTitle || p.itemTitle || '—' },
      };
    case EMPLOYEE_NOTIF.ACCESS_INVITED:
      return {
        titleKey: 'employeeHome.notifAccessTitle',
        bodyKey: 'employeeHome.notifAccessBody',
        values: {},
      };
    default:
      return {
        titleKey: 'employeeHome.notifGenericTitle',
        bodyKey: 'employeeHome.notifGenericBody',
        values: { message: p.message || '—' },
      };
  }
}

export function employeeNotificationHref(type) {
  if (type === EMPLOYEE_NOTIF.LMS_ENROLLED || type === EMPLOYEE_NOTIF.LMS_OVERDUE) {
    return '/colaborador#lms';
  }
  if (type === EMPLOYEE_NOTIF.PDI_UPDATED) return '/colaborador#pdi';
  if (type === EMPLOYEE_NOTIF.MOTIVATORS_INVITE) return '/colaborador';
  return '/colaborador';
}
