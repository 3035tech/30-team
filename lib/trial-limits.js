/**
 * Trial limits para companies auto-criadas via signup (early access).
 * Soft limits via env — ajustáveis sem deploy.
 */

import { query } from './db.js';

export const TRIAL_LIMITS = Object.freeze({
  MAX_VACANCIES: parseInt(process.env.TRIAL_MAX_VACANCIES) || 2,
  MAX_CANDIDATES: parseInt(process.env.TRIAL_MAX_CANDIDATES) || 50,
  MAX_USERS: parseInt(process.env.TRIAL_MAX_USERS) || 3,
  MAX_MOTIVATORS_INVITES: parseInt(process.env.TRIAL_MAX_MOTIVATORS) || 10,
  MAX_CLIMATE_SURVEYS: parseInt(process.env.TRIAL_MAX_CLIMATE_SURVEYS) || 2,
});

/**
 * @param {number} companyId
 * @returns {Promise<boolean>}
 */
export async function isTrialCompany(companyId) {
  const id = Number(companyId);
  if (!Number.isFinite(id) || id <= 0) return false;

  const r = await query(
    `SELECT signup_auto_created
     FROM companies
     WHERE id = $1 AND deleted = FALSE
     LIMIT 1`,
    [id]
  );
  return r.rowCount > 0 && r.rows[0].signup_auto_created === true;
}

/**
 * @param {number} companyId
 * @param {'vacancies'|'candidates'|'users'|'motivators'|'climate'} resource
 * @returns {Promise<{ allowed: boolean, current?: number, limit?: number, reason?: string }>}
 */
export async function checkTrialLimit(companyId, resource) {
  const id = Number(companyId);
  if (!Number.isFinite(id) || id <= 0) {
    return { allowed: false, reason: 'INVALID_COMPANY' };
  }

  const isTrial = await isTrialCompany(id);
  if (!isTrial) return { allowed: true };

  let current = 0;
  let limit = 0;

  switch (resource) {
    case 'vacancies': {
      const r = await query(
        `SELECT COUNT(*) AS cnt FROM vacancies WHERE company_id = $1 AND deleted = FALSE`,
        [id]
      );
      current = parseInt(r.rows[0]?.cnt) || 0;
      limit = TRIAL_LIMITS.MAX_VACANCIES;
      break;
    }
    case 'candidates': {
      const r = await query(
        `SELECT COUNT(*) AS cnt FROM candidates WHERE company_id = $1`,
        [id]
      );
      current = parseInt(r.rows[0]?.cnt) || 0;
      limit = TRIAL_LIMITS.MAX_CANDIDATES;
      break;
    }
    case 'users': {
      const r = await query(
        `SELECT COUNT(*) AS cnt FROM users WHERE company_id = $1 AND deleted = FALSE AND active = TRUE`,
        [id]
      );
      current = parseInt(r.rows[0]?.cnt) || 0;
      limit = TRIAL_LIMITS.MAX_USERS;
      break;
    }
    case 'motivators': {
      const r = await query(
        `SELECT COUNT(*) AS cnt FROM ae_invitations WHERE company_id = $1`,
        [id]
      );
      current = parseInt(r.rows[0]?.cnt) || 0;
      limit = TRIAL_LIMITS.MAX_MOTIVATORS_INVITES;
      break;
    }
    case 'climate': {
      const r = await query(
        `SELECT COUNT(*) AS cnt FROM climate_surveys WHERE company_id = $1 AND deleted = FALSE`,
        [id]
      );
      current = parseInt(r.rows[0]?.cnt) || 0;
      limit = TRIAL_LIMITS.MAX_CLIMATE_SURVEYS;
      break;
    }
    default:
      return { allowed: false, reason: 'UNKNOWN_RESOURCE' };
  }

  if (current >= limit) {
    return { allowed: false, current, limit, reason: 'TRIAL_LIMIT_REACHED' };
  }

  return { allowed: true, current, limit };
}
