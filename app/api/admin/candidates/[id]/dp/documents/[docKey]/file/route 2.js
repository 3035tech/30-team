import { NextResponse } from 'next/server';
import { dpDownloadResponse } from '../../../../../../../../../lib/people/dp-download-response.js';
import { downloadDpDocumentFile } from '../../../../../../../../../lib/people/employee-dp.js';
import { withAdminApi } from '../../../../../../../../../lib/admin-api.js';
import { zPositiveInt } from '../../../../../../../../../lib/validate.js';
import { query } from '../../../../../../../../../lib/db.js';
import { apiError, apiErrorFromResult, ERR } from '../../../../../../../../../lib/api-error.js';
import {
  CAP,
  getManagerScope,
  getSessionPayload,
  requireAnyCapability,
} from '../../../../../../../../../lib/ae/require-admin.js';
import { checkRateLimit } from '../../../../../../../../../lib/rate-limit.js';
import {
  clearDpDocumentFile,
  uploadDpDocumentFile,
} from '../../../../../../../../../lib/people/employee-dp.js';
import { auditFromRequest } from '../../../../../../../../../lib/audit.js';

const DP_OR_TEAM = Object.freeze([CAP.DP_VIEW, CAP.TEAM_VIEW]);

async function loadCandidateScope(candidateId, scope) {
  const c = await query(
    `SELECT id, company_id AS "companyId" FROM candidates WHERE id = $1 LIMIT 1`,
    [candidateId]
  );
  if (c.rowCount === 0) return { error: ERR.NOT_FOUND };
  if (!scope.isAdmin && String(c.rows[0].companyId) !== String(scope.companyId)) {
    return { error: ERR.UNAUTHORIZED };
  }
  return { candidate: c.rows[0] };
}

/** Authenticated private document download. */

export const GET = withAdminApi(
  { anyCap: DP_OR_TEAM, requireCompany: false, companyFrom: 'none', logLabel: 'dp-document-file-download' },
  async ({ request, payload, scope, params }) => {
    const parsed = zPositiveInt.safeParse(params?.id);
    if (!parsed.success) return apiError(request, ERR.INVALID_ID, 400);
    return dpDownloadResponse(request, `manager:${payload.userId}`, async () => {
      const loaded = await loadCandidateScope(parsed.data, scope);
      if (loaded.error) return { ok: false, errorCode: ERR.NOT_FOUND };
      return downloadDpDocumentFile({ query }, {
        companyId: loaded.candidate.companyId, candidateId: parsed.data, docKey: params?.docKey,
      });
    });
  }
);

/** POST multipart file upload for a DP document. */
export async function POST(request, props) {
  const params = await props.params;
  try {
    const payload = await getSessionPayload();
    if (!requireAnyCapability(payload, DP_OR_TEAM)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const candidateId = params?.id;
    const docKey = params?.docKey;
    if (!candidateId || !docKey) return apiError(request, ERR.INVALID_ID, 400);
    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) {
      return apiError(request, loaded.error, loaded.error === ERR.NOT_FOUND ? 404 : 401);
    }

    const rl = await checkRateLimit(`dp-doc:${payload.userId}`, 30, 60 * 60 * 1000);
    if (!rl.ok) return apiError(request, ERR.RATE_LIMIT, 429);

    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return apiError(request, ERR.INVALID_DATA, 400);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadDpDocumentFile({ query }, {
      companyId: loaded.candidate.companyId,
      candidateId,
      docKey,
      userId: payload.userId,
      file: {
        buffer,
        size: buffer.length,
        mimeType: file.type,
        originalName: file.name,
      },
    });
    if (!result.ok) return apiErrorFromResult(request, result);
    await auditFromRequest(request, {
      actorUserId: payload.userId || null,
      companyId: loaded.candidate.companyId,
      action: 'dp.document.file_uploaded',
      targetType: 'employee_dp_document',
      targetId: result.item.id,
      metadata: { candidateId: Number(candidateId), docKey },
    });
    return NextResponse.json({ ok: true, item: result.item });
  } catch (err) {
    console.error('POST dp document file', err);
    const code = err?.code;
    if (code === ERR.INVALID_CV_FILE_SIZE || code === ERR.INVALID_CV_FILE_TYPE) {
      return apiError(request, code, 400);
    }
    return apiError(request, ERR.INTERNAL, 500);
  }
}

/** DELETE attachment */
export async function DELETE(request, props) {
  const params = await props.params;
  try {
    const payload = await getSessionPayload();
    if (!requireAnyCapability(payload, DP_OR_TEAM)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, ERR.UNAUTHORIZED, 401);

    const candidateId = params?.id;
    const docKey = params?.docKey;
    if (!candidateId || !docKey) return apiError(request, ERR.INVALID_ID, 400);
    const loaded = await loadCandidateScope(candidateId, scope);
    if (loaded.error) {
      return apiError(request, loaded.error, loaded.error === ERR.NOT_FOUND ? 404 : 401);
    }

    const result = await clearDpDocumentFile({ query }, {
      companyId: loaded.candidate.companyId,
      candidateId,
      docKey,
      userId: payload.userId,
    });
    if (!result.ok) return apiErrorFromResult(request, result);
    await auditFromRequest(request, {
      actorUserId: payload.userId || null,
      companyId: loaded.candidate.companyId,
      action: 'dp.document.file_removed',
      targetType: 'employee_dp_document',
      targetId: result.item.id,
      metadata: { candidateId: Number(candidateId), docKey },
    });
    return NextResponse.json({ ok: true, item: result.item });
  } catch (err) {
    console.error('DELETE dp document file', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
