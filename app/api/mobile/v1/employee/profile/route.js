import { NextResponse } from 'next/server';
import { apiError, apiErrorFromResult, HTTP_STATUS, ERR } from '../../../../../../lib/api-error.js';
import { getEmployeeProfile, updateEmployeeProfile } from '../../../../../../lib/employee-profile.js';
import { authenticateMobileEmployee, mobileEmployeeBearerToken } from '../../../../../../lib/mobile-employee-session.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../../../lib/rate-limit.js';

export const dynamic = 'force-dynamic';
const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });
async function auth(request) { return authenticateMobileEmployee(mobileEmployeeBearerToken(request)); }

async function load(session) {
  return getEmployeeProfile(null, { companyId: session.companyId, candidateId: session.candidateId });
}

export async function GET(request) {
  try {
    const session = await auth(request);
    if (!session) return apiError(request, ERR.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    const result = await load(session);
    if (!result.ok) return apiErrorFromResult(request, result, { fallbackCode: ERR.UNAUTHORIZED });
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    console.error('GET mobile employee profile', error);
    return apiError(request, ERR.INTERNAL, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

export async function PATCH(request) {
  try {
    const session = await auth(request);
    if (!session) return apiError(request, ERR.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    const limit = await checkRateLimit(`mobile-employee-profile:${session.candidateId}:${clientIpFromRequest(request)}`, 20, 10 * 60 * 1000);
    if (!limit.ok) return apiError(request, ERR.RATE_LIMIT, HTTP_STATUS.TOO_MANY_REQUESTS);
    const body = await request.json().catch(() => ({}));
    const patch = { fullName: body.fullName, phone: body.phone, linkedinUrl: body.linkedinUrl, city: body.city, state: body.state, birthDate: body.birthDate };
    const result = await updateEmployeeProfile(null, { companyId: session.companyId, candidateId: session.candidateId, patch });
    if (!result.ok) return apiErrorFromResult(request, result, { fallbackCode: ERR.INVALID_DATA });
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    console.error('PATCH mobile employee profile', error);
    return apiError(request, ERR.INTERNAL, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
