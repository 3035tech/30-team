'use client';

import { useMemo, useState } from 'react';
import { t } from '../../../lib/i18n';
import { getTypeData } from '../../../lib/i18n-data';
import { typeFullName, typeShortLabel } from '../../../lib/type-en';
import { cn } from '../../../lib/cn';
import { S } from '../dashboard-shared';
import { HelpSystemMap } from '../../_components/HelpSystemMap';
import { ContentEnter } from '../../_components/AppLoading';
import { Icon } from '../../_components/Icon';
import { HELP_GUIDE_GROUPS, HELP_GUIDE_SECTIONS, HELP_SECTION_STEP_COUNTS, TAB_BY_HELP_SECTION } from '../../../lib/help-sections';

const QUICK_TOPICS = Object.freeze([
  { section: 'setupPath', icon: 'help', descriptionKey: 'quickSetup' },
  { section: 'vacancies', icon: 'vacancies', descriptionKey: 'quickVacancy' },
  { section: 'team', icon: 'team', descriptionKey: 'quickTeam' },
  { section: 'reports', icon: 'chart', descriptionKey: 'quickReports' },
]);

function fold(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function groupForSection(section) {
  return HELP_GUIDE_GROUPS.find((group) => group.sections.includes(section)) || HELP_GUIDE_GROUPS[0];
}

function TypeCatalog({ locale }) {
  const [selected, setSelected] = useState(1);
  const typeData = getTypeData(locale);
  const detail = typeData[selected];
  return (
    <div className="mt-6">
      <p className="mb-4 mt-0 max-w-3xl text-prose leading-relaxed text-ink-muted">{t(locale, 'panel.help.typesCatalogIntro')}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9" role="tablist" aria-label={t(locale, 'panel.help.enneagramTitle')}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => {
          const item = typeData[number];
          const active = selected === number;
          return <button key={number} type="button" role="tab" aria-selected={active} onClick={() => setSelected(number)} className={cn('min-h-20 cursor-pointer rounded-control border px-2 py-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35', active ? 'bg-surface shadow-sm' : 'bg-ink/[0.02] hover:bg-ink/[0.04]')} style={{ borderColor: active ? item.color : `${item.color}35` }}><span className="block text-lg" aria-hidden>{item.emoji}</span><span className="mt-1 block font-mono text-xs font-semibold" style={{ color: item.color }}>T{number}</span><span className="mt-0.5 block truncate font-ui text-2xs text-ink-muted">{typeShortLabel(number, locale)}</span></button>;
        })}
      </div>
      {detail ? <ContentEnter animKey={`type-${selected}`}><article className="mt-3 rounded-card border border-ink/12 bg-ink/[0.02] p-5" style={{ borderLeftColor: detail.color, borderLeftWidth: 4 }}><div className="flex flex-wrap items-center gap-2"><h3 className="m-0 font-display text-xl font-normal text-ink">T{selected}: {typeFullName(selected, locale)}</h3><span className="rounded-full border px-2.5 py-1 font-mono text-2xs" style={{ color: detail.color, borderColor: `${detail.color}45`, background: `${detail.color}12` }}>{typeShortLabel(selected, locale)}</span></div><p className="mb-0 mt-3 max-w-3xl text-prose leading-6 text-ink">{detail.desc}</p><div className="mt-5 grid gap-4 md:grid-cols-2"><div><h4 className="m-0 font-ui text-sm font-semibold text-ink">{t(locale, 'panel.help.typesAtWork')}</h4><p className="mb-0 mt-1 text-sm leading-6 text-ink-muted">{t(locale, `panel.help.typeAtWork${selected}`)}</p></div><div><h4 className="m-0 font-ui text-sm font-semibold text-ink">{t(locale, 'panel.help.typesWatch')}</h4><p className="mb-0 mt-1 text-sm leading-6 text-ink-muted">{t(locale, `panel.help.typeWatch${selected}`)}</p></div></div><div className="mt-5 flex flex-wrap gap-2">{detail.strengths.map((strength) => <span key={strength} className="rounded-full border px-2.5 py-1 font-ui text-xs" style={{ background: `${detail.color}12`, borderColor: `${detail.color}30`, color: detail.color }}>{strength}</span>)}</div><details className="mt-5 border-t border-ink/10 pt-4"><summary className="cursor-pointer font-ui text-sm font-medium text-brand-700">{t(locale, 'panel.help.typeMore', { n: selected })}</summary><div className="mt-4 grid gap-4 md:grid-cols-2"><div><h4 className="m-0 font-ui text-sm font-semibold text-ink">{t(locale, 'panel.help.typesChallenge')}</h4><p className="mb-0 mt-1 text-sm leading-6 text-ink-muted">{detail.challenge}</p></div><div><h4 className="m-0 font-ui text-sm font-semibold text-ink">{t(locale, 'panel.help.typesTeam')}</h4><p className="mb-0 mt-1 text-sm leading-6 text-ink-muted">{detail.team}</p></div></div></details></article></ContentEnter> : null}
    </div>
  );
}

