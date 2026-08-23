'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { S } from '../dashboard-shared';
import { Spinner } from '../../_components/AppLoading';
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
    return (
      <div className={cn(S.card, 'flex items-center gap-2.5 p-5')}>
        <Spinner size={18} />
        <span className="text-[13px] text-ink-muted">{t(locale, 'common.loading')}</span>
      </div>
    );
  }
  if (err) {
    return <div className={cn(S.card, 'p-4 text-[13px] text-danger')}>{err}</div>;
  }

  const views = Number(data?.views) || 0;
  const empty = views === 0 && !(Number(data?.applications) || 0);
  const publicPageUrl =
    publicPagePath
      ? (appUrl ? `${appUrl}${publicPagePath}` : publicPagePath)
      : '';

  return (
    <div className="flex flex-col gap-3.5">
      <div className={cn(S.card, 'px-[18px] py-4')}>
        <div className="mb-3 text-[13px] font-semibold text-ink">
          {t(locale, 'recruiting.analyticsFunnelTitle')}
        </div>
        {empty ? (
          <div className="flex flex-col gap-2.5">
            <p className="m-0 text-[13px] leading-[1.55] text-ink-muted">
              {t(locale, 'recruiting.analyticsEmpty')}
            </p>
            {publicPageUrl ? (
              <CopyableLink
                url={publicPageUrl}
                locale={locale}
                compact
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
                <div className="font-mono text-[22px] text-ink">{Number(data?.[s.key]) || 0}</div>
                <div className="mt-1 font-mono text-[11px] text-ink-muted">{s.label}</div>
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

      {!empty && Array.isArray(data?.sources) && data.sources.length > 0 ? (
        <div className={cn(S.card, 'px-[18px] py-4')}>
          <div className="mb-2.5 text-[13px] font-semibold text-ink">
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
    </div>
  );
}
