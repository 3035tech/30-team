import { NextResponse } from 'next/server';
import { verifySessionWithCapabilities } from '../../../../../lib/user-capabilities';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '../../../../../lib/auth';
import { query, queryRead } from '../../../../../lib/db';
import { sanitizeInterviewNotesHtml } from '../../../../../lib/sanitize-html';
import { apiError } from '../../../../../lib/api-error';
import { CAP, isAdminRole, requireCapability } from '../../../../../lib/permissions';
import { parseVacancyDetailsFromBody } from '../../../../../lib/vacancy-details';
import { notifyCompanyManagers, NOTIF } from '../../../../../lib/manager-notifications';
import { slugify } from '../../../../../lib/slugify';
import { scheduleVacancyIndexSync } from '../../../../../lib/job-indexing';
import { scheduleJobAlertDispatch } from '../../../../../lib/job-alerts';

async function getVacancyOr404(vacancyId) {
  const v = await queryRead(
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
       v.created_at AS "createdAt"
     FROM vacancies v
     JOIN companies c ON c.id = v.company_id
     WHERE v.id = $1 AND v.deleted = FALSE AND c.deleted = FALSE
     LIMIT 1`,
    [vacancyId]
  );
  if (v.rowCount === 0) return null;
  return v.rows[0];
}

async function attachActiveToken(vacancy) {
  const t = await queryRead(
    `SELECT token, expires_at AS "expiresAt", rotated_at AS "rotatedAt"
     FROM vacancy_links
     WHERE vacancy_id = $1 AND active = TRUE
     LIMIT 1`,
    [vacancy.id]
  );
  return { ...vacancy, activeToken: t.rows?.[0]?.token || null, activeTokenExpiresAt: t.rows?.[0]?.expiresAt || null };
}

export async function GET(request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!requireCapability(payload, CAP.VACANCIES_VIEW)) return apiError(request, 'UNAUTHORIZED', 401);

  const isAdmin = isAdminRole(payload);
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

  const id = params?.id;
  if (!id) return apiError(request, 'INVALID_VACANCY', 400);

  const v = await getVacancyOr404(id);
  if (!v) return apiError(request, 'NOT_FOUND', 404);
  if (!isAdmin && String(v.companyId) !== String(companyId)) return apiError(request, 'UNAUTHORIZED', 401);

  const rub = await queryRead(
    `SELECT desired_type_weights AS "vacancyFitWeights", notes AS "vacancyRubricNotes", updated_at AS "vacancyRubricUpdatedAt"
     FROM vacancy_rubrics WHERE vacancy_id = $1 LIMIT 1`,
    [id]
  );
  const rubric =
    rub.rowCount > 0
      ? {
          vacancyFitWeights: rub.rows[0].vacancyFitWeights || {},
          vacancyRubricNotes: rub.rows[0].vacancyRubricNotes ?? null,
          vacancyRubricUpdatedAt: rub.rows[0].vacancyRubricUpdatedAt ?? null,
        }
      : { vacancyFitWeights: {}, vacancyRubricNotes: null, vacancyRubricUpdatedAt: null };

  return NextResponse.json({ ...(await attachActiveToken(v)), ...rubric });
}

export async function PATCH(request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!requireCapability(payload, CAP.VACANCIES_MANAGE)) return apiError(request, 'UNAUTHORIZED', 401);

  const isAdmin = isAdminRole(payload);
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

  const id = params?.id;
  if (!id) return apiError(request, 'INVALID_VACANCY', 400);

  const current = await getVacancyOr404(id);
  if (!current) return apiError(request, 'NOT_FOUND', 404);
  if (!isAdmin && String(current.companyId) !== String(companyId)) return apiError(request, 'UNAUTHORIZED', 401);

  const body = await request.json().catch(() => ({}));
  const title = body.title != null ? String(body.title || '').trim() : null;
  const status = body.status != null ? String(body.status || '').trim() : null;
  const slug = body.slug != null ? slugify(body.slug || '') : null;
  const positionsCount = body.positionsCount != null
    ? Math.max(1, parseInt(body.positionsCount, 10) || 1)
    : null;
  const targetDate = body.targetDate !== undefined
    ? (/^\d{4}-\d{2}-\d{2}$/.test(String(body.targetDate || '')) ? String(body.targetDate) : null)
    : undefined;

  let details;
  try {
    details = parseVacancyDetailsFromBody(body, { forCreate: false });
  } catch (e) {
    if (e?.code === 'INVALID_SALARY_RANGE') return apiError(request, 'INVALID_SALARY_RANGE', 400);
    if (e?.code === 'INVALID_EMPLOYMENT_TYPE') return apiError(request, 'INVALID_EMPLOYMENT_TYPE', 400);
    if (e?.code === 'INVALID_WORKPLACE_MODALITY') {
      return apiError(request, 'INVALID_WORKPLACE_MODALITY', 400);
    }
    if (e?.code === 'INVALID_WORKPLACE_STATE') return apiError(request, 'INVALID_WORKPLACE_STATE', 400);
    throw e;
  }

  // Valida min/max cruzando com valores atuais quando só um lado veio no PATCH
  const checkMin = details.salaryMin !== undefined ? details.salaryMin : current.salaryMin;
  const checkMax = details.salaryMax !== undefined ? details.salaryMax : current.salaryMax;
  if (checkMin != null && checkMax != null && Number(checkMin) > Number(checkMax)) {
    return apiError(request, 'INVALID_SALARY_RANGE', 400);
  }

  if (status !== null && !['open', 'closed'].includes(status)) return apiError(request, 'INVALID_STATUS', 400);
  if (slug !== null && !slug) return apiError(request, 'INVALID_SLUG', 400);

  const nextTitle = title !== null ? title : current.title;
  const nextStatus = status !== null ? status : current.status;
  const nextSlug = slug !== null ? slug : current.slug;
  const nextPositions = positionsCount !== null ? positionsCount : (current.positionsCount ?? 1);
  const nextTargetDate = targetDate !== undefined ? targetDate : (current.targetDate ?? null);
  const nextDescription = details.description !== undefined ? details.description : (current.description ?? null);
  const nextSalaryMin = details.salaryMin !== undefined ? details.salaryMin : (current.salaryMin ?? null);
  const nextSalaryMax = details.salaryMax !== undefined ? details.salaryMax : (current.salaryMax ?? null);
  const nextShowSalary =
    details.clientReportShowSalary !== undefined
      ? details.clientReportShowSalary
      : Boolean(current.clientReportShowSalary);
  const nextEmploymentType =
    details.employmentType !== undefined ? details.employmentType : (current.employmentType ?? null);
  const nextWorkplaceModality =
    details.workplaceModality !== undefined
      ? details.workplaceModality
      : (current.workplaceModality ?? null);
  const nextWorkplaceCity =
    details.workplaceCity !== undefined ? details.workplaceCity : (current.workplaceCity ?? null);
  const nextWorkplaceState =
    details.workplaceState !== undefined ? details.workplaceState : (current.workplaceState ?? null);
  const nextPublicPageEnabled =
    details.publicPageEnabled !== undefined
      ? details.publicPageEnabled
      : Boolean(current.publicPageEnabled);
  const nextPublicAllowIndex =
    details.publicAllowIndex !== undefined
      ? details.publicAllowIndex
      : Boolean(current.publicAllowIndex);
  const nextPublicShowCompanyInfo =
    details.publicShowCompanyInfo !== undefined
      ? details.publicShowCompanyInfo
      : Boolean(current.publicShowCompanyInfo);
  const nextPublicShowSalary =
    details.publicShowSalary !== undefined
      ? details.publicShowSalary
      : Boolean(current.publicShowSalary);
  if (!nextTitle) return apiError(request, 'TITLE_REQUIRED', 400);

  const up = await query(
    `UPDATE vacancies
     SET title = $2, slug = $3, status = $4, positions_count = $5, target_date = $6,
         description = $7, salary_min = $8, salary_max = $9, client_report_show_salary = $10,
         employment_type = $11,
         workplace_modality = $12, workplace_city = $13, workplace_state = $14,
         public_page_enabled = $15, public_allow_index = $16,
         public_show_company_info = $17, public_show_salary = $18
     WHERE id = $1 AND deleted = FALSE
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
      id,
      nextTitle,
      nextSlug,
      nextStatus,
      nextPositions,
      nextTargetDate,
      nextDescription,
      nextSalaryMin,
      nextSalaryMax,
      nextShowSalary,
      nextEmploymentType,
      nextWorkplaceModality,
      nextWorkplaceCity,
      nextWorkplaceState,
      nextPublicPageEnabled,
      nextPublicAllowIndex,
      nextPublicShowCompanyInfo,
      nextPublicShowSalary,
    ]
  );

  if (body.vacancyFitWeights != null || body.vacancyRubricNotes !== undefined) {
    const curRub = await queryRead(
      `SELECT desired_type_weights AS weights, notes FROM vacancy_rubrics WHERE vacancy_id = $1 LIMIT 1`,
      [id]
    );
    const prevW = curRub.rows[0]?.weights || {};
    const prevN = curRub.rows[0]?.notes ?? null;

    const w = body.vacancyFitWeights != null ? body.vacancyFitWeights : prevW;
    if (typeof w !== 'object' || Array.isArray(w)) {
      return apiError(request, 'INVALID_FIT_WEIGHTS', 400);
    }
    const notes =
      body.vacancyRubricNotes !== undefined
        ? body.vacancyRubricNotes == null
          ? null
          : sanitizeInterviewNotesHtml(body.vacancyRubricNotes)
        : prevN;
    await query(
      `INSERT INTO vacancy_rubrics (vacancy_id, desired_type_weights, notes, updated_at)
       VALUES ($1, $2::jsonb, $3, NOW())
       ON CONFLICT (vacancy_id) DO UPDATE SET
         desired_type_weights = EXCLUDED.desired_type_weights,
         notes = EXCLUDED.notes,
         updated_at = NOW()`,
      [id, JSON.stringify(w), notes]
    );
  }

  const rub = await queryRead(
    `SELECT desired_type_weights AS "vacancyFitWeights", notes AS "vacancyRubricNotes", updated_at AS "vacancyRubricUpdatedAt"
     FROM vacancy_rubrics WHERE vacancy_id = $1 LIMIT 1`,
    [id]
  );
  const rubric =
    rub.rowCount > 0
      ? {
          vacancyFitWeights: rub.rows[0].vacancyFitWeights || {},
          vacancyRubricNotes: rub.rows[0].vacancyRubricNotes ?? null,
          vacancyRubricUpdatedAt: rub.rows[0].vacancyRubricUpdatedAt ?? null,
        }
      : { vacancyFitWeights: {}, vacancyRubricNotes: null, vacancyRubricUpdatedAt: null };

  const closedNow =
    String(current.status || '') !== 'closed'
    && String(up.rows[0]?.status || '') === 'closed';
  if (closedNow) {
    await notifyCompanyManagers(query, {
      companyId: up.rows[0].companyId,
      type: NOTIF.VACANCY_CLOSED,
      entityType: 'vacancy',
      entityId: up.rows[0].id,
      dedupeKey: `vacancy_closed:${up.rows[0].id}:${new Date().toISOString().slice(0, 10)}`,
      payload: {
        vacancyId: up.rows[0].id,
        vacancyTitle: up.rows[0].title,
      },
    });
  }

  const updated = up.rows[0];
  const previousPayload = {
    id: current.id,
    slug: current.slug,
    status: current.status,
    publicPageEnabled: current.publicPageEnabled,
    publicAllowIndex: current.publicAllowIndex,
    targetDate: current.targetDate,
    title: current.title,
    employmentType: current.employmentType,
  };
  const currentPayload = {
    id: updated.id,
    slug: updated.slug,
    status: updated.status,
    publicPageEnabled: updated.publicPageEnabled,
    publicAllowIndex: updated.publicAllowIndex,
    targetDate: updated.targetDate,
    title: updated.title,
    employmentType: updated.employmentType,
  };
  scheduleVacancyIndexSync({
    previous: previousPayload,
    current: currentPayload,
    reason: closedNow ? 'vacancy_close' : 'vacancy_update',
  });
  scheduleJobAlertDispatch({
    previous: previousPayload,
    current: currentPayload,
    companyName: current.companyName,
  });

  return NextResponse.json({
    ...(await attachActiveToken({ ...updated, companyName: current.companyName })),
    ...rubric,
  });
}

