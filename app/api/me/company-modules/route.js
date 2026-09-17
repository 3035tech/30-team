import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '../../../../lib/auth.js';
import { query } from '../../../../lib/db.js';
import { apiError, apiErrorFromResult, ERR } from '../../../../lib/api-error.js';
import { verifySessionWithCapabilities } from '../../../../lib/session.js';
import { isManagerRole } from '../../../../lib/permissions.js';
import {
  isSelfServiceOrigin,
  resolveUserOrigin,
} from '../../../../lib/user-signup-origin.js';
import { listCompanyModuleCatalog, modulesSelectionForPersist } from '../../../../lib/company-modules.js';
import {
  getCompanyEnabledModules,
  setCompanyEnabledModules,
} from '../../../../lib/company-module-entitlements.js';
import { audit } from '../../../../lib/audit.js';
import { z } from '../../../../lib/validate.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../lib/rate-limit.js';

async function requireEarlyAccessCompanyManager(request) {
  const token = cookies().get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!payload?.userId || !isManagerRole(payload)) {
    return { error: apiError(request, ERR.UNAUTHORIZED, 401) };
  }
  const companyId = Number(payload.companyId);
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return { error: apiError(request, ERR.ADMIN_ONLY, 403) };
  }

  const userRes = await query(
    `SELECT signup_source AS "signupSource",
            signup_pending AS "signupPending",
            signup_metadata AS "signupMetadata"
     FROM users
     WHERE id = $1 AND deleted = FALSE AND active = TRUE
     LIMIT 1`,
    [payload.userId]
  );
  if (userRes.rowCount === 0) {
    return { error: apiError(request, ERR.USER_NOT_FOUND, 404) };
  }
  const origin = resolveUserOrigin(userRes.rows[0]);
  if (!isSelfServiceOrigin(origin)) {
    return { error: apiError(request, ERR.ADMIN_ONLY, 403) };
  }

  return { payload, companyId, origin };
}

/** GET /api/me/company-modules — early-access manager: own company entitlements */
export async function GET(request) {
  try {
    const ctx = await requireEarlyAccessCompanyManager(request);
    if (ctx.error) return ctx.error;

    const enabledModules = await getCompanyEnabledModules(query, ctx.companyId);
    return NextResponse.json({
      ok: true,
      companyId: ctx.companyId,
      catalog: listCompanyModuleCatalog(),
      enabledModules,
      unrestricted: enabledModules == null,
      canEdit: true,
    });
  } catch (err) {
    if (err?.code === '42703') return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    console.error('[me/company-modules] GET', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

const putBodySchema = z.object({
  modules: z.array(z.string().trim().min(1).max(64)).max(32).nullable(),
});

/** PUT /api/me/company-modules — early-access manager updates own company allow-list */
export async function PUT(request) {
  try {
    const ctx = await requireEarlyAccessCompanyManager(request);
    if (ctx.error) return ctx.error;

    const ip = clientIpFromRequest(request);
    const rl = await checkRateLimit(`me-company-modules:${ctx.payload.userId}:${ip}`, 30, 15 * 60 * 1000);
    if (!rl.ok) {
      return apiError(request, ERR.RATE_LIMIT, 429, {}, { headers: { 'Retry-After': String(rl.retryAfterSec) } });
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = putBodySchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(request, ERR.INVALID_DATA, 400);
    }

    const toStore =
      parsed.data.modules == null
        ? null
        : modulesSelectionForPersist(parsed.data.modules);

    const result = await setCompanyEnabledModules(query, {
      companyId: ctx.companyId,
      modules: toStore,
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.INVALID_DATA });
    }

    await audit({
      action: 'company_modules_self',
      actorUserId: ctx.payload.userId,
      targetType: 'company',
      targetId: ctx.companyId,
      metadata: {
        unrestricted: result.enabledModules == null,
        modules: result.enabledModules,
        origin: ctx.origin,
      },
    });

    return NextResponse.json({
      ok: true,
      enabledModules: result.enabledModules,
      unrestricted: result.enabledModules == null,
    });
  } catch (err) {
    if (err?.code === '42703') return apiError(request, ERR.SCHEMA_NOT_INITIALIZED, 503);
    console.error('[me/company-modules] PUT', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
