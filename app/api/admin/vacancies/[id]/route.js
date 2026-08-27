import { NextResponse } from 'next/server';
import { apiError } from '../../../../../lib/api-error';
import {
  CAP,
  getSessionPayload,
  getManagerScope,
  requireCapability,
} from '../../../../../lib/ae/require-admin';
import {
  assertVacancyAccess,
  attachVacancyActiveToken,
  getVacancyById,
  getVacancyRubric,
  softDeleteVacancy,
  updateVacancy,
} from '../../../../../lib/vacancies-admin';

export async function GET(request, { params }) {
  const payload = await getSessionPayload();
  if (!requireCapability(payload, CAP.VACANCIES_VIEW)) return apiError(request, 'UNAUTHORIZED', 401);
  const scope = getManagerScope(payload);
  if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

  const id = params?.id;
  if (!id) return apiError(request, 'INVALID_VACANCY', 400);

  const v = await getVacancyById(id);
  if (!v) return apiError(request, 'NOT_FOUND', 404);
  if (!assertVacancyAccess(v, scope)) return apiError(request, 'UNAUTHORIZED', 401);

  const rubric = await getVacancyRubric(id);
  return NextResponse.json({ ...(await attachVacancyActiveToken(v)), ...rubric });
}

export async function PATCH(request, { params }) {
  const payload = await getSessionPayload();
  if (!requireCapability(payload, CAP.VACANCIES_MANAGE)) return apiError(request, 'UNAUTHORIZED', 401);
  const scope = getManagerScope(payload);
  if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

  const id = params?.id;
  if (!id) return apiError(request, 'INVALID_VACANCY', 400);

  const current = await getVacancyById(id);
  if (!current) return apiError(request, 'NOT_FOUND', 404);
  if (!assertVacancyAccess(current, scope)) return apiError(request, 'UNAUTHORIZED', 401);

  const body = await request.json().catch(() => ({}));
  const result = await updateVacancy({ vacancyId: id, current, body });
  if (!result.ok) {
    const status = result.errorCode === 'NOT_FOUND' ? 404 : 400;
    return apiError(request, result.errorCode || 'INVALID_DATA', status);
  }

  return NextResponse.json(result.vacancy);
}

export async function DELETE(request, { params }) {
  const payload = await getSessionPayload();
  if (!requireCapability(payload, CAP.VACANCIES_MANAGE)) return apiError(request, 'UNAUTHORIZED', 401);
  const scope = getManagerScope(payload);
  if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

  const id = params?.id;
  if (!id) return apiError(request, 'INVALID_VACANCY', 400);

  const beforeDelete = await getVacancyById(id);
  if (!beforeDelete) return apiError(request, 'NOT_FOUND', 404);
  if (!assertVacancyAccess(beforeDelete, scope)) return apiError(request, 'UNAUTHORIZED', 401);

  const result = await softDeleteVacancy({ vacancyId: id, beforeDelete });
  if (!result.ok) return apiError(request, result.errorCode || 'NOT_FOUND', 404);

  return NextResponse.json({ ok: true });
}
