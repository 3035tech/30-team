/**
 * Pre-onboarding template constants (client-safe: no DB).
 * SQL lives in pre-onboarding-template.js.
 */

export const PRE_ONBOARDING_OWNER_ROLES = Object.freeze([
  'rh',
  'manager',
  'it',
  'security',
  'employee',
]);

export const DEFAULT_PRE_ONBOARDING_TEMPLATE = Object.freeze([
  {
    itemKey: 'welcome_kit',
    labelPt: 'Kit de boas-vindas',
    labelEn: 'Welcome kit',
    ownerRole: 'rh',
    sortOrder: 10,
    dueOffsetDays: 0,
    requireMeet: false,
  },
  {
    itemKey: 'access_sheet',
    labelPt: 'Acessos e ferramentas',
    labelEn: 'Access and tools',
    ownerRole: 'it',
    sortOrder: 20,
    dueOffsetDays: 0,
    requireMeet: false,
  },
  {
    itemKey: 'rh_onboarding_call',
    labelPt: 'Conversa de onboarding RH',
    labelEn: 'HR onboarding call',
    ownerRole: 'rh',
    sortOrder: 30,
    dueOffsetDays: 0,
    requireMeet: true,
  },
  {
    itemKey: 'manager_onboarding',
    labelPt: 'Onboarding com o gestor',
    labelEn: 'Manager onboarding',
    ownerRole: 'manager',
    sortOrder: 40,
    dueOffsetDays: 0,
    requireMeet: true,
  },
]);
