import { NextResponse } from 'next/server';
import { apiError, apiErrorFromResult, ERR, HTTP_STATUS } from '../../../../../../../lib/api-error.js';
import { query, withTransaction } from '../../../../../../../lib/db.js';
import { getEmployeeSessionPayload } from '../../../../../../../lib/employee-session.js';
import { checkRateLimit } from '../../../../../../../lib/rate-limit.js';
import {
  DP_DOC_MAX_BYTES,
  clearLeaveAttachment,
  downloadLeaveAttachment,
  getEmployeeDisplayName,
  getEmployeeDpHome,
  uploadLeaveAttachment,
} from '../../../../../../../lib/people/employee-dp.js';
import { notifyCompanyManagers } from '../../../../../../../lib/manager-notifications.js';
import { NOTIF } from '../../../../../../../lib/manager-notification-catalog.js';

export const dynamic = 'force-dynamic';

const UPLOAD_LIMIT = 20;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });

function safeFileName(fileName) {
  return String(fileName || 'attachment.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function boundedFormData(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > DP_DOC_MAX_BYTES + MULTIPART_OVERHEAD_BYTES) {
        await reader.cancel();
        throw Object.assign(new Error('upload_limit'), { code: ERR.INVALID_CV_FILE_SIZE });
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { 'Content-Type': request.headers.get('content-type') || '' },
    }).formData();
  } catch {
    return null;
  }
}

async function context(request, props) {
  const session = await getEmployeeSessionPayload();
  if (!session) return { error: apiError(request, ERR.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED) };
  const params = await props.params;
  const rawId = String(params?.id || '');
  if (!/^[1-9]\d*$/.test(rawId) || !Number.isSafeInteger(Number(rawId))) {
    return { error: apiError(request, ERR.INVALID_DATA, HTTP_STATUS.BAD_REQUEST) };
  }
  return { session, id: Number(rawId) };
}

/** Download the authenticated employee's sick-leave attachment. */
export async function GET(request, props) {
  try {
    const ctx = await context(request, props);
    if (ctx.error) return ctx.error;
    const result = await downloadLeaveAttachment({ query }, { id: ctx.id, ...ctx.session });
    if (!result.ok) return apiErrorFromResult(request, result);
    const fileName = safeFileName(result.fileName);
    return new NextResponse(result.body, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': result.contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return apiError(request, ERR.INTERNAL, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

/** Upload or replace the authenticated employee's sick-leave attachment. */
export async function POST(request, props) {
  try {
    const ctx = await context(request, props);
    if (ctx.error) return ctx.error;
    const limit = await checkRateLimit(
      `employee-leave-file:${ctx.session.companyId}:${ctx.session.candidateId}`,
      UPLOAD_LIMIT,
      UPLOAD_WINDOW_MS
    );
    if (!limit.ok) return apiError(request, ERR.RATE_LIMIT, HTTP_STATUS.TOO_MANY_REQUESTS);
    if (Number(request.headers.get('content-length') || 0) > DP_DOC_MAX_BYTES + MULTIPART_OVERHEAD_BYTES) {
      return apiError(request, ERR.INVALID_CV_FILE_SIZE, HTTP_STATUS.BAD_REQUEST);
    }
    const form = await boundedFormData(request);
    if (!form) return apiError(request, ERR.INVALID_DATA, HTTP_STATUS.BAD_REQUEST);
    const file = form.get('file');
    if ([...form.keys()].some((key) => key !== 'file') || form.getAll('file').length !== 1 || !file || typeof file.arrayBuffer !== 'function') {
      return apiError(request, ERR.INVALID_DATA, HTTP_STATUS.BAD_REQUEST);
    }
    if (!file.size || file.size > DP_DOC_MAX_BYTES) {
      return apiError(request, ERR.INVALID_CV_FILE_SIZE, HTTP_STATUS.BAD_REQUEST);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await withTransaction(async (client) => {
      const own = await client.query(
        'SELECT id FROM employee_leave_requests WHERE id = $1 AND company_id = $2 AND candidate_id = $3 FOR UPDATE',
        [ctx.id, ctx.session.companyId, ctx.session.candidateId]
      );
      if (!own.rowCount) return { ok: false, errorCode: ERR.NOT_FOUND };
      return uploadLeaveAttachment(client, {
        id: ctx.id,
        companyId: ctx.session.companyId,
        candidateId: ctx.session.candidateId,
        file: { buffer, size: buffer.length, mimeType: file.type, originalName: file.name },
      });
    });
    if (!result.ok) return apiErrorFromResult(request, result);
    try {
      const candidateName = await getEmployeeDisplayName({ query }, ctx.session);
      await notifyCompanyManagers(query, {
        companyId: ctx.session.companyId,
        type: NOTIF.DP_LEAVE_FILE,
        entityType: 'leave',
        entityId: ctx.id,
        dedupeKey: `dp_leave_file:${ctx.id}:${new Date().toISOString().slice(0, 10)}`,
        payload: { candidateId: ctx.session.candidateId, candidateName, leaveId: ctx.id },
      });
    } catch {
      // The attachment is already committed; notification failure is non-fatal.
    }
    const home = await getEmployeeDpHome({ query }, ctx.session);
    if (!home.ok) return apiErrorFromResult(request, home);
    return NextResponse.json(home, { headers: NO_STORE });
  } catch (error) {
    if (error?.code === ERR.INVALID_CV_FILE_SIZE || error?.code === ERR.INVALID_CV_FILE_TYPE) {
      return apiError(request, error.code, HTTP_STATUS.BAD_REQUEST);
    }
    return apiError(request, ERR.INTERNAL, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

/** Remove the authenticated employee's sick-leave attachment. */
export async function DELETE(request, props) {
  try {
    const ctx = await context(request, props);
    if (ctx.error) return ctx.error;
    const result = await clearLeaveAttachment({ query }, {
      id: ctx.id,
      companyId: ctx.session.companyId,
      candidateId: ctx.session.candidateId,
    });
    if (!result.ok) return apiErrorFromResult(request, result);
    const home = await getEmployeeDpHome({ query }, ctx.session);
    if (!home.ok) return apiErrorFromResult(request, home);
    return NextResponse.json(home, { headers: NO_STORE });
  } catch {
    return apiError(request, ERR.INTERNAL, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
