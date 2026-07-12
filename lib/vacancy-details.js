import { stripSalary } from './br-masks';
import { sanitizeInterviewNotesHtml } from './sanitize-html';

function cleanDescription(v) {
  return sanitizeInterviewNotesHtml(v);
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

  return { description, salaryMin, salaryMax };
}

export const VACANCY_DETAILS_SQL_SELECT = `
  v.description,
  v.salary_min AS "salaryMin",
  v.salary_max AS "salaryMax"`.trim();
