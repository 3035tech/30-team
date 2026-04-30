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
  'users',
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
  if (id === 'users' && !isAdmin) return 'overview';
  return id;
}

const TEAM_SORT_KEYS = new Set(['createdAt', 'name', 'area', 'type', 'vacancy']);

/** @returns {{ sort: string, dir: 'asc' | 'desc' }} */
export function parseTeamSort(searchParams) {
  const raw =
    typeof searchParams?.get === 'function'
      ? (searchParams.get('teamSort') || '').toString()
      : String(searchParams?.teamSort ?? '').trim();
  const sort = TEAM_SORT_KEYS.has(raw) ? raw : 'createdAt';
  const dRaw =
    typeof searchParams?.get === 'function'
      ? (searchParams.get('teamSortDir') || 'desc').toString()
      : String(searchParams?.teamSortDir ?? 'desc').toLowerCase();
  const dir = dRaw === 'asc' ? 'asc' : 'desc';
  return { sort, dir };
}

/** SQL ORDER BY fragment (whitelist only — injetar apenas com parseTeamSort). */
export function sqlTeamOrderBy(sort, dir) {
  const d = dir === 'asc' ? 'ASC' : 'DESC';
  switch (sort) {
    case 'name':
      return `ORDER BY LOWER(c.full_name) ${d}, ass.id DESC`;
    case 'area':
      return `ORDER BY ar.label ${d}, ass.id DESC`;
    case 'type':
      return `ORDER BY ass.top_type ${d}, ass.id DESC`;
    case 'vacancy':
      return `ORDER BY COALESCE(v.title, '') ${d}, ass.id DESC`;
    case 'createdAt':
    default:
      return `ORDER BY ass.created_at ${d}, ass.id DESC`;
  }
}

const VACANCY_SORT_KEYS = new Set(['createdAt', 'title', 'status', 'companyName', 'id']);

/** @param {{ isAdmin: boolean }} ctx — não-admin não usa companyName na ordenação */
export function parseVacanciesSort(searchParams, ctx = {}) {
  const raw =
    typeof searchParams?.get === 'function'
      ? (searchParams.get('vacanciesSort') || searchParams.get('sort') || '').toString()
      : String(searchParams?.vacanciesSort ?? searchParams?.sort ?? '').trim();
  let sort = VACANCY_SORT_KEYS.has(raw) ? raw : 'createdAt';
  if (!ctx.isAdmin && sort === 'companyName') sort = 'createdAt';
  const dRaw =
    typeof searchParams?.get === 'function'
      ? (searchParams.get('vacanciesSortDir') || searchParams.get('sortDir') || 'desc').toString()
      : String(searchParams?.vacanciesSortDir ?? searchParams?.sortDir ?? 'desc').toLowerCase();
  const dir = dRaw === 'asc' ? 'asc' : 'desc';
  return { sort, dir };
}

/** SQL ORDER BY para listagem paginada de vagas */
export function sqlVacancyOrderBy(sort, dir) {
  const d = dir === 'asc' ? 'ASC' : 'DESC';
  switch (sort) {
    case 'title':
      return `ORDER BY v.title ${d}, v.id DESC`;
    case 'status':
      return `ORDER BY v.status ${d}, v.id DESC`;
    case 'companyName':
      return `ORDER BY c.name ${d}, v.id DESC`;
    case 'id':
      return `ORDER BY v.id ${d}`;
    case 'createdAt':
    default:
      return `ORDER BY v.created_at ${d}, v.id DESC`;
  }
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

const USER_SORT_KEYS = new Set(['id', 'email', 'role', 'companyName', 'active', 'createdAt']);

/** @returns {{ sort: string, dir: 'asc' | 'desc' }} */
export function parseUsersSort(searchParams) {
  const raw =
    typeof searchParams?.get === 'function'
      ? (searchParams.get('usersSort') || '').toString()
      : String(searchParams?.usersSort ?? '').trim();
  const sort = USER_SORT_KEYS.has(raw) ? raw : 'createdAt';
  const dRaw =
    typeof searchParams?.get === 'function'
      ? (searchParams.get('usersSortDir') || 'desc').toString()
      : String(searchParams?.usersSortDir ?? 'desc').toLowerCase();
  const dir = dRaw === 'asc' ? 'asc' : 'desc';
  return { sort, dir };
}

/** SQL ORDER BY — usar apenas com parseUsersSort. */
export function sqlUsersOrderBy(sort, dir) {
  const d = dir === 'asc' ? 'ASC' : 'DESC';
  switch (sort) {
    case 'email':
      return `ORDER BY LOWER(u.email) ${d}, u.id DESC`;
    case 'role':
      return `ORDER BY u.role ${d}, u.id DESC`;
    case 'companyName':
      return `ORDER BY LOWER(COALESCE(c.name, '')) ${d}, u.id DESC`;
    case 'active':
      return `ORDER BY u.active ${d}, u.id DESC`;
    case 'id':
      return `ORDER BY u.id ${d}`;
    case 'createdAt':
    default:
      return `ORDER BY u.created_at ${d}, u.id DESC`;
  }
}

/** @returns {{ page: number, pageSize: number }} */
export function parseUsersPagination(searchParams) {
  const pageRaw = parseInt(String(searchParams?.usersPage ?? '1'), 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const sizeRaw = parseInt(String(searchParams?.usersPageSize ?? '20'), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(sizeRaw) ? sizeRaw : 20;
  return { page, pageSize };
}

const COMPANY_SORT_KEYS = new Set(['id', 'name', 'slug', 'active', 'createdAt']);

/** @returns {{ sort: string, dir: 'asc' | 'desc' }} */
export function parseCompaniesSort(searchParams) {
  const raw =
    typeof searchParams?.get === 'function'
      ? (searchParams.get('companiesSort') || '').toString()
      : String(searchParams?.companiesSort ?? '').trim();
  const sort = COMPANY_SORT_KEYS.has(raw) ? raw : 'createdAt';
  const dRaw =
    typeof searchParams?.get === 'function'
      ? (searchParams.get('companiesSortDir') || 'desc').toString()
      : String(searchParams?.companiesSortDir ?? 'desc').toLowerCase();
  const dir = dRaw === 'asc' ? 'asc' : 'desc';
  return { sort, dir };
}

/** SQL ORDER BY — usar apenas com parseCompaniesSort. */
export function sqlCompaniesOrderBy(sort, dir) {
  const d = dir === 'asc' ? 'ASC' : 'DESC';
  switch (sort) {
    case 'name':
      return `ORDER BY LOWER(c.name) ${d}, c.id DESC`;
    case 'slug':
      return `ORDER BY LOWER(c.slug) ${d}, c.id DESC`;
    case 'active':
      return `ORDER BY c.active ${d}, c.id DESC`;
    case 'id':
      return `ORDER BY c.id ${d}`;
    case 'createdAt':
    default:
      return `ORDER BY c.created_at ${d}, c.id DESC`;
  }
}

/** @returns {{ page: number, pageSize: number }} */
export function parseCompaniesPagination(searchParams) {
  const pageRaw = parseInt(String(searchParams?.companiesPage ?? '1'), 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const sizeRaw = parseInt(String(searchParams?.companiesPageSize ?? '20'), 10);
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

  const vacRaw = String(selectedVacancy ?? 'all').trim();
  if (vacRaw !== 'all') {
    const vid = parseInt(vacRaw, 10);
    if (Number.isFinite(vid)) {
      params.push(vid);
      whereParts.push(`ass.vacancy_id = $${params.length}`);
    }
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
