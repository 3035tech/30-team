import { NextResponse } from 'next/server';
import { apiError, apiErrorFromResult, HTTP_STATUS, ERR } from '../../../../../../lib/api-error.js';
import { listCandidateNotifications, markCandidateNotificationRead } from '../../../../../../lib/employee-notifications.js';
import { t } from '../../../../../../lib/i18n.js';
import { authenticateMobileEmployee, mobileEmployeeBearerToken } from '../../../../../../lib/mobile-employee-session.js';

export const dynamic = 'force-dynamic';

async function authenticate(request) {
  return authenticateMobileEmployee(mobileEmployeeBearerToken(request));
}

async function responseFor(session) {
  const result = await listCandidateNotifications(null, { companyId: session.companyId, candidateId: session.candidateId, limit: 40 });
  return NextResponse.json({
    items: result.items.map((item) => ({ id: Number(item.id), title: t('pt-BR', item.copy.titleKey, item.copy.values), body: t('pt-BR', item.copy.bodyKey, item.copy.values), createdAt: new Date(item.createdAt).toISOString(), readAt: item.readAt ? new Date(item.readAt).toISOString() : null })),
    unreadCount: Number(result.unreadCount) || 0,
  });
}

export async function GET(request) {
  try {
    const session = await authenticate(request);
    if (!session) return apiError(request, ERR.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    return responseFor(session);
  } catch (error) {
    console.error('GET mobile employee notifications', error);
    return apiError(request, ERR.INTERNAL, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

export async function PATCH(request) {
  try {
    const session = await authenticate(request);
    if (!session) return apiError(request, ERR.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    const body = await request.json().catch(() => ({}));
    const result = await markCandidateNotificationRead(null, { companyId: session.companyId, candidateId: session.candidateId, id: body.id, markAll: body.markAll === true });
    if (!result.ok) return apiErrorFromResult(request, result, { fallbackCode: ERR.INVALID_DATA });
    return responseFor(session);
  } catch (error) {
    console.error('PATCH mobile employee notifications', error);
    return apiError(request, ERR.INTERNAL, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
