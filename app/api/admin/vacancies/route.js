import { NextResponse } from 'next/server';
import { apiError } from '../../../../lib/api-error';
import {
  CAP,
  getSessionPayload,
  getManagerScope,
  requireCapability,
} from '../../../../lib/ae/require-admin';
import { parseVacanciesSort } from '../../../../lib/assessment-filters';
import { parseVacancyDetailsFromBody } from '../../../../lib/vacancy-details';
import { slugify } from '../../../../lib/slugify';
import { createVacancy, listVacancies } from '../../../../lib/vacancies-admin';

export async function GET(request) {
  const payload = await getSessionPayload();
  if (!requireCapability(payload, CAP.VACANCIES_VIEW)) return apiError(request, 'UNAUTHORIZED', 401);
  const scope = getManagerScope(payload);
  if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

  const url = new URL(request.url);
  const vacFromQs = String(url.searchParams.get('vacancy') || '').trim();
  let vacancyIdFilter = null;
  if (vacFromQs !== '' && vacFromQs !== 'all') {
    const vid = parseInt(vacFromQs, 10);
    if (Number.isFinite(vid)) vacancyIdFilter = vid;
  }

  const sortParams = parseVacanciesSort(Object.fromEntries(url.searchParams.entries()), {
    isAdmin: scope.isAdmin,
  });

  const result = await listVacancies({
    isAdmin: scope.isAdmin,
    companyId: scope.companyId,
    companyFilter: String(url.searchParams.get('company') || '').trim(),
    vacancyIdFilter,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    sortParams,
  });

  return NextResponse.json(result);
}

export async function POST(request) {
  const payload = await getSessionPayload();
  if (!requireCapability(payload, CAP.VACANCIES_MANAGE)) return apiError(request, 'UNAUTHORIZED', 401);
  const scope = getManagerScope(payload);
  if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

  const body = await request.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const status = String(body.status || 'open').trim();

  const requestedCompanyId = body.companyId ?? null;
  const companyId = scope.isAdmin ? (requestedCompanyId ?? scope.companyId) : scope.companyId;

  if (!companyId) return apiError(request, 'COMPANY_REQUIRED', 400);
  if (!title) return apiError(request, 'TITLE_REQUIRED', 400);
  if (!['open', 'closed'].includes(status)) return apiError(request, 'INVALID_STATUS', 400);

  const slug = slugify(body.slug || title);
  if (!slug) return apiError(request, 'INVALID_SLUG', 400);

  const positionsCount = Math.max(1, parseInt(body.positionsCount || '1', 10) || 1);
  const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.targetDate || ''))
    ? String(body.targetDate)
    : null;

  let details;
  try {
    details = parseVacancyDetailsFromBody(body, { forCreate: true });
  } catch (e) {
    if (e?.code === 'INVALID_SALARY_RANGE') return apiError(request, 'INVALID_SALARY_RANGE', 400);
    if (e?.code === 'INVALID_EMPLOYMENT_TYPE') return apiError(request, 'INVALID_EMPLOYMENT_TYPE', 400);
    if (e?.code === 'INVALID_WORKPLACE_MODALITY') {
      return apiError(request, 'INVALID_WORKPLACE_MODALITY', 400);
    }
    if (e?.code === 'INVALID_WORKPLACE_STATE') return apiError(request, 'INVALID_WORKPLACE_STATE', 400);
    throw e;
  }

  const created = await createVacancy({
    companyId,
    title,
    status,
    slug,
    positionsCount,
    targetDate,
    details,
  });
  if (!created.ok) return apiError(request, created.errorCode || 'INVALID_DATA', 400);

  return NextResponse.json(
    { ...created.vacancy, companyName: created.companyName, activeToken: created.activeToken },
    { status: 201 }
  );
}
