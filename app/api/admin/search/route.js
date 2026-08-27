/**
 * GET /api/admin/search — Busca global (candidatos, vagas, grupos)
 * UX/UX Melhoria #6 — Cmd+K search
 */

import { NextResponse } from 'next/server';
import { queryRead } from '../../../../lib/db.js';
import { apiError } from '../../../../lib/api-error.js';
import { getSessionPayload, getManagerScope } from '../../../../lib/ae/require-admin.js';

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
      return apiError(request, 'UNAUTHORIZED', 401);
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
    const companyFilter = scope.isAdmin ? [] : [scope.companyId];

    // Search candidates
    const candidatesPromise = queryRead(
      `SELECT
         c.id,
         c.name,
         c.email AS subtitle,
         v.title AS vacancy_title
       FROM candidates c
       LEFT JOIN assessments ass ON ass.candidate_id = c.id
       LEFT JOIN vacancies v ON v.id = ass.vacancy_id
       WHERE ${scope.isAdmin ? 'TRUE' : 'c.company_id = $2'}
         AND c.deleted = FALSE
         AND (
           c.name ILIKE $1
           OR c.email ILIKE $1
         )
       ORDER BY c.name ASC
       LIMIT $${scope.isAdmin ? '2' : '3'}`,
      scope.isAdmin
        ? [searchPattern, MAX_RESULTS_PER_CATEGORY]
        : [searchPattern, scope.companyId, MAX_RESULTS_PER_CATEGORY]
    );

    // Search vacancies
    const vacanciesPromise = queryRead(
      `SELECT
         v.id,
         v.title AS name,
         v.status AS subtitle
       FROM vacancies v
       WHERE ${scope.isAdmin ? 'TRUE' : 'v.company_id = $2'}
         AND v.deleted = FALSE
         AND v.title ILIKE $1
       ORDER BY v.created_at DESC
       LIMIT $${scope.isAdmin ? '2' : '3'}`,
      scope.isAdmin
        ? [searchPattern, MAX_RESULTS_PER_CATEGORY]
        : [searchPattern, scope.companyId, MAX_RESULTS_PER_CATEGORY]
    );

    // Search groups
    const groupsPromise = queryRead(
      `SELECT
         tg.id,
         tg.name,
         COUNT(tgm.candidate_id)::text || ' membros' AS subtitle
       FROM team_groups tg
       LEFT JOIN team_group_members tgm ON tgm.group_id = tg.id
       WHERE ${scope.isAdmin ? 'TRUE' : 'tg.company_id = $2'}
         AND tg.name ILIKE $1
       GROUP BY tg.id, tg.name
       ORDER BY tg.created_at DESC
       LIMIT $${scope.isAdmin ? '2' : '3'}`,
      scope.isAdmin
        ? [searchPattern, MAX_RESULTS_PER_CATEGORY]
        : [searchPattern, scope.companyId, MAX_RESULTS_PER_CATEGORY]
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
    return apiError(request, 'SERVER_ERROR', 500);
  }
}
