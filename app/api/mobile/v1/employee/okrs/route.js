import { NextResponse } from 'next/server';
import { apiError, apiErrorFromResult, ERR } from '../../../../../../lib/api-error.js';
import { OKR_CYCLE_STATUS } from '../../../../../../lib/domain-status.js';
import { authenticateMobileEmployee, mobileEmployeeBearerToken } from '../../../../../../lib/mobile-employee-session.js';
import { createOkrActivityCheckin, listOkrActivitiesForCandidate } from '../../../../../../lib/okr-cycles.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../../../lib/rate-limit.js';

export const dynamic = 'force-dynamic';
const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });
async function auth(request) { return authenticateMobileEmployee(mobileEmployeeBearerToken(request)); }
async function load(session) {
  const result = await listOkrActivitiesForCandidate(null, { companyId: session.companyId, candidateId: session.candidateId });
  return { activities: result.ok ? result.items : [] };
}

export async function GET(request) {
  try {
    const session = await auth(request);
    if (!session) return apiError(request, ERR.UNAUTHORIZED, 401);
    return NextResponse.json(await load(session), { headers: NO_STORE });
  } catch (error) {
    console.error('GET mobile employee okrs', error);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

export async function POST(request) {
  try {
    const session = await auth(request);
    if (!session) return apiError(request, ERR.UNAUTHORIZED, 401);
    const limit = await checkRateLimit(`mobile-employee-okr:${session.candidateId}:${clientIpFromRequest(request)}`, 30, 60 * 60 * 1000);
    if (!limit.ok) return apiError(request, ERR.RATE_LIMIT, 429);
    const body = await request.json().catch(() => ({}));
    const activityId = Number(body.activityId);
    const progressPct = Number(body.progressPct);
    if (!Number.isInteger(activityId) || activityId < 1 || !Number.isInteger(progressPct) || progressPct < 0 || progressPct > 100) return apiError(request, ERR.INVALID_DATA, 400);
    const current = await load(session);
    const owned = current.activities.find((activity) => activity.id === activityId);
    if (!owned || owned.cycleStatus === OKR_CYCLE_STATUS.CLOSED) return apiError(request, ERR.UNAUTHORIZED, 403);
    const result = await createOkrActivityCheckin(null, { companyId: session.companyId, activityId, progressPct, note: String(body.note || '').slice(0, 500), createdByCandidateId: session.candidateId });
    if (!result.ok) return apiErrorFromResult(request, result, { fallbackCode: ERR.UNAUTHORIZED });
    return NextResponse.json(await load(session), { headers: NO_STORE });
  } catch (error) {
    console.error('POST mobile employee okrs', error);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
