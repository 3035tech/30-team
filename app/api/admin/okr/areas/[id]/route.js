/**
 * DELETE /api/admin/okr/areas/[id]
 */

import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../../lib/admin-api.js';
import { CAP } from '../../../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../../../lib/api-error.js';
import { audit } from '../../../../../../lib/audit.js';
import { z, zPositiveInt } from '../../../../../../lib/validate.js';
import { deleteOkrArea } from '../../../../../../lib/okr-cycles.js';

export const DELETE = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    companyFrom: 'query',
    query: z.object({ companyId: zPositiveInt.optional() }),
    logLabel: 'okr areas DELETE',
  },
  async ({ request, companyId, payload, params }) => {
    const areaId = Number(params?.id);
    if (!Number.isFinite(areaId) || areaId <= 0) {
      return apiErrorFromResult(request, { ok: false, errorCode: ERR.INVALID_ID });
    }
    const result = await deleteOkrArea(null, { companyId, areaId });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.NOT_FOUND });
    }
    await audit({
      actorUserId: payload.userId || null,
      action: 'okr.area_delete',
      companyId,
      targetType: 'okr_area',
      targetId: areaId,
      metadata: {},
    });
    return NextResponse.json({ ok: true });
  }
);
