import { NextResponse } from 'next/server';
import { apiError, apiErrorFromResult, ERR } from '../../../../../../lib/api-error.js';
import { DEVELOPMENT_PLAN_ITEM_STATUS } from '../../../../../../lib/domain-status.js';
import { updateEmployeePdiItemStatus } from '../../../../../../lib/employee-pdi.js';
import { authenticateMobileEmployee, mobileEmployeeBearerToken } from '../../../../../../lib/mobile-employee-session.js';
import { listActiveDevelopmentPlansWithItems } from '../../../../../../lib/people/development-plans.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../../../lib/rate-limit.js';

export const dynamic = 'force-dynamic';
const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });
const ALLOWED_STATUS = new Set([DEVELOPMENT_PLAN_ITEM_STATUS.TODO, DEVELOPMENT_PLAN_ITEM_STATUS.DOING, DEVELOPMENT_PLAN_ITEM_STATUS.DONE]);
async function auth(request) { return authenticateMobileEmployee(mobileEmployeeBearerToken(request)); }
async function load(session) {
  const plans = await listActiveDevelopmentPlansWithItems(null, { companyId: session.companyId, candidateId: session.candidateId, planLimit: 10 });
  return { plans: plans.map((plan) => ({ id: Number(plan.id), title: plan.title, objective: plan.objective || '', periodStart: plan.periodStart || null, periodEnd: plan.periodEnd || null, items: (plan.items || []).map((item) => ({ id: Number(item.id), title: item.title, status: item.status, dueDate: item.dueDate || null })) })) };
}

export async function GET(request) {
  try {
    const session = await auth(request);
    if (!session) return apiError(request, ERR.UNAUTHORIZED, 401);
    return NextResponse.json(await load(session), { headers: NO_STORE });
  } catch (error) {
    console.error('GET mobile employee pdi', error);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

export async function PATCH(request) {
  try {
    const session = await auth(request);
    if (!session) return apiError(request, ERR.UNAUTHORIZED, 401);
    const limit = await checkRateLimit(`mobile-employee-pdi:${session.candidateId}:${clientIpFromRequest(request)}`, 60, 10 * 60 * 1000);
    if (!limit.ok) return apiError(request, ERR.RATE_LIMIT, 429);
    const body = await request.json().catch(() => ({}));
    const itemId = Number(body.itemId);
    if (!Number.isInteger(itemId) || itemId < 1 || !ALLOWED_STATUS.has(body.status)) return apiError(request, ERR.INVALID_DATA, 400);
    const result = await updateEmployeePdiItemStatus(null, { companyId: session.companyId, candidateId: session.candidateId, itemId, status: body.status });
    if (!result.ok) return apiErrorFromResult(request, result, { fallbackCode: ERR.NOT_FOUND });
    return NextResponse.json(await load(session), { headers: NO_STORE });
  } catch (error) {
    console.error('PATCH mobile employee pdi', error);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
