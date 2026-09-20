import { NextResponse } from 'next/server';
import { apiError, apiErrorFromResult, ERR, HTTP_STATUS } from '../../../../../../../lib/api-error.js';
import { query } from '../../../../../../../lib/db.js';
import { DP_DOCUMENT_KEYS } from '../../../../../../../lib/domain-status.js';
import { getEmployeeSessionPayload } from '../../../../../../../lib/employee-session.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../../../../lib/rate-limit.js';
import { DP_DOC_MAX_BYTES, clearDpDocumentFile, downloadDpDocumentFile, getEmployeeDpHome, uploadDpDocumentFile } from '../../../../../../../lib/people/employee-dp.js';

export const dynamic = 'force-dynamic';
const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });
const LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;
const OVERHEAD = 64 * 1024;

async function context(request, props) {
  const session = await getEmployeeSessionPayload();
  if (!session) return { error: apiError(request, ERR.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED) };
  const params = await props.params;
  const docKey = String(params?.docKey || '');
  if (!DP_DOCUMENT_KEYS.includes(docKey)) return { error: apiError(request, ERR.INVALID_DATA, HTTP_STATUS.BAD_REQUEST) };
  return { session, docKey };
}
async function limit(request, session) {
  return checkRateLimit(`employee-dp-document:${session.companyId}:${session.candidateId}:${clientIpFromRequest(request)}`, LIMIT, WINDOW_MS);
}
export async function GET(request, props) {
  try {
    const ctx = await context(request, props); if (ctx.error) return ctx.error;
    const result = await downloadDpDocumentFile({ query }, { companyId: ctx.session.companyId, candidateId: ctx.session.candidateId, docKey: ctx.docKey });
    if (!result.ok) return apiErrorFromResult(request, result);
    const fileName = result.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return new NextResponse(result.body, { headers: { 'Cache-Control': 'private, no-store', 'Content-Disposition': `attachment; filename="${fileName}"`, 'Content-Type': result.contentType, 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) { console.error('GET employee DP document', error); return apiError(request, ERR.INTERNAL, HTTP_STATUS.INTERNAL_SERVER_ERROR); }
}
export async function POST(request, props) {
  try {
    const ctx = await context(request, props); if (ctx.error) return ctx.error;
    if (!(await limit(request, ctx.session)).ok) return apiError(request, ERR.RATE_LIMIT, HTTP_STATUS.TOO_MANY_REQUESTS);
    if (Number(request.headers.get('content-length') || 0) > DP_DOC_MAX_BYTES + OVERHEAD) return apiError(request, ERR.INVALID_CV_FILE_SIZE, HTTP_STATUS.BAD_REQUEST);
    const file = (await request.formData()).get('file');
    if (!file || typeof file.arrayBuffer !== 'function' || Number(file.size) <= 0) return apiError(request, ERR.INVALID_DATA, HTTP_STATUS.BAD_REQUEST);
    if (Number(file.size) > DP_DOC_MAX_BYTES) return apiError(request, ERR.INVALID_CV_FILE_SIZE, HTTP_STATUS.BAD_REQUEST);
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadDpDocumentFile({ query }, { companyId: ctx.session.companyId, candidateId: ctx.session.candidateId, docKey: ctx.docKey, userId: ctx.session.userId, file: { buffer, size: buffer.length, mimeType: file.type, originalName: file.name } });
    if (!result.ok) return apiErrorFromResult(request, result);
    const home = await getEmployeeDpHome({ query }, ctx.session);
    if (!home.ok) return apiErrorFromResult(request, home);
    return NextResponse.json(home, { headers: NO_STORE });
  } catch (error) { console.error('POST employee DP document', error); if (error?.code === ERR.INVALID_CV_FILE_SIZE || error?.code === ERR.INVALID_CV_FILE_TYPE) return apiError(request, error.code, HTTP_STATUS.BAD_REQUEST); return apiError(request, ERR.INTERNAL, HTTP_STATUS.INTERNAL_SERVER_ERROR); }
}
export async function DELETE(request, props) {
  try {
    const ctx = await context(request, props); if (ctx.error) return ctx.error;
    if (!(await limit(request, ctx.session)).ok) return apiError(request, ERR.RATE_LIMIT, HTTP_STATUS.TOO_MANY_REQUESTS);
    const result = await clearDpDocumentFile({ query }, { companyId: ctx.session.companyId, candidateId: ctx.session.candidateId, docKey: ctx.docKey, userId: ctx.session.userId });
    if (!result.ok) return apiErrorFromResult(request, result);
    const home = await getEmployeeDpHome({ query }, ctx.session);
    if (!home.ok) return apiErrorFromResult(request, home);
    return NextResponse.json(home, { headers: NO_STORE });
  } catch (error) { console.error('DELETE employee DP document', error); return apiError(request, ERR.INTERNAL, HTTP_STATUS.INTERNAL_SERVER_ERROR); }
}
