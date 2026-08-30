import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../../../lib/admin-api.js';
import { apiError, apiErrorFromResult, ERR } from '../../../../../../../lib/api-error.js';
import { query } from '../../../../../../../lib/db.js';
import { CAP } from '../../../../../../../lib/permissions.js';
import {
  clearLeaveAttachment,
  uploadLeaveAttachment,
} from '../../../../../../../lib/people/employee-dp.js';
import { checkRateLimit } from '../../../../../../../lib/rate-limit.js';
import { zPositiveInt } from '../../../../../../../lib/validate.js';

/** POST /api/admin/dp/leave/[id]/file — atestado attachment */
export const POST = withAdminApi(
  {
    anyCap: [CAP.DP_VIEW, CAP.TEAM_VIEW],
    requireCompany: true,
    companyFrom: 'query',
    logLabel: 'dp-leave-file-upload',
  },
  async ({ request, payload, params, companyId }) => {
    const idParsed = zPositiveInt.safeParse(params?.id);
    if (!idParsed.success) return apiError(request, ERR.INVALID_ID, 400);

    const rl = await checkRateLimit(`dp-leave-file:${payload.userId}`, 30, 60 * 60 * 1000);
    if (!rl.ok) return apiError(request, ERR.RATE_LIMIT, 429);

    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return apiError(request, ERR.INVALID_DATA, 400);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const result = await uploadLeaveAttachment(
        { query },
        {
          id: idParsed.data,
          companyId,
          userId: payload.userId,
          file: {
            buffer,
            size: buffer.length,
            mimeType: file.type,
            originalName: file.name,
          },
        }
      );
      if (!result.ok) return apiErrorFromResult(request, result);
      return NextResponse.json({ ok: true, item: result.item });
    } catch (err) {
      const code = err?.code;
      if (code === ERR.INVALID_CV_FILE_SIZE || code === ERR.INVALID_CV_FILE_TYPE) {
        return apiError(request, code, 400);
      }
      throw err;
    }
  }
);

/** DELETE /api/admin/dp/leave/[id]/file */
export const DELETE = withAdminApi(
  {
    anyCap: [CAP.DP_VIEW, CAP.TEAM_VIEW],
    requireCompany: true,
    companyFrom: 'query',
    logLabel: 'dp-leave-file-clear',
  },
  async ({ request, params, companyId }) => {
    const idParsed = zPositiveInt.safeParse(params?.id);
    if (!idParsed.success) return apiError(request, ERR.INVALID_ID, 400);

    const result = await clearLeaveAttachment(
      { query },
      { id: idParsed.data, companyId }
    );
    if (!result.ok) return apiErrorFromResult(request, result);
    return NextResponse.json({ ok: true, item: result.item });
  }
);
