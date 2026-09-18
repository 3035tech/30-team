import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, ERR } from '../../../../../../lib/api-error.js';
import { refreshMobileSession } from '../../../../../../lib/mobile-manager-session.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../../../lib/rate-limit.js';
import { parseJsonBody } from '../../../../../../lib/validate.js';

const refreshSchema = z.object({ refreshToken: z.string().min(32).max(256) });

export async function POST(request) {
  try {
    const rate = await checkRateLimit(`mobile-refresh:${clientIpFromRequest(request)}`, 60, 15 * 60 * 1000);
    if (!rate.ok) return apiError(request, ERR.RATE_LIMIT, 429, {}, { headers: { 'Retry-After': String(rate.retryAfterSec), 'Cache-Control': 'no-store' } });
    const parsed = await parseJsonBody(request, refreshSchema);
    if (!parsed.ok) return parsed.response;
    const result = await refreshMobileSession(parsed.data.refreshToken);
    if (!result.ok) return apiError(request, ERR.INVALID_TOKEN, 401, {}, { headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[mobile-session-refresh]', error);
    return apiError(request, ERR.INTERNAL, 500, {}, { headers: { 'Cache-Control': 'no-store' } });
  }
}
