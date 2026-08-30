'use client';

import { useCallback, useEffect, useState } from 'react';
import { CopyableLink } from '../../_components/CopyableLink';
import { useAppFeedback } from '../../_components/AppFeedback';
import { StatusToneChip } from '../../_components/StatusToneChip';
import { Spinner } from '../../_components/AppLoading';
import { S } from '../dashboard-shared';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { formatDisplayDateTime } from '../../../lib/format-display-date';

/**
 * B-2709 — ensure prep link + show prepared badge for vacancy candidate.
 */
export function InterviewPrepBlock({ vacancyId, candidateId, locale = 'pt-BR' }) {
  const { toast } = useAppFeedback();
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const base = typeof window !== 'undefined' ? window.location.origin : '';

  const load = useCallback(async () => {
    if (!vacancyId || !candidateId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates/${encodeURIComponent(candidateId)}/interview-prep`
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setLink(data.link);
      else {
        setLink(null);
        setLoadError(true);
      }
    } catch {
      setLink(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [vacancyId, candidateId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function ensureLink() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates/${encodeURIComponent(candidateId)}/interview-prep`,
        { method: 'POST' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast(t(locale, 'interviewPrep.createError'), 'error');
        return;
      }
      setLink(data.link);
      setLoadError(false);
      toast(t(locale, 'interviewPrep.linkReady'), 'ok');
    } catch {
      toast(t(locale, 'interviewPrep.createError'), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mb-3 flex items-center gap-2 font-mono text-2xs text-ink-faint">
        <Spinner size={12} />
        <span>{t(locale, 'panel.common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-control border border-ink/10 bg-ink/[0.02] px-3 py-2.5">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className={cn(S.label, 'mb-0')}>{t(locale, 'interviewPrep.adminTitle')}</span>
        {link?.prepared ? (
          <StatusToneChip tone="success" bordered>
            {t(locale, 'interviewPrep.preparedBadge')}
          </StatusToneChip>
        ) : null}
      </div>
      <p className={cn(S.faint, 'm-0 mb-2')}>{t(locale, 'interviewPrep.adminHint')}</p>
      {loadError && !link ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="m-0 font-mono text-2xs text-danger">{t(locale, 'interviewPrep.loadError')}</p>
          <button type="button" className={S.btnGhost} onClick={load}>
            {t(locale, 'panel.common.retry')}
          </button>
        </div>
      ) : null}
      {link?.prepared && link.preparedAt ? (
        <p className={cn(S.faint, 'm-0 mb-2')}>
          {t(locale, 'interviewPrep.preparedAt', {
            when: formatDisplayDateTime(link.preparedAt, locale),
          })}
        </p>
      ) : null}
      {link?.path ? (
        <CopyableLink
          url={`${base}${link.path}`}
          locale={locale}
          label={t(locale, 'interviewPrep.linkLabel')}
          showUrl
        />
      ) : (
        <button
          type="button"
          className={cn(S.btnBrandSoft, 'min-h-touch')}
          disabled={busy}
          onClick={ensureLink}
        >
          {busy ? t(locale, 'panel.common.loading') : t(locale, 'interviewPrep.createLink')}
        </button>
      )}
    </div>
  );
}
