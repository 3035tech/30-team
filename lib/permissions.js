/**
 * Capability-based access (view / manage) on top of users.role.
 *
 * Etapa 1: defaults by role === current product behavior (hr ≡ direction).
 * Etapa 2: admin APIs use requireCapability / canAccess* (same defaults).
 * Etapa 3: optional per-user whitelist in user_capability_overrides
 *          (payload.capabilitiesCustomized + capabilityOverrides).
 *
 * INVARIANTE — links de assessment já gerados:
 * Capabilities só afetam gestores (`/dashboard`, `/api/admin/*`).
 * Fluxos por token (`/t`, `/v`, `/r`, `/assessment/*`, `/api/public/*`, `/api/ae/*`,
 * POST `/api/results`) NÃO usam CAP — convites e vacancy_links continuam válidos
 * mesmo se o gestor perder vacancies.manage / motivators.view depois.
 * Tirar capability = não criar/gerir novos links no painel; não invalidar tokens existentes.
 */

export const ROLES = Object.freeze(['admin', 'direction', 'hr']);

/** Stable capability keys (code + user_capability_overrides). */
export const CAP = Object.freeze({
  OVERVIEW_VIEW: 'overview.view',
  TEAM_VIEW: 'team.view',
  COMPATIBILITY_VIEW: 'compatibility.view',
  COMPARE_VIEW: 'compare.view',
  GROUP_VIEW: 'group.view',
  LEADERSHIP_VIEW: 'leadership.view',
  VACANCIES_VIEW: 'vacancies.view',
  VACANCIES_MANAGE: 'vacancies.manage',
  MOTIVATORS_VIEW: 'motivators.view',
  MOTIVATORS_CONFIG: 'motivators.config',
  CLIMATE_VIEW: 'climate.view',
  COMPANIES_MANAGE: 'companies.manage',
  USERS_MANAGE: 'users.manage',
  HELP_VIEW: 'help.view',
  PROFILE_SELF: 'profile.self',
});

/** Caps an admin may toggle per user (module views). Not stored: profile.self. */
export const ASSIGNABLE_MODULE_CAPS = Object.freeze([
  CAP.OVERVIEW_VIEW,
  CAP.TEAM_VIEW,
  CAP.COMPATIBILITY_VIEW,
  CAP.COMPARE_VIEW,
  CAP.GROUP_VIEW,
  CAP.LEADERSHIP_VIEW,
  CAP.VACANCIES_VIEW,
  CAP.MOTIVATORS_VIEW,
  CAP.CLIMATE_VIEW,
  CAP.HELP_VIEW,
]);

/** Never grant via override to non-admin. */
export const ADMIN_ONLY_CAPS = Object.freeze([
  CAP.MOTIVATORS_CONFIG,
  CAP.COMPANIES_MANAGE,
  CAP.USERS_MANAGE,
]);

/** Dashboard tab id → required view/manage capability. */
export const TAB_CAPABILITY = Object.freeze({
  overview: CAP.OVERVIEW_VIEW,
  team: CAP.TEAM_VIEW,
  compatibility: CAP.COMPATIBILITY_VIEW,
  compare: CAP.COMPARE_VIEW,
  group: CAP.GROUP_VIEW,
  leadership: CAP.LEADERSHIP_VIEW,
  vacancies: CAP.VACANCIES_VIEW,
  motivators: CAP.MOTIVATORS_VIEW,
  climate: CAP.CLIMATE_VIEW,
  companies: CAP.COMPANIES_MANAGE,
  users: CAP.USERS_MANAGE,
  /** Super-admin only — enforced in canAccessDashboardTab (not CAP alone). */
  leads: CAP.USERS_MANAGE,
  /** B-1000 admin modules — same gate as Users until dedicated CAPs exist. */
  'job-roles': CAP.USERS_MANAGE,
  'performance-reviews': CAP.USERS_MANAGE,
  succession: CAP.USERS_MANAGE,
  'exit-analysis': CAP.USERS_MANAGE,
  'learning-resources': CAP.USERS_MANAGE,
  'company-benefits': CAP.USERS_MANAGE,
  help: CAP.HELP_VIEW,
  profile: CAP.PROFILE_SELF,
});