export async function DELETE(request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!requireCapability(payload, CAP.VACANCIES_MANAGE)) return apiError(request, 'UNAUTHORIZED', 401);

  const isAdmin = isAdminRole(payload);
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

  const id = params?.id;
  if (!id) return apiError(request, 'INVALID_VACANCY', 400);

  const beforeDelete = await getVacancyOr404(id);
  if (!beforeDelete) return apiError(request, 'NOT_FOUND', 404);
  if (!isAdmin && String(beforeDelete.companyId) !== String(companyId)) {
    return apiError(request, 'UNAUTHORIZED', 401);
  }

  await query(
    `UPDATE vacancy_links SET active = FALSE, rotated_at = NOW() WHERE vacancy_id = $1 AND active = TRUE`,
    [id]
  );
  const del = await query(`UPDATE vacancies SET deleted = TRUE WHERE id = $1 AND deleted = FALSE RETURNING id`, [id]);
  if (del.rowCount === 0) return apiError(request, 'NOT_FOUND', 404);

  scheduleVacancyIndexSync({
    previous: {
      id: beforeDelete.id,
      slug: beforeDelete.slug,
      status: beforeDelete.status,
      publicPageEnabled: beforeDelete.publicPageEnabled,
      publicAllowIndex: beforeDelete.publicAllowIndex,
      targetDate: beforeDelete.targetDate,
    },
    current: {
      id: beforeDelete.id,
      slug: beforeDelete.slug,
      status: 'closed',
      publicPageEnabled: false,
      publicAllowIndex: false,
      targetDate: beforeDelete.targetDate,
    },
    reason: 'vacancy_delete',
  });

  return NextResponse.json({ ok: true });
}
