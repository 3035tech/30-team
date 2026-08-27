import { NextResponse } from 'next/server';
import { getSessionPayload, getManagerScope, resolveScopedCompanyId, CAP, requireCapability } from '../../../../../lib/ae/require-admin.js';
import { apiError, ERR } from '../../../../../lib/api-error.js';
import {
  getCompanyBenefit,
  updateCompanyBenefit,
  deactivateCompanyBenefit,
} from '../../../../../lib/company-benefits.js';

/**
 * GET /api/admin/company-benefits/[id] — get benefit
 * PATCH /api/admin/company-benefits/[id] — update benefit
 * DELETE /api/admin/company-benefits/[id] — deactivate benefit
 */


export async function GET(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.USERS_MANAGE)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const companyId = resolveScopedCompanyId(scope, new URL(request.url).searchParams.get('companyId'));
    if (!companyId) return apiError(request, ERR.COMPANY_REQUIRED, 400);

    const { id } = params;
    const benefitId = Number(id);
    if (!benefitId || benefitId <= 0) {
      return apiError(request, ERR.INVALID_ID, 400);
    }

    const benefit = await getCompanyBenefit(null, { companyId, benefitId });
    if (!benefit) {
      return apiError(request, ERR.NOT_FOUND, 404);
    }

    return NextResponse.json({ ok: true, benefit }, { status: 200 });
  } catch (err) {
    console.error('GET /api/admin/company-benefits/[id] error:', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.USERS_MANAGE)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    let body;
    try {
      body = await request.json();
    } catch {
      return apiError(request, ERR.INVALID_JSON, 400);
    }

    const companyId = resolveScopedCompanyId(scope, body.companyId);
    if (!companyId) return apiError(request, ERR.COMPANY_REQUIRED, 400);

    const { id } = params;
    const benefitId = Number(id);
    if (!benefitId || benefitId <= 0) {
      return apiError(request, ERR.INVALID_ID, 400);
    }

    const result = await updateCompanyBenefit(null, {
      companyId,
      benefitId,
      name: body.name,
      description: body.description,
      category: body.category,
      benefitType: body.benefitType,
      active: body.active,
    });

    if (!result.ok) {
      if (result.errorCode === 'NOT_FOUND') {
        return apiError(request, ERR.NOT_FOUND, 404);
      }
      if (result.errorCode === 'NAME_REQUIRED') {
        return apiError(request, ERR.NAME_REQUIRED, 400);
      }
      return apiError(request, ERR.UPDATE_FAILED, 500);
    }

    return NextResponse.json({ ok: true, benefit: result.benefit }, { status: 200 });
  } catch (err) {
    console.error('PATCH /api/admin/company-benefits/[id] error:', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.USERS_MANAGE)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const companyId = resolveScopedCompanyId(scope, new URL(request.url).searchParams.get('companyId'));
    if (!companyId) return apiError(request, ERR.COMPANY_REQUIRED, 400);

    const { id } = params;
    const benefitId = Number(id);
    if (!benefitId || benefitId <= 0) {
      return apiError(request, ERR.INVALID_ID, 400);
    }

    const result = await deactivateCompanyBenefit(null, { companyId, benefitId });
    if (!result.ok) {
      if (result.errorCode === 'NOT_FOUND') {
        return apiError(request, ERR.NOT_FOUND, 404);
      }
      return apiError(request, ERR.DELETE_FAILED, 500);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('DELETE /api/admin/company-benefits/[id] error:', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
