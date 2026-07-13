import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../../lib/auth';
import {
  createReportShare,
  listReportShares,
  loadVacancyReportSource,
} from '../../../../../../lib/vacancy-report';
import { apiError } from '../../../../../../lib/api-error';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

function appOrigin(request) {
  const env = String(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (env) return env;
  try {
    return new URL(request.url).origin;
  } catch {
    return '';
  }
}

export async function GET(request, { params }) {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value;
    const payload = session ? verifyToken(session) : null;
    if (!requireRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);

    const isAdmin = payload?.role === 'admin';
    const companyId = payload?.companyId ?? null;
    if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

    const vacancyId = params?.id;
    if (!vacancyId) return apiError(request, 'INVALID_VACANCY', 400);

    const { searchParams } = new URL(request.url);
    if (searchParams.get('candidates') === '1') {
      const source = await loadVacancyReportSource(vacancyId, { isAdmin, companyId });
      if (!source) return apiError(request, 'NOT_FOUND', 404);
      return NextResponse.json({
        vacancyId: Number(vacancyId),
        vacancy: source.vacancy,
        candidates: source.people.map((p) => ({
          candidateId: p.candidateId,
          name: p.name,
          topType: p.topType,
          pipelineStage: p.pipelineStage,
          vacancyFitScore010: p.vacancyFitScore010,
          vacancyFitLabel: p.vacancyFitLabel,
        })),
      });
    }

    const reports = await listReportShares(vacancyId, { isAdmin, companyId });
    const origin = appOrigin(request);
    return NextResponse.json({
      vacancyId: Number(vacancyId),
      reports: reports.map((r) => ({
        ...r,
        url: origin ? `${origin}/r/${r.token}` : `/r/${r.token}`,
      })),
    });
  } catch (e) {
    console.error('[vacancy-reports GET]', e);
    return apiError(request, 'INTERNAL', 500);
  }
}

export async function POST(request, { params }) {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value;
    const payload = session ? verifyToken(session) : null;
    if (!requireRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);

    const isAdmin = payload?.role === 'admin';
    const companyId = payload?.companyId ?? null;
    if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

    const vacancyId = params?.id;
    if (!vacancyId) return apiError(request, 'INVALID_VACANCY', 400);

    const body = await request.json().catch(() => ({}));
    const candidateIds = Array.isArray(body.candidateIds) ? body.candidateIds : [];
    const expiresInDays = body.expiresInDays;
    const executiveNote = body.executiveNote;

    const source = await loadVacancyReportSource(vacancyId, { isAdmin, companyId });
    if (!source) return apiError(request, 'NOT_FOUND', 404);

    const row = await createReportShare({
      vacancyId: Number(vacancyId),
      companyId: source.vacancy.companyId,
      userId: payload?.userId ?? null,
      candidateIds,
      expiresInDays,
      executiveNote,
      isAdmin,
      sessionCompanyId: companyId,
    });

    const origin = appOrigin(request);
    const url = origin ? `${origin}/r/${row.token}` : `/r/${row.token}`;

    return NextResponse.json(
      {
        id: row.id,
        token: row.token,
        url,
        expiresAt: row.expiresAt,
        candidateCount: Array.isArray(row.snapshot?.candidates) ? row.snapshot.candidates.length : null,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e?.code === 'NO_CANDIDATES') return apiError(request, 'INCOMPLETE_DATA', 400);
    if (e?.code === 'NOT_FOUND') return apiError(request, 'NOT_FOUND', 404);
    console.error('[vacancy-reports POST]', e);
    return apiError(request, 'INTERNAL', 500);
  }
}
