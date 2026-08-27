import { NextResponse } from 'next/server';
import { requireManagerRole, getManagerScope } from '../../../../lib/ae/require-admin.js';
import { apiError } from '../../../../lib/api-error.js';
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
  const auth = await requireManagerRole(request);
  if (!auth.ok) return auth.response;

  const { companyId } = getManagerScope(auth);
  if (!companyId) {
    return apiError(request, 'NO_COMPANY', 400);
  }

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get('includeInactive') === 'true';
  const category = searchParams.get('category') || null;
  const categories = searchParams.get('categories') === 'true';
  const limit = Number(searchParams.get('limit')) || 100;

  try {
    if (categories) {
      const categoriesList = await getCompanyBenefitCategories({ companyId });
      return NextResponse.json({ ok: true, categories: categoriesList }, { status: 200 });
    }

    const benefits = await listCompanyBenefits({ companyId, includeInactive, category, limit });
    return NextResponse.json({ ok: true, benefits }, { status: 200 });
  } catch (err) {
    console.error('Failed to list company benefits:', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

export async function POST(request) {
  const auth = await requireManagerRole(request);
  if (!auth.ok) return auth.response;

  const { companyId, userId } = getManagerScope(auth);
  if (!companyId) {
    return apiError(request, 'NO_COMPANY', 400);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError(request, 'INVALID_JSON', 400);
  }

  const { name, description, category, benefitType } = body;

  const result = await createCompanyBenefit({
    companyId,
    name,
    description,
    category,
    benefitType,
    createdByUserId: userId,
  });

  if (!result.ok) {
    if (result.errorCode === 'NAME_REQUIRED') {
      return apiError(request, 'NAME_REQUIRED', 400);
    }
    return apiError(request, 'CREATE_FAILED', 500);
  }

  return NextResponse.json({ ok: true, benefit: result.benefit }, { status: 201 });
}
