import { cookies } from 'next/headers';
import { COOKIE_NAME } from '../../../../lib/auth.js';
import { query } from '../../../../lib/db.js';
import { apiError } from '../../../../lib/api-error.js';
import { CAP, requireCapability } from '../../../../lib/permissions.js';
import { verifySessionWithCapabilities } from '../../../../lib/user-capabilities.js';
import { listEarlyAccessLeads } from '../../../../lib/admin-leads.js';

/**
 * GET /api/admin/leads
 * Admin-only: early-access / self-service signup leads (cross-tenant).
 * Query: page, pageSize, status=all|pending|active|inactive, q=
 */
export async function GET(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!requireCapability(payload, CAP.USERS_MANAGE)) {
    return apiError(request, 'UNAUTHORIZED', 401);
  }

  try {
    const url = new URL(request.url);
    const data = await listEarlyAccessLeads({ query }, Object.fromEntries(url.searchParams.entries()));
    return Response.json(data);
  } catch (err) {
    console.error('GET /api/admin/leads', err);
    return apiError(request, 'INTERNAL', 500);
  }
}
