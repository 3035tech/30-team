import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, ERR } from '../../../../../../lib/api-error.js';
import { revokeMobileRefreshSession } from '../../../../../../lib/mobile-refresh-session.js';
import { parseJsonBody } from '../../../../../../lib/validate.js';

const logoutSchema = z.object({ refreshToken: z.string().min(32).max(256) });

export async function POST(request) {
  try {
    const parsed = await parseJsonBody(request, logoutSchema);
    if (!parsed.ok) return parsed.response;
    await revokeMobileRefreshSession(parsed.data.refreshToken);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[mobile-session-logout]', error);
    return apiError(request, ERR.INTERNAL, 500, {}, { headers: { 'Cache-Control': 'no-store' } });
  }
}
