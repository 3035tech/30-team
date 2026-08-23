import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { apiError } from '../../../../../lib/api-error';
import {
  getPublicTeamPulseByToken,
  submitPublicTeamPulse,
} from '../../../../../lib/people/team-pulses';

/** GET /api/public/team-pulse/[token] */
export async function GET(request, { params }) {
  try {
    const token = params?.token;
    if (!token) return apiError(request, 'NOT_FOUND', 404);
    const loaded = await getPublicTeamPulseByToken(query, token);
    if (!loaded.ok) {
      const code = loaded.errorCode || 'NOT_FOUND';
      const status = code === 'NOT_FOUND' ? 404 : 410;
      return apiError(request, code, status);
    }
    return NextResponse.json({
      title: loaded.pulse.title,
      questions: loaded.pulse.questions,
    });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('GET public team-pulse', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

/** POST /api/public/team-pulse/[token] */
export async function POST(request, { params }) {
  try {
    const token = params?.token;
    if (!token) return apiError(request, 'NOT_FOUND', 404);
    const body = await request.json().catch(() => ({}));
    const submitted = await submitPublicTeamPulse(query, {
      token,
      answers: body.answers,
    });
    if (!submitted.ok) {
      const code = submitted.errorCode || 'INVALID_DATA';
      const status =
        code === 'ALREADY_USED' || code === 'EXPIRED' || code === 'UNAVAILABLE' ? 410 : 400;
      return apiError(request, code, status);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('POST public team-pulse', err);
    return apiError(request, 'INTERNAL', 500);
  }
}
