import { NextResponse } from 'next/server';
import { apiError, apiErrorFromResult, ERR, HTTP_STATUS } from '../../../../../../../../../lib/api-error.js';
import { query } from '../../../../../../../../../lib/db.js';
import { DP_DOCUMENT_KEYS } from '../../../../../../../../../lib/domain-status.js';
import { CAP, getManagerScope, getSessionPayload, requireAnyCapability } from '../../../../../../../../../lib/ae/require-admin.js';
import { DP_DOC_MAX_BYTES, clearDpDocumentFile, downloadDpDocumentFile, uploadDpDocumentFile } from '../../../../../../../../../lib/people/employee-dp.js';
import { auditFromRequest } from '../../../../../../../../../lib/audit.js';

export const dynamic = 'force-dynamic';
const DP_OR_TEAM = Object.freeze([CAP.DP_VIEW, CAP.TEAM_VIEW]);
const OVERHEAD = 64 * 1024;
async function context(request, props) {
  const payload = await getSessionPayload();
  if (!payload) return { error: apiError(request, ERR.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED) };
  if (!requireAnyCapability(payload, DP_OR_TEAM)) return { error: apiError(request, ERR.FORBIDDEN, HTTP_STATUS.FORBIDDEN) };
  const scope = getManagerScope(payload); if (!scope.authorized) return { error: apiError(request, ERR.FORBIDDEN, HTTP_STATUS.FORBIDDEN) };
  const params = await props.params; const id = Number(params?.id); const docKey = String(params?.docKey || '');
  if (!Number.isSafeInteger(id) || id <= 0 || !DP_DOCUMENT_KEYS.includes(docKey)) return { error: apiError(request, ERR.INVALID_DATA, HTTP_STATUS.BAD_REQUEST) };
  const found = await query(`SELECT id, company_id AS "companyId" FROM candidates WHERE id = $1 ${scope.isAdmin ? '' : 'AND company_id = $2'} LIMIT 1`, scope.isAdmin ? [id] : [id, scope.companyId]);
  if (!found.rowCount) return { error: apiError(request, ERR.NOT_FOUND, HTTP_STATUS.NOT_FOUND) };
  return { payload, candidate: found.rows[0], docKey };
}
export async function GET(request, props) {
  try { const ctx = await context(request, props); if (ctx.error) return ctx.error; const r = await downloadDpDocumentFile({ query }, { companyId: ctx.candidate.companyId, candidateId: ctx.candidate.id, docKey: ctx.docKey }); if (!r.ok) return apiErrorFromResult(request, r); const name = r.fileName.replace(/[^a-zA-Z0-9._-]/g, '_'); return new NextResponse(r.body, { headers: { 'Cache-Control': 'private, no-store', 'Content-Disposition': `attachment; filename="${name}"`, 'Content-Type': r.contentType, 'X-Content-Type-Options': 'nosniff' } }); } catch (error) { console.error('GET admin DP document', error); return apiError(request, ERR.INTERNAL, HTTP_STATUS.INTERNAL_SERVER_ERROR); }
}
export async function POST(request, props) {
  try { const ctx = await context(request, props); if (ctx.error) return ctx.error; if (Number(request.headers.get('content-length') || 0) > DP_DOC_MAX_BYTES + OVERHEAD) return apiError(request, ERR.INVALID_CV_FILE_SIZE, HTTP_STATUS.BAD_REQUEST); const file = (await request.formData()).get('file'); if (!file || typeof file.arrayBuffer !== 'function' || Number(file.size) <= 0) return apiError(request, ERR.INVALID_DATA, HTTP_STATUS.BAD_REQUEST); if (Number(file.size) > DP_DOC_MAX_BYTES) return apiError(request, ERR.INVALID_CV_FILE_SIZE, HTTP_STATUS.BAD_REQUEST); const buffer = Buffer.from(await file.arrayBuffer()); const r = await uploadDpDocumentFile({ query }, { companyId: ctx.candidate.companyId, candidateId: ctx.candidate.id, docKey: ctx.docKey, userId: ctx.payload.userId, file: { buffer, size: buffer.length, mimeType: file.type, originalName: file.name } }); if (!r.ok) return apiErrorFromResult(request, r); await auditFromRequest(request, { actorUserId: ctx.payload.userId || null, companyId: ctx.candidate.companyId, action: 'dp.document.file_uploaded', targetType: 'candidate', targetId: ctx.candidate.id, metadata: { docKey: ctx.docKey } }); return NextResponse.json({ ok: true, item: r.item }, { headers: { 'Cache-Control': 'no-store' } }); } catch (error) { console.error('POST admin DP document', error); if (error?.code === ERR.INVALID_CV_FILE_SIZE || error?.code === ERR.INVALID_CV_FILE_TYPE) return apiError(request, error.code, HTTP_STATUS.BAD_REQUEST); return apiError(request, ERR.INTERNAL, HTTP_STATUS.INTERNAL_SERVER_ERROR); }
}
export async function DELETE(request, props) {
  try { const ctx = await context(request, props); if (ctx.error) return ctx.error; const r = await clearDpDocumentFile({ query }, { companyId: ctx.candidate.companyId, candidateId: ctx.candidate.id, docKey: ctx.docKey, userId: ctx.payload.userId }); if (!r.ok) return apiErrorFromResult(request, r); await auditFromRequest(request, { actorUserId: ctx.payload.userId || null, companyId: ctx.candidate.companyId, action: 'dp.document.file_removed', targetType: 'candidate', targetId: ctx.candidate.id, metadata: { docKey: ctx.docKey } }); return NextResponse.json({ ok: true, item: r.item }, { headers: { 'Cache-Control': 'no-store' } }); } catch (error) { console.error('DELETE admin DP document', error); return apiError(request, ERR.INTERNAL, HTTP_STATUS.INTERNAL_SERVER_ERROR); }
}