function StepTimeline({ locale, sectionKey, count }) {
  const [expanded, setExpanded] = useState(false);
  const visibleCount = expanded ? count : Math.min(count, 5);
  const items = Array.from({ length: visibleCount }, (_, index) => t(locale, `panel.help.${sectionKey}Step${index + 1}`));
  return <div className="mt-6"><h3 className="m-0 font-ui text-sm font-semibold text-ink">{t(locale, 'panel.help.articleSteps')}</h3><ol className="mb-0 mt-4 list-none p-0">{items.map((text, index) => <li key={`${sectionKey}-${index}`} className="relative grid grid-cols-[2rem_1fr] gap-3 pb-5 last:pb-0">{index < items.length - 1 ? <span className="absolute bottom-0 left-[15px] top-8 w-px bg-ink/12" aria-hidden /> : null}<span className="relative z-[1] flex h-8 w-8 items-center justify-center rounded-full border border-brand-500/25 bg-brand-50 font-mono text-xs font-semibold text-brand-700">{index + 1}</span><p className="m-0 pt-1 text-sm leading-6 text-ink-muted">{text}</p></li>)}</ol>{count > 5 ? <button type="button" className={cn(S.btnGhost, 'mt-5')} onClick={() => setExpanded((value) => !value)}>{t(locale, expanded ? 'panel.help.showFewerSteps' : 'panel.help.showAllSteps', { n: count })}</button> : null}</div>;
}

function FlowStrip({ locale }) {
  const steps = Array.from({ length: 9 }, (_, index) => t(locale, `panel.help.flowChip${index + 1}`));
  return <div className="mt-6 grid gap-px overflow-hidden rounded-card border border-ink/12 bg-ink/10 sm:grid-cols-3">{steps.map((label, index) => <div key={label} className="flex items-center gap-3 bg-surface p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 font-mono text-2xs font-semibold text-brand-700">{index + 1}</span><span className="font-ui text-sm text-ink">{label}</span></div>)}</div>;
}

function TopicButton({ locale, section, onClick }) {
  return <button type="button" onClick={onClick} className="min-h-touch w-full cursor-pointer rounded-control border border-ink/10 bg-transparent px-3 py-2.5 text-left font-ui text-sm text-ink-muted hover:border-brand-500/25 hover:bg-brand-50 hover:text-ink">{t(locale, `panel.help.${section}Title`)}</button>;
}

