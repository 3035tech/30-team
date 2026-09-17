'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { formatDisplayDate } from '../../lib/format-display-date';
import { S } from '../dashboard/dashboard-shared';
import { EmptyState } from '../_components/EmptyState';
import { AppLoading, ContentEnter } from '../_components/AppLoading';
import { StatusToneChip } from '../_components/StatusToneChip';
import { FORMAL_RATER_ROLE, FORMAL_REVIEW_MODEL } from '../../lib/domain-status';

function roleLabel(locale, role) {
  const key =
    role === FORMAL_RATER_ROLE.SELF
      ? 'roleSelf'
      : role === FORMAL_RATER_ROLE.UPWARD
        ? 'roleUpward'
        : role === FORMAL_RATER_ROLE.EXTERNAL
          ? 'roleExternal'
          : 'roleManager';
  return t(locale, `performanceReviews.formal.${key}`);
}

function modelShort(locale, model) {
  if (model === FORMAL_REVIEW_MODEL.ONE_EIGHTY) {
    return t(locale, 'performanceReviews.formal.modelShort180');
  }
  if (model === FORMAL_REVIEW_MODEL.THREE_SIXTY) {
    return t(locale, 'performanceReviews.formal.modelShort360');
  }
  return t(locale, 'performanceReviews.formal.modelShort90');
}

/**
 * Employee portal: formal reviews sent to the subject (B-RH2-15).
 */
export function EmployeeFormalReviewsSection({ locale = 'pt-BR' }) {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await fetch('/api/employee/formal-reviews');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReviews([]);
        setLoadFailed(true);
        return;
      }
      setReviews(json.reviews || []);
    } catch {
      setReviews([]);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openDetail = async (id) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/employee/formal-reviews?id=${encodeURIComponent(id)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setDetail(json.review);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AppLoading variant="panel" locale={locale} />;

  if (loadFailed) {
    return (
      <EmptyState
        message={t(locale, 'performanceReviews.formal.loadError')}
        actionLabel={t(locale, 'panel.common.retry')}
        onAction={loadList}
      />
    );
  }

  if (detail) {
    const scoreByKey = new Map();
    for (const s of detail.scores || []) {
      scoreByKey.set(`${s.raterId}:${s.itemId}`, s.score);
    }
    const notes = (detail.raters || []).filter((r) => String(r.overallNotes || '').trim());
    return (
      <ContentEnter>
        <div className={S.stack}>
          <button type="button" className={S.btnGhost} onClick={() => setDetail(null)} disabled={busy}>
            {t(locale, 'performanceReviews.formal.employeeBack')}
          </button>
          <div>
            <h3 className="m-0 font-display text-base text-ink">{detail.cycleTitle}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusToneChip tone="neutral">{modelShort(locale, detail.model)}</StatusToneChip>
              {detail.sentAt ? (
                <span className="font-mono text-2xs text-ink-faint">
                  {formatDisplayDate(detail.sentAt, locale)}
                </span>
              ) : null}
            </div>
          </div>
          <ul className="m-0 list-none space-y-3 p-0">
            {(detail.items || []).map((item) => (
              <li key={item.id} className="rounded-control border border-ink/10 px-3 py-2">
                <div className="text-sm font-medium text-ink">{item.label}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(detail.raters || []).map((r) => {
                    const score = scoreByKey.get(`${r.id}:${item.id}`);
                    return (
                      <StatusToneChip key={r.id} tone={score != null ? 'info' : 'neutral'}>
                        {roleLabel(locale, r.role)}: {score != null ? score : '—'}
                      </StatusToneChip>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
          {notes.length ? (
            <div className={S.stack}>
              <h4 className={cn(S.label, 'm-0')}>{t(locale, 'performanceReviews.formal.overallNotes')}</h4>
              {notes.map((r) => (
                <div key={r.id} className="rounded-control border border-ink/8 bg-canvas/40 px-3 py-2">
                  <div className="font-mono text-2xs text-ink-faint">{roleLabel(locale, r.role)}</div>
                  <p className={cn(S.muted, 'm-0 mt-1')}>{r.overallNotes}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </ContentEnter>
    );
  }

  if (!reviews.length) {
    return <EmptyState message={t(locale, 'performanceReviews.formal.employeeEmpty')} />;
  }

  return (
    <ul className="m-0 list-none space-y-2 p-0">
      {reviews.map((r) => (
        <li
          key={r.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-ink/10 px-3 py-2"
        >
          <div className="min-w-0">
            <div className="text-sm text-ink">{r.cycleTitle}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-2xs text-ink-faint">
              <span>{modelShort(locale, r.model)}</span>
              {r.sentAt ? <span>· {formatDisplayDate(r.sentAt, locale)}</span> : null}
            </div>
          </div>
          <button
            type="button"
            className={cn(S.btnBrandSoft, 'min-h-touch')}
            disabled={busy}
            onClick={() => openDetail(r.id)}
          >
            {t(locale, 'performanceReviews.formal.employeeView')}
          </button>
        </li>
      ))}
    </ul>
  );
}
