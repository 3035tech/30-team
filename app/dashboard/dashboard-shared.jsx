'use client';

import { TYPE_DATA } from '../../lib/data';
import { t } from '../../lib/i18n';
import { typeFullName, typeShortLabel } from '../../lib/type-en';
import { C, FONTS } from '../../lib/theme';

const S = {
  label:{ fontSize:'11px', letterSpacing:'2.5px', textTransform:'uppercase',
    color:'rgba(124,58,237,.55)', fontFamily:FONTS.mono,
    marginBottom:'12px', display:'block' },
  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'16px',
    padding:'28px', backdropFilter:'blur(16px)' },
  select:{ background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:'10px',
    padding:'9px 12px', color:C.muted, fontSize:'13px', cursor:'pointer', fontFamily:FONTS.serif },
  sidebarSection:{ fontSize:'11px', letterSpacing:'2px', textTransform:'uppercase',
    color:C.sectionLabel, fontFamily:FONTS.mono, display:'block',
    padding:'0 12px', marginBottom:'4px' },
  filterChip:{ display:'inline-flex', alignItems:'center', gap:'4px',
    padding:'4px 10px', background:`${C.purple}12`, border:`1px solid ${C.purple}40`,
    borderRadius:'20px', fontSize:'12px', color:C.purpleLight, fontFamily:FONTS.mono },
};

const Bar = ({ value, max, color, h=6 }) => (
  <div style={{ width:'100%', height:h, background:'rgba(26,22,37,.08)', borderRadius:h/2, overflow:'hidden' }}>
    <div style={{ height:'100%', width:`${(value/Math.max(max,1))*100}%`,
      background:`linear-gradient(90deg,${color}99,${color})`, borderRadius:h/2 }}/>
  </div>
);

const TypeBadge = ({ type, locale = 'pt-BR' }) => {
  const d = TYPE_DATA[type];
  const short = typeShortLabel(type, locale);
  const name = typeFullName(type, locale);
  if (!d) {
    return (
      <span
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
        }}
      >
        T{type}
      </span>
    );
  }
  return (
    <span
      title={name ? `${name} (T${type})` : `T${type}`}
      style={{ padding:'3px 10px', fontSize:'12px', borderRadius:'20px',
      display:'inline-flex', alignItems:'center', gap:'4px',
      background:`${d.color}18`, border:`1px solid ${d.color}44`,
      color:d.color, fontFamily:'monospace' }}>
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
        color: active ? C.purpleLight : C.muted,
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

const KANBAN_STAGES = [
  { id: 'new',            label: 'Novo',            color: 'rgba(26,22,37,.5)' },
  { id: 'test_completed', label: 'Teste Realizado',  color: '#7C3AED' },
  { id: 'screening',      label: 'Triagem',          color: '#0284c7' },
  { id: 'interview',      label: 'Entrevista',       color: '#d97706' },
  { id: 'approved',       label: 'Aprovado',         color: '#15803d' },
  { id: 'rejected',       label: 'Reprovado',        color: '#dc2626' },
  { id: 'archived',       label: 'Arquivado',        color: 'rgba(26,22,37,.3)' },
];

export { Bar, CompatBadge, KANBAN_STAGES, S, SortableTh, TypeBadge, clientSortNextDir };
