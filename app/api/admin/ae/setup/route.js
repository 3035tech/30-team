import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { bootstrapMotivators, getMotivatorsStatus } from '../../../../../lib/ae/bootstrap-motivators';
import { getSessionPayload, requireManagerRole } from '../../../../../lib/ae/require-admin';
import { AE_SCORING_ENGINE_VERSION } from '../../../../../lib/ae/ae-id';
import { apiError } from '../../../../../lib/api-error';

/** GET /api/admin/ae/status — diagnóstico do módulo */
export async function GET(request) {
  try {
    const payload = getSessionPayload();
    if (!requireManagerRole(payload)) {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    const status = await getMotivatorsStatus(query);
    return NextResponse.json({ ...status, scoringEngine: AE_SCORING_ENGINE_VERSION });
  } catch (err) {
    console.error('GET /api/admin/ae/status', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

/** POST /api/admin/ae/setup — inicializa definition + perguntas + templates */
export async function POST(request) {
  try {
    const payload = getSessionPayload();
    if (!requireManagerRole(payload)) {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    const result = await bootstrapMotivators(query, { repairWeights: true });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('POST /api/admin/ae/setup', err);
    if (err?.code === '42P01') {
      return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    }
    return apiError(request, 'MODULE_INIT_FAILED', 500);
  }
}
