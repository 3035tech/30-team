import { NextResponse } from 'next/server';
import { queryRead } from '../../../lib/db';
import { verifyToken, COOKIE_NAME } from '../../../lib/auth';
import { cookies } from 'next/headers';
import { checkRateLimit, clientIpFromRequest } from '../../../lib/rate-limit';
import { apiError } from '../../../lib/api-error';
import { JOB_ATTR_COOKIE } from '../../../lib/job-attribution';
import { normalizeAssessmentTelemetry, submitAssessmentResult } from '../../../lib/assessment-submit';

// POST /api/results — salva resultado de um candidato (com área)
export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request);
    const rl = checkRateLimit(`results:${ip}`, 40, 10 * 60 * 1000);
    if (!rl.ok) {
      return apiError(request, 'RATE_LIMIT', 429, {}, { headers: { 'Retry-After': String(rl.retryAfterSec) } });
    }

    const body = await request.json().catch(() => ({}));
    const { name, email, areaKey, consent, answers, companyToken, vacancyToken, inviteToken } = body;
    const { fillDurationMs, copyEventCount } = normalizeAssessmentTelemetry(body);
    const attributionCookieValue = cookies().get(JOB_ATTR_COOKIE)?.value;

    const result = await submitAssessmentResult({
      name,
      email,
      areaKey,
      consent,
      answers,
      companyToken,
      vacancyToken,
      inviteToken,
      profileBody: body,
      attributionCookieValue,
      fillDurationMs,
      copyEventCount,
    });

    if (!result.ok) {
      return apiError(request, result.errorCode, result.status || 400, result.values || {});
    }

    return NextResponse.json(
      {
        ok: true,
        candidateId: result.candidateId,
        assessmentId: result.assessmentId,
        createdAt: result.createdAt,
        ...(result.vacancyId != null ? { vacancyId: result.vacancyId } : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao salvar resultado:', error);
    return apiError(request, 'INTERNAL', 500);
  }
}

// GET /api/results — legado: tabela `results` (global por nome). Preferir dados do dashboard via assessments.
export async function GET(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload?.role !== 'admin') {
    return apiError(request, 'UNAUTHORIZED', 401);
  }

  try {
    const result = await queryRead(
      `SELECT id, name, top_type AS "topType", scores, created_at AS "createdAt"
       FROM results
       ORDER BY created_at DESC`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar resultados:', error);
    return apiError(request, 'INTERNAL', 500);
  }
}
