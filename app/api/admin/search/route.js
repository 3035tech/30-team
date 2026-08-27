/**
 * GET /api/admin/search — Busca global (candidatos, vagas, grupos)
 * UX/UX Melhoria #6 — Cmd+K search
 */

import { NextResponse } from 'next/server';
import { queryRead } from '../../../../lib/db.js';
import { apiError, ERR } from '../../../../lib/api-error.js';
import { getSessionPayload, getManagerScope } from '../../../../lib/ae/require-admin.js';
import { resolveCohortCompanyId } from '../../../../lib/assessment-filters.js';

export const dynamic = 'force-dynamic';

const MAX_RESULTS_PER_CATEGORY = 5;

/**
 * GET — busca global
 * Query params:
 * - q: query string (required, min 2 chars)
 */
export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    const scope = getManagerScope(payload);
    if (!scope.authorized) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();

    if (query.length < 2) {
      return NextResponse.json({
        candidates: [],
        vacancies: [],
        groups: [],
      });
    }

    const searchPattern = `%${query}%`;
    const tenantId = resolveCohortCompanyId({
      isAdmin: scope.isAdmin,
      companyId: scope.companyId,
      scopeCompanyFilter: null,
    });
    const scoped = tenantId != null;
    const limIx = scoped ? '3' : '2';

    // Search candidates
    const candidatesPromise = queryRead(
      `SELECT
         c.id,
         c.full_name AS name,
         c.email AS subtitle,
         v.title AS vacancy_title
       FROM candidates c
       LEFT JOIN assessments ass ON ass.candidate_id = c.id
       LEFT JOIN vacancies v ON v.id = ass.vacancy_id
       WHERE ${scoped ? 'c.company_id = $2' : 'TRUE'}
         AND (
           c.full_name ILIKE $1
           OR c.email ILIKE $1
         )
       ORDER BY c.full_name ASC
       LIMIT $${limIx}`,
      scoped
        ? [searchPattern, tenantId, MAX_RESULTS_PER_CATEGORY]
        : [searchPattern, MAX_RESULTS_PER_CATEGORY]
    );

    // Search vacancies
    const vacanciesPromise = queryRead(
      `SELECT
         v.id,
         v.title AS name,
         v.status AS subtitle
       FROM vacancies v
       WHERE ${scoped ? 'v.company_id = $2' : 'TRUE'}
         AND v.deleted = FALSE
         AND v.title ILIKE $1
       ORDER BY v.created_at DESC
       LIMIT $${limIx}`,
      scoped
        ? [searchPattern, tenantId, MAX_RESULTS_PER_CATEGORY]
        : [searchPattern, MAX_RESULTS_PER_CATEGORY]
    );

    // Search groups (member_assessment_ids is BIGINT[])
    const groupsPromise = queryRead(
      `SELECT
         tg.id,
         tg.name,
         COALESCE(cardinality(tg.member_assessment_ids), 0)::text || ' membros' AS subtitle
       FROM team_groups tg
       WHERE ${scoped ? 'tg.company_id = $2' : 'TRUE'}
         AND tg.deleted = FALSE
         AND tg.name ILIKE $1
       ORDER BY tg.updated_at DESC
       LIMIT $${limIx}`,
      scoped
        ? [searchPattern, tenantId, MAX_RESULTS_PER_CATEGORY]
        : [searchPattern, MAX_RESULTS_PER_CATEGORY]
    );

    const [candidatesRes, vacanciesRes, groupsRes] = await Promise.all([
      candidatesPromise,
      vacanciesPromise,
      groupsPromise,
    ]);

    return NextResponse.json({
      candidates: candidatesRes.rows,
      vacancies: vacanciesRes.rows,
      groups: groupsRes.rows,
    });
  } catch (err) {
    console.error('[GET /api/admin/search]', err);
    return apiError(request, ERR.SERVER_ERROR, 500);
  }
}
