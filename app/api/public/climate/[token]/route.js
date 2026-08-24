import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { apiError } from '../../../../../lib/api-error';
import {
  resolveClimateInviteByToken,
  submitClimateResponse,
} from '../../../../../lib/people/climate-surveys';

/** GET /api/public/climate/[token] — anonymous survey form (no PII). */
export async function GET(request, { params }) {
  try {
    const token = params?.token;
    const resolved = await resolveClimateInviteByToken(query, token);
    if (!resolved.ok) {
      const status =
        resolved.errorCode === 'ALREADY_SUBMITTED'
          ? 409
          : resolved.errorCode === 'EXPIRED_LINK' || resolved.errorCode === 'SURVEY_NOT_OPEN'
            ? 410
            : 404;
      return apiError(request, resolved.errorCode || 'INVALID_TOKEN', status);
    }
    return NextResponse.json({
      title: resolved.title,
      description: resolved.description,
      questions: resolved.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        scaleMin: q.scaleMin,
        scaleMax: q.scaleMax,
        questionKind: q.questionKind || 'likert',
      })),
    });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('GET public climate', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

/** POST /api/public/climate/[token] — submit anonymous answers. */
export async function POST(request, { params }) {
  try {
    const token = params?.token;
    const body = await request.json().catch(() => ({}));
    const result = await submitClimateResponse(query, {
      token,
      answers: body.answers,
    });
    if (!result.ok) {
      const status =
        result.errorCode === 'ALREADY_SUBMITTED'
          ? 409
          : result.errorCode === 'INCOMPLETE_ANSWERS'
            ? 400
            : result.errorCode === 'EXPIRED_LINK' || result.errorCode === 'SURVEY_NOT_OPEN'
              ? 410
              : 404;
      return apiError(request, result.errorCode || 'INVALID_DATA', status);
    }
    return NextResponse.json({ ok: true, submittedAt: result.submittedAt });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('POST public climate', err);
    return apiError(request, 'INTERNAL', 500);
  }
}
