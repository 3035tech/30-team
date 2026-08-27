'use client';

import { TYPE_DATA } from '../../lib/data';
import { t } from '../../lib/i18n';
import { typeHintTooltip, typeShortLabel } from '../../lib/type-en';
import { C, PIPELINE_STAGE_COLORS } from '../../lib/theme';
import { cn } from '../../lib/cn';

/** Shared Tailwind class tokens (prefer `className={S.x}` — do not reinvent). */
const S = {
  label:
    'mb-3 block font-mono text-[11px] uppercase tracking-[2.5px] text-ink-label',
  card: 'rounded-card border border-ink/12 bg-white p-7 backdrop-blur-[16px]',
  cardTight: 'rounded-card border border-ink/12 bg-white p-5',
  select:
    'cursor-pointer rounded-control border border-ink/12 bg-ink/[0.05] px-3 py-[9px] font-ui text-[13px] text-ink-muted',
  input:
    'w-full box-border rounded-control border border-ink/12 bg-ink/[0.05] px-3 py-2.5 font-mono text-[13px] text-ink',
  sidebarSection:
    'mb-1 block px-3 font-mono text-[11px] uppercase tracking-[2px] text-ink-label',
  filterChip:
    'inline-flex items-center gap-1 rounded-full border border-brand-500/25 bg-brand-500/10 px-2.5 py-1 font-mono text-xs text-brand-600',
  /** Primary CTA — brand (use once per viewport when possible) */
  btnPrimary:
    'inline-flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-control border-0 bg-brand-500 px-4 py-2.5 font-mono text-[13px] text-white disabled:cursor-default disabled:opacity-55',
  /** Secondary soft brand */
  btnBrandSoft:
    'inline-flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-control border border-brand-500/35 bg-brand-500/10 px-3.5 py-2.5 font-mono text-xs text-brand-600 disabled:cursor-default disabled:opacity-55',
  /** Neutral / ghost actions (pagination, refresh, cancel) */
  btnGhost:
    'inline-flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-control border border-ink/12 bg-transparent px-3.5 py-2.5 font-mono text-xs text-ink-muted disabled:cursor-default disabled:opacity-55',
  muted: 'text-[13px] leading-relaxed text-ink-muted',
  faint: 'text-[12px] leading-snug text-ink-faint',
  stack: 'flex flex-col gap-4',
  row: 'flex flex-wrap items-center gap-2',
};

const Bar = ({ value, max, color, h = 6 }) => (
  <div
    className="w-full overflow-hidden bg-ink/[0.08]"
    style={{ height: h, borderRadius: h / 2 }}
  >
    <div
      className="h-full"
      style={{
        width: `${(value / Math.max(max, 1)) * 100}%`,
        background: `linear-gradient(90deg,${color}99,${color})`,
        borderRadius: h / 2,
      }}
    />
  </div>
);

/** Inline T1–T9 reference with localized hint (hover / aria). */
const TypeRef = ({ type, locale = 'pt-BR', children, className, style }) => {
  const tip = typeHintTooltip(type, locale);
  return (
    <span
      title={tip}
      aria-label={tip}
      className={cn('cursor-help border-b border-dotted border-ink-faint', className)}
      style={style}
    >
      {children != null ? children : `T${type}`}
    </span>
  );
};

const TypeBadge = ({ type, locale = 'pt-BR', compact = false }) => {
  const d = TYPE_DATA[type];
  const short = typeShortLabel(type, locale);
  const tip = typeHintTooltip(type, locale);
  const label = compact ? `T${type}` : short;
  const base = cn(
    'inline-flex flex-shrink-0 cursor-help items-center font-mono rounded-full',
    compact ? 'gap-0.5 px-[7px] py-0.5 text-[10px]' : 'gap-1 px-2.5 py-[3px] text-[11px]'
  );
  if (!d) {
    return (
      <span
        title={tip}
        aria-label={tip}
        className={cn(base, !compact && 'text-[11px]', 'border border-ink/12 bg-ink-muted/10 text-ink-muted')}
      >
        T{type}
      </span>
    );
  }
  return (
    <span
      title={tip}
      aria-label={tip}
      className={cn(base, !compact && 'text-xs', compact && 'tracking-[0.02em]')}
      style={{
        background: `${d.color}18`,
        border: `1px solid ${d.color}44`,
        color: d.color,
      }}
    >
      {compact ? (
        <>
          <span aria-hidden className="text-[11px] leading-none">
            {d.emoji}
          </span>
          {label}
        </>
      ) : (
        <>
          {d.emoji} {label}
        </>
      )}
    </span>
  );
};

