'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { PAGE_SIZE_OPTIONS } from '../../../lib/assessment-filters';
import { S, AdminListPager } from '../dashboard-shared';
import { EmptyState } from '../../_components/EmptyState';
import { FormField, formFieldRowClass } from '../../_components/FormField';

function statusChipClass(status) {
  if (status === 'pending') return 'border-warning/25 bg-warning/10 text-warning';
  if (status === 'active') return 'border-success/25 bg-success/10 text-success';
  return 'border-ink/12 bg-ink/[0.04] text-ink-muted';
}

/**
 * Admin: early-access / self-service leads (lista + status + metadata).
 * Visível só para super admin (admin sem company_id).
 */
export function LeadsAdminTab({ navigateDashboard, locale }) {
  const urlParams = useSearchParams();
  const spKey = urlParams.toString();
  const dateLocale = locale === 'en' ? 'en-US' : 'pt-BR';

  const filters = useMemo(() => {
    const status = (urlParams.get('leadsStatus') || 'all').toLowerCase();
    const q = (urlParams.get('leadsQ') || '').trim();
    const pageRaw = parseInt(urlParams.get('leadsPage') || '1', 10);
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
    const sizeRaw = parseInt(urlParams.get('leadsPageSize') || '20', 10);
    const pageSize = PAGE_SIZE_OPTIONS.includes(sizeRaw) ? sizeRaw : 20;
    return {
      status: ['all', 'pending', 'active', 'inactive'].includes(status) ? status : 'all',
      q,
      page,
      pageSize,
    };
  }, [spKey]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [qDraft, setQDraft] = useState(filters.q);

  useEffect(() => {
    setQDraft(filters.q);
  }, [filters.q]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams({
          page: String(filters.page),
          pageSize: String(filters.pageSize),
          status: filters.status,
        });
        if (filters.q) qs.set('q', filters.q);
        const res = await fetch(`/api/admin/leads?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.leads.loadFailed'));
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
          setTotal(typeof data.total === 'number' ? data.total : 0);
          setTotalPages(typeof data.totalPages === 'number' ? data.totalPages : 1);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || t(locale, 'panel.common.error'));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.page, filters.pageSize, filters.status, filters.q, locale]);

  const pushFilters = (patch) => {
    if (!navigateDashboard) return;
    navigateDashboard({
      tab: 'leads',
      leadsStatus: patch.status !== undefined ? patch.status : filters.status,
      leadsQ: patch.q !== undefined ? patch.q || null : filters.q || null,
      leadsPage: patch.page !== undefined ? patch.page : filters.page,
      leadsPageSize: patch.pageSize !== undefined ? patch.pageSize : filters.pageSize,
    });
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(dateLocale, {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className={S.stack}>
      <div>
        <h2 className={S.pageTitle}>{t(locale, 'panel.leads.title')}</h2>
        <p className={cn(S.muted, 'mt-1 max-w-2xl')}>{t(locale, 'panel.leads.intro')}</p>
      </div>

      <div className={cn(formFieldRowClass, 'gap-3')}>
        <FormField label={t(locale, 'panel.leads.filterStatus')}>
          <select
            value={filters.status}
            onChange={(e) => pushFilters({ status: e.target.value, page: 1 })}
            className={S.select}
          >
            <option value="all">{t(locale, 'panel.leads.statusAll')}</option>
            <option value="pending">{t(locale, 'panel.leads.statusPending')}</option>
            <option value="active">{t(locale, 'panel.leads.statusActive')}</option>
            <option value="inactive">{t(locale, 'panel.leads.statusInactive')}</option>
          </select>
        </FormField>
        <FormField label={t(locale, 'panel.leads.filterSearch')} className="min-w-[200px] flex-1">
          <input
            type="search"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') pushFilters({ q: qDraft.trim(), page: 1 });
            }}
            onBlur={() => {
              if (qDraft.trim() !== filters.q) pushFilters({ q: qDraft.trim(), page: 1 });
            }}
            placeholder={t(locale, 'panel.leads.searchPh')}
            className={S.input}
          />
        </FormField>
      </div>

      {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
      {loading ? <p className={S.muted}>{t(locale, 'common.loading')}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title={t(locale, 'panel.leads.emptyTitle')}
          message={t(locale, 'panel.leads.emptyBody')}
        />
      ) : null}

      {!loading && items.length > 0 ? (
        <>
          <p className={cn(S.faint, 'm-0')}>
            {t(locale, 'panel.leads.count', { n: total })}
          </p>
          <div className="overflow-x-auto rounded-card border border-ink/10 bg-surface">
            <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-canvas/80">
                  <th className="px-3 py-2.5 font-mono text-2xs font-normal uppercase text-ink-faint">
                    {t(locale, 'panel.leads.colWhen')}
                  </th>
                  <th className="px-3 py-2.5 font-mono text-2xs font-normal uppercase text-ink-faint">
                    {t(locale, 'panel.leads.colLead')}
                  </th>
                  <th className="px-3 py-2.5 font-mono text-2xs font-normal uppercase text-ink-faint">
                    {t(locale, 'panel.leads.colOrigin')}
                  </th>
                  <th className="px-3 py-2.5 font-mono text-2xs font-normal uppercase text-ink-faint">
                    {t(locale, 'panel.leads.colCompany')}
                  </th>
                  <th className="px-3 py-2.5 font-mono text-2xs font-normal uppercase text-ink-faint">
                    {t(locale, 'panel.leads.colStatus')}
                  </th>
                  <th className="px-3 py-2.5 font-mono text-2xs font-normal uppercase text-ink-faint">
                    {t(locale, 'panel.leads.colMeta')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-ink/6 align-top last:border-0">
                    <td className="px-3 py-3 text-xs text-ink-muted whitespace-nowrap">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-ink">{row.fullName || '—'}</div>
                      <div className="text-xs text-ink-muted">{row.email}</div>
                      <div className="mt-0.5 font-mono text-2xs text-ink-faint">
                        #{row.id} · {row.role}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-block rounded-control border border-info/25 bg-info/10 px-2 py-0.5 font-mono text-2xs text-info">
                        {t(locale, `panel.leads.origin.${row.origin || 'self_service'}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-ink">
                      {row.companyName || '—'}
                      {row.companyId != null ? (
                        <div className="font-mono text-2xs text-ink-faint">#{row.companyId}</div>
                      ) : null}
                      {row.companySignupAutoCreated ? (
                        <div className="mt-0.5 text-2xs text-ink-faint">
                          {t(locale, 'panel.leads.autoCompany')}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'inline-block rounded-control border px-2 py-0.5 font-mono text-2xs uppercase',
                          statusChipClass(row.status)
                        )}
                      >
                        {t(locale, `panel.leads.status.${row.status}`)}
                      </span>
                      {row.passwordSetupPending ? (
                        <div className="mt-1 text-2xs text-warning">
                          {t(locale, 'panel.leads.setupPending')}
                        </div>
                      ) : null}
                      {row.onboardingCompleted ? (
                        <div className="mt-1 text-2xs text-ink-faint">
                          {t(locale, 'panel.leads.wizardDone')}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-muted">
                      {row.jobTitle ? (
                        <div>
                          <span className="text-ink-faint">{t(locale, 'panel.leads.metaJob')}: </span>
                          {row.jobTitle}
                        </div>
                      ) : null}
                      {row.teamSize ? (
                        <div>
                          <span className="text-ink-faint">{t(locale, 'panel.leads.metaTeam')}: </span>
                          {row.teamSize}
                        </div>
                      ) : null}
                      {row.painPoints ? (
                        <div className="mt-1 max-w-xs leading-snug">
                          <span className="text-ink-faint">{t(locale, 'panel.leads.metaPain')}: </span>
                          {row.painPoints}
                        </div>
                      ) : null}
                      {!row.jobTitle && !row.teamSize && !row.painPoints ? '—' : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminListPager
            locale={locale}
            page={filters.page}
            pageSize={filters.pageSize}
            total={total}
            onPageChange={(p) => pushFilters({ page: p })}
            onPageSizeChange={(ps) => pushFilters({ pageSize: ps, page: 1 })}
          />
        </>
      ) : null}
    </div>
  );
}
