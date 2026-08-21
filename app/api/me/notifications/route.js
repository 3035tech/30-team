import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, verifyToken } from '../../../../lib/auth';
import { query } from '../../../../lib/db';
import { apiError } from '../../../../lib/api-error';
import {
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../../../lib/manager-notifications';
import { notificationHref } from '../../../../lib/manager-notification-catalog';

function requireSession(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) return { error: apiError(request, 'UNAUTHORIZED', 401) };
  return { payload };
}

function withHref(row) {
  return {
    ...row,
    href: notificationHref(row.type, row.payload || {}),
  };
}

/** GET /api/me/notifications */
export async function GET(request) {
  const { payload, error } = requireSession(request);
  if (error) return error;

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread') === '1';
  const limit = parseInt(url.searchParams.get('limit') || '30', 10);

  const data = await listNotificationsForUser(query, payload.userId, { limit, unreadOnly });
  return NextResponse.json({
    items: (data.items || []).map(withHref),
    unreadCount: data.unreadCount,
  });
}

/**
 * PATCH /api/me/notifications
 * body: { id } | { all: true }
 */
export async function PATCH(request) {
  const { payload, error } = requireSession(request);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  if (body.all === true) {
    const r = await markAllNotificationsRead(query, payload.userId);
    const data = await listNotificationsForUser(query, payload.userId, { limit: 1 });
    return NextResponse.json({ ok: true, updated: r.updated, unreadCount: data.unreadCount });
  }

  const id = Number(body.id);
  if (!Number.isFinite(id)) return apiError(request, 'INVALID_DATA', 400);

  const r = await markNotificationRead(query, payload.userId, id);
  if (!r.ok) return apiError(request, 'NOT_FOUND', 404);

  const data = await listNotificationsForUser(query, payload.userId, { limit: 1 });
  return NextResponse.json({ ok: true, unreadCount: data.unreadCount });
}