function SortableTh({ children, columnKey, sortKey, dir, onSort, align = 'left' }) {
  const active = sortKey === columnKey;
  return (
    <th
      scope="col"
      tabIndex={0}
      role="columnheader"
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      onClick={() => onSort(columnKey)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSort(columnKey);
        }
      }}
      className={cn(
        'cursor-pointer select-none border-b border-ink/12 px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em]',
        active ? 'text-brand-600' : 'text-ink-muted',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        <span className="text-ink-faint">{active ? (dir === 'asc' ? '▲' : '▼') : ''}</span>
      </span>
    </th>
  );
}

function clientSortNextDir(column, previousKey, previousDir) {
  if (previousKey === column) return previousDir === 'asc' ? 'desc' : 'asc';
  return column === 'createdAt' ? 'desc' : 'asc';
}

const CompatBadge = ({ level, locale = 'pt-BR' }) => {
  const map = {
    synergy: { key: 'panel.compatLevel.synergy', color: C.synergy },
    tension: { key: 'panel.compatLevel.tension', color: C.tension },
    neutral: { key: 'panel.compatLevel.neutral', color: C.neutral },
  };
  const m = map[level];
  if (!m) return null;
  return (
    <span
      className="rounded-full px-[9px] py-0.5 font-mono text-xs"
      style={{
        background: `${m.color}18`,
        border: `1px solid ${m.color}44`,
        color: m.color,
      }}
    >
      {t(locale, m.key)}
    </span>
  );
};

const KANBAN_STAGE_DEFS = [
  { id: 'new', color: PIPELINE_STAGE_COLORS.new, labelKey: 'recruiting.pipelineNew' },
  { id: 'interview', color: PIPELINE_STAGE_COLORS.interview, labelKey: 'recruiting.pipelineInterview' },
  { id: 'test_completed', color: PIPELINE_STAGE_COLORS.test_completed, labelKey: 'recruiting.pipelineTestCompleted' },
  { id: 'screening', color: PIPELINE_STAGE_COLORS.screening, labelKey: 'recruiting.pipelineScreening' },
  { id: 'approved', color: PIPELINE_STAGE_COLORS.approved, labelKey: 'recruiting.pipelineApproved' },
  { id: 'hired', color: PIPELINE_STAGE_COLORS.hired, labelKey: 'recruiting.pipelineHired' },
  { id: 'rejected', color: PIPELINE_STAGE_COLORS.rejected, labelKey: 'recruiting.pipelineRejected' },
  { id: 'archived', color: PIPELINE_STAGE_COLORS.archived, labelKey: 'recruiting.pipelineArchived' },
];

function getKanbanStages(locale = 'pt-BR') {
  return KANBAN_STAGE_DEFS.map((s) => ({
    id: s.id,
    color: s.color,
    label: t(locale, s.labelKey),
  }));
}

/** @deprecated use getKanbanStages(locale) */
const KANBAN_STAGES = getKanbanStages('pt-BR');

/** Sidebar section + label key for dashboard breadcrumb / page chrome. */
const DASHBOARD_TAB_NAV = {
  overview: { sectionKey: 'dashboard.sectionAnalysis', labelKey: 'dashboard.overview' },
  team: { sectionKey: 'dashboard.sectionAnalysis', labelKey: 'dashboard.team' },
  compatibility: { sectionKey: 'dashboard.sectionAnalysis', labelKey: 'dashboard.compatibility' },
  compare: { sectionKey: 'dashboard.sectionAnalysis', labelKey: 'dashboard.compare' },
  group: { sectionKey: 'dashboard.sectionAnalysis', labelKey: 'dashboard.group' },
  leadership: { sectionKey: 'dashboard.sectionAnalysis', labelKey: 'dashboard.leadership' },
  vacancies: { sectionKey: 'dashboard.sectionManagement', labelKey: 'dashboard.vacancies' },
  motivators: { sectionKey: 'dashboard.sectionManagement', labelKey: 'dashboard.motivators' },
  climate: { sectionKey: 'dashboard.sectionManagement', labelKey: 'dashboard.climate' },
  'job-roles': { sectionKey: 'dashboard.sectionManagement', labelKey: 'dashboard.jobRoles' },
  'performance-reviews': { sectionKey: 'dashboard.sectionManagement', labelKey: 'dashboard.performanceReviews' },
  succession: { sectionKey: 'dashboard.sectionManagement', labelKey: 'dashboard.succession' },
  'exit-analysis': { sectionKey: 'dashboard.sectionManagement', labelKey: 'dashboard.exitAnalysis' },
  companies: { sectionKey: 'dashboard.sectionManagement', labelKey: 'dashboard.companies' },
  users: { sectionKey: 'dashboard.sectionManagement', labelKey: 'dashboard.users' },
  help: { sectionKey: 'dashboard.sectionHelp', labelKey: 'dashboard.help' },
  profile: { sectionKey: null, labelKey: 'dashboard.profile' },
};

