'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { S, AdminListPager, AdminPageHeader, AdminTableShell, AdminTh } from '../dashboard-shared';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { FormField } from '../../_components/FormField';
import { AdminListFilters, AdminListFilterSelect } from '../../_components/AdminListFilters';
import { DisclosureToggle } from '../../_components/CollapsibleBlock';

function formatActor(row, locale) {
  if (row.actorKind === 'employee') {
    return row.actorCandidateName || row.actorCandidateEmail || `#${row.actorCandidateId || '?'}`;
  }
  if (row.actorKind === 'system') return t(locale, 'panel.audit.actorSystem');
  if (row.actorKind === 'public') return t(locale, 'panel.audit.actorPublic');
  if (row.actorUserEmail) {
    const name = row.actorUserName ? `${row.actorUserName} · ` : '';
    return `${name}${row.actorUserEmail}${row.actorUserRole ? ` (${row.actorUserRole})` : ''}`;
  }
  return row.actorUserId ? `#${row.actorUserId}` : '—';
}

function formatTarget(row) {
  if (!row.targetType && !row.targetId) return '—';
  if (row.targetType && row.targetId) return `${row.targetType} #${row.targetId}`;
  return row.targetType || row.targetId || '—';
}

function metadataPreview(meta) {
  if (!meta || typeof meta !== 'object') return '';
  try {
    const s = JSON.stringify(meta);
    return s.length > 160 ? `${s.slice(0, 157)}…` : s;
  } catch {
    return '';
  }
}

/**
 * Super admin: trilha de auditoria cross-tenant (append-only).
 */
