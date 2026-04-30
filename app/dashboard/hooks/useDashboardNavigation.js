'use client';

import {
  parseCompatTabPagination,
  parseComparePagination,
  parseTeamPagination,
  parseTeamSort,
  parseVacanciesPagination,
  parseVacanciesSort,
} from '../../../lib/assessment-filters';

/**
 * Centraliza montagem da query do dashboard (filtros, paginação por aba, ordenação).
 */
export function useDashboardNavigation({
  router,
  urlParams,
  area,
  vacancy,
  company,
  enneagram,
  isAdmin,
  teamPagination,
}) {
  const snapshot = () => Object.fromEntries(urlParams.entries());

  const buildDashboardUrl = (opts = {}) => {
    const p = new URLSearchParams();
    const nextCompany = opts.company !== undefined ? opts.company : company;
    const nextArea = opts.area !== undefined ? opts.area : area;
    const nextVacancy = opts.vacancy !== undefined ? opts.vacancy : vacancy;
    const nextEnneagram = opts.enneagram !== undefined ? opts.enneagram : enneagram;

    if (isAdmin && nextCompany && nextCompany !== 'all') {
      p.set('company', String(nextCompany));
    }

    if (nextArea && nextArea !== 'all') p.set('area', nextArea);

    if (nextVacancy && nextVacancy !== 'all') p.set('vacancy', String(nextVacancy));

    if (nextEnneagram && nextEnneagram !== 'all') p.set('enneagram', nextEnneagram);

    const merged = { ...snapshot(), ...opts };
    const teamFrom = parseTeamPagination(merged);
    const teamSortSt = parseTeamSort(merged);
    p.set('teamSort', teamSortSt.sort);
    p.set('teamSortDir', teamSortSt.dir);
    const teamPg = opts.teamPage != null ? opts.teamPage : teamFrom.page;
    const teamPs = opts.teamPageSize != null ? opts.teamPageSize : teamFrom.pageSize;
    p.set('teamPage', String(Math.max(1, teamPg)));
    p.set('teamPageSize', String(teamPs));

    const vacLst = parseVacanciesPagination(merged);
    const vPg = opts.vacanciesPage != null ? opts.vacanciesPage : vacLst.page;
    const vPs = opts.vacanciesPageSize != null ? opts.vacanciesPageSize : vacLst.pageSize;
    p.set('vacanciesPage', String(Math.max(1, vPg)));
    p.set('vacanciesPageSize', String(vPs));

    const vacSortSt = parseVacanciesSort(merged, { isAdmin });
    p.set('vacanciesSort', vacSortSt.sort);
    p.set('vacanciesSortDir', vacSortSt.dir);

    const cmp = parseComparePagination(merged);
    const cPg = opts.comparePage != null ? opts.comparePage : cmp.page;
    const cPs = opts.comparePageSize != null ? opts.comparePageSize : cmp.pageSize;
    p.set('comparePage', String(Math.max(1, cPg)));
    p.set('comparePageSize', String(cPs));

    const compat = parseCompatTabPagination(merged);
    const compatPg = opts.compatPage != null ? opts.compatPage : compat.page;
    const compatPs = opts.compatPageSize != null ? opts.compatPageSize : compat.pageSize;
    p.set('compatPage', String(Math.max(1, compatPg)));
    p.set('compatPageSize', String(compatPs));

    const resolvedTab =
      opts.tab !== undefined ? opts.tab : urlParams.get('tab') || 'overview';
    p.set('tab', resolvedTab);

    return p;
  };

  const navigateWithOpts = (opts) => {
    router.push(`/dashboard?${buildDashboardUrl(opts).toString()}`);
  };

  const navigateToTab = (id) => {
    navigateWithOpts({ tab: id });
  };

  const pushFilters = (nextFilter) => {
    navigateWithOpts({
      ...(nextFilter?.company != null ? { company: nextFilter.company } : {}),
      ...(nextFilter?.area != null ? { area: nextFilter.area } : {}),
      ...(nextFilter?.vacancy != null ? { vacancy: nextFilter.vacancy } : {}),
      ...(nextFilter?.enneagram != null ? { enneagram: nextFilter.enneagram } : {}),
      teamPage: 1,
      comparePage: 1,
      vacanciesPage: 1,
      compatPage: 1,
    });
  };

  const pushTeamPagination = (opts) => {
    navigateWithOpts({
      teamPage: opts.teamPage ?? teamPagination.page,
      teamPageSize: opts.teamPageSize ?? teamPagination.pageSize,
    });
  };

  const pushTeamSort = (column) => {
    const cur = parseTeamSort(snapshot());
    const nextDir =
      cur.sort === column ? (cur.dir === 'asc' ? 'desc' : 'asc') : column === 'createdAt' ? 'desc' : 'asc';
    navigateWithOpts({
      teamSort: column,
      teamSortDir: nextDir,
      teamPage: 1,
    });
  };

  const pushComparePagination = (opts) => {
    const cmp = parseComparePagination(snapshot());
    navigateWithOpts({
      comparePage: opts.page ?? cmp.page,
      comparePageSize: opts.pageSize ?? cmp.pageSize,
    });
  };

  const pushCompatListPagination = (opts) => {
    const cx = parseCompatTabPagination(snapshot());
    navigateWithOpts({
      compatPage: opts.page ?? cx.page,
      compatPageSize: opts.pageSize ?? cx.pageSize,
    });
  };

  return {
    snapshot,
    navigateWithOpts,
    navigateToTab,
    pushFilters,
    pushTeamPagination,
    pushTeamSort,
    pushComparePagination,
    pushCompatListPagination,
  };
}
