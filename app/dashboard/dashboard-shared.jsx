'use client';

import { TYPE_DATA } from '../../lib/data';
import { C, FONTS } from '../../lib/theme';

const S = {
  label:{ fontSize:'10px', letterSpacing:'3px', textTransform:'uppercase',
    color:'rgba(124,58,237,.55)', fontFamily:FONTS.mono,
    marginBottom:'12px', display:'block' },
  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'16px',
    padding:'28px', backdropFilter:'blur(16px)' },
};

const Bar = ({ value, max, color, h=6 }) => (
  <div style={{ width:'100%', height:h, background:'rgba(26,22,37,.08)', borderRadius:h/2, overflow:'hidden' }}>
    <div style={{ height:'100%', width:`${(value/Math.max(max,1))*100}%`,
      background:`linear-gradient(90deg,${color}99,${color})`, borderRadius:h/2 }}/>
  </div>
);

const TypeBadge = ({ type }) => {
  const d = TYPE_DATA[type];
  return (
    <span
      title={d?.name ? `${d.name} (T${type})` : `T${type}`}
      style={{ padding:'3px 10px', fontSize:'11px', borderRadius:'20px',
      display:'inline-flex', alignItems:'center', gap:'4px',
      background:`${d.color}18`, border:`1px solid ${d.color}44`,
      color:d.color, fontFamily:'monospace' }}>
      {d.emoji} {d.short}
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
        fontSize: '10px',
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

const CompatBadge = ({ level }) => {
  const map = { synergy:{label:'Sinergia',color:C.synergy}, tension:{label:'Tensão',color:C.tension}, neutral:{label:'Neutro',color:C.neutral} };
  const m = map[level];
  return <span style={{ padding:'2px 9px', fontSize:'10px', borderRadius:'20px',
    background:`${m.color}18`, border:`1px solid ${m.color}44`, color:m.color, fontFamily:'monospace' }}>{m.label}</span>;
};

export { Bar, CompatBadge, S, SortableTh, TypeBadge, clientSortNextDir };
