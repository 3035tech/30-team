import { NextResponse } from 'next/server';
import { queryRead } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/public/areas — lista áreas (mesmas chaves validadas em POST /api/results). */
export async function GET() {
  try {
    const r = await queryRead(`SELECT key, label FROM areas ORDER BY label ASC`);
    return NextResponse.json({ areas: r.rows });
  } catch (e) {
    console.error('public/areas:', e);
    return NextResponse.json({ errorCode: 'AREAS_LOAD', error: 'Erro ao carregar áreas' }, { status: 500 });
  }
}
