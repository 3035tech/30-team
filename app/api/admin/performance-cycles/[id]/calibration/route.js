/**
 * GET  /api/admin/performance-cycles/[id]/calibration — calibration queue
 * POST /api/admin/performance-cycles/[id]/calibration — adjust overall / 9Box
 */

import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../../lib/admin-api.js';
import { CAP } from '../../../../../../lib/ae/require-admin.js';
import { apiError, apiErrorFromResult, ERR, httpStatusForError } from '../../../../../../lib/api-error.js';
import { audit } from '../../../../../../lib/audit.js';
import { z, zPositiveInt } from '../../../../../../lib/validate.js';
import {
  calibratePerformanceReview,
  listCalibrationQueue,
} from '../../../../../../lib/people/performance-calibration.js';

function parseCycleId(params) {
  const id = Number(params?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

const listQuerySchema = z.object({
  companyId: zPositiveInt.optional(),
  limit: z.coerce.number().int().min(1).max(80).optional(),
});

const calibrateBodySchema = z.object({
  companyId: zPositiveInt.optional(),
  reviewId: zPositiveInt,
  overallScore: z.union([z.coerce.number(), z.null()]).optional(),
  nineBoxCell: z.union([z.coerce.number().int(), z.null()]).optional(),
  calibrationNotes: z.string().max(2000).optional(),
});

/** GET calibration queue for submitted reviews in a cycle */
export const GET = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    query: listQuerySchema,
    companyFrom: 'query',
    logLabel: 'performance-calibration GET',
  },
  async ({ request, companyId, query, params }) => {
    const cycleId = parseCycleId(params);
    if (!cycleId) {
      return apiError(request, ERR.INVALID_ID, httpStatusForError(ERR.INVALID_ID));
    }
    const result = await listCalibrationQueue(null, {
      companyId,
      cycleId,
      limit: query.limit,
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.INVALID_ID });
    }
    return NextResponse.json(result);
  }
);

/** POST calibrate a submitted review (audit before/after) */
export const POST = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    body: calibrateBodySchema,
    companyFrom: 'body',
    logLabel: 'performance-calibration POST',
  },
  async ({ request, companyId, body, payload, params }) => {
    const cycleId = parseCycleId(params);
    if (!cycleId) {
      return apiError(request, ERR.INVALID_ID, httpStatusForError(ERR.INVALID_ID));
    }
    const result = await calibratePerformanceReview(null, {
      companyId,
      reviewId: body.reviewId,
      overallScore: body.overallScore,
      nineBoxCell: body.nineBoxCell,
      calibrationNotes: body.calibrationNotes,
      calibratedByUserId: payload.userId || null,
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.NOT_FOUND });
    }
    await audit({
      actorUserId: payload.userId || null,
      action: 'performance_calibration_adjust',
      companyId,
      targetType: 'performance_review',
      targetId: body.reviewId,
      metadata: {
        cycleId,
        before: result.before,
        after: {
          overallScore: result.review.overallScore,
          nineBoxCell: result.review.nineBoxCell,
          calibrationNotes: result.review.calibrationNotes,
        },
      },
    });
    return NextResponse.json(result);
  }
);
