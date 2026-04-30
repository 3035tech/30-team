/** Filtros comuns das listagens de assessments (dashboard + APIs). */

export const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

const VALID_TAB_IDS = new Set([
  'overview',
  'team',
  'compatibility',
  'compare',
  'group',
  'leadership',
  'vacancies',
  'companies',
]);

/** @param {Record<string, string | string[] | undefined> | URLSearchParams} searchParams */
export function parseDashboardTab(searchParams, { canVacancies, isAdmin }) {
  const raw =
    typeof searchParams?.get === 'function'
      ? (searchParams.get('tab') || '').toString()
      : String(searchParams?.tab ?? '').trim();
  const id = raw && VALID_TAB_IDS.has(raw) ? raw : 'overview';
  if (id === 'vacancies' && !canVacancies) return 'overview';
  if (id === 'companies' && !isAdmin) return 'overview';
  return id;
}

/** @returns {{ page: number, pageSize: number }} — lê teamPage/teamPageSize; fallback legacy page/pageSize */
export function parseTeamPagination(searchParams) {
  const pageRaw = parseInt(
    String(searchParams?.teamPage ?? searchParams?.page ?? '1'),
    10
  );
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  const sizeRaw = parseInt(
    String(searchParams?.teamPageSize ?? searchParams?.pageSize ?? '20'),
    10
  );
  const pageSize = PAGE_SIZE_OPTIONS.includes(sizeRaw) ? sizeRaw : 20;
  return { page, pageSize };
}

/** @returns {{ page: number, pageSize: number }} */
export function parseVacanciesPagination(searchParams) {
  const pageRaw = parseInt(String(searchParams?.vacanciesPage ?? '1'), 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const sizeRaw = parseInt(String(searchParams?.vacanciesPageSize ?? '20'), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(sizeRaw) ? sizeRaw : 20;
  return { page, pageSize };
}

/** @returns {{ page: number, pageSize: number }} */
export function parseComparePagination(searchParams) {
  const pageRaw = parseInt(String(searchParams?.comparePage ?? '1'), 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const sizeRaw = parseInt(String(searchParams?.comparePageSize ?? '20'), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(sizeRaw) ? sizeRaw : 20;
  return { page, pageSize };
}

/** Paginação da aba Compatibilidade (lista de pares). */
export function parseCompatTabPagination(searchParams) {
  const pageRaw = parseInt(String(searchParams?.compatPage ?? '1'), 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const sizeRaw = parseInt(String(searchParams?.compatPageSize ?? '20'), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(sizeRaw) ? sizeRaw : 20;
  return { page, pageSize };
}

/** @returns {string} */
export function parseEnneagramFilter(searchParams) {
  const enneRaw = String(searchParams?.enneagram ?? searchParams?.profile ?? 'all').trim();
  if (/^[1-9]$/.test(enneRaw)) return enneRaw;
  return 'all';
}

/** @returns {{ page: number, pageSize: number, enneagram: string }} */
export function parseDashboardPagination(searchParams) {
  const { page, pageSize } = parseTeamPagination(searchParams);
  const enneagram = parseEnneagramFilter(searchParams);
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
