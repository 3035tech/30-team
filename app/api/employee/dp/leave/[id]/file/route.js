import { NextResponse } from 'next/server';
import { apiError, apiErrorFromResult, ERR } from '../../../../../../../lib/api-error.js';
import { query } from '../../../../../../../lib/db.js';
import { getEmployeeSessionPayload } from '../../../../../../../lib/employee-session.js';
import {
  clearLeaveAttachment,
  uploadLeaveAttachment,
} from '../../../../../../../lib/people/employee-dp.js';
import { checkRateLimit } from '../../../../../../../lib/rate-limit.js';
import { zPositiveInt } from '../../../../../../../lib/validate.js';

export const dynamic = 'force-dynamic';

/** POST multipart atestado on own sick leave */
export async function POST(request, { params }) {
  try {
    const session = await getEmployeeSessionPayload();
    if (!session) return apiError(request, ERR.UNAUTHORIZED, 401);

    const idParsed = zPositiveInt.safeParse(params?.id);
    if (!idParsed.success) return apiError(request, ERR.INVALID_ID, 400);

    const rl = await checkRateLimit(
      `emp-leave-file:${session.candidateId}`,
      20,
      60 * 60 * 1000
    );
    if (!rl.ok) return apiError(request, ERR.RATE_LIMIT, 429);

    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return apiError(request, ERR.INVALID_DATA, 400);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadLeaveAttachment(
      { query },
      {
        id: idParsed.data,
        companyId: session.companyId,
        candidateId: session.candidateId,
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
    console.error('POST employee leave file', err);
    const code = err?.code;
    if (code === ERR.INVALID_CV_FILE_SIZE || code === ERR.INVALID_CV_FILE_TYPE) {
      return apiError(request, code, 400);
    }
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/** DELETE own leave attachment */
export async function DELETE(request, { params }) {
  try {
    const session = await getEmployeeSessionPayload();
    if (!session) return apiError(request, ERR.UNAUTHORIZED, 401);

    const idParsed = zPositiveInt.safeParse(params?.id);
    if (!idParsed.success) return apiError(request, ERR.INVALID_ID, 400);

    const result = await clearLeaveAttachment(
      { query },
      {
        id: idParsed.data,
        companyId: session.companyId,
        candidateId: session.candidateId,
      }
    );
    if (!result.ok) return apiErrorFromResult(request, result);
    return NextResponse.json({ ok: true, item: result.item });
  } catch (err) {
    console.error('DELETE employee leave file', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
