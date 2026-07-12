import { NextResponse } from 'next/server';
import { apiError } from '../../../../lib/api-error';
import { fetchCitiesByUf } from '../../../../lib/br-cities';

export const dynamic = 'force-dynamic';

/** GET /api/public/br-cities?uf=SP — municípios IBGE por UF. */
export async function GET(request) {
  const uf = new URL(request.url).searchParams.get('uf') || '';
  try {
    const cities = await fetchCitiesByUf(uf);
    return NextResponse.json(
      { uf: String(uf).trim().toUpperCase(), cities },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (e) {
    if (e?.code === 'INVALID_UF') return apiError(request, 'INVALID_UF', 400);
    console.error('public/br-cities:', e);
    return apiError(request, 'IBGE_CITIES_FAILED', 502);
  }
}
