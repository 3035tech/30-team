import { cookies } from 'next/headers';
import { COOKIE_NAME } from '../../../../lib/auth.js';
import { query } from '../../../../lib/db.js';
import { apiError, ERR } from '../../../../lib/api-error.js';
import { CAP, requireCapability, isSuperAdminPayload } from '../../../../lib/permissions.js';
import { verifySessionWithCapabilities } from '../../../../lib/user-capabilities.js';
import { listAuditLogEntries } from '../../../../lib/audit-log-admin.js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/audit-log
 * Super-admin only (admin sem company_id): trilha de auditoria cross-tenant.
 * Query: page, pageSize, actorKind, companyId, action, q
 */
export async function GET(request) {
  const token = cookies().get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!isSuperAdminPayload(payload) || !requireCapability(payload, CAP.USERS_MANAGE)) {
    return apiError(request, ERR.UNAUTHORIZED, 401);
  }

  try {
    const url = new URL(request.url);
    const data = await listAuditLogEntries(
      { query },
      Object.fromEntries(url.searchParams.entries())
    );
    return Response.json(data);
  } catch (err) {
    console.error('GET /api/admin/audit-log', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
