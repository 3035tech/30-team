'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { TypeBadge } from '../dashboard/dashboard-shared';
import { useAppFeedback } from './AppFeedback';
import { CollapsibleBlock } from './CollapsibleBlock';

/**
 * Dossier unificado da pessoa (B-1901) + botão IA (B-1904).
 * @param {{ embedded?: boolean }} props — when true (Resumo tab), signals start collapsed
 */
export function PersonDossierBlock({
  locale = 'pt-BR',
  candidateId,
  companyId = null,
  onGoSubTab,
  embedded = false,
}) {
  const { toast } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [dossier, setDossier] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [ai, setAi] = useState(null);

  const load = useCallback(async () => {
    if (!candidateId) return;
    setLoading(true);
    setErr('');
    try {
      const q = locale ? `?locale=${encodeURIComponent(locale)}` : '';
      const res = await fetch(`/api/admin/candidates/${candidateId}/dossier${q}`, {
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || t(locale, 'panel.dossier.loadError'));
      }
      setDossier(data);
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.dossier.loadError'));
      setDossier(null);
    } finally {
      setLoading(false);
    }
  }, [candidateId, locale]);

  useEffect(() => {
    load();
  }, [load]);

  const runAi = async () => {
    if (!candidateId) return;
    setAiLoading(true);
    setAi(null);
    try {
      const res = await fetch('/api/admin/people/interpret-ai', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'person',
          candidateId,
          companyId: companyId || undefined,
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || t(locale, 'panel.dossier.aiError'));
      }
      setAi(data);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.dossier.aiError'), 'error');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return <p className="m-0 text-xs text-ink-muted">…</p>;
  }
  if (err) {
    return <p className="m-0 text-xs text-danger">{err}</p>;
  }
  if (!dossier?.ok && !dossier?.candidate) {
    return (
      <p className="m-0 text-[13px] text-ink-muted">{t(locale, 'panel.dossier.empty')}</p>
    );
  }

  const d = dossier;
  const sev = (risk) => {
    if (risk === 'high') return 'text-danger';
    if (risk === 'medium') return 'text-warning';
    return 'text-ink-muted';
  };

  return (
    <div className={cn('flex flex-col gap-3', embedded && 'mb-1')}>
      {!embedded ? (
        <div className={S.cardTight}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <span className={S.label}>{t(locale, 'panel.dossier.title')}</span>
              <p className="mt-1 mb-0 text-[13px] leading-snug text-ink-muted">
                {t(locale, 'panel.dossier.intro')}
              </p>
              <p className="mt-1 mb-0 font-mono text-[11px] text-ink-faint">
                {t(locale, 'panel.dossier.signalCount', { n: d.meta?.signalCount ?? 0 })}
              </p>
            </div>
            <button
              type="button"
              disabled={aiLoading}
              onClick={runAi}
              className={cn(S.btnBrandSoft, 'min-h-touch shrink-0')}
            >
              {aiLoading ? t(locale, 'panel.dossier.aiRunning') : t(locale, 'panel.dossier.aiCta')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 font-mono text-[11px] text-ink-faint">
            {t(locale, 'panel.dossier.signalCount', { n: d.meta?.signalCount ?? 0 })}
          </p>
          <button
            type="button"
            disabled={aiLoading}
            onClick={runAi}
            className={cn(S.btnGhost, 'inline-flex min-h-touch items-center text-[11px]')}
          >
            {aiLoading ? t(locale, 'panel.dossier.aiRunning') : t(locale, 'panel.dossier.aiCta')}
          </button>
        </div>
      )}

      {ai?.summary ? (
        <div className={cn(S.cardTight, 'border-brand-500/20 bg-brand-500/[0.04]')}>
          <span className={S.label}>{t(locale, 'panel.dossier.aiTitle')}</span>
          <p className="mt-2 mb-0 text-[13px] leading-snug text-ink">{ai.summary}</p>
          {Array.isArray(ai.recommendations) && ai.recommendations.length > 0 ? (
            <ul className="mt-2 mb-0 list-disc pl-4 text-[13px] text-ink">
              {ai.recommendations.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
          {Array.isArray(ai.cautions) && ai.cautions.length > 0 ? (
            <ul className="mt-2 mb-0 list-disc pl-4 text-[12px] text-ink-muted">
              {ai.cautions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 mb-0 text-[11px] text-ink-faint">{t(locale, 'panel.dossier.aiDisclaimer')}</p>
        </div>
      ) : null}

      <CollapsibleBlock
        locale={locale}
        title={t(locale, 'panel.dossier.title')}
        defaultOpen={!embedded}
        count={d.meta?.signalCount ?? null}
      >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <section className="border-b border-ink/8 pb-2 sm:border-b-0 sm:pb-0">
          <span className={S.label}>{t(locale, 'panel.dossier.profileTitle')}</span>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {d.profile?.topType ? <TypeBadge type={d.profile.topType} locale={locale} compact /> : null}
            <span className="text-[12px] text-ink-muted">
              {d.profile?.hasEnneagram
                ? t(locale, 'panel.dossier.hasEnneagram')
                : t(locale, 'panel.dossier.noEnneagram')}
            </span>
            <span className="text-[12px] text-ink-muted">
              {d.profile?.hasMotivators
                ? t(locale, 'panel.dossier.hasMotivators')
                : t(locale, 'panel.dossier.noMotivators')}
            </span>
          </div>
        </section>

        <section className="border-b border-ink/8 pb-2 sm:border-b-0 sm:pb-0">
          <span className={S.label}>{t(locale, 'panel.dossier.hrTitle')}</span>
          {d.hrScore ? (
            <p className="mt-2 mb-0 text-[13px] text-ink">
              {t(locale, 'panel.dossier.hrScore', { score: d.hrScore.score })}{' '}
              <span className={sev(d.hrScore.turnoverRisk)}>
                {t(locale, 'panel.dossier.turnoverRisk', { risk: d.hrScore.turnoverRisk || '—' })}
              </span>
            </p>
          ) : (
            <p className="mt-2 mb-0 text-[13px] text-ink-faint">{t(locale, 'panel.dossier.hrEmpty')}</p>
          )}
        </section>

        <section className="border-b border-ink/8 pb-2 sm:border-b-0 sm:pb-0">
          <span className={S.label}>{t(locale, 'panel.dossier.pdiTitle')}</span>
          {d.pdi ? (
            <p className="mt-2 mb-0 text-[13px] text-ink">
              {d.pdi.title}
              {d.pdi.itemCount != null
                ? ` · ${d.pdi.doneCount ?? 0}/${d.pdi.itemCount}`
                : ''}
            </p>
          ) : (
            <p className="mt-2 mb-0 text-[13px] text-ink-faint">{t(locale, 'panel.dossier.pdiEmpty')}</p>
          )}
          {typeof onGoSubTab === 'function' ? (
            <button
              type="button"
              className="mt-2 inline-flex min-h-touch cursor-pointer items-center border-none bg-transparent p-0 font-mono text-[11px] text-brand-500"
              onClick={() => onGoSubTab('journey')}
            >
              {t(locale, 'panel.dossier.openJourney')}
            </button>
          ) : null}
        </section>

        <section className="border-b border-ink/8 pb-2 sm:border-b-0 sm:pb-0">
          <span className={S.label}>{t(locale, 'panel.dossier.performanceTitle')}</span>
          {d.performance ? (
            <>
              <p className="mt-2 mb-0 text-[13px] text-ink">
                {d.performance.cycleTitle || '—'} · {d.performance.status}
                {d.performance.developCount > 0
                  ? ` · ${t(locale, 'panel.dossier.developGoals', { n: d.performance.developCount })}`
                  : ''}
              </p>
              {d.performance.developCount > 0 && typeof onGoSubTab === 'function' ? (
                <div className="mt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="inline-flex min-h-touch cursor-pointer items-center border-none bg-transparent p-0 font-mono text-[11px] text-brand-500"
                    onClick={() => onGoSubTab('oneOnOne')}
                  >
                    {t(locale, 'panel.dossier.openOneOnOneFromReview')}
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-touch cursor-pointer items-center border-none bg-transparent p-0 font-mono text-[11px] text-brand-500"
                    onClick={() => onGoSubTab('journey')}
                  >
                    {t(locale, 'panel.dossier.openJourney')}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-2 mb-0 text-[13px] text-ink-faint">
              {t(locale, 'panel.dossier.performanceEmpty')}
            </p>
          )}
        </section>

        <section className="border-b border-ink/8 pb-2 sm:border-b-0 sm:pb-0">
          <span className={S.label}>{t(locale, 'panel.dossier.retentionTitle')}</span>
          <p className="mt-2 mb-0 text-[13px] text-ink">
            {t(locale, 'panel.dossier.retentionOpen', { n: d.retention?.openFollowUpCount || 0 })}
          </p>
          {typeof onGoSubTab === 'function' ? (
            <button
              type="button"
              className="mt-2 inline-flex min-h-touch cursor-pointer items-center border-none bg-transparent p-0 font-mono text-[11px] text-brand-500"
              onClick={() => onGoSubTab('oneOnOne')}
            >
              {t(locale, 'panel.dossier.openOneOnOne')}
            </button>
          ) : null}
        </section>

        <section>
          <span className={S.label}>{t(locale, 'panel.dossier.climateTitle')}</span>
          <p className="mt-1 mb-0 text-[11px] text-ink-faint">{t(locale, 'panel.dossier.climateHint')}</p>
          {d.climateCompany?.latestMean != null ? (
            <p className="mt-2 mb-0 text-[13px] text-ink">
              {t(locale, 'panel.dossier.climateMean', {
                mean: Number(d.climateCompany.latestMean).toFixed(1),
              })}
            </p>
          ) : (
            <p className="mt-2 mb-0 text-[13px] text-ink-faint">{t(locale, 'panel.dossier.climateEmpty')}</p>
          )}
        </section>
      </div>

      {Array.isArray(d.briefing?.alerts) && d.briefing.alerts.length > 0 ? (
        <section className="mt-3">
          <span className={S.label}>{t(locale, 'panel.dossier.alertsTitle')}</span>
          <ul className="mt-2 mb-0 list-disc pl-4 text-[13px] text-ink">
            {d.briefing.alerts.map((a) => (
              <li key={a.key || a.text}>{a.text || a}</li>
            ))}
          </ul>
        </section>
      ) : null}
      </CollapsibleBlock>
    </div>
  );
}
