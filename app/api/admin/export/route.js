import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../lib/auth';
import { queryRead } from '../../../../lib/db';
import { audit } from '../../../../lib/audit';
import {
  assessmentListWhereParts,
  parsePipelineFilter,
  parseDateFilter,
  parseNameSearch,
  parseRosterScope,
  sqlWhere,
} from '../../../../lib/assessment-filters';
import { apiError } from '../../../../lib/api-error';

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  const allowed = payload?.role === 'admin' || payload?.role === 'direction' || payload?.role === 'hr';
  if (!allowed) return apiError(request, 'UNAUTHORIZED', 401);
  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

  const { searchParams } = new URL(request.url);
  const area = (searchParams.get('area') || 'all').toString();
  const rawExportCompany = (searchParams.get('company') || 'all').toString();
  const rawVacancy = String(searchParams.get('vacancy') || 'all').trim();
  const pipelineStage = parsePipelineFilter(searchParams);
  const { dateFrom, dateTo } = parseDateFilter(searchParams);
  const nameSearch = parseNameSearch(searchParams);
  const rosterScope = parseRosterScope(searchParams);

  let scopeCompanyFilter = null;
  if (isAdmin && rawExportCompany !== 'all') {
    const cid = parseInt(rawExportCompany, 10);
    if (Number.isFinite(cid)) {
      const ok = await queryRead(`SELECT id FROM companies WHERE id = $1 AND deleted = FALSE LIMIT 1`, [cid]);
      if (ok.rowCount > 0) scopeCompanyFilter = cid;
    }
  }

  const { whereParts, params } = assessmentListWhereParts({
    isAdmin,
    companyId,
    scopeCompanyFilter,
    selectedArea: area,
    selectedVacancy: rawVacancy,
    pipelineStage,
    dateFrom,
    dateTo,
    rosterScope,
  });
  const extWhereParts = nameSearch
    ? [...whereParts, `c.full_name ILIKE $${params.length + 1}`]
    : whereParts;
  const extParams = nameSearch ? [...params, `%${nameSearch}%`] : params;
  const where = sqlWhere(extWhereParts);

  const r = await queryRead(
    `SELECT
       ass.id AS assessment_id,
       c.full_name AS candidate_name,
       c.email AS candidate_email,
       c.phone AS candidate_phone,
       c.linkedin_url AS candidate_linkedin,
       c.city AS candidate_city,
       c.state AS candidate_state,
       c.salary_expectation AS candidate_salary,
       c.availability AS candidate_availability,
       c.source AS candidate_source,
       ar.key AS area_key,
       ar.label AS area_label,
       ass.top_type,
       ass.scores,
       ass.pipeline_stage AS pipeline_stage,
       c.hr_notes,
       ass.created_at
     FROM assessments ass
     JOIN candidates c ON c.id = ass.candidate_id
     JOIN areas ar ON ar.id = ass.area_id
     ${where}
     ORDER BY ass.created_at DESC`,
    extParams
  );

  const header = [
    'assessment_id',
    'candidate_name',
    'candidate_email',
    'candidate_phone',
    'candidate_linkedin',
    'candidate_city',
    'candidate_state',
    'candidate_salary',
    'candidate_availability',
    'candidate_source',
    'area_key',
    'area_label',
    'top_type',
    'pipeline_stage',
    'hr_notes',
    'scores_json',
    'created_at',
  ];

  const lines = [header.join(',')];
  for (const row of r.rows) {
    lines.push(
      [
        row.assessment_id,
        csvEscape(row.candidate_name),
        csvEscape(row.candidate_email || ''),
        csvEscape(row.candidate_phone || ''),
        csvEscape(row.candidate_linkedin || ''),
        csvEscape(row.candidate_city || ''),
        csvEscape(row.candidate_state || ''),
        csvEscape(row.candidate_salary || ''),
        csvEscape(row.candidate_availability || ''),
        csvEscape(row.candidate_source || ''),
        row.area_key,
        csvEscape(row.area_label),
        row.top_type,
        csvEscape(row.pipeline_stage || ''),
        csvEscape(row.hr_notes || ''),
        csvEscape(JSON.stringify(row.scores)),
        row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      ].join(',')
    );
  }

  const csv = lines.join('\n');
  await audit({
    actorUserId: payload.userId || null,
    action: 'admin.export_csv',
    targetType: 'assessments',
    targetId: area,
    metadata: { area },
  });
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="candidatos_${area}.csv"`,
    },
  });
}

