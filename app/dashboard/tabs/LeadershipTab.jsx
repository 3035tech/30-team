'use client';

import { useState } from 'react';
import { TYPE_DATA } from '../../../lib/data';
import { t } from '../../../lib/i18n';
import { typeShortLabel, typeTitleTooltip } from '../../../lib/type-en';
import { C } from '../../../lib/theme';
import { Icon } from '../../_components/Icon';
import { Bar, PanelSubNav, S, TypeBadge } from '../dashboard-shared';
import { cn } from '../../../lib/cn';
import { RosterEmptyHint } from '../../_components/RosterEmptyHint';
import { ROSTER_SCOPE } from '../../../lib/domain-status';

const BAND_KEYS = {
  standout: 'bandStandout',
  strong: 'bandStrong',
  moderate: 'bandModerate',
  explore: 'bandExplore',
};

function bandLabel(locale, band) {
  const k = BAND_KEYS[band];
  return k ? t(locale, `panel.leadership.${k}`) : band || t(locale, 'panel.common.notApplicable');
}

/** Top band people across companies for the summary strip (cap keeps viewport light). */
function summaryPeople(leadershipPotentials, cap = 8) {
  const flat = [];
  for (const co of leadershipPotentials || []) {
    for (const p of co.people || []) {
      flat.push({ ...p, companyName: co.companyName, companyId: co.companyId });
    }
  }
  const rank = { standout: 0, strong: 1, moderate: 2, explore: 3 };
  flat.sort((a, b) => {
    const ba = rank[a.leadershipBand] ?? 9;
    const bb = rank[b.leadershipBand] ?? 9;
    if (ba !== bb) return ba - bb;
    return (b.leadership010 || 0) - (a.leadership010 || 0);
  });
  return flat.slice(0, cap);
}

