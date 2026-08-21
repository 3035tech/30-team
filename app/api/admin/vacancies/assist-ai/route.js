import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '../../../../../lib/auth';
import {
  CAP,
  requireCapability,
  verifySessionWithCapabilities,
} from '../../../../../lib/ae/require-admin';
import { apiError } from '../../../../../lib/api-error';
import { isOpenAiConfigured } from '../../../../../lib/openai-chat';
import { normalizeLocale } from '../../../../../lib/i18n';
import { checkRateLimit, clientIpFromRequest } from '../../../../../lib/rate-limit';
import { suggestVacancyDescriptionAi } from '../../../../../lib/vacancy-assist-ai';

/**
 * POST /api/admin/vacancies/assist-ai
 * Sem vacancy id — rascunho de descrição no create.
 * body: { action: 'vacancyDescription', title, employmentType, salaryMin, salaryMax, description?, locale? }
 */
export async function POST(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!requireCapability(payload, CAP.VACANCIES_MANAGE)) {
    return apiError(request, 'UNAUTHORIZED', 401);
  }

  if (!isOpenAiConfigured()) {
    return apiError(request, 'RUBRIC_AI_NOT_CONFIGURED', 503);
  }

  const ip = clientIpFromRequest(request);
  const rl = checkRateLimit(`assist-ai-draft:${payload.userId || ip}`, 20, 15 * 60 * 1000);
  if (!rl.ok) {
    return apiError(request, 'RATE_LIMIT', 429, {}, { headers: { 'Retry-After': String(rl.retryAfterSec) } });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || '').trim();
  const locale = normalizeLocale(body.locale || payload?.locale || 'pt-BR');

  if (action !== 'vacancyDescription') {
    return apiError(request, 'INVALID_ACTION', 400);
  }

  const title = String(body.title || '').trim();
  if (!title) return apiError(request, 'TITLE_REQUIRED', 400);

  try {
    const out = await suggestVacancyDescriptionAi({
      vacancy: {
        title,
        employmentType: body.employmentType || null,
        salaryMin: body.salaryMin || null,
        salaryMax: body.salaryMax || null,
        description: body.description || '',
        rubricNotes: body.rubricNotes || '',
      },
      locale,
    });
    return NextResponse.json({ ok: true, action, description: out.description, model: out.model });
  } catch (e) {
    const code = e?.code || 'RUBRIC_AI_FAILED';
    if (code === 'ASSIST_AI_DESC_SHORT') {
      return NextResponse.json({ error: code, errorCode: code, raw: e.raw || null }, { status: 422 });
    }
    return apiError(request, code, 502);
  }
}
