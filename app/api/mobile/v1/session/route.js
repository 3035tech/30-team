import { NextResponse } from 'next/server';
import { apiError, ERR } from '../../../../../lib/api-error.js';
import {
  authenticateMobileAccessToken,
  bearerTokenFromRequest,
  MOBILE_AUTH_OUTCOME,
} from '../../../../../lib/mobile-manager-session.js';

export async function GET(request) {
  try {
    const authenticated = await authenticateMobileAccessToken(bearerTokenFromRequest(request));
    if (!authenticated) {
      return apiError(request, ERR.UNAUTHORIZED, 401, {}, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    return NextResponse.json(
      {
        outcome: MOBILE_AUTH_OUTCOME.AUTHENTICATED,
        session: authenticated.session,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[mobile-session]', error);
    return apiError(request, ERR.INTERNAL, 500, {}, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
