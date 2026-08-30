'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { PAGE_SIZE_OPTIONS } from '../../../lib/assessment-filters';
import {
  PRODUCT_FEEDBACK_KINDS,
  PRODUCT_FEEDBACK_STATUSES,
} from '../../../lib/domain-status';
import {
  S,
  AdminListPager,
  AdminListSearch,
  AdminPageHeader,
  AdminTableShell,
  AdminTh,
  AdminEditButton,
  AdminActionsCell,
  AdminActionsTh,
} from '../dashboard-shared';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { AdminListFilters, AdminListFilterSelect } from '../../_components/AdminListFilters';
import { StatusToneChip } from '../../_components/StatusToneChip';
import { useAppFeedback } from '../../_components/AppFeedback';
import { InlineCallout } from '../../_components/InlineCallout';

function statusTone(status) {
  if (status === 'new') return 'info';
  if (status === 'reviewing') return 'warning';
  if (status === 'done') return 'success';
  return 'neutral';
}

function kindTone(kind) {
  if (kind === 'bug') return 'danger';
  if (kind === 'ux') return 'warning';
  return 'info';
}

/**
 * Super-admin inbox: product suggestions from managers.
 */
export function ProductFeedbackAdminTab({ locale = 'pt-BR', navigateDashboard }) {
  const { promptForm, toast } = useAppFeedback();
  const urlParams = useSearchParams();
  const spKey = urlParams.toString();
  const dateLocale = locale === 'en' ? 'en-US' : 'pt-BR';

  const filters = useMemo(() => {
    const status = (urlParams.get('fbStatus') || 'all').toLowerCase();
    const kind = (urlParams.get('fbKind') || 'all').toLowerCase();
    const q = (urlParams.get('fbQ') || '').trim();
    const pageRaw = parseInt(urlParams.get('fbPage') || '1', 10);
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
    const sizeRaw = parseInt(urlParams.get('fbPageSize') || '20', 10);
    const pageSize = PAGE_SIZE_OPTIONS.includes(sizeRaw) ? sizeRaw : 20;
    return {
      status: ['all', ...PRODUCT_FEEDBACK_STATUSES].includes(status) ? status : 'all',
      kind: ['all', ...PRODUCT_FEEDBACK_KINDS].includes(kind) ? kind : 'all',
      q,
      page,
      pageSize,
    };
  }, [spKey]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [qDraft, setQDraft] = useState(filters.q);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setQDraft(filters.q);
  }, [filters.q]);

  const pushFilters = (patch) => {
    if (!navigateDashboard) return;
    navigateDashboard({
      tab: 'product-feedback',
      fbStatus: patch.status !== undefined ? patch.status : filters.status,
      fbKind: patch.kind !== undefined ? patch.kind : filters.kind,
      fbQ: patch.q !== undefined ? patch.q || null : filters.q || null,
      fbPage: patch.page !== undefined ? patch.page : filters.page,
      fbPageSize: patch.pageSize !== undefined ? patch.pageSize : filters.pageSize,
    });
  };

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
          kind: filters.kind,
        });
        if (filters.q) qs.set('q', filters.q);
        const res = await fetch(`/api/admin/product-feedback?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.productFeedback.loadFailed'));
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
          setTotal(typeof data.total === 'number' ? data.total : 0);
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
  }, [filters.page, filters.pageSize, filters.status, filters.kind, filters.q, locale, reloadKey]);

  const reviewItem = async (row) => {
    const result = await promptForm({
      title: t(locale, 'panel.productFeedback.reviewTitle'),
      fields: [
        {
          key: 'status',
          label: t(locale, 'panel.productFeedback.colStatus'),
          type: 'select',
          defaultValue: row.status,
          options: PRODUCT_FEEDBACK_STATUSES.map((s) => ({
            value: s,
            label: t(locale, `panel.productFeedback.status.${s}`),
          })),
        },
        {
          key: 'adminNotes',
          label: t(locale, 'panel.productFeedback.adminNotes'),
          type: 'textarea',
          defaultValue: row.adminNotes || '',
          rows: 4,
          maxLength: 4000,
        },
      ],
    });
    if (!result) return;
    try {
      const res = await fetch(`/api/admin/product-feedback/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: result.status,
          adminNotes: result.adminNotes ?? '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.productFeedback.saveFailed'));
      toast(t(locale, 'panel.productFeedback.saved'), 'ok');
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.productFeedback.saveFailed'), 'error');
    }
  };

  const formatWhen = (iso) => {
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
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t(locale, 'panel.productFeedback.title')}
        subtitle={t(locale, 'panel.productFeedback.intro')}
      />

      <InlineCallout tone="info">{t(locale, 'panel.productFeedback.superAdminHint')}</InlineCallout>

      <AdminListFilters
        aria-label={t(locale, 'panel.productFeedback.title')}
        locale={locale}
        onClear={() => {
          setQDraft('');
          pushFilters({ status: 'all', kind: 'all', q: '', page: 1 });
        }}
        clearEnabled={Boolean(
          String(qDraft || '').trim() || filters.status !== 'all' || filters.kind !== 'all'
        )}
      >
        <AdminListSearch
          locale={locale}
          value={qDraft}
          onChange={setQDraft}
          onSubmit={(v) => pushFilters({ q: String(v || '').trim(), page: 1 })}
          placeholder={t(locale, 'panel.productFeedback.searchPh')}
          className="min-w-[200px] flex-1 items-end self-end"
          inputClassName="w-full max-w-none"
        />
        <AdminListFilterSelect
          label={t(locale, 'panel.productFeedback.filterStatus')}
          value={filters.status}
          onChange={(v) => pushFilters({ status: v, page: 1 })}
        >
          <option value="all">{t(locale, 'panel.productFeedback.statusAll')}</option>
          {PRODUCT_FEEDBACK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(locale, `panel.productFeedback.status.${s}`)}
            </option>
          ))}
        </AdminListFilterSelect>
        <AdminListFilterSelect
          label={t(locale, 'panel.productFeedback.filterKind')}
          value={filters.kind}
          onChange={(v) => pushFilters({ kind: v, page: 1 })}
        >
          <option value="all">{t(locale, 'panel.productFeedback.kindAll')}</option>
          {PRODUCT_FEEDBACK_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(locale, `panel.productFeedback.kind.${k}`)}
            </option>
          ))}
        </AdminListFilterSelect>
      </AdminListFilters>

      {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
      {loading ? <AppLoading locale={locale} variant="panel" /> : null}

      {!loading && !error && items.length === 0 ? (
        <ContentEnter animKey={`fb-empty|${filters.status}|${filters.kind}|${filters.q}`}>
          <EmptyState
            title={t(locale, 'panel.productFeedback.emptyTitle')}
            message={t(locale, 'panel.productFeedback.emptyBody')}
          />
        </ContentEnter>
      ) : null}

      {!loading && items.length > 0 ? (
        <ContentEnter animKey={`${filters.status}-${filters.kind}-${filters.page}-${items.length}`}>
          <>
            <p className={cn(S.muted, 'm-0 text-xs')}>
              {t(locale, 'panel.productFeedback.count', { n: total })}
            </p>
            <AdminTableShell animKey={`fb-${reloadKey}-${items.map((r) => r.id).join(',')}`}>
              <thead>
                <tr>
                  <AdminTh>{t(locale, 'panel.productFeedback.colWhen')}</AdminTh>
                  <AdminTh>{t(locale, 'panel.productFeedback.colKind')}</AdminTh>
                  <AdminTh>{t(locale, 'panel.productFeedback.colMessage')}</AdminTh>
                  <AdminTh>{t(locale, 'panel.productFeedback.colFrom')}</AdminTh>
                  <AdminTh>{t(locale, 'panel.productFeedback.colScreen')}</AdminTh>
                  <AdminTh>{t(locale, 'panel.productFeedback.colStatus')}</AdminTh>
                  <AdminActionsTh />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap font-mono text-2xs text-ink-muted">
                      {formatWhen(row.createdAt)}
                    </td>
                    <td>
                      <StatusToneChip tone={kindTone(row.kind)}>
                        {t(locale, `panel.productFeedback.kind.${row.kind}`)}
                      </StatusToneChip>
                    </td>
                    <td className="max-w-md">
                      <p className="m-0 whitespace-pre-wrap text-prose text-ink">{row.message}</p>
                      {row.adminNotes ? (
                        <p className="m-0 mt-1 text-2xs text-ink-faint">
                          {t(locale, 'panel.productFeedback.adminNotes')}: {row.adminNotes}
                        </p>
                      ) : null}
                    </td>
                    <td className="text-prose">
                      <div className="font-medium text-ink">{row.userName || row.userEmail || '—'}</div>
                      {row.userEmail && row.userName ? (
                        <div className="text-2xs text-ink-faint">{row.userEmail}</div>
                      ) : null}
                      <div className="text-2xs text-ink-muted">
                        {row.companyName || t(locale, 'panel.productFeedback.noCompany')}
                        {row.companySlug ? ` · ${row.companySlug}` : ''}
                      </div>
                      {!row.contactOk ? (
                        <div className="text-2xs text-warning">
                          {t(locale, 'panel.productFeedback.noContact')}
                        </div>
                      ) : null}
                    </td>
                    <td className="font-mono text-2xs text-ink-muted">
                      {row.activeTab || '—'}
                      {row.activeSection ? ` / ${row.activeSection}` : ''}
                    </td>
                    <td>
                      <StatusToneChip tone={statusTone(row.status)}>
                        {t(locale, `panel.productFeedback.status.${row.status}`)}
                      </StatusToneChip>
                    </td>
                    <AdminActionsCell>
                      <AdminEditButton
                        label={t(locale, 'panel.productFeedback.review')}
                        onClick={() => void reviewItem(row)}
                      />
                    </AdminActionsCell>
                  </tr>
                ))}
              </tbody>
            </AdminTableShell>

            <AdminListPager
              locale={locale}
              page={filters.page}
              pageSize={filters.pageSize}
              total={total}
              onPageChange={(p) => pushFilters({ page: p })}
              onPageSizeChange={(ps) => pushFilters({ pageSize: ps, page: 1 })}
            />
          </>
        </ContentEnter>
      ) : null}
    </div>
  );
}
