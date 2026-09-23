'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { S } from '../dashboard-shared';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { CopyableLink } from '../../_components/CopyableLink';

export function VacancyFunnelAnalyticsBlock({ vacancyId, locale, publicPagePath, appUrl = '' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/analytics`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || t(locale, 'panel.common.error'));
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || t(locale, 'panel.common.error'));
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vacancyId, locale]);

  const steps = [
    { key: 'views', label: t(locale, 'recruiting.analyticsViews') },
    { key: 'applyStarts', label: t(locale, 'recruiting.analyticsApplyStarts') },
    { key: 'applications', label: t(locale, 'recruiting.analyticsApplications') },
    { key: 'interviews', label: t(locale, 'recruiting.analyticsInterviews') },
    { key: 'hires', label: t(locale, 'recruiting.analyticsHires') },
  ];

  if (loading) {
    return <AppLoading variant="panel" label={t(locale, 'panel.common.loading')} />;
  }
  if (err) {
    return <div className={cn(S.card, 'p-4 text-prose text-danger')}>{err}</div>;
  }

  const views = Number(data?.views) || 0;
  const empty = views === 0 && !(Number(data?.applications) || 0);
  const publicPageUrl =
    publicPagePath
      ? (appUrl ? `${appUrl}${publicPagePath}` : publicPagePath)
      : '';

  return (
    <ContentEnter animKey={`vacancy-analytics-${vacancyId}`} className="flex flex-col gap-3.5">
      <div className={cn(S.card, 'px-[18px] py-4')}>
        <div className="mb-3 text-prose font-semibold text-ink">
          {t(locale, 'recruiting.analyticsFunnelTitle')}
        </div>
        {empty ? (
          <div className="flex flex-col gap-2.5">
            <p className="m-0 text-prose leading-[1.55] text-ink-muted">
              {t(locale, 'recruiting.analyticsEmpty')}
            </p>
            {publicPageUrl ? (
              <CopyableLink
                url={publicPageUrl}
                locale={locale}
                compact
                iconOnly
                label={t(locale, 'recruiting.analyticsOpenPublic')}
              />
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2.5">
            {steps.map((s) => (
              <div
                key={s.key}
                className="rounded-control border border-ink/12 p-3 text-center"
              >
                <div className="font-mono text-2xl text-ink">{Number(data?.[s.key]) || 0}</div>
                <div className="mt-1 font-mono text-2xs text-ink-muted">{s.label}</div>
              </div>
            ))}
          </div>
        )}
        {data?.conversionRate != null && !empty ? (
          <p className="mb-0 mt-3 font-mono text-xs text-ink-muted">
            {t(locale, 'recruiting.analyticsConversion', {
              rate: String(Math.round(Number(data.conversionRate) * 1000) / 10),
            })}
          </p>
        ) : null}
      </div>

      {Array.isArray(data?.stagePerformance) && data.stagePerformance.length > 0 ? (
        <div className={cn(S.card, 'px-[18px] py-4')}>
          <div className="mb-1 text-prose font-semibold text-ink">
            {t(locale, 'recruiting.analyticsStageTitle')}
          </div>
          <p className="mb-3 mt-0 text-xs leading-relaxed text-ink-muted">
            {t(locale, 'recruiting.analyticsStageHint')}
          </p>
          <div className="overflow-x-auto rounded-control border border-ink/10">
            <table className="w-full min-w-[560px] border-collapse font-mono text-xs">
              <thead className="bg-ink/[0.035] text-left text-ink-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">{t(locale, 'recruiting.analyticsStage')}</th>
                  <th className="px-3 py-2 font-medium">{t(locale, 'recruiting.analyticsEntered')}</th>
                  <th className="px-3 py-2 font-medium">{t(locale, 'recruiting.analyticsAvgTime')}</th>
                  <th className="px-3 py-2 font-medium">{t(locale, 'recruiting.analyticsNextConversion')}</th>
                </tr>
              </thead>
              <tbody>
                {data.stagePerformance.map((row) => (
                  <tr key={row.stageKey} className="border-t border-ink/10">
                    <td className="px-3 py-2.5 font-ui text-ink">{locale === 'en' ? (row.labelEn || row.labelPt) : (row.labelPt || row.labelEn)}</td>
                    <td className="px-3 py-2.5 text-ink-muted">{row.entered}</td>
                    <td className="px-3 py-2.5 text-ink-muted">{row.avgDays == null ? '–' : t(locale, 'recruiting.analyticsDays', { n: row.avgDays })}</td>
                    <td className="px-3 py-2.5 text-ink-muted">{row.conversionToNext == null ? '–' : `${Math.round(Number(row.conversionToNext) * 100)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {Array.isArray(data?.bottlenecks) && data.bottlenecks.length > 0 ? (
        <div className={cn(S.card, 'border-warning/25 px-[18px] py-4')}>
          <div className="mb-1 text-prose font-semibold text-ink">{t(locale, 'recruiting.analyticsBottlenecksTitle')}</div>
          <p className="mb-3 mt-0 text-xs leading-relaxed text-ink-muted">{t(locale, 'recruiting.analyticsBottlenecksHint')}</p>
          <ul className="m-0 space-y-2 pl-0">
            {data.bottlenecks.map((signal) => (
              <li key={`${signal.stageKey}-${signal.signal}`} className="list-none rounded-control border border-warning/20 bg-warning/[0.06] px-3 py-2 text-xs text-ink-muted">
                <span className="font-ui font-semibold text-ink">{locale === 'en' ? (signal.labelEn || signal.labelPt) : (signal.labelPt || signal.labelEn)}</span>
                {': '}
                {signal.signal === 'slow_stage'
                  ? t(locale, 'recruiting.analyticsSlowStage', { days: signal.avgDays, n: signal.entered })
                  : t(locale, 'recruiting.analyticsLowConversion', { rate: Math.round(Number(signal.conversionToNext) * 100), n: signal.entered })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

    </ContentEnter>
  );
}
