'use client';

import { useCallback, useEffect, useState } from 'react';
import { t, localeHtmlLang } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { formatSalaryDisplay } from '../../../lib/br-masks';
import { PAGE_SIZE_OPTIONS } from '../../../lib/assessment-filters';
import { EMPLOYMENT_STATUS } from '../../../lib/domain-status.js';
import {
  AdminActionsCell,
  AdminActionsTh,
  AdminIconButton,
  AdminListPager,
  AdminViewButton,
  S,
  SortableTh,
  clientSortNextDir,
} from '../dashboard-shared';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';
import { AdminRichFormDrawer } from '../../_components/AdminRichFormDrawer';
import { CompensationBlock } from '../../_components/CompensationBlock';
import { useAppFeedback } from '../../_components/AppFeedback';

function formatDate(value, locale) {
  if (!value) return '—';
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split('-').map(Number);
  if (!y || !m || !d) return raw;
  return new Date(y, m - 1, d).toLocaleDateString(localeHtmlLang(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function eventTypeLabel(locale, type) {
  const key = `panel.compensation.type.${type}`;
  const label = t(locale, key);
  return label === key ? type : label;
}

/**
 * Unified internal compensation roster — list salaries + history drawer.
 */
export function CompensationAdminTab({ locale = 'pt-BR', companyId }) {
  const { toast } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState(EMPLOYMENT_STATUS.EMPLOYEE);
  const [hasSalary, setHasSalary] = useState('all');
  const [historyPerson, setHistoryPerson] = useState(null);

  const load = useCallback(async () => {
    if (!companyId) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort,
        sortDir,
        employmentStatus: statusFilter,
        hasSalary,
      });
      if (q) params.set('q', q);
      if (companyId) params.set('companyId', String(companyId));
      const res = await fetch(`/api/admin/compensation?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total) || 0);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.compensationRoster.loadError'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, page, pageSize, sort, sortDir, statusFilter, hasSalary, q, locale, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSort = (columnKey) => {
    const nextDir = clientSortNextDir(columnKey, sort, sortDir);
    setSort(columnKey);
    setSortDir(nextDir);
    setPage(1);
  };

  const commitSearch = () => {
    const next = qDraft.trim();
    if (next === q) return;
    setQ(next);
    setPage(1);
  };

  const money = (amount) =>
    amount ? formatSalaryDisplay(amount, locale) : t(locale, 'panel.compensation.noCurrent');

  if (!companyId) {
    return (
      <EmptyState
        title={t(locale, 'panel.compensationRoster.needCompanyTitle')}
        message={t(locale, 'panel.compensationRoster.needCompanyHint')}
      />
    );
  }

  if (loading && items.length === 0) return <AppLoading />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="m-0 font-display text-xl font-normal text-ink">
          {t(locale, 'panel.compensationRoster.title')}
        </h2>
        <p className={cn(S.muted, 'mb-0 mt-1 text-sm')}>
          {t(locale, 'panel.compensationRoster.subtitle')}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <span className={S.label}>{t(locale, 'panel.compensationRoster.searchLabel')}</span>
          <input
            type="search"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitSearch();
            }}
            onBlur={commitSearch}
            placeholder={t(locale, 'panel.compensationRoster.searchPh')}
            className={S.input}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={S.label}>{t(locale, 'panel.compensationRoster.statusLabel')}</span>
          <select
            className={S.select}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value={EMPLOYMENT_STATUS.EMPLOYEE}>
              {t(locale, 'panel.compensationRoster.statusEmployee')}
            </option>
            <option value={EMPLOYMENT_STATUS.ALUMNI}>
              {t(locale, 'panel.compensationRoster.statusAlumni')}
            </option>
            <option value="all">{t(locale, 'panel.compensationRoster.statusAll')}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={S.label}>{t(locale, 'panel.compensationRoster.hasSalaryLabel')}</span>
          <select
            className={S.select}
            value={hasSalary}
            onChange={(e) => {
              setHasSalary(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t(locale, 'panel.compensationRoster.hasSalaryAll')}</option>
            <option value="with">{t(locale, 'panel.compensationRoster.hasSalaryWith')}</option>
            <option value="without">{t(locale, 'panel.compensationRoster.hasSalaryWithout')}</option>
          </select>
        </label>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={t(locale, 'panel.compensationRoster.emptyTitle')}
          message={t(locale, 'panel.compensationRoster.emptyHint')}
        />
      ) : (
        <div className="overflow-x-auto rounded-control border border-ink/12 bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr>
                <SortableTh columnKey="name" sortKey={sort} dir={sortDir} onSort={onSort}>
                  {t(locale, 'panel.compensationRoster.colName')}
                </SortableTh>
                <SortableTh columnKey="amount" sortKey={sort} dir={sortDir} onSort={onSort}>
                  {t(locale, 'panel.compensationRoster.colAmount')}
                </SortableTh>
                <SortableTh columnKey="effectiveDate" sortKey={sort} dir={sortDir} onSort={onSort}>
                  {t(locale, 'panel.compensationRoster.colSince')}
                </SortableTh>
                <th
                  scope="col"
                  className="border-b border-ink/12 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted"
                >
                  {t(locale, 'panel.compensationRoster.colType')}
                </th>
                <SortableTh columnKey="eventCount" sortKey={sort} dir={sortDir} onSort={onSort}>
                  {t(locale, 'panel.compensationRoster.colEvents')}
                </SortableTh>
                <AdminActionsTh>{t(locale, 'panel.compensationRoster.colActions')}</AdminActionsTh>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.candidateId} className="border-b border-ink/8 last:border-b-0">
                  <td className="px-4 py-3 align-middle">
                    <div className="font-ui text-sm text-ink">{row.fullName}</div>
                    {row.email ? (
                      <div className="mt-0.5 font-mono text-[11px] text-ink-muted">{row.email}</div>
                    ) : null}
                    {row.employmentStatus === EMPLOYMENT_STATUS.ALUMNI ? (
                      <span className="mt-1 inline-block rounded-control bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink-muted">
                        {t(locale, 'panel.compensationRoster.badgeAlumni')}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-middle font-ui text-sm tabular-nums text-ink">
                    {money(row.current?.amount)}
                  </td>
                  <td className="px-4 py-3 align-middle font-mono text-[12px] text-ink-muted">
                    {formatDate(row.current?.effectiveDate, locale)}
                  </td>
                  <td className="px-4 py-3 align-middle text-sm text-ink-muted">
                    {row.current?.eventType
                      ? eventTypeLabel(locale, row.current.eventType)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 align-middle font-mono text-[12px] text-ink-muted">
                    {row.eventCount}
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    <AdminActionsCell>
                      <AdminViewButton
                        label={t(locale, 'panel.compensationRoster.historyBtn')}
                        icon="list"
                        onClick={() => setHistoryPerson(row)}
                      />
                      <AdminIconButton
                        href={`/dashboard?tab=team&candidate=${row.candidateId}&section=compensation`}
                        label={t(locale, 'panel.compensationRoster.openTeam')}
                        icon="team"
                      />
                    </AdminActionsCell>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminListPager
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        locale={locale}
      />

      <AdminRichFormDrawer
        open={Boolean(historyPerson)}
        title={
          historyPerson
            ? t(locale, 'panel.compensationRoster.historyTitle', {
                name: historyPerson.fullName,
              })
            : ''
        }
        locale={locale}
        onClose={() => {
          setHistoryPerson(null);
          void load();
        }}
        maxWidth="640px"
      >
        {historyPerson ? (
          <CompensationBlock
            locale={locale}
            candidateId={historyPerson.candidateId}
            employmentStatus={historyPerson.employmentStatus}
          />
        ) : null}
      </AdminRichFormDrawer>
    </div>
  );
}
