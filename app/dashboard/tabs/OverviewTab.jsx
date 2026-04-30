'use client';

import { TYPE_DATA } from '../../../lib/data';
import { C } from '../../../lib/theme';
import { Bar, S } from '../dashboard-shared';

export function OverviewTab({ typeCount, maxCount, distributionTotal, tensions, synergies }) {
  const denom = Math.max(
    distributionTotal || 0,
    Object.values(typeCount).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0),
    1,
  );
  const top = Object.entries(typeCount).sort((a,b)=>b[1]-a[1]).find(([,c])=>c>0);
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
      <div style={{...S.card, gridColumn:'1/-1'}}>
        <span style={S.label}>Distribuição de tipos</span>
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          {Object.entries(typeCount).filter(([,c])=>c>0).sort((a,b)=>b[1]-a[1]).map(([t,c])=>{
            const d=TYPE_DATA[parseInt(t)];
            return (
              <div key={t} style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <span
                  title={d?.name ? `${d.name} (T${t})` : `T${t}`}
                  style={{
                    width:'160px',
                    fontSize:'12px',
                    color:d.color,
                    flexShrink:0,
                    fontFamily:'monospace',
                    whiteSpace:'nowrap',
                    overflow:'hidden',
                    textOverflow:'ellipsis',
                    display:'inline-flex',
                    alignItems:'center',
                    gap:'8px',
                  }}
                >
                  <span style={{ width:'22px', textAlign:'center', flexShrink:0 }}>{d.emoji}</span>
                  <span style={{ minWidth:0 }}>{d.short}</span>
                </span>
                <div style={{ flex:1 }}><Bar value={c} max={maxCount} color={d.color} h={10}/></div>
                <span style={{ fontSize:'13px', color:C.muted, fontFamily:'monospace', width:'20px', textAlign:'right' }}>{c}</span>
                <span style={{ fontSize:'11px', color:C.faint, fontFamily:'monospace', width:'36px', textAlign:'right' }}>
                  {Math.round((c / denom) * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={S.card}>
        <span style={S.label}>Alertas rápidos</span>
        {[{icon:'⚠️',n:tensions.length,c:C.tension,l:'Pares em tensão'},
          {icon:'✅',n:synergies.length,c:C.synergy,l:'Parcerias naturais'},
          {icon:'👥',n:Object.values(typeCount).filter(c=>c>0).length,c:C.purpleLight,l:'Tipos presentes'}
        ].map(x=>(
          <div key={x.l} style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
            <span style={{ fontSize:'20px' }}>{x.icon}</span>
            <div>
              <div style={{ fontSize:'22px', color:x.c }}>{x.n}</div>
              <div style={{ fontSize:'11px', color:C.muted, fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'1px' }}>{x.l}</div>
            </div>
          </div>
        ))}
      </div>
      {top&&(()=>{
        const d=TYPE_DATA[parseInt(top[0])];
        return (
          <div style={{...S.card, background:`${d.color}08`, border:`1px solid ${d.color}25`}}>
            <span style={{...S.label, color:`${d.color}70`}}>Tipo dominante</span>
            <div style={{ fontSize:'32px', marginBottom:'8px' }}>{d.emoji}</div>
            <h3 style={{ fontSize:'18px', color:d.color, fontWeight:'normal', marginBottom:'8px' }}>{d.name}</h3>
            <p style={{ fontSize:'13px', color:C.muted, lineHeight:1.6, margin:0 }}>{d.team}</p>
          </div>
        );
      })()}
    </div>
  );
}
