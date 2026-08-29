/**
 * Users admin domain — list/create/update/deactivate + password invite resend.
 * Routes stay thin: auth + parse + NextResponse/apiError.
 */

import { hashPassword } from './auth.js';
import { query } from './db.js';
import { PAGE_SIZE_OPTIONS, sqlUsersOrderBy } from './assessment-filters.js';
import { ERR } from './api-error-codes.js';
import {
  ASSIGNABLE_MODULE_CAPS,
  defaultAssignableModulesForRole,
} from './permissions.js';
import {
  loadUserCapabilityOverrides,
  replaceUserModuleCapabilities,
} from './user-capabilities.js';
import { bumpSessionVersion } from './session.js';
import { audit } from './audit.js';
import { isMailConfigured } from './mail.js';
import {
  hashUnusablePassword,
  issuePasswordSetupInvite,
} from './user-password-invite.js';
import { resolveUserOrigin } from './user-signup-origin.js';

const USER_SORT_KEYS = new Set(['id', 'email', 'displayName', 'role', 'companyName', 'active', 'createdAt']);
const VALID_ROLES = new Set(['hr', 'direction', 'admin']);

/**
 * @param {{ isAdmin: boolean, companyId: number|null }} scope
 * @param {{ companyId: number|null }} user
 */
export function assertUserInScope(user, scope) {
  if (!scope?.isAdmin && scope?.companyId == null) return false;
  if (scope.isAdmin) return true;
  return user?.companyId != null && Number(user.companyId) === Number(scope.companyId);
}

function mapUserModules(role, overrides) {
  const customized = overrides.length > 0;
  const modules = customized
    ? overrides
        .filter((o) => o.granted && ASSIGNABLE_MODULE_CAPS.includes(o.capability))
        .map((o) => o.capability)
    : defaultAssignableModulesForRole(role);
  return { modules, capabilitiesCustomized: customized };
}

async function loadOverridesByUserIds(ids) {
  const overrideByUser = new Map();
  if (!ids.length) return overrideByUser;
  try {
    const ov = await query(
      `SELECT user_id AS "userId", capability, granted
       FROM user_capability_overrides
       WHERE user_id = ANY($1::bigint[])`,
      [ids]
    );
    for (const o of ov.rows) {
      const list = overrideByUser.get(o.userId) || [];
      list.push({ capability: String(o.capability), granted: o.granted !== false });
      overrideByUser.set(o.userId, list);
    }
  } catch (err) {
    if (err?.code !== '42P01') throw err;
  }
  return overrideByUser;
}

/**
 * @param {{
 *   page?: number|string,
 *   pageSize?: number|string,
 *   sort?: string|null,
 *   sortDir?: string|null,
 *   q?: string|null,
 *   isAdmin?: boolean,
 *   companyId?: number|null,
 * }} opts
 */
