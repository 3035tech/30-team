import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { getMotivatorsStatus } from '../../../../../lib/ae/bootstrap-motivators';
import { CAP, getSessionPayload, requireCapability } from '../../../../../lib/ae/require-admin';
import { AE_SCORING_ENGINE_VERSION } from '../../../../../lib/ae/ae-id';
import { apiError, ERR } from '../../../../../lib/api-error';

/** GET /api/admin/ae/status — diagnóstico do módulo Motivadores */
export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.MOTIVATORS_VIEW)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }
    const status = await getMotivatorsStatus(query);
    return NextResponse.json({ ...status, scoringEngine: AE_SCORING_ENGINE_VERSION });
  } catch (err) {
    console.error('GET /api/admin/ae/status', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
