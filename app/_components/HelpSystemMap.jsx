'use client';

import { useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { DASHBOARD_NAV_SECTIONS, DASHBOARD_TAB_NAV } from '../../lib/dashboard-navigation';
import { S } from '../dashboard/dashboard-shared';

const LINK_KEYS = ['t', 'v', 'j', 'c', 'r', 'assessment', 'e', 'climate', 'pulse'];

const MAP_GROUPS = DASHBOARD_NAV_SECTIONS.map(({ id, labelKey }) => ({
  id,
  labelKey,
  tabs: Object.entries(DASHBOARD_TAB_NAV)
    .filter(([tabId, item]) => item.section === id && tabId !== 'profile')
    .map(([tabId, item]) => ({ id: tabId, labelKey: item.labelKey })),
}));

/** Current product map: dashboard modules grouped by their navigation section. */
export function HelpSystemMap({ locale, onNavigate }) {
  const [selectedGroupId, setSelectedGroupId] = useState(MAP_GROUPS[0].id);
  const [selectedTab, setSelectedTab] = useState(MAP_GROUPS[0].tabs[0].id);
  const selectedGroup = MAP_GROUPS.find((group) => group.id === selectedGroupId) || MAP_GROUPS[0];
  const selectedModule = selectedGroup.tabs.find((tab) => tab.id === selectedTab) || selectedGroup.tabs[0];

  return (
    <div className="mt-4 space-y-5">
      <p className="m-0 max-w-4xl text-sm leading-6 text-ink-muted">
        {t(locale, 'panel.help.systemMapLegend')}
      </p>

      <div className="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
        <nav aria-label={t(locale, 'panel.help.systemMapAreas')} className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1 lg:rounded-control lg:border lg:border-ink/10 lg:bg-surface lg:p-2">
          {MAP_GROUPS.map((group) => {
            const active = group.id === selectedGroup.id;
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSelectedGroupId(group.id);
                  setSelectedTab(group.tabs[0].id);
                }}
                className={cn(
                  'flex min-h-touch min-w-0 cursor-pointer items-center justify-between gap-2 rounded-control border px-3 py-2.5 text-left font-ui text-xs sm:text-sm lg:border-transparent',
                  active
                    ? 'border-brand-500/25 bg-brand-50 text-brand-700 lg:border-brand-500/20'
                    : 'border-ink/10 bg-surface text-ink-muted hover:bg-ink/[0.025] hover:text-ink lg:bg-transparent'
                )}
              >
                <span className="min-w-0">{t(locale, group.labelKey)}</span>
                <span className="shrink-0 font-mono text-2xs text-ink-faint">{group.tabs.length}</span>
              </button>
            );
          })}
        </nav>

        <section className="min-w-0 rounded-control border border-ink/10 bg-surface p-3.5 sm:p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-ink/8 pb-3">
            <h3 className="m-0 font-ui text-sm font-semibold text-ink">{t(locale, selectedGroup.labelKey)}</h3>
            <span className="font-mono text-2xs text-ink-faint">
              {t(locale, 'panel.help.categoryCount', { n: selectedGroup.tabs.length })}
            </span>
          </div>
          <ul className="m-0 grid list-none gap-1 p-0 sm:grid-cols-2">
            {selectedGroup.tabs.map((tab) => {
              const active = tab.id === selectedTab;
              return (
                <li key={tab.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedTab(tab.id)}
                    className={cn(
                      'flex min-h-touch w-full cursor-pointer items-center justify-between gap-3 rounded-control border px-3 py-2.5 text-left font-ui text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35',
                      active
                        ? 'border-brand-500/25 bg-brand-50 text-brand-700'
                        : 'border-transparent bg-transparent text-ink-muted hover:border-ink/10 hover:bg-ink/[0.025] hover:text-ink'
                    )}
                  >
                    <span className="min-w-0">{t(locale, tab.labelKey)}</span>
                    {active ? <span aria-hidden="true" className="shrink-0 text-brand-600">✓</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="flex flex-col gap-4 rounded-control border border-brand-500/20 bg-brand-50/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="m-0 font-mono text-2xs font-semibold uppercase tracking-[0.14em] text-brand-700">
            {t(locale, selectedGroup.labelKey)}
          </p>
          <h3 className="mb-0 mt-1 font-display text-xl font-normal text-ink">
            {t(locale, selectedModule.labelKey)}
          </h3>
          <p className="mb-0 mt-1 text-xs leading-5 text-ink-muted">
            {t(locale, 'panel.help.systemMapSelectedHint')}
          </p>
        </div>
        {typeof onNavigate === 'function' ? (
          <button type="button" className={cn(S.btnBrandSoft, 'shrink-0')} onClick={() => onNavigate(selectedModule.id)}>
            {t(locale, 'panel.help.systemMapOpenModule')}
            <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </section>

      <section>
        <div className="mb-2">
          <h3 className="m-0 font-mono text-2xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            {t(locale, 'panel.help.systemMapLinksTitle')}
          </h3>
          <p className="mb-0 mt-1 text-xs leading-5 text-ink-faint">
            {t(locale, 'panel.help.systemMapLinksHint')}
          </p>
        </div>
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {LINK_KEYS.map((key) => (
            <li key={key} className="min-w-0 rounded-control border border-ink/10 bg-surface px-3.5 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-ui text-sm font-medium text-ink">
                  {t(locale, `panel.help.systemMapLinkName_${key}`)}
                </span>
                <code className="break-all font-mono text-2xs text-brand-700">
                  {t(locale, `panel.help.systemMapLinkUrl_${key}`)}
                </code>
              </div>
              <p className="mb-0 mt-1.5 text-xs leading-5 text-ink-muted">
                {t(locale, `panel.help.systemMapLinkPurpose_${key}`)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