export function LeadershipTab({
  analytics,
  locale = 'pt-BR',
  roster = null,
  navigateDashboard = null,
}) {
  const [viewMode, setViewMode] = useState('summary');
  const hasData = analytics && analytics.kpis && analytics.kpis.assessments > 0;
  if (!hasData) {
    return (
      <RosterEmptyHint
        locale={locale}
        roster={roster || ROSTER_SCOPE.INTERNAL}
        navigateDashboard={navigateDashboard}
      />
    );
  }

  const { kpis, monthlyTrend, globalTopTypeCounts: gCounts, globalTotal, areaSummaries, leadershipPotentials = [] } = analytics;
  const maxMonthly = Math.max(...monthlyTrend.map((m) => m.cnt), 1);
  const maxG = Math.max(...Object.values(gCounts), 1);
  const gTot = globalTotal || 1;
  const topPeople = summaryPeople(leadershipPotentials);

  const Kpi = ({ icon, value, label, hint }) => (
    <div className={cn(S.card, 'p-[22px]')}>
      <div className="mb-2 flex text-brand-500"><Icon name={icon} /></div>
      <div className="mb-1 font-mono text-3xl text-brand-600">{value}</div>
      <div className="font-mono text-2xs uppercase tracking-wide text-ink-muted">{label}</div>
      {hint && <div className="mt-2 text-2xs leading-snug text-ink-faint">{hint}</div>}
    </div>
  );

  const tableHeaders = [
    t(locale, 'panel.leadership.tablePerson'),
    t(locale, 'panel.leadership.tableDominant'),
    t(locale, 'panel.leadership.tableIndicator'),
    t(locale, 'panel.leadership.tableBand'),
  ];

  const execHeaders = [
    t(locale, 'panel.leadership.execColArea'),
    t(locale, 'panel.leadership.execColN'),
    t(locale, 'panel.leadership.execColDominant'),
    t(locale, 'panel.leadership.execColDiversity'),
    t(locale, 'panel.leadership.execColFit'),
    t(locale, 'panel.leadership.execColRubricTop'),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className={cn(S.card, 'px-7 py-[22px]')}>
        <span className={S.label}>{t(locale, 'panel.leadership.title')}</span>
        <p className="mb-3.5 mt-2.5 text-prose leading-relaxed text-ink-muted">
          {t(locale, 'panel.leadership.intro')}
        </p>
        <PanelSubNav
          ariaLabel={t(locale, 'panel.leadership.viewModeAria')}
          active={viewMode}
          onChange={setViewMode}
          tabs={[
            { id: 'summary', label: t(locale, 'panel.leadership.viewSummary') },
            { id: 'detail', label: t(locale, 'panel.leadership.viewDetail') },
          ]}
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <Kpi icon="chart" value={kpis.assessments} label={t(locale, 'panel.leadership.kpiAssessments')} hint={t(locale, 'panel.leadership.kpiAssessmentsHint')} />
        <Kpi icon="user" value={kpis.candidates} label={t(locale, 'panel.leadership.kpiCandidates')} hint={t(locale, 'panel.leadership.kpiCandidatesHint')} />
        <Kpi icon="building" value={kpis.areasActive} label={t(locale, 'panel.leadership.kpiAreas')} hint={t(locale, 'panel.leadership.kpiAreasHint')} />
      </div>

      {viewMode === 'summary' ? (
        <>
          {topPeople.length > 0 ? (
            <div className={S.card}>
              <span className={S.label}>{t(locale, 'panel.leadership.potentialsTitle')}</span>
              <p className="mb-3.5 mt-2 text-xs leading-relaxed text-ink-faint">
                {t(locale, 'panel.leadership.potentialsIntro')}
              </p>
              <div className="flex flex-col gap-2">
                {topPeople.map((p) => (
                  <div
                    key={`${p.companyId}-${p.candidateId}`}
                    className="flex flex-wrap items-center gap-2.5 rounded-control border border-ink/12 bg-ink/[0.02] px-3 py-2.5"
                  >
                    <span className="min-w-0 flex-[1_1_140px] text-prose text-ink">{p.name}</span>
                    <span className="font-mono text-2xs text-ink-faint">{p.companyName}</span>
                    <TypeBadge type={p.topType} locale={locale} compact />
                    <span className="font-mono text-xs text-brand-600">
                      {p.leadership010}/10
                    </span>
                    <span className="font-mono text-2xs text-ink-muted">
                      {bandLabel(locale, p.leadershipBand)}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setViewMode('detail')}
                className="mt-3.5 min-h-touch cursor-pointer rounded-control border border-ink/12 bg-transparent px-3 py-2 font-mono text-xs text-ink-muted"
              >
                {t(locale, 'panel.leadership.showMoreDetail')} →
              </button>
            </div>
          ) : null}

          <div className={S.card}>
            <span className={S.label}>{t(locale, 'panel.leadership.monthlyTitle')}</span>
            <p className="mb-4 mt-1.5 text-2xs text-ink-faint">
              {t(locale, 'panel.leadership.monthlyHint')}
            </p>
            {monthlyTrend.length === 0 ? (
              <p className="text-prose italic text-ink-muted">{t(locale, 'panel.leadership.noTimeSeries')}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {monthlyTrend.slice(-6).map((m) => (
                  <div key={m.period} className="flex items-center gap-3">
                    <span className="w-[72px] shrink-0 font-mono text-xs text-ink-muted">{m.period}</span>
                    <div className="flex-1">
                      <Bar value={m.cnt} max={maxMonthly} color={C.purple} h={8} />
                    </div>
                    <span className="w-9 text-right font-mono text-xs text-ink-muted">{m.cnt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {leadershipPotentials.length > 0 ? (
            <div className={S.card}>
              <span className={S.label}>{t(locale, 'panel.leadership.potentialsTitle')}</span>
              <p className="mb-[18px] mt-2 text-xs leading-relaxed text-ink-faint">
                {t(locale, 'panel.leadership.potentialsIntro')}
              </p>
              <div className="flex flex-col gap-5">
                {leadershipPotentials.map((co) => (
                  <div
                    key={String(co.companyId)}
                    className="rounded-xl border border-ink/12 bg-ink/[0.03] px-[18px] py-4"
                  >
                    <div className="mb-3 font-mono text-prose text-ink">
                      {co.companyName}
                      <span className="ml-2 text-ink-faint">#{co.companyId}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[420px] border-collapse text-xs">
                        <thead>
                          <tr>
                            {tableHeaders.map((h) => (
                              <th
                                key={h}
                                className="border-b border-ink/12 px-2.5 py-2 text-left font-normal font-mono text-ink-muted"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {co.people.map((p) => (
                            <tr key={`${co.companyId}-${p.candidateId}`} className="border-b border-ink/[0.07]">
                              <td className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap p-2.5 text-ink">
                                {p.name}
                              </td>
                              <td className="p-2.5">
                                <TypeBadge type={p.topType} locale={locale} compact />
                              </td>
                              <td
                                className="p-2.5 font-mono text-brand-600"
                                title={t(locale, 'panel.leadership.scoreTitleHint')}
                              >
                                {p.leadership010}/10
                              </td>
                              <td className="p-2.5 font-mono text-ink-muted">
                                {bandLabel(locale, p.leadershipBand)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className={S.card}>
            <span className={S.label}>{t(locale, 'panel.leadership.monthlyTitle')}</span>
            <p className="mb-4 mt-1.5 text-2xs text-ink-faint">
              {t(locale, 'panel.leadership.monthlyHint')}
            </p>
            {monthlyTrend.length === 0 ? (
              <p className="text-prose italic text-ink-muted">{t(locale, 'panel.leadership.noTimeSeries')}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {monthlyTrend.map((m) => (
                  <div key={m.period} className="flex items-center gap-3">
                    <span className="w-[72px] shrink-0 font-mono text-xs text-ink-muted">{m.period}</span>
                    <div className="flex-1">
                      <Bar value={m.cnt} max={maxMonthly} color={C.purple} h={8} />
                    </div>
                    <span className="w-9 text-right font-mono text-xs text-ink-muted">{m.cnt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
            <div className={S.card}>
              <span className={S.label}>{t(locale, 'panel.leadership.globalDistTitle')}</span>
              <p className="mb-3.5 mt-1.5 text-2xs text-ink-faint">
                {t(locale, 'panel.leadership.globalDistHint')}
              </p>
              <div className="flex flex-col gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9]
                  .filter((ty) => (gCounts[ty] || 0) > 0)
                  .sort((a, b) => (gCounts[b] || 0) - (gCounts[a] || 0))
                  .map((ty) => {
                    const d = TYPE_DATA[ty];
                    const c = gCounts[ty] || 0;
                    const label = typeShortLabel(ty, locale);
                    return (
                      <div key={ty} className="flex items-center gap-2.5">
                        <span
                          title={typeTitleTooltip(ty, locale)}
                          className="inline-flex w-40 shrink-0 cursor-help items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs"
                          style={{ color: d.color }}
                        >
                          <span className="w-[22px] shrink-0 text-center">{d.emoji}</span>
                          <span className="min-w-0">{label}</span>
                        </span>
                        <div className="flex-1">
                          <Bar value={c} max={maxG} color={d.color} h={8} />
                        </div>
                        <span className="w-7 text-right font-mono text-xs text-ink-muted">{c}</span>
                        <span className="w-10 text-right font-mono text-2xs text-ink-faint">
                          {Math.round((c / gTot) * 100)}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className={S.card}>
              <span className={S.label}>{t(locale, 'panel.leadership.diversityTitle')}</span>
              <p className="mb-3.5 mt-1.5 text-2xs leading-snug text-ink-faint">
                {t(locale, 'panel.leadership.diversityHint')}
              </p>
              <div className="flex flex-col gap-3">
                {areaSummaries.map((row) => (
                  <div key={row.areaKey} className="flex items-center gap-2.5">
                    <span className="basis-[38%] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-ink">
                      {row.areaLabel}
                    </span>
                    <div className="flex-1">
                      <Bar value={row.diversity01} max={1} color={C.synergy} h={8} />
                    </div>
                    <span className="w-11 text-right font-mono text-xs text-ink-muted">
                      {Math.round(row.diversity01 * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={cn(S.card, 'overflow-hidden')}>
            <span className={S.label}>{t(locale, 'panel.leadership.execTableTitle')}</span>
            <div className="mt-3.5 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-xs">
                <thead>
                  <tr>
                    {execHeaders.map((h) => (
                      <th
                        key={h}
                        className="border-b border-ink/12 px-3 py-2 text-left font-normal font-mono text-ink-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {areaSummaries.map((row) => (
                    <tr key={row.areaKey} className="border-b border-ink/[0.07]">
                      <td className="px-3 py-2.5 text-ink">{row.areaLabel}</td>
                      <td className="px-3 py-2.5 font-mono text-ink-muted">{row.n}</td>
                      <td className="px-3 py-2.5">
                        {row.dominantType ? <TypeBadge type={row.dominantType} locale={locale} compact /> : <span className="text-ink-faint">—</span>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-ink-muted">
                        {Math.round(row.diversity01 * 100)}%
                      </td>
                      <td className="px-3 py-2.5 font-mono text-ink-muted">
                        {row.avgFit010 != null ? `${row.avgFit010}/10` : '—'}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-ink-muted">
                        {row.rubricAlignPct != null ? `${row.rubricAlignPct}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mb-0 mt-3.5 text-2xs italic leading-relaxed text-ink-faint">
              {t(locale, 'panel.leadership.execFootnote')}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