export async function listUsers({
  page: pageIn = 1,
  pageSize: pageSizeIn = 20,
  sort: sortRaw = 'createdAt',
  sortDir = 'desc',
  q: qIn = '',
  role: roleIn = '',
  active: activeIn = '',
  filterCompanyId: filterCompanyIdIn = '',
  isAdmin = true,
  companyId = null,
} = {}) {
  const pageRaw = parseInt(pageIn, 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const sizeRaw = parseInt(pageSizeIn, 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(sizeRaw) ? sizeRaw : 20;
  const sort = USER_SORT_KEYS.has(String(sortRaw || '')) ? String(sortRaw) : 'createdAt';
  const dir = sortDir === 'asc' ? 'asc' : 'desc';
  const orderSql = sqlUsersOrderBy(sort, dir);
  const needle = String(qIn || '').trim().slice(0, 80);
  const roleFilter = String(roleIn || '').trim().toLowerCase();
  const activeRaw = String(activeIn || '').trim().toLowerCase();
  const filterCompanyRaw = String(filterCompanyIdIn || '').trim();

  const whereParts = ['u.deleted = FALSE'];
  const params = [];
  if (!isAdmin) {
    if (companyId == null) {
      return { items: [], total: 0, page: 1, pageSize, totalPages: 1 };
    }
    params.push(companyId);
    whereParts.push(`u.company_id = $${params.length}`);
  }
  if (needle) {
    params.push(`%${needle}%`);
    const idx = params.length;
    whereParts.push(
      `(u.email ILIKE $${idx} OR COALESCE(u.display_name, '') ILIKE $${idx})`
    );
  }
  if (roleFilter && VALID_ROLES.has(roleFilter)) {
    params.push(roleFilter);
    whereParts.push(`u.role = $${params.length}`);
  }
  if (activeRaw === '1' || activeRaw === 'true' || activeRaw === 'active') {
    whereParts.push('u.active = TRUE');
  } else if (activeRaw === '0' || activeRaw === 'false' || activeRaw === 'inactive') {
    whereParts.push('u.active = FALSE');
  }
  if (isAdmin && filterCompanyRaw) {
    const cid = parseInt(filterCompanyRaw, 10);
    if (Number.isFinite(cid) && cid > 0) {
      params.push(cid);
      whereParts.push(`u.company_id = $${params.length}`);
    }
  }
  const where = `WHERE ${whereParts.join(' AND ')}`;

  const cnt = await query(
    `SELECT COUNT(*)::int AS n
     FROM users u
     ${where}`,
    params
  );
  const total = cnt.rows[0]?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const offset = (effectivePage - 1) * pageSize;

  const listParams = [...params, pageSize, offset];
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;

  const r = await query(
    `SELECT
       u.id,
       u.email,
       u.display_name AS "displayName",
       u.role,
       u.active,
       u.signup_pending AS "signupPending",
       u.signup_source AS "signupSource",
       u.company_id AS "companyId",
       c.name AS "companyName",
       c.signup_auto_created AS "companySignupAutoCreated",
       u.last_login_at AS "lastLoginAt",
       u.created_at AS "createdAt",
       (u.password_setup_token IS NOT NULL) AS "passwordSetupPending"
     FROM users u
     LEFT JOIN companies c ON c.id = u.company_id
     ${where}
     ${orderSql}
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    listParams
  );

  const rows = r.rows;
  const overrideByUser = await loadOverridesByUserIds(rows.map((row) => row.id));

  const items = rows.map((row) => {
    const overrides = overrideByUser.get(row.id) || [];
    const { modules, capabilitiesCustomized } = mapUserModules(row.role, overrides);
    return {
      ...row,
      passwordSetupPending: Boolean(row.passwordSetupPending),
      signupPending: Boolean(row.signupPending),
      origin: resolveUserOrigin({
        signupSource: row.signupSource,
        signupPending: row.signupPending,
        companySignupAutoCreated: row.companySignupAutoCreated,
      }),
      capabilitiesCustomized,
      modules,
    };
  });

  return {
    items,
    total,
    page: effectivePage,
    pageSize,
    totalPages,
  };
}

/**
 * @returns {{ ok: true, user: object } | { ok: false, errorCode: string, status?: number }}
 */
export async function createUser({
  email: emailIn,
  password: passwordIn,
  role: roleIn,
  companyId: companyIdIn = null,
  modules: modulesIn,
  sendInvite,
  temporaryPassword,
  actorUserId,
  locale = 'pt-BR',
  appUrl,
}) {
  const email = String(emailIn || '').trim().toLowerCase();
  const suppliedPassword = String(passwordIn || '').trim();
  const role = String(roleIn || '').trim();
  const companyId = companyIdIn ?? null;
  const wantInvite =
    !suppliedPassword || sendInvite === true || temporaryPassword === true;

  if (!email) return { ok: false, errorCode: ERR.EMAIL_REQUIRED, status: 400 };
  if (!VALID_ROLES.has(role)) return { ok: false, errorCode: ERR.INVALID_ROLE, status: 400 };
  if (role !== 'admin' && !companyId) {
    return { ok: false, errorCode: ERR.COMPANY_REQUIRED, status: 400 };
  }

  if (wantInvite && !isMailConfigured()) {
    return { ok: false, errorCode: ERR.PASSWORD_OR_SMTP_REQUIRED, status: 400 };
  }

  if (companyId) {
    const c = await query(`SELECT id FROM companies WHERE id = $1 AND deleted = FALSE LIMIT 1`, [
      companyId,
    ]);
    if (c.rowCount === 0) return { ok: false, errorCode: ERR.INVALID_COMPANY, status: 400 };
  }

  if (!wantInvite && suppliedPassword.length < 8) {
    return { ok: false, errorCode: ERR.PASSWORD_TOO_SHORT, status: 400 };
  }

  const hash = wantInvite ? await hashUnusablePassword() : await hashPassword(suppliedPassword);
  const ins = await query(
    `INSERT INTO users (
       email, password_hash, role, active, company_id, must_change_password,
       password_setup_token, password_setup_expires_at, onboarding_completed, onboarding_completed_at
     )
     VALUES ($1, $2, $3, TRUE, $4, FALSE, NULL, NULL, TRUE, NOW())
     RETURNING id, email, role, active, company_id AS "companyId", created_at AS "createdAt"`,
    [email, hash, role, companyId]
  );
  const created = ins.rows[0];

  let modules = defaultAssignableModulesForRole(role);
  let customized = false;
  if (Array.isArray(modulesIn)) {
    const saved = await replaceUserModuleCapabilities(created.id, role, modulesIn);
    modules = saved.modules;
    customized = saved.customized;
  }

  await audit({
    actorUserId,
    action: 'user.create',
    targetType: 'user',
    targetId: created.id,
    metadata: { email, role, invite: wantInvite },
  });

  const result = {
    ...created,
    modules,
    capabilitiesCustomized: customized,
  };

  if (wantInvite) {
    const issued = await issuePasswordSetupInvite(created.id, {
      appUrl,
      locale,
    });
    if (!issued.ok) {
      // Conta já criada — admin pode reenviar. Não falhar o create.
      result.inviteSent = false;
      result.inviteError = issued.code;
    } else {
      result.inviteSent = true;
    }
  }

  return { ok: true, user: result };
}

/**
 * @returns {{ ok: true, user: object } | { ok: false, errorCode: string, status?: number }}
 */
export async function updateUser({
  userId,
  body = {},
  actorUserId,
  isAdmin = true,
  scopeCompanyId = null,
}) {
  const current = await query(
    `SELECT id, email, role, active, company_id AS "companyId"
     FROM users
     WHERE id = $1 AND deleted = FALSE
     LIMIT 1`,
    [userId]
  );
  if (current.rowCount === 0) return { ok: false, errorCode: ERR.USER_NOT_FOUND, status: 404 };

  const prev = current.rows[0];
  if (!assertUserInScope(prev, { isAdmin, companyId: scopeCompanyId })) {
    return { ok: false, errorCode: ERR.UNAUTHORIZED, status: 401 };
  }

  const email = body.email != null ? String(body.email || '').trim().toLowerCase() : null;
  const role = body.role != null ? String(body.role || '').trim() : null;
  const active = body.active != null ? Boolean(body.active) : null;
  const companyIdRaw = body.companyId != null ? body.companyId : null;
  const companyId = companyIdRaw === null ? null : parseInt(String(companyIdRaw), 10);
  const newPassword = body.password != null ? String(body.password || '') : null;

  if (email !== null && !email) return { ok: false, errorCode: ERR.EMAIL_REQUIRED, status: 400 };
  if (role !== null && !VALID_ROLES.has(role)) {
    return { ok: false, errorCode: ERR.INVALID_ROLE, status: 400 };
  }
  if (companyIdRaw != null && companyIdRaw !== null && !Number.isFinite(companyId)) {
    return { ok: false, errorCode: ERR.INVALID_COMPANY, status: 400 };
  }

  const nextRole = role !== null ? role : prev.role;
  let nextCompanyId = companyIdRaw != null ? companyId : prev.companyId;
  if (!isAdmin) {
    // Non-admin cannot reassign tenant or promote to admin.
    nextCompanyId = scopeCompanyId;
    if (nextRole === 'admin') {
      return { ok: false, errorCode: ERR.INVALID_ROLE, status: 400 };
    }
  }
  if (nextRole !== 'admin' && !nextCompanyId) {
    return { ok: false, errorCode: ERR.COMPANY_REQUIRED_FOR_ROLE, status: 400 };
  }
  if (nextCompanyId) {
    const c = await query(`SELECT id FROM companies WHERE id = $1 AND deleted = FALSE LIMIT 1`, [
      nextCompanyId,
    ]);
    if (c.rowCount === 0) return { ok: false, errorCode: ERR.INVALID_COMPANY, status: 400 };
  }

  const nextEmail = email !== null ? email : prev.email;
  const nextActive = active !== null ? active : prev.active;

  const nextHash =
    newPassword !== null && newPassword.trim() ? await hashPassword(newPassword.trim()) : null;

  if (nextHash != null && newPassword.trim().length < 8) {
    return { ok: false, errorCode: ERR.PASSWORD_TOO_SHORT, status: 400 };
  }

  const resolvedCompanyId = nextRole === 'admin' ? null : nextCompanyId;

  const up = await query(
    `UPDATE users
     SET email = $2,
         role = $3,
         active = $4,
         company_id = $5,
         password_hash = COALESCE($6, password_hash),
         password_setup_token = CASE WHEN $6 IS NOT NULL THEN NULL ELSE password_setup_token END,
         password_setup_expires_at = CASE WHEN $6 IS NOT NULL THEN NULL ELSE password_setup_expires_at END,
         must_change_password = CASE WHEN $6 IS NOT NULL THEN FALSE ELSE must_change_password END
     WHERE id = $1 AND deleted = FALSE
     RETURNING id, email, role, active, company_id AS "companyId", created_at AS "createdAt", last_login_at AS "lastLoginAt"`,
    [userId, nextEmail, nextRole, nextActive, resolvedCompanyId, nextHash]
  );

  const sensitiveChange =
    nextHash != null ||
    nextRole !== prev.role ||
    nextActive !== prev.active ||
    resolvedCompanyId !== prev.companyId;
  if (sensitiveChange) {
    await bumpSessionVersion(userId).catch(() => {});
  }

  let modules;
  let customized;
  if (Object.prototype.hasOwnProperty.call(body, 'modules')) {
    if (body.modules == null) {
      const saved = await replaceUserModuleCapabilities(userId, nextRole, null);
      modules = saved.modules;
      customized = saved.customized;
    } else if (Array.isArray(body.modules)) {
      const saved = await replaceUserModuleCapabilities(userId, nextRole, body.modules);
      modules = saved.modules;
      customized = saved.customized;
    } else {
      return { ok: false, errorCode: ERR.INVALID_MODULES, status: 400 };
    }
  } else {
    const overrides = await loadUserCapabilityOverrides(userId);
    ({ modules, capabilitiesCustomized: customized } = mapUserModules(nextRole, overrides));
  }

  await audit({
    actorUserId,
    action: 'user.update',
    targetType: 'user',
    targetId: userId,
    metadata: { modulesUpdated: Object.prototype.hasOwnProperty.call(body, 'modules') },
  });

  return {
    ok: true,
    user: { ...up.rows[0], modules, capabilitiesCustomized: customized },
  };
}

/**
 * Soft-delete user (deleted=TRUE, active=FALSE) + clear capability overrides.
 * @returns {{ ok: true } | { ok: false, errorCode: string, status?: number }}
 */
export async function deactivateUser({
  userId,
  actorUserId,
  isAdmin = true,
  scopeCompanyId = null,
}) {
  if (actorUserId != null && Number(actorUserId) === Number(userId)) {
    return { ok: false, errorCode: ERR.CANNOT_DELETE_SELF, status: 400 };
  }

  const current = await query(
    `SELECT id, company_id AS "companyId"
     FROM users
     WHERE id = $1 AND deleted = FALSE
     LIMIT 1`,
    [userId]
  );
  if (current.rowCount === 0) return { ok: false, errorCode: ERR.USER_NOT_FOUND, status: 404 };
  if (!assertUserInScope(current.rows[0], { isAdmin, companyId: scopeCompanyId })) {
    return { ok: false, errorCode: ERR.UNAUTHORIZED, status: 401 };
  }

  const del = await query(
    `UPDATE users SET deleted = TRUE, active = FALSE WHERE id = $1 AND deleted = FALSE RETURNING id`,
    [userId]
  );
  if (del.rowCount === 0) return { ok: false, errorCode: ERR.USER_NOT_FOUND, status: 404 };

  await bumpSessionVersion(userId).catch(() => {});
  await query(`DELETE FROM user_capability_overrides WHERE user_id = $1`, [userId]).catch(() => {});

  await audit({
    actorUserId,
    action: 'user.deactivate',
    targetType: 'user',
    targetId: userId,
  });

  return { ok: true };
}

/**
 * @returns {{ ok: true, email: string, expiresAt: * }
 *         | { ok: false, errorCode: string, status?: number }}
 */
export async function resendUserPasswordInvite({
  userId,
  actorUserId,
  locale = 'pt-BR',
  appUrl,
  isAdmin = true,
  scopeCompanyId = null,
}) {
  const cur = await query(
    `SELECT id, email, company_id AS "companyId", password_setup_token AS "passwordSetupToken"
     FROM users
     WHERE id = $1 AND deleted = FALSE
     LIMIT 1`,
    [userId]
  );
  if (cur.rowCount === 0) return { ok: false, errorCode: ERR.USER_NOT_FOUND, status: 404 };
  if (!assertUserInScope(cur.rows[0], { isAdmin, companyId: scopeCompanyId })) {
    return { ok: false, errorCode: ERR.UNAUTHORIZED, status: 401 };
  }

  const issued = await issuePasswordSetupInvite(userId, {
    appUrl,
    locale,
  });
  if (!issued.ok) {
    if (issued.code === 'SMTP_NOT_CONFIGURED') {
      return { ok: false, errorCode: ERR.SMTP_NOT_CONFIGURED, status: 503 };
    }
    return { ok: false, errorCode: issued.code || 'INTERNAL', status: 400 };
  }

  await audit({
    actorUserId,
    action: 'user.password_invite_resend',
    targetType: 'user',
    targetId: userId,
    metadata: { email: cur.rows[0].email },
  });

  return {
    ok: true,
    email: cur.rows[0].email,
    expiresAt: issued.expiresAt,
  };
}
