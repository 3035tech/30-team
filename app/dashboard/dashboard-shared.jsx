'use client';

import { TYPE_DATA } from '../../lib/data';
import { t } from '../../lib/i18n';
import { typeHintTooltip, typeShortLabel } from '../../lib/type-en';
import { C, FONTS, PIPELINE_STAGE_COLORS } from '../../lib/theme';

const S = {
  label:{ fontSize:'11px', letterSpacing:'2.5px', textTransform:'uppercase',
    color:'rgba(124,58,237,.55)', fontFamily:FONTS.mono,
    marginBottom:'12px', display:'block' },
  card:{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:'16px',
    padding:'28px', backdropFilter:'blur(16px)' },
  select:{ background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:'10px',
    padding:'9px 12px', color:C.muted, fontSize:'13px', cursor:'pointer', fontFamily:FONTS.serif },
  sidebarSection:{ fontSize:'11px', letterSpacing:'2px', textTransform:'uppercase',
    color:C.sectionLabel, fontFamily:FONTS.mono, display:'block',
    padding:'0 12px', marginBottom:'4px' },
  filterChip:{ display:'inline-flex', alignItems:'center', gap:'4px',
    padding:'4px 10px', background:`${C.purple}12`, border:`1px solid ${C.purple}40`,
    borderRadius:'20px', fontSize:'12px', color:C.purpleDeep, fontFamily:FONTS.mono },
};

const Bar = ({ value, max, color, h=6 }) => (
  <div style={{ width:'100%', height:h, background:'rgba(26,22,37,.08)', borderRadius:h/2, overflow:'hidden' }}>
    <div style={{ height:'100%', width:`${(value/Math.max(max,1))*100}%`,
      background:`linear-gradient(90deg,${color}99,${color})`, borderRadius:h/2 }}/>
  </div>
);

/** Inline T1–T9 reference with localized hint (hover / aria). */
const TypeRef = ({ type, locale = 'pt-BR', children, style }) => {
  const tip = typeHintTooltip(type, locale);
  return (
    <span
      title={tip}
      aria-label={tip}
      style={{
        cursor: 'help',
        borderBottom: `1px dotted ${C.faint}`,
        ...style,
      }}
    >
      {children != null ? children : `T${type}`}
    </span>
  );
};

const TypeBadge = ({ type, locale = 'pt-BR' }) => {
  const d = TYPE_DATA[type];
  const short = typeShortLabel(type, locale);
  const tip = typeHintTooltip(type, locale);
  if (!d) {
    return (
      <span
        title={tip}
        aria-label={tip}
        style={{
          padding: '3px 10px',
          fontSize: '11px',
          borderRadius: '20px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: `${C.muted}18`,
          border: `1px solid ${C.border}`,
          color: C.muted,
          fontFamily: 'monospace',
          cursor: 'help',
        }}
      >
        T{type}
      </span>
    );
  }
  return (
    <span
      title={tip}
      aria-label={tip}
      style={{
        padding: '3px 10px',
        fontSize: '12px',
        borderRadius: '20px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: `${d.color}18`,
        border: `1px solid ${d.color}44`,
        color: d.color,
        fontFamily: 'monospace',
        cursor: 'help',
      }}
    >
      {d.emoji} {short}
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
      style={{
        textAlign: align,
        padding: '10px 12px',
        color: active ? C.purpleDeep : C.muted,
        fontWeight: 600,
        fontFamily: 'monospace',
        fontSize: '11px',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        borderBottom: `1px solid ${C.border}`,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        {children}
        <span style={{ color: C.faint }}>{active ? (dir === 'asc' ? '▲' : '▼') : ''}</span>
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
      style={{
        padding: '2px 9px',
        fontSize: '12px',
        borderRadius: '20px',
        background: `${m.color}18`,
        border: `1px solid ${m.color}44`,
        color: m.color,
        fontFamily: 'monospace',
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
    <span aria-hidden style={{ color: C.faint, margin: '0 6px', fontWeight: 400 }}>
      /
    </span>
  );
  const crumbBtn = {
    margin: 0,
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    font: 'inherit',
    color: 'rgba(124,58,237,.55)',
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    fontFamily: FONTS.mono,
    fontSize: '11px',
  };

  return (
    <nav aria-label={t(locale, 'dashboard.breadcrumbAria')} style={{ ...S.label, marginBottom: 0 }}>
      <button type="button" onClick={onHome} style={crumbBtn} title={t(locale, 'dashboard.homeAria')}>
        {t(locale, 'dashboard.panel')}
      </button>
      {sectionLabel ? (
        <>
          {sep}
          <span style={{ color: 'rgba(124,58,237,.45)' }}>{sectionLabel}</span>
        </>
      ) : null}
      {sep}
      <span style={{ color: C.purpleDeep }} aria-current="page">{screenLabel}</span>
    </nav>
  );
}

export {
  Bar,
  CompatBadge,
  DashboardBreadcrumb,
  getDashboardTabNav,
  KANBAN_STAGES,
  getKanbanStages,
  S,
  SortableTh,
  TypeBadge,
  TypeRef,
  clientSortNextDir,
};