export function HelpTab({ locale = 'pt-BR', navigateDashboard }) {
  const [activeSection, setActiveSection] = useState('welcome');
  const [activeGroup, setActiveGroup] = useState('start');
  const [query, setQuery] = useState('');
  const go = (tab) => { if (typeof navigateDashboard === 'function') navigateDashboard({ tab }); };
  const searchResults = useMemo(() => {
    const needle = fold(query).trim();
    if (needle.length < 2) return [];
    return HELP_GUIDE_SECTIONS.filter((section) => {
      const steps = Array.from({ length: HELP_SECTION_STEP_COUNTS[section] || 0 }, (_, index) => t(locale, `panel.help.${section}Step${index + 1}`));
      return fold([t(locale, `panel.help.${section}Title`), t(locale, `panel.help.${section}Body`), ...steps].join(' ')).includes(needle);
    }).slice(0, 20);
  }, [locale, query]);
  const group = HELP_GUIDE_GROUPS.find((item) => item.id === activeGroup) || HELP_GUIDE_GROUPS[0];
  const selectSection = (section) => { setActiveSection(section); setActiveGroup(groupForSection(section).id); setQuery(''); };
  const related = group.sections.filter((section) => section !== activeSection).slice(0, 3);
  const targetTab = TAB_BY_HELP_SECTION[activeSection];
  const hasProductLink = targetTab && targetTab !== 'help';

  return <div className="space-y-5">
    <section className={cn(S.card, 'overflow-hidden p-0')}>
      <div className="grid gap-6 px-5 py-6 sm:px-7 sm:py-8 lg:grid-cols-[1fr_.72fr] lg:items-end"><div><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-control bg-brand-50 text-brand-700"><Icon name="help" className="h-5 w-5" /></div><h2 className="m-0 font-display text-3xl font-normal text-ink">{t(locale, 'panel.help.title')}</h2><p className="mb-0 mt-3 max-w-2xl font-ui text-sm leading-6 text-ink-muted">{t(locale, 'panel.help.intro')}</p></div><label className="block"><span className="mb-2 block font-ui text-sm font-medium text-ink">{t(locale, 'panel.help.searchLabel')}</span><span className="relative block"><Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t(locale, 'panel.help.searchPlaceholder')} className={cn(S.input, 'pl-10 pr-10')} />{query ? <button type="button" aria-label={t(locale, 'panel.help.clearSearch')} onClick={() => setQuery('')} className="absolute right-1.5 top-1/2 flex min-h-touch min-w-touch -translate-y-1/2 cursor-pointer items-center justify-center border-0 bg-transparent text-ink-muted"><Icon name="close" className="h-4 w-4" /></button> : null}</span></label></div>
      <div className="border-t border-ink/10 bg-ink/[0.02] px-5 py-5 sm:px-7"><p className="m-0 font-ui text-sm font-semibold text-ink">{t(locale, 'panel.help.quickStartTitle')}</p><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{QUICK_TOPICS.map((item) => <button key={item.section} type="button" onClick={() => selectSection(item.section)} className="flex min-h-24 cursor-pointer items-start gap-3 rounded-control border border-ink/10 bg-surface p-3.5 text-left hover:border-brand-500/25"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-700"><Icon name={item.icon} className="h-4 w-4" /></span><span><strong className="block font-ui text-sm font-semibold text-ink">{t(locale, `panel.help.${item.section}Title`)}</strong><span className="mt-1 block font-ui text-xs leading-5 text-ink-muted">{t(locale, `panel.help.${item.descriptionKey}`)}</span></span></button>)}</div></div>
    </section>

    {query.trim().length >= 2 ? <ContentEnter animKey={`search-${query}`}><section className={S.card}><div className="flex items-baseline justify-between gap-4"><h2 className="m-0 font-display text-2xl font-normal text-ink">{t(locale, 'panel.help.searchResults')}</h2><span className="font-mono text-xs text-ink-faint">{t(locale, 'panel.help.resultsCount', { n: searchResults.length })}</span></div>{searchResults.length ? <div className="mt-5 divide-y divide-ink/10 border-y border-ink/10">{searchResults.map((section) => <button key={section} type="button" onClick={() => selectSection(section)} className="flex min-h-touch w-full cursor-pointer items-center justify-between gap-4 border-0 bg-transparent py-4 text-left"><span><strong className="block font-ui text-sm font-semibold text-ink">{t(locale, `panel.help.${section}Title`)}</strong><span className="mt-1 line-clamp-2 block max-w-3xl font-ui text-xs leading-5 text-ink-muted">{t(locale, `panel.help.${section}Body`)}</span></span><Icon name="chevronRight" className="h-4 w-4 shrink-0 text-ink-faint" /></button>)}</div> : <div className="mt-6 rounded-control border border-ink/10 bg-ink/[0.02] p-6"><h3 className="m-0 font-ui text-sm font-semibold text-ink">{t(locale, 'panel.help.noResultsTitle')}</h3><p className="mb-0 mt-2 text-sm leading-6 text-ink-muted">{t(locale, 'panel.help.noResultsBody')}</p></div>}</section></ContentEnter> :
      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className={cn(S.card, 'min-w-0 self-start p-3 lg:sticky lg:top-5')}><p className="px-2 pb-2 pt-1 font-ui text-xs font-semibold text-ink-muted">{t(locale, 'panel.help.browseByGoal')}</p><nav aria-label={t(locale, 'panel.help.categoryAria')} className="flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">{HELP_GUIDE_GROUPS.map((item) => <button key={item.id} type="button" onClick={() => { setActiveGroup(item.id); setActiveSection(item.sections[0]); }} className={cn('flex min-h-touch shrink-0 cursor-pointer items-center gap-3 rounded-control border px-3 py-2.5 text-left lg:w-full', activeGroup === item.id ? 'border-brand-500/25 bg-brand-50 text-brand-700' : 'border-transparent text-ink-muted hover:bg-ink/[0.035] hover:text-ink')}><Icon name={item.icon} className="h-4 w-4 shrink-0" /><span className="font-ui text-sm font-medium lg:min-w-0 lg:flex-1">{t(locale, `panel.help.category_${item.id}`)}</span><span className="font-mono text-2xs text-ink-faint">{item.sections.length}</span></button>)}</nav></aside>
        <main className="min-w-0 space-y-4"><div className={cn(S.card, 'flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between')}><label className="block min-w-0 flex-1"><span className="mb-2 block font-ui text-xs font-semibold text-ink-muted">{t(locale, 'panel.help.chooseTopic')}</span><select value={activeSection} onChange={(event) => setActiveSection(event.target.value)} className={cn(S.select, 'w-full sm:max-w-xl')}>{group.sections.map((section) => <option key={section} value={section}>{t(locale, `panel.help.${section}Title`)}</option>)}</select></label><span className="shrink-0 pb-3 font-mono text-2xs text-ink-faint">{t(locale, 'panel.help.categoryCount', { n: group.sections.length })}</span></div><ContentEnter animKey={activeSection}><article className={cn(S.card, 'px-5 py-6 sm:px-8 sm:py-8')}><div className="flex flex-col gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-start sm:justify-between"><div className="max-w-3xl"><span className="font-ui text-xs font-medium text-brand-700">{t(locale, `panel.help.category_${group.id}`)}</span><h2 className="mb-0 mt-2 font-display text-3xl font-normal leading-tight text-ink">{t(locale, `panel.help.${activeSection}Title`)}</h2><p className="mb-0 mt-4 font-ui text-base leading-7 text-ink-muted">{t(locale, `panel.help.${activeSection}Body`)}</p></div>{hasProductLink ? <button type="button" className={cn(S.btnBrandSoft, 'shrink-0')} onClick={() => go(targetTab)}>{t(locale, 'panel.help.openFeature')}<Icon name="externalLink" className="h-4 w-4" /></button> : null}</div>{activeSection === 'flow' ? <FlowStrip locale={locale} /> : null}{activeSection === 'systemMap' ? <HelpSystemMap locale={locale} /> : null}{(HELP_SECTION_STEP_COUNTS[activeSection] || 0) > 0 ? <StepTimeline key={activeSection} locale={locale} sectionKey={activeSection} count={HELP_SECTION_STEP_COUNTS[activeSection]} /> : null}{activeSection === 'enneagram' ? <TypeCatalog locale={locale} /> : null}{activeSection === 'flow' ? <p className="mb-0 mt-5 font-ui text-xs leading-5 text-ink-faint">{t(locale, 'panel.help.flowAlt')}</p> : null}</article></ContentEnter><section className={cn(S.card, 'p-5')}><h2 className="m-0 font-ui text-sm font-semibold text-ink">{t(locale, 'panel.help.relatedTopics')}</h2><div className="mt-3 grid gap-2 sm:grid-cols-3">{related.map((section) => <TopicButton key={section} locale={locale} section={section} onClick={() => setActiveSection(section)} />)}</div></section></main>
      </div>}
  </div>;
}
