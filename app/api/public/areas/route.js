import { NextResponse } from 'next/server';
import { queryRead } from '../../../../lib/db';
import { apiError } from '../../../../lib/api-error';

export const dynamic = 'force-dynamic';

/** GET /api/public/areas — lista áreas (mesmas chaves validadas em POST /api/results). */
export async function GET(request) {
  try {
    const r = await queryRead(`SELECT key, label FROM areas ORDER BY label ASC`);
    return NextResponse.json({ areas: r.rows });
  } catch (e) {
    console.error('public/areas:', e);
    return apiError(request, 'AREAS_LOAD', 500);
  }
}
