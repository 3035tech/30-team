/**
 * B-1103 — Analytics: API de comparativos
 * GET /api/admin/analytics/compare
 * 
 * Query params:
 * - type: 'areas' | 'periods' | 'rubrics'
 * - areaA, areaB (for areas)
 * - periodAStart, periodAEnd, periodBStart, periodBEnd (for periods)
 * - rubricAId, rubricBId (for rubrics)
 */

import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error.js';
import { getManagerScope } from '@/lib/ae/require-admin.js';
import {
  compareAreas,
  comparePeriods,
  compareRubrics,
  listAvailableAreas,
  listAvailableRubrics,
} from '@/lib/analytics-comparisons.js';

export async function GET(request) {
  try {
    const scope = await getManagerScope(request, { allowDirection: true, allowHr: true });
    if (!scope) {
      return apiError(request, 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // List available options
    if (type === 'list-areas') {
      const areas = await listAvailableAreas(scope.companyId);
      return NextResponse.json({ ok: true, areas });
    }

    if (type === 'list-rubrics') {
      const rubrics = await listAvailableRubrics(scope.companyId);
      return NextResponse.json({ ok: true, rubrics });
    }

    // Comparisons
    if (type === 'areas') {
      const areaA = searchParams.get('areaA');
      const areaB = searchParams.get('areaB');

      if (!areaA || !areaB) {
        return apiError(request, 'MISSING_PARAMS', 400);
      }

      const comparison = await compareAreas(scope.companyId, areaA, areaB);
      return NextResponse.json({ ok: true, comparison });
    }

    if (type === 'periods') {
      const periodAStart = searchParams.get('periodAStart');
      const periodAEnd = searchParams.get('periodAEnd');
      const periodBStart = searchParams.get('periodBStart');
      const periodBEnd = searchParams.get('periodBEnd');

      if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) {
        return apiError(request, 'MISSING_PARAMS', 400);
      }

      const comparison = await comparePeriods(
        scope.companyId,
        periodAStart,
        periodAEnd,
        periodBStart,
        periodBEnd
      );
      return NextResponse.json({ ok: true, comparison });
    }

    if (type === 'rubrics') {
      const rubricAId = parseInt(searchParams.get('rubricAId'));
      const rubricBId = parseInt(searchParams.get('rubricBId'));

      if (!rubricAId || !rubricBId) {
        return apiError(request, 'MISSING_PARAMS', 400);
      }

      const comparison = await compareRubrics(scope.companyId, rubricAId, rubricBId);
      return NextResponse.json({ ok: true, comparison });
    }

    return apiError(request, 'INVALID_TYPE', 400);
  } catch (err) {
    console.error('[analytics/compare GET]', err);
    return apiError(request, 'SERVER_ERROR', 500);
  }
}
