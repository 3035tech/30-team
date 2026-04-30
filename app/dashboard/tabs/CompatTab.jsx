'use client';

import { useState } from 'react';
import { TYPE_DATA } from '../../../lib/data';
import { C } from '../../../lib/theme';
import { PAGE_SIZE_OPTIONS } from '../../../lib/assessment-filters';
import { CompatBadge, S, TypeBadge } from '../dashboard-shared';

export function CompatTab({
  tensions,
  synergies,
  pairs,
  compatPage = 1,
  compatPageSize = 20,
  onCompatPagination,
}) {
  const [section, setSection] = useState('tensions');
  const SecBtn = ({ id, label, count, color }) => (
    <button
      type="button"
      onClick={() => {
        setSection(id);
        if (onCompatPagination) {
          onCompatPagination({ page: 1, pageSize: compatPageSize });
        }
      }}
      style={{
      padding:'8px 16px', display:'flex', alignItems:'center', gap:'8px',
      background:section===id?`${color}20`:'rgba(26,22,37,.04)',
      border:`1px solid ${section===id?color:C.border}`,
      borderRadius:'10px', color:section===id?color:C.muted, fontSize:'12px',
      cursor:'pointer', fontFamily:'monospace' }}>
      {label} <span style={{ background:`${color}30`, padding:'1px 7px', borderRadius:'10px', fontSize:'11px' }}>{count}</span>
    </button>
  );
  const display = section === 'tensions' ? tensions : section === 'synergies' ? synergies : pairs;
  const listLen = display.length;
  const totalPg = Math.max(1, Math.ceil(listLen / compatPageSize));
  const pg = Math.min(Math.max(1, compatPage || 1), totalPg);
  const sliced = listLen === 0 ? [] : display.slice((pg - 1) * compatPageSize, pg * compatPageSize);
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'20px' }}>
        {[{l:'Pares em tensão',n:tensions.length,c:C.tension,i:'⚠️',d:'Risco de atrito interpessoal'},
          {l:'Parcerias naturais',n:synergies.length,c:C.synergy,i:'✅',d:'Alta complementaridade'},
          {l:'Total de pares',n:pairs.length,c:C.purpleLight,i:'👥',d:'Combinações analisadas'}
        ].map(x=>(
          <div key={x.l} style={{ background:C.card, border:`1px solid ${x.c}25`, borderRadius:'14px', padding:'20px' }}>
            <div style={{ fontSize:'22px', marginBottom:'6px' }}>{x.i}</div>
            <div style={{ fontSize:'26px', color:x.c, marginBottom:'4px' }}>{x.n}</div>
            <div style={{ fontSize:'11px', color:C.muted, fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px' }}>{x.l}</div>
            <div style={{ fontSize:'11px', color:C.faint }}>{x.d}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'20px', flexWrap:'wrap' }}>
        <SecBtn id="tensions"  label="Tensões"        count={tensions.length}  color={C.tension}/>
        <SecBtn id="synergies" label="Sinergias"      count={synergies.length} color={C.synergy}/>
        <SecBtn id="all"       label="Todos os pares" count={pairs.length}     color={C.purpleLight}/>
      </div>
      {display.length===0?(
        <div style={{...S.card, textAlign:'center', padding:'40px'}}>
          <p style={{ color:C.muted, fontStyle:'italic' }}>Nenhum par nessa categoria.</p>
        </div>
      ):(
        <>
        {sliced.map((pair, i)=>{
          const {a,b,compat}=pair;
          const pairKey = `${String(a?.assessmentId ?? 'a')}_${String(b?.assessmentId ?? 'b')}_${i}`;
          const lc={synergy:C.synergy,tension:C.tension,neutral:C.neutral}[compat.level];

          const PersonCard = ({ person }) => {
            const d = TYPE_DATA[person.topType];
            return (
              <div style={{ background:'rgba(26,22,37,.03)', border:`1px solid ${C.border}`,
                borderRadius:'12px', padding:'14px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                  <div style={{ fontSize:'22px' }}>{d.emoji}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:'13px', color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {person.name}
                    </div>
                    <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                      <TypeBadge type={person.topType}/>
                      {person.areaLabel && (
                        <span style={{ padding:'2px 8px', fontSize:'10px', borderRadius:'20px',
                          background:'rgba(26,22,37,.04)', border:`1px solid ${C.border}`,
                          color:C.muted, fontFamily:'monospace' }}>
                          {person.areaLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize:'12px', color:C.faint, lineHeight:1.6, margin:0 }}>
                  {d.team}
                </p>
              </div>
            );
          };

          return (
            <div key={pairKey} style={{ background:C.card, border:`1px solid ${lc}30`,
              borderRadius:'14px', padding:'18px 18px', marginBottom:'12px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                flexWrap:'wrap', gap:'12px', marginBottom:'12px' }}>
                <div style={{ fontSize:'12px', color:lc, fontFamily:'monospace',
                  letterSpacing:'1px', textTransform:'uppercase' }}>{compat.title}</div>
                <CompatBadge level={compat.level}/>
              </div>

              {compat.level === 'tension' ? (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 56px 1fr', gap:'10px', alignItems:'stretch' }}>
                  <PersonCard person={a}/>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', color:C.faint, fontFamily:'monospace' }}>×</div>
                  <PersonCard person={b}/>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'10px' }}>
                  <TypeBadge type={a.topType}/><span style={{ color:C.muted, fontSize:'13px' }}>{a.name.split(' ')[0]}</span>
                  <span style={{ color:C.faint }}>×</span>
                  <TypeBadge type={b.topType}/><span style={{ color:C.muted, fontSize:'13px' }}>{b.name.split(' ')[0]}</span>
                </div>
              )}

              <p style={{ fontSize:'13px', color:C.muted, lineHeight:1.65, margin:'12px 0 0' }}>{compat.desc}</p>

              {compat.level==='tension'&&(
                <div style={{ marginTop:'12px', padding:'10px 14px', background:'rgba(232,71,71,.06)',
                  border:'1px solid rgba(232,71,71,.2)', borderRadius:'8px' }}>
                  <span style={{ fontSize:'11px', color:C.tension, fontFamily:'monospace', display:'block', marginBottom:'4px' }}>⚠ Decisão para grupos</span>
                  <p style={{ fontSize:'12px', color:C.muted, lineHeight:1.6, margin:0 }}>
                    Evite colocar esse par como dupla fixa sem um acordo claro de papéis. Se precisarem trabalhar juntos, prefira um terceiro elemento “ponte” e rituais curtos de alinhamento (check-in semanal + definição explícita de entregáveis).
                  </p>
                </div>
              )}
              {compat.level==='synergy'&&(
                <div style={{ marginTop:'12px', padding:'10px 14px', background:'rgba(71,232,123,.06)',
                  border:'1px solid rgba(71,232,123,.2)', borderRadius:'8px' }}>
                  <span style={{ fontSize:'11px', color:C.synergy, fontFamily:'monospace', display:'block', marginBottom:'4px' }}>✓ Oportunidade</span>
                  <p style={{ fontSize:'12px', color:C.muted, lineHeight:1.6, margin:0 }}>
                    Alta complementaridade. Bom candidato para projetos de alta interdependência (pairing, discovery/entrega, liderança técnica + execução).
                  </p>
                </div>
              )}
            </div>
          );
        })}
        {onCompatPagination && listLen > 0 ? (
          <div style={{
            ...S.card, padding: '12px 18px', display: 'flex', flexWrap: 'wrap',
            alignItems: 'center', gap: '12px', justifyContent: 'space-between',
            marginTop: '8px',
          }}>
            <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
              Pares nesta vista · página {pg} de {totalPg}
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <select
                value={String(compatPageSize)}
                onChange={(e) => {
                  const ps = parseInt(e.target.value, 10);
                  onCompatPagination({ page: 1, pageSize: ps });
                }}
                style={{ background: 'rgba(26,22,37,.05)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '6px 10px', color: C.muted, fontSize: '11px',
                  cursor: 'pointer', fontFamily: 'monospace' }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={String(n)}>{n}/pág.</option>
                ))}
              </select>
              <button
                type="button"
                disabled={pg <= 1}
                onClick={() => onCompatPagination({ page: pg - 1, pageSize: compatPageSize })}
                style={{ background: pg <= 1 ? 'transparent' : `${C.purple}18`,
                  border: `1px solid ${pg <= 1 ? C.border : `${C.purple}55`}`,
                  borderRadius: '10px', padding: '6px 12px', color: pg <= 1 ? C.faint : C.purple,
                  fontSize: '11px', cursor: pg <= 1 ? 'default' : 'pointer', fontFamily: 'monospace' }}
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={pg >= totalPg}
                onClick={() => onCompatPagination({ page: pg + 1, pageSize: compatPageSize })}
                style={{ background: pg >= totalPg ? 'transparent' : `${C.purple}18`,
                  border: `1px solid ${pg >= totalPg ? C.border : `${C.purple}55`}`,
                  borderRadius: '10px', padding: '6px 12px',
                  color: pg >= totalPg ? C.faint : C.purple,
                  fontSize: '11px', cursor: pg >= totalPg ? 'default' : 'pointer', fontFamily: 'monospace' }}
              >
                Próxima
              </button>
            </div>
          </div>
        ) : null}
        </>
      )}
      <div style={{ marginTop:'16px', padding:'16px 20px', background:'rgba(167,139,250,.05)',
        border:`1px solid rgba(167,139,250,.15)`, borderRadius:'12px' }}>
        <span style={{...S.label,marginBottom:'6px'}}>Nota metodológica</span>
        <p style={{ fontSize:'12px', color:C.faint, lineHeight:1.65, margin:0 }}>
          A análise de compatibilidade é baseada no modelo interno de perfis e serve como ponto de partida para conversas — não como diagnóstico definitivo.
        </p>
      </div>
    </div>
  );
}