export function AuditAdminTab({ navigateDashboard, locale }) {
  const urlParams = useSearchParams();
  const spKey = urlParams.toString();
  const dateLocale = locale === 'en' ? 'en-US' : 'pt-BR';

  const filters = useMemo(() => {
    const actorKind = (urlParams.get('auditActorKind') || 'all').toLowerCase();
    const companyId = (urlParams.get('auditCompanyId') || 'all').trim();
    const action = (urlParams.get('auditAction') || '').trim();
    const q = (urlParams.get('auditQ') || '').trim();
    const pageRaw = parseInt(urlParams.get('auditPage') || '1', 10);
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
    const sizeRaw = parseInt(urlParams.get('auditPageSize') || '30', 10);
    const pageSize = [20, 30, 50, 100].includes(sizeRaw) ? sizeRaw : 30;
    return {
      actorKind: ['all', 'manager', 'employee', 'system', 'public'].includes(actorKind)
        ? actorKind
        : 'all',
      companyId,
      action,
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
  const [expandedId, setExpandedId] = useState(null);
  const [qDraft, setQDraft] = useState(filters.q);
  const [actionDraft, setActionDraft] = useState(filters.action);

  useEffect(() => {
    setQDraft(filters.q);
    setActionDraft(filters.action);
  }, [filters.q, filters.action]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams({
          page: String(filters.page),
          pageSize: String(filters.pageSize),
          actorKind: filters.actorKind,
        });
        if (filters.companyId && filters.companyId !== 'all') qs.set('companyId', filters.companyId);
        if (filters.action) qs.set('action', filters.action);
        if (filters.q) qs.set('q', filters.q);
        const res = await fetch(`/api/admin/audit-log?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.audit.loadFailed'));
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
  }, [filters, locale]);

  const pushFilters = (patch) => {
    navigateDashboard({
      tab: 'audit',
      auditActorKind: patch.actorKind !== undefined ? patch.actorKind : filters.actorKind,
      auditCompanyId: patch.companyId !== undefined ? patch.companyId || null : filters.companyId || null,
      auditAction: patch.action !== undefined ? patch.action || null : filters.action || null,
      auditQ: patch.q !== undefined ? patch.q || null : filters.q || null,
      auditPage: patch.page !== undefined ? patch.page : filters.page,
      auditPageSize: patch.pageSize !== undefined ? patch.pageSize : filters.pageSize,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title={t(locale, 'panel.audit.title')}
        subtitle={t(locale, 'panel.audit.intro')}
      />

      <AdminListFilters
        aria-label={t(locale, 'panel.audit.title')}
        locale={locale}
        onClear={() => {
          setQDraft('');
          setActionDraft('');
          pushFilters({ actorKind: 'all', companyId: 'all', action: '', q: '', page: 1 });
        }}
        clearEnabled={Boolean(
          filters.actorKind !== 'all' ||
            (filters.companyId && filters.companyId !== 'all') ||
            filters.action ||
            filters.q ||
            String(qDraft || '').trim() ||
            String(actionDraft || '').trim()
        )}
      >
        <AdminListFilterSelect
          label={t(locale, 'panel.audit.filterActorKind')}
          value={filters.actorKind}
          onChange={(v) => pushFilters({ actorKind: v, page: 1 })}
        >
          <option value="all">{t(locale, 'panel.audit.actorKindAll')}</option>
          <option value="manager">{t(locale, 'panel.audit.actorKindManager')}</option>
          <option value="employee">{t(locale, 'panel.audit.actorKindEmployee')}</option>
          <option value="system">{t(locale, 'panel.audit.actorKindSystem')}</option>
          <option value="public">{t(locale, 'panel.audit.actorKindPublic')}</option>
        </AdminListFilterSelect>
        <FormField label={t(locale, 'panel.audit.filterCompanyId')} className="min-w-[7rem] shrink-0">
          <input
            className={cn(S.input, 'w-28')}
            inputMode="numeric"
            placeholder={t(locale, 'panel.audit.companyIdPh')}
            value={filters.companyId === 'all' ? '' : filters.companyId}
            onChange={(e) => {
              const v = e.target.value.trim();
              pushFilters({ companyId: v || 'all', page: 1 });
            }}
          />
        </FormField>
        <FormField label={t(locale, 'panel.audit.filterAction')} className="min-w-[11rem] shrink-0">
          <input
            className={cn(S.input, 'min-w-[180px]')}
            value={actionDraft}
            placeholder={t(locale, 'panel.audit.actionPh')}
            onChange={(e) => setActionDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') pushFilters({ action: actionDraft.trim(), page: 1 });
            }}
          />
        </FormField>
        <FormField label={t(locale, 'panel.audit.filterSearch')} className="min-w-[200px] shrink-0 flex-1">
          <input
            className={cn(S.input, 'w-full')}
            value={qDraft}
            placeholder={t(locale, 'panel.audit.searchPh')}
            onChange={(e) => setQDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') pushFilters({ q: qDraft.trim(), page: 1 });
            }}
          />
        </FormField>
        <button
          type="button"
          className={cn(S.btnBrandSoft, 'min-h-touch shrink-0 self-end')}
          onClick={() => pushFilters({ q: qDraft.trim(), action: actionDraft.trim(), page: 1 })}
        >
          {t(locale, 'panel.audit.applyFilters')}
        </button>
      </AdminListFilters>

      {error ? <p className="m-0 font-mono text-xs text-danger">{error}</p> : null}
      {loading ? <AppLoading locale={locale} variant="panel" /> : null}

      {!loading && !items.length ? (
        <EmptyState
          title={t(locale, 'panel.audit.emptyTitle')}
          message={t(locale, 'panel.audit.emptyBody')}
        />
      ) : null}

      {!loading && items.length ? (
        <ContentEnter animKey={`${total}-${items.length}`}>
        <>
          <p className={cn(S.muted, 'm-0 text-xs')}>{t(locale, 'panel.audit.count', { n: total })}</p>
          <AdminTableShell
            minWidth="880px"
            animKey={`${filters.actorKind}|${filters.companyId}|${filters.action}|${filters.q}|${filters.page}|${filters.pageSize}`}
          >
              <thead>
                <tr className="border-b border-ink/10 bg-ink/[0.03]">
                  <AdminTh>{t(locale, 'panel.audit.colWhen')}</AdminTh>
                  <AdminTh>{t(locale, 'panel.audit.colActor')}</AdminTh>
                  <AdminTh>{t(locale, 'panel.audit.colAction')}</AdminTh>
                  <AdminTh>{t(locale, 'panel.audit.colTarget')}</AdminTh>
                  <AdminTh>{t(locale, 'panel.audit.colCompany')}</AdminTh>
                  <AdminTh>{t(locale, 'panel.audit.colWhere')}</AdminTh>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const when = row.createdAt
                    ? new Date(row.createdAt).toLocaleString(dateLocale)
                    : '—';
                  const metaLine = metadataPreview(row.metadata);
                  const open = expandedId === row.id;
                  return (
                    <tr key={row.id} className="border-b border-ink/8 align-top hover:bg-ink/[0.02]">
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-2xs text-ink-muted">
                        {when}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="mb-0.5 block font-mono text-2xs uppercase text-ink-faint">
                          {t(locale, `panel.audit.actorKind.${row.actorKind || 'manager'}`)}
                        </span>
                        {formatActor(row, locale)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">{row.action}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{formatTarget(row)}</td>
                      <td className="px-3 py-2.5 text-ink-muted">
                        {row.companyName || (row.companyId ? `#${row.companyId}` : '—')}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-mono text-2xs text-ink-muted">{row.requestPath || '—'}</div>
                        {row.requestIp ? (
                          <div className="mt-0.5 font-mono text-2xs text-ink-faint">{row.requestIp}</div>
                        ) : null}
                        {metaLine ? (
                          <button
                            type="button"
                            className="mt-1 inline-flex cursor-pointer items-center border-none bg-transparent p-0 text-left"
                            onClick={() => setExpandedId(open ? null : row.id)}
                            aria-expanded={open}
                          >
                            <DisclosureToggle locale={locale} open={open} />
                          </button>
                        ) : null}
                        {open && row.metadata ? (
                          <pre className="mt-1 max-w-md overflow-x-auto rounded-control border border-ink/10 bg-ink/[0.03] p-2 font-mono text-2xs text-ink-muted">
                            {JSON.stringify(row.metadata, null, 2)}
                          </pre>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
          </AdminTableShell>

          <AdminListPager
            locale={locale}
            page={filters.page}
            pageSize={filters.pageSize}
            total={total}
            pageSizeOptions={[20, 30, 50, 100]}
            onPageChange={(p) => pushFilters({ page: p })}
            onPageSizeChange={(ps) => pushFilters({ pageSize: ps, page: 1 })}
          />
        </>
        </ContentEnter>
      ) : null}
    </div>
  );
}
