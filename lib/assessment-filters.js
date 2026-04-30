/** Filtros comuns das listagens de assessments (dashboard + APIs). */

export const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

/** @returns {{ page: number, pageSize: number, enneagram: string }} */
export function parseDashboardPagination(searchParams) {
  const pageRaw = parseInt(String(searchParams?.page ?? '1'), 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  const sizeRaw = parseInt(String(searchParams?.pageSize ?? '20'), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(sizeRaw) ? sizeRaw : 20;

  const enneRaw = String(searchParams?.enneagram ?? searchParams?.profile ?? 'all').trim();
  let enneagram = 'all';
  if (/^[1-9]$/.test(enneRaw)) enneagram = enneRaw;

  return { page, pageSize, enneagram };
}

/**
 * @returns {{ whereParts: string[], params: unknown[] }}
 * Cláusulas para WHERE em queries que já fazem JOIN em candidates, areas, vacancies (LEFT).
 */
export function assessmentListWhereParts({
  isAdmin,
  companyId,
  scopeCompanyFilter,
  selectedArea,
  selectedVacancy,
  enneagram = 'all',
}) {
  const whereParts = [];
  const params = [];

  if (!isAdmin) {
    params.push(companyId);
    whereParts.push(`ass.company_id = $${params.length}`);
  } else if (scopeCompanyFilter != null) {
    params.push(scopeCompanyFilter);
    whereParts.push(`ass.company_id = $${params.length}`);
  }

  if (selectedArea !== 'all') {
    params.push(selectedArea);
    whereParts.push(`ar.key = $${params.length}`);
  }

  if (selectedVacancy !== 'all') {
    params.push(selectedVacancy);
    whereParts.push(`ass.vacancy_id = $${params.length}`);
  }

  if (enneagram !== 'all') {
    const t = parseInt(String(enneagram), 10);
    if (t >= 1 && t <= 9) {
      params.push(t);
      whereParts.push(`ass.top_type = $${params.length}`);
    }
  }

  return { whereParts, params };
}

export function sqlWhere(whereParts) {
  return whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
}
