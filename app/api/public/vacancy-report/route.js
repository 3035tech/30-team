import { NextResponse } from 'next/server';
import { getReportByToken } from '../../../../lib/vacancy-report';
import { apiError } from '../../../../lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get('token') || '').trim();
    if (!token) return apiError(request, 'INVALID_TOKEN', 400);

    const row = await getReportByToken(token);
    if (!row) return apiError(request, 'EXPIRED_LINK', 404);

    const snapshot = row.snapshot && typeof row.snapshot === 'object' ? row.snapshot : {};

    return NextResponse.json(
      {
        title: row.title,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
        executiveNote: row.executiveNote || snapshot.executiveNote || null,
        snapshot,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  } catch (e) {
    console.error('[public vacancy-report]', e);
    return apiError(request, 'INTERNAL', 500);
  }
}
