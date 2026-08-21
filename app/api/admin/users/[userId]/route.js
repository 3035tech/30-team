import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, hashPassword } from '../../../../../lib/auth';
import { query } from '../../../../../lib/db';
import { apiError } from '../../../../../lib/api-error';
import { CAP, ASSIGNABLE_MODULE_CAPS, defaultAssignableModulesForRole, requireCapability } from '../../../../../lib/permissions';
import {
  loadUserCapabilityOverrides,
  replaceUserModuleCapabilities,
  verifySessionWithCapabilities,
} from '../../../../../lib/user-capabilities';
import { audit } from '../../../../../lib/audit';

export async function PATCH(request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!requireCapability(payload, CAP.USERS_MANAGE)) return apiError(request, 'UNAUTHORIZED', 401);

  const id = params?.userId;
  const userId = id ? parseInt(String(id), 10) : NaN;
  if (!Number.isFinite(userId)) return apiError(request, 'INVALID_USER', 400);

  const current = await query(
    `SELECT id, email, role, active, company_id AS "companyId"
     FROM users
     WHERE id = $1 AND deleted = FALSE
     LIMIT 1`,
    [userId]
  );
  if (current.rowCount === 0) return apiError(request, 'USER_NOT_FOUND', 404);

  const body = await request.json().catch(() => ({}));
  const email = body.email != null ? String(body.email || '').trim().toLowerCase() : null;
  const role = body.role != null ? String(body.role || '').trim() : null;
  const active = body.active != null ? Boolean(body.active) : null;
  const companyIdRaw = body.companyId != null ? body.companyId : null;
  const companyId = companyIdRaw === null ? null : parseInt(String(companyIdRaw), 10);
  const newPassword = body.password != null ? String(body.password || '') : null;

  if (email !== null && !email) return apiError(request, 'EMAIL_REQUIRED', 400);
  if (role !== null && !['hr', 'direction', 'admin'].includes(role)) return apiError(request, 'INVALID_ROLE', 400);
  if (companyIdRaw != null && companyIdRaw !== null && !Number.isFinite(companyId)) {
    return apiError(request, 'INVALID_COMPANY', 400);
  }

  const nextRole = role !== null ? role : current.rows[0].role;
  const nextCompanyId = companyIdRaw != null ? companyId : current.rows[0].companyId;
  if (nextRole !== 'admin' && !nextCompanyId) {
    return apiError(request, 'COMPANY_REQUIRED_FOR_ROLE', 400);
  }
  if (nextCompanyId) {
    const c = await query(`SELECT id FROM companies WHERE id = $1 AND deleted = FALSE LIMIT 1`, [nextCompanyId]);
    if (c.rowCount === 0) return apiError(request, 'INVALID_COMPANY', 400);
  }

  const nextEmail = email !== null ? email : current.rows[0].email;
  const nextActive = active !== null ? active : current.rows[0].active;

  const nextHash = newPassword !== null && newPassword.trim()
    ? await hashPassword(newPassword.trim())
    : null;

  const up = await query(
    `UPDATE users
     SET email = $2,
         role = $3,
         active = $4,
         company_id = $5,
         password_hash = COALESCE($6, password_hash)
     WHERE id = $1 AND deleted = FALSE
     RETURNING id, email, role, active, company_id AS "companyId", created_at AS "createdAt", last_login_at AS "lastLoginAt"`,
    [userId, nextEmail, nextRole, nextActive, nextRole === 'admin' ? null : nextCompanyId, nextHash]
  );

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
      return apiError(request, 'INVALID_MODULES', 400);
    }
  } else {
    const overrides = await loadUserCapabilityOverrides(userId);
    customized = overrides.length > 0;
    modules = customized
      ? overrides
          .filter((o) => o.granted && ASSIGNABLE_MODULE_CAPS.includes(o.capability))
          .map((o) => o.capability)
      : defaultAssignableModulesForRole(nextRole);
  }

  await audit({
    actorUserId: payload?.userId,
    action: 'user.update',
    targetType: 'user',
    targetId: userId,
    meta: { modulesUpdated: Object.prototype.hasOwnProperty.call(body, 'modules') },
  });

  return NextResponse.json({ ...up.rows[0], modules, capabilitiesCustomized: customized });
}

export async function DELETE(request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!requireCapability(payload, CAP.USERS_MANAGE)) return apiError(request, 'UNAUTHORIZED', 401);

  const id = params?.userId;
  const userId = id ? parseInt(String(id), 10) : NaN;
  if (!Number.isFinite(userId)) return apiError(request, 'INVALID_USER', 400);

  if (payload?.userId && Number(payload.userId) === userId) {
    return apiError(request, 'CANNOT_DELETE_SELF', 400);
  }

  const del = await query(
    `UPDATE users SET deleted = TRUE, active = FALSE WHERE id = $1 AND deleted = FALSE RETURNING id`,
    [userId]
  );
  if (del.rowCount === 0) return apiError(request, 'USER_NOT_FOUND', 404);

  await query(`DELETE FROM user_capability_overrides WHERE user_id = $1`, [userId]).catch(() => {});

  await audit({
    actorUserId: payload?.userId,
    action: 'user.deactivate',
    targetType: 'user',
    targetId: userId,
  });

  return NextResponse.json({ ok: true });
}
