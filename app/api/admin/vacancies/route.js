import { NextResponse } from 'next/server';
import { verifySessionWithCapabilities } from '../../../../lib/user-capabilities';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '../../../../lib/auth';
import { query, queryRead } from '../../../../lib/db';
import crypto from 'node:crypto';
import { parseVacanciesSort, sqlVacancyOrderBy } from '../../../../lib/assessment-filters';
import { apiError } from '../../../../lib/api-error';
import { CAP, isAdminRole, requireCapability } from '../../../../lib/permissions';
import { parseVacancyDetailsFromBody } from '../../../../lib/vacancy-details';
import { slugify } from '../../../../lib/slugify';
import { scheduleVacancyIndexSync } from '../../../../lib/job-indexing';
import { scheduleJobAlertDispatch } from '../../../../lib/job-alerts';


const VACANCY_PAGE_SIZES = new Set([10, 20, 30, 40, 50]);

async function ensureActiveLink(vacancyId) {
  const existing = await queryRead(
    `SELECT token
     FROM vacancy_links
     WHERE vacancy_id = $1 AND active = TRUE AND expires_at > NOW()
     LIMIT 1`,
    [vacancyId]
  );
  if (existing.rowCount > 0) return existing.rows[0].token;
  const token = crypto.randomBytes(24).toString('hex');
  await query(
    `INSERT INTO vacancy_links (vacancy_id, token, active, expires_at)
     VALUES ($1, $2, TRUE, NOW() + INTERVAL '7 days')`,
    [vacancyId, token]
  );
  return token;
}

export async function GET(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!requireCapability(payload, CAP.VACANCIES_VIEW)) return apiError(request, 'UNAUTHORIZED', 401);

  const isAdmin = isAdminRole(payload);
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

  const url = new URL(request.url);
  const vacFromQs = String(url.searchParams.get('vacancy') || '').trim();
  let filterVacancyId = null;
  if (vacFromQs !== '' && vacFromQs !== 'all') {
    const vid = parseInt(vacFromQs, 10);
    if (Number.isFinite(vid)) filterVacancyId = vid;
  }

  const whereParts = ['v.deleted = FALSE', 'c.deleted = FALSE'];
  const params = [];
  const companyFilter = String(url.searchParams.get('company') || '').trim();
  if (!isAdmin) {
    params.push(companyId);
    whereParts.push(`v.company_id = $${params.length}`);
  } else if (companyFilter && companyFilter !== 'all') {
    const cid = parseInt(companyFilter, 10);
    if (Number.isFinite(cid)) {
      params.push(cid);
      whereParts.push(`v.company_id = $${params.length}`);
    }
  }
  if (filterVacancyId != null) {
    params.push(filterVacancyId);
    whereParts.push(`v.id = $${params.length}`);
  }
  const where = `WHERE ${whereParts.join(' AND ')}`;

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const rawSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const pageSize = VACANCY_PAGE_SIZES.has(rawSize) ? rawSize : 20;

  const { sort: vacSortCol, dir: vacSortDir } = parseVacanciesSort(Object.fromEntries(url.searchParams.entries()), {
    isAdmin,
  });
  const vacancyOrderClause = sqlVacancyOrderBy(vacSortCol, vacSortDir);

  const countR = await queryRead(
    `SELECT COUNT(*)::int AS n
     FROM vacancies v
     JOIN companies c ON c.id = v.company_id
     ${where}`,
    params
  );
  const total = countR.rows[0]?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const effectivePage = total === 0 ? 1 : Math.min(page, totalPages);
  const offset = (effectivePage - 1) * pageSize;

  const listParams = [...params];
  listParams.push(pageSize);
  const limI = listParams.length;
  listParams.push(offset);
  const offI = listParams.length;
  const r = await queryRead(
    `SELECT
       v.id,
       v.company_id AS "companyId",
       c.name AS "companyName",
       c.slug AS "companySlug",
       v.title,
       v.slug,
       v.status,
       v.positions_count AS "positionsCount",
       v.target_date AS "targetDate",
       v.description,
       v.salary_min AS "salaryMin",
       v.salary_max AS "salaryMax",
       v.client_report_show_salary AS "clientReportShowSalary",
       v.employment_type AS "employmentType",
       v.workplace_modality AS "workplaceModality",
       v.workplace_city AS "workplaceCity",
       v.workplace_state AS "workplaceState",
       v.public_page_enabled AS "publicPageEnabled",
       v.public_allow_index AS "publicAllowIndex",
       v.public_show_company_info AS "publicShowCompanyInfo",
       v.public_show_salary AS "publicShowSalary",
       v.created_at AS "createdAt",
       vl.token AS "activeToken",
       vl.expires_at AS "activeTokenExpiresAt"
     FROM vacancies v
     JOIN companies c ON c.id = v.company_id
     LEFT JOIN LATERAL (
       SELECT token, expires_at
       FROM vacancy_links
       WHERE vacancy_id = v.id AND active = TRUE
       ORDER BY expires_at DESC NULLS LAST
       LIMIT 1
     ) vl ON TRUE
     ${where}
     ${vacancyOrderClause}
     LIMIT $${limI} OFFSET $${offI}`,
    listParams
  );

  return NextResponse.json({
    items: r.rows,
    total,
    page: effectivePage,
    pageSize,
    totalPages,
  });
}

