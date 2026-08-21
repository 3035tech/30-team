/**
 * DB load/save for user_capability_overrides (etapa 3).
 * Public assessment links are unaffected — see lib/permissions.js invariant.
 */

import { verifyToken } from './auth';
import { query, queryRead } from './db';
import {
  ASSIGNABLE_MODULE_CAPS,
  CAP,
  defaultAssignableModulesForRole,
  modulesMatchRoleDefaults,
} from './permissions';

/** Verify JWT then attach per-user capability overrides. */
export async function verifySessionWithCapabilities(token) {
  const payload = token ? verifyToken(token) : null;
  return attachCapabilityOverrides(payload);
}

/**
 * @param {number|string} userId
 * @returns {Promise<Array<{ capability: string, granted: boolean }>>}
 */
export async function loadUserCapabilityOverrides(userId) {
  if (userId == null || userId === '') return [];
  try {
    const r = await queryRead(
      `SELECT capability, granted
       FROM user_capability_overrides
       WHERE user_id = $1
       ORDER BY capability`,
      [userId]
    );
    return r.rows.map((row) => ({
      capability: String(row.capability),
      granted: row.granted !== false,
    }));
  } catch (err) {
    // Table may be missing before migration 026
    if (err?.code === '42P01') return [];
    throw err;
  }
}

/**
 * Attach override state onto a JWT/session payload for resolveCapabilities().
 * @param {object | null | undefined} payload
 */
export async function attachCapabilityOverrides(payload) {
  if (!payload?.userId) return payload || null;
  const overrides = await loadUserCapabilityOverrides(payload.userId);
  return {
    ...payload,
    capabilitiesCustomized: overrides.length > 0,
    capabilityOverrides: overrides,
  };
}

/**
 * Replace module whitelist for a user.
 * Passing modules that match role defaults clears overrides (back to role).
 * Always keeps profile.self via resolve — not stored.
 * vacancies.view implies vacancies.manage at resolve time (not both required in list).
 *
 * @param {number} userId
 * @param {string} role
 * @param {string[] | null | undefined} modules — assignable cap keys; null/undefined = clear to defaults
 */
export async function replaceUserModuleCapabilities(userId, role, modules) {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) throw new Error('INVALID_USER');

  await query(`DELETE FROM user_capability_overrides WHERE user_id = $1`, [uid]);

  if (modules == null) return { customized: false, modules: defaultAssignableModulesForRole(role) };

  const allowed = new Set(ASSIGNABLE_MODULE_CAPS);
  const selected = [];
  for (const raw of modules) {
    const c = String(raw || '').trim();
    if (!c || !allowed.has(c)) continue;
    if (c === CAP.VACANCIES_MANAGE) continue; // implied by VIEW
    if (!selected.includes(c)) selected.push(c);
  }

  if (modulesMatchRoleDefaults(role, selected)) {
    return { customized: false, modules: defaultAssignableModulesForRole(role) };
  }

  for (const capability of selected) {
    await query(
      `INSERT INTO user_capability_overrides (user_id, capability, granted)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (user_id, capability) DO UPDATE SET granted = EXCLUDED.granted`,
      [uid, capability]
    );
  }

  return { customized: true, modules: selected };
}

/**
 * Effective assignable modules for admin UI (checkboxes).
 */
export function effectiveAssignableModules(payloadOrRole, overridesState) {
  const role = typeof payloadOrRole === 'string' ? payloadOrRole : payloadOrRole?.role;
  const customized =
    typeof payloadOrRole === 'object' && payloadOrRole?.capabilitiesCustomized === true
      ? true
      : Boolean(overridesState?.customized);
  const overrides =
    (typeof payloadOrRole === 'object' && payloadOrRole?.capabilityOverrides) ||
    overridesState?.overrides ||
    [];

  if (!customized) return defaultAssignableModulesForRole(role);

  const set = new Set();
  for (const o of overrides) {
    if (o.granted === false) continue;
    const c = o.capability;
    if (ASSIGNABLE_MODULE_CAPS.includes(c) && c !== CAP.VACANCIES_MANAGE) set.add(c);
  }
  return [...set];
}
