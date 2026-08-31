'use client';

import { useCallback, useEffect, useState } from 'react';
import { t, localeHtmlLang } from '../../lib/i18n';
import { formatSalaryDisplay } from '../../lib/br-masks';
import { COMPENSATION_APPROVAL_STATUS } from '../../lib/domain-status.js';
import { htmlToPlainText } from '../../lib/sanitize-html';
import { S, AdminIconButton } from '../dashboard/dashboard-shared';
import { EmptyState } from './EmptyState';
import { AppLoading, ContentEnter } from './AppLoading';
import { useAppFeedback } from './AppFeedback';
import { CollapsibleBlock } from './CollapsibleBlock';
import { InlineCallout } from './InlineCallout';
import { StatusToneChip } from './StatusToneChip';

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

/**
 * B-3003 — Company-wide proposed bonus / variable pay inbox.
 */
export function VariablePayInboxBlock({ locale = 'pt-BR', companyId, onOpenPerson = null }) {
  const { toast, confirm } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(companyId));
  const [busyId, setBusyId] = useState(null);

  const companyQs = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';

  const load = useCallback(async () => {
    if (!companyId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/compensation/proposed${companyQs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.variablePay.inboxLoadError'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, companyQs, locale, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (row, approvalStatus) => {
    const ok = await confirm({
      message:
        approvalStatus === COMPENSATION_APPROVAL_STATUS.APPROVED
          ? t(locale, 'panel.variablePay.approveConfirm', {
              name: row.candidateName || row.candidateEmail || `#${row.candidateId}`,
            })
          : t(locale, 'panel.variablePay.rejectConfirm', {
              name: row.candidateName || row.candidateEmail || `#${row.candidateId}`,
            }),
      danger: approvalStatus === COMPENSATION_APPROVAL_STATUS.REJECTED,
      confirmLabel:
        approvalStatus === COMPENSATION_APPROVAL_STATUS.APPROVED
          ? t(locale, 'panel.variablePay.approve')
          : t(locale, 'panel.variablePay.reject'),
    });
    if (!ok) return;
    setBusyId(row.id);
    try {
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(row.candidateId)}/compensation/${encodeURIComponent(row.id)}/approval`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId, approvalStatus }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'patch');
      toast(
        approvalStatus === COMPENSATION_APPROVAL_STATUS.APPROVED
          ? t(locale, 'panel.variablePay.approvedToast')
          : t(locale, 'panel.variablePay.rejectedToast'),
        'ok'
      );
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.variablePay.saveError'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (!companyId) return null;

  return (
    <CollapsibleBlock
      locale={locale}
      title={t(locale, 'panel.variablePay.inboxTitle')}
      count={!loading ? items.length || null : null}
      defaultOpen={items.length > 0}
      variant="card"
      className="mt-0"
      collapsedHint={t(locale, 'panel.variablePay.inboxHint')}
    >
      {loading ? (
        <AppLoading variant="panel" />
      ) : (
        <ContentEnter animKey={`vp-inbox|${companyId}|${items.length}`}>
          <InlineCallout tone="info" className="mb-3">
            {t(locale, 'panel.variablePay.inboxNote')}
          </InlineCallout>
          {items.length === 0 ? (
            <EmptyState
              title={t(locale, 'panel.variablePay.inboxEmptyTitle')}
              message={t(locale, 'panel.variablePay.inboxEmptyHint')}
            />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {items.map((row) => {
                const notePlain = htmlToPlainText(row.notes || '').trim();
                return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-control border border-warning/25 bg-warning/[0.05] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-ui text-sm font-medium text-ink">
                        {row.candidateName || row.candidateEmail || `#${row.candidateId}`}
                      </span>
                      <StatusToneChip tone="warning">
                        {t(locale, 'panel.variablePay.statusProposed')}
                      </StatusToneChip>
                    </div>
                    <div className="mt-0.5 font-mono text-2xs text-ink-muted">
                      {formatSalaryDisplay(row.amount, locale)}
                      {' · '}
                      {formatDate(row.effectiveDate, locale)}
                      {row.sourceReviewId
                        ? ` · ${t(locale, 'panel.variablePay.fromReview', { id: row.sourceReviewId })}`
                        : ''}
                    </div>
                    {notePlain ? (
                      <p className={`${S.muted} mb-0 mt-1 line-clamp-2 text-prose`}>{notePlain}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {typeof onOpenPerson === 'function' ? (
                      <AdminIconButton
                        icon="user"
                        label={t(locale, 'panel.variablePay.openPerson')}
                        onClick={() => onOpenPerson(row.candidateId)}
                        disabled={busyId === row.id}
                      />
                    ) : null}
                    <AdminIconButton
                      icon="check"
                      label={t(locale, 'panel.variablePay.approve')}
                      onClick={() => void setStatus(row, COMPENSATION_APPROVAL_STATUS.APPROVED)}
                      disabled={busyId === row.id}
                    />
                    <AdminIconButton
                      icon="x"
                      label={t(locale, 'panel.variablePay.reject')}
                      tint="danger"
                      onClick={() => void setStatus(row, COMPENSATION_APPROVAL_STATUS.REJECTED)}
                      disabled={busyId === row.id}
                    />
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </ContentEnter>
      )}
    </CollapsibleBlock>
  );
}
