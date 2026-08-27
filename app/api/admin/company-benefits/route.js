import { NextResponse } from 'next/server';
import { getSessionPayload, getManagerScope, requireManagerRole } from '../../../../lib/ae/require-admin.js';
import { apiError, ERR } from '../../../../lib/api-error.js';
import {
  listCompanyBenefits,
  createCompanyBenefit,
  getCompanyBenefitCategories,
} from '../../../../lib/company-benefits.js';

/**
 * GET /api/admin/company-benefits — list benefits (admin/direction/hr)
 * POST /api/admin/company-benefits — create benefit (admin/direction/hr)
 */

export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const companyId = scope.isAdmin
      ? Number(new URL(request.url).searchParams.get('companyId') || scope.companyId)
      : Number(scope.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return apiError(request, ERR.COMPANY_REQUIRED, 400);
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const category = searchParams.get('category') || null;
    const categories = searchParams.get('categories') === 'true';
    const limit = Number(searchParams.get('limit')) || 100;

    if (categories) {
      const categoriesList = await getCompanyBenefitCategories(null, { companyId });
      return NextResponse.json({ ok: true, categories: categoriesList }, { status: 200 });
    }

    const benefits = await listCompanyBenefits(null, { companyId, includeInactive, category, limit });
    return NextResponse.json({ ok: true, benefits }, { status: 200 });
  } catch (err) {
    console.error('Failed to list company benefits:', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

export async function POST(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireManagerRole(payload)) return apiError(request, ERR.UNAUTHORIZED, 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    let body;
    try {
      body = await request.json();
    } catch {
      return apiError(request, ERR.INVALID_JSON, 400);
    }

    const companyId = scope.isAdmin
      ? Number(body.companyId || scope.companyId)
      : Number(scope.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return apiError(request, ERR.COMPANY_REQUIRED, 400);
    }

    const { name, description, category, benefitType } = body;

    const result = await createCompanyBenefit(null, {
      companyId,
      name,
      description,
      category,
      benefitType,
      createdByUserId: payload.userId,
    });

    if (!result.ok) {
      if (result.errorCode === 'NAME_REQUIRED') {
        return apiError(request, ERR.NAME_REQUIRED, 400);
      }
      return apiError(request, ERR.CREATE_FAILED, 500);
    }

    return NextResponse.json({ ok: true, benefit: result.benefit }, { status: 201 });
  } catch (err) {
    console.error('Failed to create company benefit:', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
