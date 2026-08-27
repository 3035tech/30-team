import { cookies } from 'next/headers';
import { verifyToken } from '../../../../lib/auth.js';
import { apiError, ERR } from '../../../../lib/api-error.js';
import { hydrateSessionPayload } from '../../../../lib/session.js';
import { isManagerRole, isAdminRole } from '../../../../lib/permissions.js';
import { listCompanyJobRoles, createJobRole } from '../../../../lib/job-roles.js';

/**
 * GET /api/admin/job-roles?companyId=X&includeInactive=false
 * Lista cargos da empresa
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('team30_session')?.value;
    if (!token) {
      return apiError(request, ERR.REQUIRED_LOGIN, 401);
    }

    const rawPayload = verifyToken(token);
    const payload = await hydrateSessionPayload(rawPayload);
    if (!isManagerRole(payload)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }

    const isAdmin = isAdminRole(payload);
    const { searchParams } = new URL(request.url);
    
    let companyId;
    if (isAdmin) {
      const qCompanyId = searchParams.get('companyId');
      companyId = qCompanyId ? parseInt(qCompanyId) : null;
      if (!companyId) {
        return apiError(request, ERR.COMPANY_REQUIRED, 400);
      }
    } else {
      companyId = payload.companyId;
      if (!companyId) {
        return apiError(request, ERR.COMPANY_REQUIRED, 400);
      }
    }

    const includeInactive = searchParams.get('includeInactive') === 'true';

    const roles = await listCompanyJobRoles(companyId, { includeInactive });

    return Response.json({
      companyId,
      total: roles.length,
      roles,
    });
  } catch (err) {
    console.error('[job-roles] GET error:', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/**
 * POST /api/admin/job-roles
 * Cria novo cargo
 * Body: { companyId?, name, description?, rubric }
 */
export async function POST(request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('team30_session')?.value;
    if (!token) {
      return apiError(request, ERR.REQUIRED_LOGIN, 401);
    }

    const rawPayload = verifyToken(token);
    const payload = await hydrateSessionPayload(rawPayload);
    if (!isManagerRole(payload)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }

    const isAdmin = isAdminRole(payload);
    const body = await request.json();
    
    let companyId;
    if (isAdmin) {
      companyId = body.companyId ? parseInt(body.companyId) : null;
      if (!companyId) {
        return apiError(request, ERR.COMPANY_REQUIRED, 400);
      }
    } else {
      companyId = payload.companyId;
      if (!companyId) {
        return apiError(request, ERR.COMPANY_REQUIRED, 400);
      }
    }

    const { name, description, rubric } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return apiError(request, ERR.NAME_REQUIRED, 400);
    }

    const newRole = await createJobRole({
      companyId,
      name: name.trim(),
      description: description?.trim() || null,
      rubric: rubric || {},
    });

    return Response.json(newRole, { status: 201 });
  } catch (err) {
    console.error('[job-roles] POST error:', err);
    
    if (err.message === 'INVALID_RUBRIC') {
      return apiError(request, ERR.INVALID_RUBRIC, 400);
    }
    
    // Violação de UNIQUE (company_id, name)
    if (err.code === '23505') {
      return apiError(request, ERR.JOB_ROLE_NAME_EXISTS, 409);
    }
    
    return apiError(request, ERR.INTERNAL, 500);
  }
}
