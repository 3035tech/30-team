'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../dashboard-shared';
import {
  DisclosureToggle,
  disclosureToggleButtonClass,
} from '../../_components/CollapsibleBlock';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';

const BCI_OPEN_KEY = '30team_overview_bci_open';

function syncTeamGroupInUrl(teamGroupId) {
  if (typeof window === 'undefined') return;
  try {
    const u = new URL(window.location.href);
    if (teamGroupId) u.searchParams.set('teamGroup', String(teamGroupId));
    else u.searchParams.delete('teamGroup');
    const next = `${u.pathname}${u.search}${u.hash}`;
    window.history.replaceState(window.history.state, '', next);
  } catch {
    /* ignore */
  }
}

function buildIntelQuery({ companyId, teamGroupId }) {
  const p = new URLSearchParams();
  if (companyId) p.set('companyId', String(companyId));
  if (teamGroupId) p.set('teamGroupId', String(teamGroupId));
  if (typeof window !== 'undefined') {
    const cur = new URL(window.location.href);
    for (const key of ['area', 'vacancy', 'dateFrom', 'dateTo', 'search', 'roster']) {
      const v = cur.searchParams.get(key);
      if (v) p.set(key, v);
    }
  }
  return p;
}

/**
 * Inteligência Comportamental da Equipe — dashboard executivo (Overview).
 * Troca de recorte: fetch local (sem router.push) para não scrollar a Overview.
 */