const ANALYSIS_VIEW = [
  CAP.OVERVIEW_VIEW,
  CAP.TEAM_VIEW,
  CAP.COMPATIBILITY_VIEW,
  CAP.COMPARE_VIEW,
  CAP.GROUP_VIEW,
  CAP.LEADERSHIP_VIEW,
  CAP.HELP_VIEW,
  CAP.PROFILE_SELF,
];

/** Caps that imply cohort / assessment list access (export, rows). */
export const ANALYSIS_DATA_CAPS = Object.freeze([
  CAP.OVERVIEW_VIEW,
  CAP.TEAM_VIEW,
  CAP.COMPATIBILITY_VIEW,
  CAP.COMPARE_VIEW,
  CAP.GROUP_VIEW,
  CAP.LEADERSHIP_VIEW,
]);

const MANAGER_RECRUITING = [
  CAP.VACANCIES_VIEW,
  CAP.VACANCIES_MANAGE,
  CAP.MOTIVATORS_VIEW,
  CAP.CLIMATE_VIEW,
];

/** Role → granted capabilities (immutable defaults). */
export const DEFAULT_CAPABILITIES_BY_ROLE = Object.freeze({
  admin: Object.freeze([
    ...ANALYSIS_VIEW,
    ...MANAGER_RECRUITING,
    CAP.MOTIVATORS_CONFIG,
    CAP.COMPANIES_MANAGE,
    CAP.USERS_MANAGE,
  ]),
  direction: Object.freeze([...ANALYSIS_VIEW, ...MANAGER_RECRUITING]),
  hr: Object.freeze([...ANALYSIS_VIEW, ...MANAGER_RECRUITING]),
});

/** Sidebar “Gestão” — Motivadores fica em Análise (não aqui). */
const MANAGEMENT_CAPS = [
  CAP.VACANCIES_VIEW,
  CAP.CLIMATE_VIEW,
  CAP.COMPANIES_MANAGE,
  CAP.USERS_MANAGE,
];