function getDashboardTabNav(tab) {
  return DASHBOARD_TAB_NAV[tab] || DASHBOARD_TAB_NAV.overview;
}

function DashboardBreadcrumb({ locale, tab, onHome }) {
  const nav = getDashboardTabNav(tab);
  const sectionLabel = nav.sectionKey ? t(locale, nav.sectionKey) : null;
  const screenLabel = t(locale, nav.labelKey);
  const sep = (
    <span aria-hidden className="mx-1.5 font-normal text-ink-faint">
      /
    </span>
  );

  return (
    <nav
      aria-label={t(locale, 'dashboard.breadcrumbAria')}
      className={cn(S.label, 'mb-0')}
    >
      <button
        type="button"
        onClick={onHome}
        title={t(locale, 'dashboard.homeAria')}
        className="m-0 cursor-pointer border-none bg-transparent p-0 font-mono text-[11px] uppercase tracking-[2.5px] text-ink-label"
      >
        {t(locale, 'dashboard.panel')}
      </button>
      {sectionLabel ? (
        <>
          {sep}
          <span className="text-ink-faint">{sectionLabel}</span>
        </>
      ) : null}
      {sep}
      <span className="text-ink" aria-current="page">
        {screenLabel}
      </span>
    </nav>
  );
}

/**
 * Horizontal section tabs. Optional `moreTabs` collapses secondary sections into a native select
 * so recruiters keep primary jobs (e.g. pipeline + candidates) visible.
 * Styled with Tailwind tokens (brand / ink / canvas).
 */
function PanelSubNav({ tabs, active, onChange, ariaLabel, moreTabs = null, moreLabel = 'More' }) {
  const more = Array.isArray(moreTabs) ? moreTabs : [];
  const moreActive = more.some((tab) => tab.id === active);
  const moreValue = moreActive ? active : '';

  const tabClass = (on) =>
    cn(
      'min-h-touch cursor-pointer rounded-full border px-3.5 py-2 font-mono text-xs',
      on
        ? 'border-brand-500/40 bg-brand-500/[0.08] text-brand-600'
        : 'border-ink/12 bg-transparent text-ink-muted'
    );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel || undefined}
      className="mb-3.5 flex flex-wrap items-center gap-1.5 border-b border-ink/12 pb-3"
    >
      {tabs.map((tab) => {
        const on = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tab.id)}
            className={tabClass(on)}
          >
            {tab.label}
          </button>
        );
      })}
      {more.length > 0 ? (
        <label className="relative m-0 inline-flex min-h-touch items-center gap-2">
          <span className="sr-only">{moreLabel}</span>
          <select
            aria-label={moreLabel}
            value={moreValue}
            onChange={(e) => {
              const next = e.target.value;
              if (next) onChange(next);
            }}
            className={cn(
              'max-w-[220px] min-h-touch cursor-pointer rounded-full border px-3.5 py-2 font-mono text-xs',
              moreActive
                ? 'border-brand-500/40 bg-brand-500/[0.08] text-brand-600'
                : 'border-ink/12 bg-ink/[0.05] text-ink-muted'
            )}
          >
            <option value="">{moreLabel}</option>
            {more.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

export {
  Bar,
  CompatBadge,
  DashboardBreadcrumb,
  getDashboardTabNav,
  KANBAN_STAGES,
  getKanbanStages,
  PanelSubNav,
  S,
  SortableTh,
  TypeBadge,
  TypeRef,
  clientSortNextDir,
};
