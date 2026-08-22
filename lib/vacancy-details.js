import { stripSalary } from './br-masks.js';
import { sanitizeInterviewNotesHtml } from './sanitize-html.js';
import { normalizeEmploymentType } from './vacancy-employment-type.js';

function cleanDescription(v) {
  return sanitizeInterviewNotesHtml(v);
}

function parseOptionalBool(body, camelKey, snakeKey, { forCreate }) {
  const has = body[camelKey] !== undefined || body[snakeKey] !== undefined;
  if (forCreate) {
    return has ? Boolean(body[camelKey] ?? body[snakeKey]) : false;
  }
  if (has) return Boolean(body[camelKey] ?? body[snakeKey]);
  return undefined;
}

/**
 * Extrai campos de detalhe da vaga do body.
 * Campos omitidos retornam `undefined` (não atualizar no PATCH).
 * description é HTML sanitizado (mesmo editor das anotações).
 */
export function parseVacancyDetailsFromBody(body = {}, { forCreate = false } = {}) {
  const hasDesc = body.description !== undefined || body.vacancyDescription !== undefined;
  const hasMin = body.salaryMin !== undefined || body.salary_min !== undefined;
  const hasMax = body.salaryMax !== undefined || body.salary_max !== undefined;
  const hasShowSalary =
    body.clientReportShowSalary !== undefined || body.client_report_show_salary !== undefined;
  const hasEmployment =
    body.employmentType !== undefined || body.employment_type !== undefined;

  const description = forCreate
    ? cleanDescription(body.description ?? body.vacancyDescription)
    : hasDesc
      ? cleanDescription(body.description ?? body.vacancyDescription)
      : undefined;

  const salaryMin = forCreate
    ? stripSalary(body.salaryMin ?? body.salary_min)
    : hasMin
      ? stripSalary(body.salaryMin ?? body.salary_min)
      : undefined;

  const salaryMax = forCreate
    ? stripSalary(body.salaryMax ?? body.salary_max)
    : hasMax
      ? stripSalary(body.salaryMax ?? body.salary_max)
      : undefined;

  const minVal = salaryMin !== undefined ? salaryMin : null;
  const maxVal = salaryMax !== undefined ? salaryMax : null;
  if (minVal != null && maxVal != null && Number(minVal) > Number(maxVal)) {
    const err = new Error('INVALID_SALARY_RANGE');
    err.code = 'INVALID_SALARY_RANGE';
    throw err;
  }

  let clientReportShowSalary;
  if (forCreate) {
    clientReportShowSalary = hasShowSalary
      ? Boolean(body.clientReportShowSalary ?? body.client_report_show_salary)
      : false;
  } else if (hasShowSalary) {
    clientReportShowSalary = Boolean(body.clientReportShowSalary ?? body.client_report_show_salary);
  } else {
    clientReportShowSalary = undefined;
  }

  let employmentType;
  if (forCreate) {
    employmentType = hasEmployment
      ? normalizeEmploymentType(body.employmentType ?? body.employment_type)
      : null;
  } else if (hasEmployment) {
    const raw = body.employmentType ?? body.employment_type;
    employmentType = raw === '' || raw == null ? null : normalizeEmploymentType(raw);
    if (raw && employmentType == null) {
      const err = new Error('INVALID_EMPLOYMENT_TYPE');
      err.code = 'INVALID_EMPLOYMENT_TYPE';
      throw err;
    }
  } else {
    employmentType = undefined;
  }

  const publicPageEnabled = parseOptionalBool(body, 'publicPageEnabled', 'public_page_enabled', {
    forCreate,
  });
  const publicAllowIndex = parseOptionalBool(body, 'publicAllowIndex', 'public_allow_index', {
    forCreate,
  });
  const publicShowCompanyInfo = parseOptionalBool(
    body,
    'publicShowCompanyInfo',
    'public_show_company_info',
    { forCreate }
  );
  const publicShowSalary = parseOptionalBool(body, 'publicShowSalary', 'public_show_salary', {
    forCreate,
  });

  return {
    description,
    salaryMin,
    salaryMax,
    clientReportShowSalary,
    employmentType,
    publicPageEnabled,
    publicAllowIndex,
    publicShowCompanyInfo,
    publicShowSalary,
  };
}

export const VACANCY_DETAILS_SQL_SELECT = `
  v.description,
  v.salary_min AS "salaryMin",
  v.salary_max AS "salaryMax",
  v.client_report_show_salary AS "clientReportShowSalary",
  v.employment_type AS "employmentType",
  v.public_page_enabled AS "publicPageEnabled",
  v.public_allow_index AS "publicAllowIndex",
  v.public_show_company_info AS "publicShowCompanyInfo",
  v.public_show_salary AS "publicShowSalary"`.trim();