export async function POST(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!requireCapability(payload, CAP.VACANCIES_MANAGE)) return apiError(request, 'UNAUTHORIZED', 401);

  const isAdmin = isAdminRole(payload);
  const sessionCompanyId = payload?.companyId ?? null;
  if (!isAdmin && !sessionCompanyId) return apiError(request, 'UNAUTHORIZED', 401);

  const body = await request.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const status = String(body.status || 'open').trim();

  const requestedCompanyId = body.companyId ?? null;
  const companyId = isAdmin ? (requestedCompanyId ?? sessionCompanyId) : sessionCompanyId;

  if (!companyId) return apiError(request, 'COMPANY_REQUIRED', 400);
  if (!title) return apiError(request, 'TITLE_REQUIRED', 400);
  if (!['open', 'closed'].includes(status)) return apiError(request, 'INVALID_STATUS', 400);

  const slug = slugify(body.slug || title);
  if (!slug) return apiError(request, 'INVALID_SLUG', 400);

  const positionsCount = Math.max(1, parseInt(body.positionsCount || '1', 10) || 1);
  const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.targetDate || ''))
    ? String(body.targetDate)
    : null;

  let details;
  try {
    details = parseVacancyDetailsFromBody(body, { forCreate: true });
  } catch (e) {
    if (e?.code === 'INVALID_SALARY_RANGE') return apiError(request, 'INVALID_SALARY_RANGE', 400);
    if (e?.code === 'INVALID_EMPLOYMENT_TYPE') return apiError(request, 'INVALID_EMPLOYMENT_TYPE', 400);
    if (e?.code === 'INVALID_WORKPLACE_MODALITY') {
      return apiError(request, 'INVALID_WORKPLACE_MODALITY', 400);
    }
    if (e?.code === 'INVALID_WORKPLACE_STATE') return apiError(request, 'INVALID_WORKPLACE_STATE', 400);
    throw e;
  }

  const c = await queryRead(`SELECT id, name FROM companies WHERE id = $1 AND deleted = FALSE LIMIT 1`, [companyId]);
  if (c.rowCount === 0) return apiError(request, 'INVALID_COMPANY', 400);

  const ins = await query(
    `INSERT INTO vacancies (
       company_id, title, slug, status, positions_count, target_date,
       description, salary_min, salary_max, client_report_show_salary, employment_type,
       workplace_modality, workplace_city, workplace_state,
       public_page_enabled, public_allow_index, public_show_company_info, public_show_salary
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
     RETURNING id, company_id AS "companyId", title, slug, status,
               positions_count AS "positionsCount", target_date AS "targetDate",
               description, salary_min AS "salaryMin", salary_max AS "salaryMax",
               client_report_show_salary AS "clientReportShowSalary",
               employment_type AS "employmentType",
               workplace_modality AS "workplaceModality",
               workplace_city AS "workplaceCity",
               workplace_state AS "workplaceState",
               public_page_enabled AS "publicPageEnabled",
               public_allow_index AS "publicAllowIndex",
               public_show_company_info AS "publicShowCompanyInfo",
               public_show_salary AS "publicShowSalary",
               created_at AS "createdAt"`,
    [
      companyId,
      title,
      slug,
      status,
      positionsCount,
      targetDate,
      details.description,
      details.salaryMin,
      details.salaryMax,
      details.clientReportShowSalary === true,
      details.employmentType ?? null,
      details.workplaceModality ?? null,
      details.workplaceCity ?? null,
      details.workplaceState ?? null,
      details.publicPageEnabled === true,
      details.publicAllowIndex === true,
      details.publicShowCompanyInfo === true,
      details.publicShowSalary === true,
    ]
  );

  const linkToken = await ensureActiveLink(ins.rows[0].id);
  const created = ins.rows[0];
  const indexPayload = {
    id: created.id,
    slug: created.slug,
    status: created.status,
    publicPageEnabled: created.publicPageEnabled,
    publicAllowIndex: created.publicAllowIndex,
    targetDate: created.targetDate,
    title: created.title,
    employmentType: created.employmentType,
  };
  scheduleVacancyIndexSync({
    previous: null,
    current: indexPayload,
    reason: 'vacancy_create',
  });
  scheduleJobAlertDispatch({
    previous: null,
    current: indexPayload,
    companyName: c.rows[0].name,
  });
  return NextResponse.json(
    { ...created, companyName: c.rows[0].name, activeToken: linkToken },
    { status: 201 }
  );
}

