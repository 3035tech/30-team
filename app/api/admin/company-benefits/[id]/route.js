import { NextResponse } from 'next/server';
import { requireManagerRole, getManagerScope } from '../../../../../lib/ae/require-admin.js';
import { apiError } from '../../../../../lib/api-error.js';
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
  const auth = await requireManagerRole(request);
  if (!auth.ok) return auth.response;

  const { companyId } = getManagerScope(auth);
  if (!companyId) {
    return apiError(request, 'NO_COMPANY', 400);
  }

  const { id } = params;
  const benefitId = Number(id);
  if (!benefitId || benefitId <= 0) {
    return apiError(request, 'INVALID_ID', 400);
  }

  const benefit = await getCompanyBenefit({ companyId, benefitId });
  if (!benefit) {
    return apiError(request, 'NOT_FOUND', 404);
  }

  return NextResponse.json({ ok: true, benefit }, { status: 200 });
}

export async function PATCH(request, { params }) {
  const auth = await requireManagerRole(request);
  if (!auth.ok) return auth.response;

  const { companyId } = getManagerScope(auth);
  if (!companyId) {
    return apiError(request, 'NO_COMPANY', 400);
  }

  const { id } = params;
  const benefitId = Number(id);
  if (!benefitId || benefitId <= 0) {
    return apiError(request, 'INVALID_ID', 400);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError(request, 'INVALID_JSON', 400);
  }

  const result = await updateCompanyBenefit({
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
      return apiError(request, 'NOT_FOUND', 404);
    }
    if (result.errorCode === 'NAME_REQUIRED') {
      return apiError(request, 'NAME_REQUIRED', 400);
    }
    return apiError(request, 'UPDATE_FAILED', 500);
  }

  return NextResponse.json({ ok: true, benefit: result.benefit }, { status: 200 });
}

export async function DELETE(request, { params }) {
  const auth = await requireManagerRole(request);
  if (!auth.ok) return auth.response;

  const { companyId } = getManagerScope(auth);
  if (!companyId) {
    return apiError(request, 'NO_COMPANY', 400);
  }

  const { id } = params;
  const benefitId = Number(id);
  if (!benefitId || benefitId <= 0) {
    return apiError(request, 'INVALID_ID', 400);
  }

  const result = await deactivateCompanyBenefit({ companyId, benefitId });
  if (!result.ok) {
    if (result.errorCode === 'NOT_FOUND') {
      return apiError(request, 'NOT_FOUND', 404);
    }
    return apiError(request, 'DELETE_FAILED', 500);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