export function isManagerRole(payloadOrRole) {
  const role = typeof payloadOrRole === 'string' ? payloadOrRole : payloadOrRole?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

export function isAdminRole(payloadOrRole) {
  const role = typeof payloadOrRole === 'string' ? payloadOrRole : payloadOrRole?.role;
  return role === 'admin';
}

/**
 * Platform / super admin: role admin with no home company (cross-tenant).
 * Used for Leads (early access) and other ops that must not appear to tenant-bound admins.
 */
export function isSuperAdminPayload(payload) {
  if (!isAdminRole(payload)) return false;
  const cid = payload?.companyId ?? payload?.company_id;
  return cid == null || cid === '';
}

/** Assignable modules included in role defaults (for UI comparison). */
export function defaultAssignableModulesForRole(role) {
  const defaults = DEFAULT_CAPABILITIES_BY_ROLE[role] || [];
  const assignable = new Set(ASSIGNABLE_MODULE_CAPS);
  return defaults.filter((c) => assignable.has(c) && c !== CAP.VACANCIES_MANAGE);
}

export function modulesMatchRoleDefaults(role, modules) {
  const expected = defaultAssignableModulesForRole(role);
  const got = [...new Set((modules || []).filter((c) => c && c !== CAP.VACANCIES_MANAGE))].sort();
  const exp = [...expected].sort();
  if (got.length !== exp.length) return false;
  return got.every((c, i) => c === exp[i]);
}

/**
 * Resolve granted capabilities for a session payload (or { role }).
 * Uses capabilityOverrides when capabilitiesCustomized === true (etapa 3).
 * @returns {ReadonlySet<string>}
 */
export function resolveCapabilities(payload) {
  const role = payload?.role;
  const defaults = DEFAULT_CAPABILITIES_BY_ROLE[role];
  if (!defaults) return new Set();

  let caps;
  if (payload?.capabilitiesCustomized === true) {
    caps = new Set([CAP.PROFILE_SELF]);
    const overrides = Array.isArray(payload.capabilityOverrides) ? payload.capabilityOverrides : [];
    const assignable = new Set(ASSIGNABLE_MODULE_CAPS);
    for (const o of overrides) {
      if (!o || o.granted === false) continue;
      const c = String(o.capability || '');
      if (assignable.has(c)) caps.add(c);
    }
    if (caps.has(CAP.VACANCIES_VIEW)) caps.add(CAP.VACANCIES_MANAGE);
    if (role === 'admin') {
      for (const c of ADMIN_ONLY_CAPS) caps.add(c);
    }
  } else {
    caps = new Set(defaults);
  }

  if (role !== 'admin') {
    for (const c of ADMIN_ONLY_CAPS) caps.delete(c);
  }

  return caps;
}

/** @param {object | null | undefined} payload @param {string} capability */
export function can(payload, capability) {
  if (!capability) return false;
  return resolveCapabilities(payload).has(capability);
}

/** @param {object | null | undefined} payload @param {readonly string[]} capabilities */
export function canAny(payload, capabilities) {
  if (!capabilities?.length) return false;
  return capabilities.some((c) => can(payload, c));
}

/** @param {object | null | undefined} payload @param {string} tabId */
export function canAccessDashboardTab(payload, tabId) {
  if (tabId === 'leads') return isSuperAdminPayload(payload);
  const need = TAB_CAPABILITY[tabId];
  if (!need) return false;
  return can(payload, need);
}

/** Sidebar “Gestão” section if any management module is allowed. */
export function canSeeManagementSection(payload) {
  return MANAGEMENT_CAPS.some((c) => can(payload, c));
}

/**
 * API helper — true if session has capability.
 * Prefer this over role string checks on admin routes.
 */
export function requireCapability(payload, capability) {
  return can(payload, capability);
}

/** Caps that grant access to a candidate hub record (pipeline + people). */
export const CANDIDATE_ACCESS_CAPS = Object.freeze([
  CAP.TEAM_VIEW,
  CAP.VACANCIES_VIEW,
  CAP.VACANCIES_MANAGE,
]);

/** @param {object | null | undefined} payload @param {readonly string[]} capabilities */
export function requireAnyCapability(payload, capabilities) {
  return canAny(payload, capabilities);
}

/** Pipeline / candidate profile APIs (Equipe or Vagas). */
export function canAccessCandidateRecord(payload) {
  return canAny(payload, CANDIDATE_ACCESS_CAPS);
}

/** Export, assessment-rows, and other cohort list APIs. */
export function canAccessAnalysisData(payload) {
  return canAny(payload, ANALYSIS_DATA_CAPS);
}

/** i18n label key suffix for assignable module (dashboard.* / panel). */
export const ASSIGNABLE_MODULE_I18N = Object.freeze({
  [CAP.OVERVIEW_VIEW]: 'dashboard.overview',
  [CAP.TEAM_VIEW]: 'dashboard.team',
  [CAP.COMPATIBILITY_VIEW]: 'dashboard.compatibility',
  [CAP.COMPARE_VIEW]: 'dashboard.compare',
  [CAP.GROUP_VIEW]: 'dashboard.group',
  [CAP.LEADERSHIP_VIEW]: 'dashboard.leadership',
  [CAP.VACANCIES_VIEW]: 'dashboard.vacancies',
  [CAP.MOTIVATORS_VIEW]: 'dashboard.motivators',
  [CAP.CLIMATE_VIEW]: 'dashboard.climate',
  [CAP.HELP_VIEW]: 'dashboard.help',
});