export function TeamBehavioralIntelBlock({
  locale = 'pt-BR',
  intel: intelProp = null,
  companyId = null,
  navigateDashboard,
  onIntelChange = null,
}) {
  const [motivatorsOpen, setMotivatorsOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [intel, setIntel] = useState(intelProp);
  const [cohortBusy, setCohortBusy] = useState(false);
  const [selectedTeamGroupId, setSelectedTeamGroupId] = useState(
    () => intelProp?.selectedTeamGroupId ?? intelProp?.meta?.teamGroupId ?? null
  );

  useEffect(() => {
    setIntel(intelProp);
    setSelectedTeamGroupId(
      intelProp?.selectedTeamGroupId ?? intelProp?.meta?.teamGroupId ?? null
    );
  }, [intelProp]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const v = localStorage.getItem(BCI_OPEN_KEY);
        if (v === '1') setSectionOpen(true);
        if (v === '0') setSectionOpen(false);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSection = () => {
    setSectionOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(BCI_OPEN_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const applyIntel = useCallback(
    (next) => {
      setIntel(next);
      if (typeof onIntelChange === 'function') onIntelChange(next);
    },
    [onIntelChange]
  );

  const onGroupChange = async (e) => {
    const v = e.target.value;
    const nextId = v ? Number(v) : null;
    setSelectedTeamGroupId(Number.isFinite(nextId) && nextId > 0 ? nextId : null);
    setMotivatorsOpen(false);

    if (!companyId) {
      if (typeof navigateDashboard === 'function') {
        navigateDashboard({ tab: 'overview', teamGroup: v || null, scroll: false });
      }
      return;
    }

    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    setCohortBusy(true);
    try {
      const qs = buildIntelQuery({
        companyId,
        teamGroupId: Number.isFinite(nextId) && nextId > 0 ? nextId : null,
      });
      const res = await fetch(`/api/admin/behavioral-intel?${qs}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.intel) {
        applyIntel(data.intel);
        syncTeamGroupInUrl(
          data.intel.selectedTeamGroupId ?? data.intel.meta?.teamGroupId ?? null
        );
      }
    } catch {
      /* keep previous intel */
    } finally {
      setCohortBusy(false);
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      }
    }
  };

  const goGroup = () => {
    if (typeof navigateDashboard === 'function') navigateDashboard({ tab: 'group' });
  };

  const teamGroups = Array.isArray(intel?.teamGroups)
    ? intel.teamGroups
    : Array.isArray(intelProp?.teamGroups)
      ? intelProp.teamGroups
      : [];
  const cohortIsGroup = intel?.meta?.cohortKind === 'team_group';

  const groupSelect =
    teamGroups.length > 0 ? (
      <label className="mt-2 flex min-w-0 flex-col gap-1 sm:max-w-xs">
        <span className="font-mono text-2xs uppercase tracking-wide text-ink-faint">
          {t(locale, 'panel.overview.bci.groupFilterLabel')}
        </span>
        <select
          className={cn(S.select, 'min-h-touch')}
          value={selectedTeamGroupId != null ? String(selectedTeamGroupId) : ''}
          onChange={(ev) => void onGroupChange(ev)}
          disabled={cohortBusy || !companyId}
          aria-busy={cohortBusy}
          aria-label={t(locale, 'panel.overview.bci.groupFilterLabel')}
        >
          <option value="">{t(locale, 'panel.overview.bci.groupFilterAll')}</option>
          {teamGroups.map((g) => (
            <option key={g.id} value={String(g.id)}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
    ) : null;

  if (!intel || intel.meta?.empty) {
    return (
      <div id="behavioral-intel" className={S.cardTight}>
        <span className={S.label}>{t(locale, 'panel.overview.bci.title')}</span>
        <p className="mt-2 mb-0 text-prose text-ink-muted">{t(locale, 'panel.overview.bci.empty')}</p>
        {groupSelect}
        <p className="mt-2 mb-0 text-xs text-ink-muted">
          {t(locale, 'panel.overview.bci.groupsHint')}{' '}
          <button
            type="button"
            onClick={goGroup}
            className="cursor-pointer border-none bg-transparent p-0 font-mono text-xs text-brand-500 underline-offset-2 hover:underline"
          >
            {t(locale, 'panel.overview.bci.openGroups')}
          </button>
        </p>
      </div>
    );
  }

  const {
    profiles,
    motivators,
    forces = [],
    attentions = [],
    topMovers = [],
    diversityKind,
    actions = [],
    meta,
  } = intel;

  const maxBar = Math.max(...(profiles.bars || []).map((b) => b.count), 0.01);

  return (
    <section id="behavioral-intel" className="flex flex-col gap-3" aria-labelledby="bci-heading">
      <div className={S.cardTight}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 id="bci-heading" className="m-0 font-display text-lg font-normal text-ink">
              {t(locale, 'panel.overview.bci.title')}
            </h2>
            <p className="mt-1 mb-0 max-w-2xl text-prose leading-snug text-ink-muted">
              {t(locale, 'panel.overview.bci.intro')}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleSection}
            className={disclosureToggleButtonClass}
            aria-expanded={sectionOpen}
          >
            <DisclosureToggle locale={locale} open={sectionOpen} />
          </button>
        </div>
        {groupSelect}
        {!sectionOpen ? (
          <p className="mt-2 mb-0 font-mono text-2xs text-ink-faint">
            {t(locale, 'panel.overview.bci.collapsedHint', {
              nE: meta.nEneagram,
              nM: meta.nMotivators,
            })}
          </p>
        ) : (
          <>
            <p className="mt-2 mb-0 font-mono text-2xs text-ink-faint">
              {cohortIsGroup && meta.teamGroupName
                ? t(locale, 'panel.overview.bci.baseGroup', {
                    name: meta.teamGroupName,
                    nE: meta.nEneagram,
                    nM: meta.nMotivators,
                  })
                : t(locale, 'panel.overview.bci.baseBoth', {
                    nE: meta.nEneagram,
                    nM: meta.nMotivators,
                  })}
            </p>
            {meta.smallSample || meta.smallSampleMotivators ? (
              <p className="mt-1.5 mb-0 text-xs text-warning">
                {t(locale, 'panel.overview.bci.smallSample')}
              </p>
            ) : null}
            <p className="mt-2 mb-0 text-xs text-ink-muted">
              {t(locale, 'panel.overview.bci.groupsHint')}{' '}
              <button
                type="button"
                onClick={goGroup}
                className="cursor-pointer border-none bg-transparent p-0 font-mono text-xs text-brand-500 underline-offset-2 hover:underline"
              >
                {t(locale, 'panel.overview.bci.openGroups')}
              </button>
            </p>
          </>
        )}
      </div>

      {sectionOpen ? (
        cohortBusy ? (
          <div className={S.cardTight}>
            <AppLoading variant="panel" />
          </div>
        ) : (
        <ContentEnter
          animKey={`bci|${selectedTeamGroupId || 'all'}|${meta.nEneagram}|${meta.nMotivators}`}
        >
          {/* 1. Profiles */}
          <div className="flex flex-col gap-3">
          <div className={S.cardTight}>
            <span className={S.label}>{t(locale, 'panel.overview.bci.profilesTitle')}</span>
            <p className="mt-0.5 mb-1 text-xs text-ink-muted">
              {t(locale, 'panel.overview.bci.profilesQuestion')}
            </p>
            <p className="mt-0 mb-3 font-mono text-2xs text-ink-faint">
              {t(locale, 'panel.overview.bci.profilesBase', { n: profiles.nPeople })}
            </p>
            {profiles.nPeople === 0 ? (
              <p className="m-0 text-prose text-ink-faint">{t(locale, 'panel.overview.bci.profilesEmpty')}</p>
            ) : (
              <>
                <p className="mb-2 mt-0 text-2xs text-ink-faint">
                  {t(locale, 'panel.overview.bci.profilesAxisHint')}
                </p>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {profiles.bars.map((b) => (
                    <li key={b.type} className="flex items-center gap-3">
                      <div className="w-[11rem] shrink-0 text-prose text-ink">
                        <span className="font-medium" style={{ color: b.color }}>
                          {b.name}
                        </span>
                        <span className="ml-1.5 font-mono text-2xs text-ink-faint" title={`T${b.type}`}>
                          T{b.type}
                        </span>
                      </div>
                      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(4, (b.count / maxBar) * 100)}%`,
                            background: b.color,
                          }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right font-mono text-2xs text-ink-muted">
                        {b.pct}%
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 mb-0 text-xs leading-snug text-ink-muted">
                  {t(locale, `panel.overview.bci.micro.${profiles.microphraseKey}`)}
                </p>
              </>
            )}
          </div>

          {/* 2. Motivators */}
          <div className={S.cardTight}>
            <span className={S.label}>{t(locale, 'panel.overview.bci.motivatorsTitle')}</span>
            <p className="mt-0.5 mb-1 text-xs text-ink-muted">
              {t(locale, 'panel.overview.bci.motivatorsQuestion')}
            </p>
            <p className="mt-0 mb-3 font-mono text-2xs text-ink-faint">
              {t(locale, 'panel.overview.bci.motivatorsBase', { n: motivators.nPeople })}
            </p>
            {motivators.nPeople === 0 ? (
              <p className="m-0 text-prose text-ink-faint">{t(locale, 'panel.overview.bci.motivatorsEmpty')}</p>
            ) : (
              <>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {(motivatorsOpen ? motivators.items : motivators.top).map((m) => (
                    <li
                      key={m.key}
                      className="rounded-control border border-ink/8 bg-ink/[0.02] px-3 py-2.5"
                    >
                      <div className="font-medium text-ink text-sm">{m.label}</div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-2xs text-ink-muted">
                        <span>
                          {t(locale, 'panel.overview.bci.intensity')}: {m.intensity}
                        </span>
                        <span>
                          {t(locale, 'panel.overview.bci.top5Of', { pct: m.recurrencePct })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                {motivators.rest?.length > 0 ? (
                  <button
                    type="button"
                    className={cn(disclosureToggleButtonClass, 'mt-3 border-brand-500/20')}
                    onClick={() => setMotivatorsOpen((v) => !v)}
                    aria-expanded={motivatorsOpen}
                  >
                    <DisclosureToggle locale={locale} open={motivatorsOpen} />
                  </button>
                ) : null}
              </>
            )}
          </div>

          {/* 3. Forces */}
          <div className={S.cardTight}>
            <span className={S.label}>{t(locale, 'panel.overview.bci.forcesTitle')}</span>
            <p className="mt-0.5 mb-0 text-xs text-ink-muted">
              {t(locale, 'panel.overview.bci.forcesQuestion')}
            </p>
            {forces.length === 0 ? (
              <p className="mt-2 mb-0 text-prose text-ink-faint">{t(locale, 'panel.overview.bci.forcesEmpty')}</p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {forces.map((f) => (
                  <article
                    key={f.id}
                    className="rounded-card border border-success/20 bg-success/[0.06] px-3.5 py-3"
                  >
                    <h3 className="m-0 font-mono text-2xs uppercase tracking-wide text-success">
                      {t(locale, `panel.overview.bci.force.${f.id}.title`)}
                    </h3>
                    <p className="mt-1.5 mb-0 text-prose leading-snug text-ink">
                      {t(locale, `panel.overview.bci.force.${f.id}.body`)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* 4. Attention */}
          <div className={S.cardTight}>
            <span className={S.label}>{t(locale, 'panel.overview.bci.attentionTitle')}</span>
            <p className="mt-0.5 mb-0 text-xs text-ink-muted">
              {t(locale, 'panel.overview.bci.attentionQuestion')}
            </p>
            <p className="mt-0.5 mb-0 text-2xs text-ink-faint">{t(locale, 'panel.overview.bci.attentionHint')}</p>
            {attentions.length === 0 ? (
              <p className="mt-2 mb-0 text-prose text-ink-faint">
                {t(locale, 'panel.overview.bci.attentionEmpty')}
              </p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {attentions.map((a) => (
                  <article
                    key={a.id}
                    className="rounded-card border border-warning/25 bg-warning/[0.07] px-3.5 py-3"
                  >
                    <h3 className="m-0 font-mono text-2xs uppercase tracking-wide text-warning">
                      {t(locale, `panel.overview.bci.attention.${a.id}.title`)}
                    </h3>
                    <p className="mt-1.5 mb-0 text-prose leading-snug text-ink">
                      {t(locale, `panel.overview.bci.attention.${a.id}.body`)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* 5. Top 5 movers */}
          <div className={S.cardTight}>
            <span className={S.label}>{t(locale, 'panel.overview.bci.top5Title')}</span>
            <p className="mt-0.5 mb-0 text-xs text-ink-muted">
              {t(locale, 'panel.overview.bci.top5Question')}
            </p>
            {topMovers.length === 0 ? (
              <p className="mt-2 mb-0 text-prose text-ink-faint">{t(locale, 'panel.overview.bci.top5Empty')}</p>
            ) : (
              <>
                <ol className="mt-3 mb-0 flex list-none flex-wrap gap-2 p-0">
                  {topMovers.map((m) => (
                    <li
                      key={m.key}
                      className="flex min-w-[7.5rem] flex-1 items-baseline gap-2 rounded-control border border-ink/10 bg-surface px-3 py-2.5"
                    >
                      <span className="font-mono text-2xs text-ink-faint">#{m.rank}</span>
                      <span className="text-sm font-medium text-ink">{m.label}</span>
                    </li>
                  ))}
                </ol>
                {diversityKind && diversityKind !== 'empty' ? (
                  <p className="mt-3 mb-0 text-prose leading-snug text-ink-muted">
                    {t(locale, `panel.overview.bci.diversity.${diversityKind}`)}
                  </p>
                ) : null}
              </>
            )}
          </div>

          {/* 6. Actions */}
          <div className={S.cardTight}>
            <span className={S.label}>{t(locale, 'panel.overview.bci.actionsTitle')}</span>
            <p className="mt-0.5 mb-0 text-xs text-ink-muted">
              {t(locale, 'panel.overview.bci.actionsQuestion')}
            </p>
            <p className="mt-0.5 mb-0 text-2xs text-ink-faint">{t(locale, 'panel.overview.bci.actionsHint')}</p>
            {actions.length === 0 ? (
              <p className="mt-2 mb-0 text-prose text-ink-faint">
                {t(locale, 'panel.overview.bci.actionsEmpty')}
              </p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {actions.map((a) => (
                  <article
                    key={a.id}
                    className={cn('rounded-card border border-info/20 bg-info/[0.06] px-3.5 py-3')}
                  >
                    <h3 className="m-0 font-mono text-2xs uppercase tracking-wide text-info">
                      {t(locale, `panel.overview.bci.action.${a.id}.title`)}
                    </h3>
                    <p className="mt-1.5 mb-0 text-prose leading-snug text-ink">
                      {t(locale, `panel.overview.bci.action.${a.id}.body`)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
          </div>
        </ContentEnter>
        )
      ) : null}
    </section>
  );
}
