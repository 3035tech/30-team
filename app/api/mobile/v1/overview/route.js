import { NextResponse } from 'next/server';
import { apiError, ERR } from '../../../../../lib/api-error.js';
import {
  authenticateMobileAccessToken,
  bearerTokenFromRequest,
} from '../../../../../lib/mobile-manager-session.js';
import { loadMobileOverview } from '../../../../../lib/mobile-overview.js';
import { CAP } from '../../../../../lib/permissions.js';

const NO_STORE_HEADERS = Object.freeze({ 'Cache-Control': 'no-store' });

export async function GET(request) {
  try {
    const authenticated = await authenticateMobileAccessToken(bearerTokenFromRequest(request));
    if (!authenticated) {
      return apiError(request, ERR.UNAUTHORIZED, 401, {}, { headers: NO_STORE_HEADERS });
    }
    if (!authenticated.session.activeMembership.capabilities.includes(CAP.OVERVIEW_VIEW)) {
      return apiError(request, ERR.UNAUTHORIZED, 401, {}, { headers: NO_STORE_HEADERS });
    }

    const overview = await loadMobileOverview(
      authenticated.session.activeMembership.company.id
    );
    return NextResponse.json(overview, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('[mobile-overview]', error);
