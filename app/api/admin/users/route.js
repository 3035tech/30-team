import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, hashPassword } from '../../../../lib/auth';
import { query } from '../../../../lib/db';
import { PAGE_SIZE_OPTIONS, sqlUsersOrderBy } from '../../../../lib/assessment-filters';
import { apiError } from '../../../../lib/api-error';
import { CAP, ASSIGNABLE_MODULE_CAPS, defaultAssignableModulesForRole, requireCapability } from '../../../../lib/permissions';
import {
  replaceUserModuleCapabilities,
  verifySessionWithCapabilities,
} from '../../../../lib/user-capabilities';
import { audit } from '../../../../lib/audit';
import { isMailConfigured } from '../../../../lib/mail';
import {
  hashUnusablePassword,
  issuePasswordSetupInvite,
} from '../../../../lib/user-password-invite';
import { resolveUserOrigin } from '../../../../lib/user-signup-origin';

const USER_SORT_KEYS = new Set(['id', 'email', 'role', 'companyName', 'active', 'createdAt']);

export async function GET(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!requireCapability(payload, CAP.USERS_MANAGE)) return apiError(request, 'UNAUTHORIZED', 401);

  const url = new URL(request.url);
  const pageRaw = parseInt(url.searchParams.get('page') || '1', 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const sizeRaw = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(sizeRaw) ? sizeRaw : 20;
  const sortRaw = url.searchParams.get('sort') || 'createdAt';
  const sort = USER_SORT_KEYS.has(sortRaw) ? sortRaw : 'createdAt';
  const dir = url.searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
  const orderSql = sqlUsersOrderBy(sort, dir);

  const cnt = await query(
    `SELECT COUNT(*)::int AS n
     FROM users u
     WHERE u.deleted = FALSE`
  );
  const total = cnt.rows[0]?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const offset = (effectivePage - 1) * pageSize;

  const r = await query(
    `SELECT
       u.id,
       u.email,
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
     WHERE u.deleted = FALSE
     ${orderSql}
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );

  const rows = r.rows;
  const ids = rows.map((row) => row.id);
  let overrideByUser = new Map();
  if (ids.length) {
    try {
      const ov = await query(
        `SELECT user_id AS "userId", capability, granted
         FROM user_capability_overrides
         WHERE user_id = ANY($1::bigint[])`,
        [ids]
      );
      overrideByUser = new Map();
      for (const o of ov.rows) {
        const list = overrideByUser.get(o.userId) || [];
        list.push({ capability: String(o.capability), granted: o.granted !== false });
        overrideByUser.set(o.userId, list);
      }
    } catch (err) {
      if (err?.code !== '42P01') throw err;
    }
  }

  const items = rows.map((row) => {
    const overrides = overrideByUser.get(row.id) || [];
    const customized = overrides.length > 0;
    const modules = customized
      ? overrides
          .filter((o) => o.granted && ASSIGNABLE_MODULE_CAPS.includes(o.capability))
          .map((o) => o.capability)
      : defaultAssignableModulesForRole(row.role);
    return {
      ...row,
      passwordSetupPending: Boolean(row.passwordSetupPending),
      signupPending: Boolean(row.signupPending),
      origin: resolveUserOrigin({
        signupSource: row.signupSource,
        signupPending: row.signupPending,
        companySignupAutoCreated: row.companySignupAutoCreated,
      }),
      capabilitiesCustomized: customized,
      modules,
    };
  });

  return NextResponse.json({
    items,
    total,
    page: effectivePage,
    pageSize,
    totalPages,
  });
}

export async function POST(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!requireCapability(payload, CAP.USERS_MANAGE)) return apiError(request, 'UNAUTHORIZED', 401);

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const suppliedPassword = String(body.password || '').trim();
  const role = String(body.role || '').trim();
  const companyId = body.companyId ?? null;
  const wantInvite =
    !suppliedPassword || body.sendInvite === true || body.temporaryPassword === true;

  if (!email) return apiError(request, 'EMAIL_REQUIRED', 400);
  if (!['hr', 'direction', 'admin'].includes(role)) return apiError(request, 'INVALID_ROLE', 400);
  if (role !== 'admin' && !companyId) return apiError(request, 'COMPANY_REQUIRED', 400);

  if (wantInvite && !isMailConfigured()) {
    return apiError(request, 'PASSWORD_OR_SMTP_REQUIRED', 400);
  }

  if (companyId) {
    const c = await query(`SELECT id FROM companies WHERE id = $1 AND deleted = FALSE LIMIT 1`, [companyId]);
    if (c.rowCount === 0) return apiError(request, 'INVALID_COMPANY', 400);
  }

  if (!wantInvite && suppliedPassword.length < 8) {
    return apiError(request, 'PASSWORD_TOO_SHORT', 400);
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
  if (Array.isArray(body.modules)) {
    const saved = await replaceUserModuleCapabilities(created.id, role, body.modules);
    modules = saved.modules;
    customized = saved.customized;
  }

  await audit({
    actorUserId: payload?.userId,
    action: 'user.create',
    targetType: 'user',
    targetId: created.id,
    meta: { email, role, invite: wantInvite },
  });

  const result = {
    ...created,
    modules,
    capabilitiesCustomized: customized,
  };

  if (wantInvite) {
    const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(
      /\/+$/,
      ''
    );
    const issued = await issuePasswordSetupInvite(created.id, {
      appUrl,
      locale: payload?.locale || 'pt-BR',
    });
    if (!issued.ok) {
      // Conta já criada — admin pode reenviar. Não falhar o create.
      result.inviteSent = false;
      result.inviteError = issued.code;
    } else {
      result.inviteSent = true;
    }
  }

  return NextResponse.json(result, { status: 201 });
}
