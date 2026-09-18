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

      {!empty && Array.isArray(data?.sources) && data.sources.length > 0 ? (
        <div className={cn(S.card, 'px-[18px] py-4')}>
          <div className="mb-2.5 text-prose font-semibold text-ink">
            {t(locale, 'recruiting.analyticsSourcesTitle')}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-xs">
              <thead>
                <tr className="text-left text-ink-muted">
                  <th className="px-2 py-1.5 font-medium">{t(locale, 'recruiting.analyticsColSource')}</th>
                  <th className="px-2 py-1.5 font-medium">{t(locale, 'recruiting.analyticsViews')}</th>
                  <th className="px-2 py-1.5 font-medium">{t(locale, 'recruiting.analyticsApplications')}</th>
                  <th className="px-2 py-1.5 font-medium">{t(locale, 'recruiting.analyticsHires')}</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.slice(0, 8).map((row) => (
                  <tr key={row.source} className="border-t border-ink/12">
                    <td className="p-2 text-ink">{row.source}</td>
                    <td className="p-2 text-ink-muted">{row.views}</td>
                    <td className="p-2 text-ink-muted">{row.applications}</td>
                    <td className="p-2 text-ink-muted">{row.hires}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </ContentEnter>
  );
}
