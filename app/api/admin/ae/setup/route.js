import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { bootstrapMotivators } from '../../../../../lib/ae/bootstrap-motivators';
import { CAP, getSessionPayload, requireCapability } from '../../../../../lib/ae/require-admin';
import { apiError } from '../../../../../lib/api-error';

/** POST /api/admin/ae/setup — inicializa definition + perguntas + templates */
export async function POST(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.MOTIVATORS_VIEW)) {
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
