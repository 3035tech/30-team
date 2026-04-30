'use client';

import { useState } from 'react';
import { getCompat } from '../../../lib/data';
import { C } from '../../../lib/theme';
import { CompatBadge, S, TypeBadge } from '../dashboard-shared';

export function GroupTab({ results, groupBase, setGroupBaseId, groupIds, setGroupIds, dismissedIds, setDismissedIds, suggestions, groupTensions }) {
  const [search, setSearch] = useState('');

  const addToGroup = (assessmentId) => {
    const id = String(assessmentId);
    if (groupIds.includes(id)) return;
    setGroupIds([...groupIds, id]);
  };
  const removeFromGroup = (assessmentId) => {
    const id = String(assessmentId);
    setGroupIds(groupIds.filter(x => x !== id));
  };
  const clearGroup = () => {
    setGroupBaseId(null);
    setGroupIds([]);
  };

  const dismissSuggestion = (assessmentId) => {
    const id = String(assessmentId);
    if (dismissedIds.includes(id)) return;
    setDismissedIds([...dismissedIds, id]);
  };

  const compatShort = { synergy: 'Sinergia', tension: 'Tensão', neutral: 'Neutro' };

  /** Mesmo padrão visual dos cards de sugestão: emoji só no TypeBadge; nome ao lado; × no canto se onRemove. */
  const PersonMini = ({ person, right, baseCompat = null, onRemove = null }) => {
    const showX = typeof onRemove === 'function';
    return (
      <div style={{
        position: showX ? 'relative' : 'static',
        display:'flex', flexDirection:'column', gap:'8px',
        padding:'12px 14px',
        paddingRight: showX ? '44px' : '14px',
        background:'rgba(26,22,37,.03)', border:`1px solid ${C.border}`, borderRadius:'12px',
      }}>
        {showX && (
          <button
            type="button"
            onClick={onRemove}
            title="Remover do grupo"
            aria-label="Remover do grupo"
            style={{ position:'absolute', top:'10px', right:'10px',
              width:'28px', height:'28px', display:'inline-flex', alignItems:'center', justifyContent:'center',
              background:'rgba(26,22,37,.06)', border:`1px solid ${C.border}`,
              borderRadius:'10px', color:C.muted, fontSize:'16px',
              cursor:'pointer', fontFamily:'monospace', lineHeight:1 }}
          >
            ×
          </button>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', gap:'12px', flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap', minWidth:0 }}>
            <TypeBadge type={person.topType}/>
            <span style={{ color:C.text, fontSize:'13px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {person.name}
            </span>
            {baseCompat && (
              <>
                <CompatBadge level={baseCompat.level}/>
                {baseCompat.level === 'tension' && (
                  <span style={{ padding:'2px 8px', fontSize:'10px', borderRadius:'20px',
                    background:`${C.tension}18`, border:`1px solid ${C.tension}44`,
                    color:C.tension, fontFamily:'monospace' }}>
                    ⚠ Tensão com base
                  </span>
                )}
              </>
            )}
          </div>
          {!showX && <div style={{ flexShrink:0 }}>{right}</div>}
        </div>
        {(person.areaLabel || (person.areaFitScore010 !== null && person.areaFitScore010 !== undefined)) ? (
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
            {person.areaLabel && (
              <span style={{ padding:'2px 8px', fontSize:'10px', borderRadius:'20px',
                background:'rgba(26,22,37,.04)', border:`1px solid ${C.border}`,
                color:C.muted, fontFamily:'monospace' }}>
                {person.areaLabel}
              </span>
            )}
            {person.areaFitScore010 !== null && person.areaFitScore010 !== undefined && (
              <span style={{ padding:'2px 8px', fontSize:'10px', borderRadius:'20px',
                background:'rgba(71,232,123,.08)', border:'1px solid rgba(71,232,123,.25)',
                color:'rgba(71,232,123,.95)', fontFamily:'monospace' }}>
                {person.areaFitScore010}/10
              </span>
            )}
          </div>
        ) : null}
        {baseCompat ? (
          <div style={{ marginTop:'0', fontSize:'12px', color:C.muted, lineHeight:1.55 }}>
            {baseCompat.title ? (
              <span style={{ fontSize:'11px', color:C.faint, fontFamily:'monospace', display:'block', marginBottom:'4px' }}>
                {baseCompat.title}
              </span>
            ) : null}
            {baseCompat.desc || ''}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
      <div style={S.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
          <span style={S.label}>Montar grupo</span>
          <button onClick={clearGroup} style={{ background:'rgba(26,22,37,.07)', border:`1px solid ${C.border}`,
            borderRadius:'10px', padding:'8px 12px', color:C.muted, fontSize:'11px', cursor:'pointer', fontFamily:'monospace' }}>
            Limpar
          </button>
        </div>

        <p style={{ fontSize:'12px', color:C.faint, lineHeight:1.65, marginTop:'10px' }}>
          Escolha uma pessoa base e veja quem tem melhor compatibilidade para trabalhar junto. Depois adicione membros ao grupo e acompanhe tensões internas.
        </p>

        <span style={{...S.label, marginTop:'18px'}}>Pessoa base</span>
        {groupBase ? (
          <PersonMini
            person={groupBase}
            right={
              <button onClick={()=>setGroupBaseId(null)} style={{ background:'transparent', border:`1px solid ${C.border}`,
                borderRadius:'10px', padding:'8px 10px', color:C.muted, fontSize:'11px', cursor:'pointer', fontFamily:'monospace' }}>
                Trocar
              </button>
            }
          />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {results.slice(0, 8).map(r=>(
              <PersonMini
                key={r.assessmentId}
                person={r}
                right={
                  <button onClick={()=>setGroupBaseId(String(r.assessmentId))} style={{ background:`${C.purple}22`, border:`1px solid ${C.purple}55`,
                    borderRadius:'10px', padding:'8px 10px', color:C.purpleLight, fontSize:'11px', cursor:'pointer', fontFamily:'monospace' }}>
                    Selecionar
                  </button>
                }
              />
            ))}
            <div style={{ marginTop:'6px', color:C.faint, fontSize:'11px', fontFamily:'monospace' }}>
              Dica: use o filtro de área/perfil acima para refinar a lista.
            </div>
          </div>
        )}
      </div>

      <div style={S.card}>
        <span style={S.label}>Sugestões e tensões</span>

        {!groupBase ? (
          <p style={{ color:C.muted, fontStyle:'italic', fontSize:'13px' }}>
            Selecione uma pessoa base para ver compatibilidades.
          </p>
        ) : (
          <>
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', margin:'10px 0 14px' }}>
              <input
                value={search}
                onChange={(e)=>setSearch(e.target.value)}
                placeholder="Buscar pessoa para adicionar…"
                style={{ flex:'1 1 240px', background:'rgba(26,22,37,.07)', border:`1px solid ${C.border}`,
                  borderRadius:'10px', padding:'10px 12px', color:C.text, fontSize:'12px',
                  fontFamily:'monospace' }}
              />
              <select
                onChange={(e)=>{ const id=e.target.value; if(id) addToGroup(id); e.target.value=''; }}
                defaultValue=""
                style={{ flex:'0 0 240px', background:'rgba(26,22,37,.05)', border:`1px solid ${C.border}`,
                  borderRadius:'10px', padding:'10px 12px', color:C.muted, fontSize:'12px',
                  cursor:'pointer', fontFamily:'monospace' }}
              >
                <option value="">+ Adicionar qualquer pessoa</option>
                {results
                  .filter(r=>String(r.assessmentId)!==String(groupBase.assessmentId))
                  .filter(r=>!groupIds.includes(String(r.assessmentId)))
                  .filter(r=>!search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase()))
                  .slice(0, 40)
                  .map(r=>{
                    const withBase = getCompat(groupBase.topType, r.topType);
                    return (
                      <option key={r.assessmentId} value={String(r.assessmentId)}>
                        {r.name} (T{r.topType}) · {compatShort[withBase.level] ?? withBase.level}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'14px' }}>
              <span style={{ padding:'2px 9px', fontSize:'10px', borderRadius:'20px',
                background:`${C.synergy}18`, border:`1px solid ${C.synergy}44`, color:C.synergy, fontFamily:'monospace' }}>
                Sinergia
              </span>
              <span style={{ padding:'2px 9px', fontSize:'10px', borderRadius:'20px',
                background:`${C.neutral}18`, border:`1px solid ${C.neutral}44`, color:C.neutral, fontFamily:'monospace' }}>
                Neutro
              </span>
              <span style={{ padding:'2px 9px', fontSize:'10px', borderRadius:'20px',
                background:`${C.tension}18`, border:`1px solid ${C.tension}44`, color:C.tension, fontFamily:'monospace' }}>
                Tensão
              </span>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'16px' }}>
              {suggestions.slice(0, 10).map(({ person, compat }) => {
                const lc = { synergy:C.synergy, tension:C.tension, neutral:C.neutral }[compat.level];
                const already = groupIds.includes(String(person.assessmentId));
                return (
                  <div key={person.assessmentId} style={{ position:'relative',
                    background:'rgba(26,22,37,.03)', border:`1px solid ${lc}30`,
                    borderRadius:'12px', padding:'12px 14px' }}>
                    <button
                      onClick={()=>dismissSuggestion(person.assessmentId)}
                      title="Remover da lista"
                      aria-label="Remover da lista"
                      style={{ position:'absolute', top:'10px', right:'10px',
                        width:'28px', height:'28px', display:'inline-flex', alignItems:'center', justifyContent:'center',
                        background:'rgba(26,22,37,.06)', border:`1px solid ${C.border}`,
                        borderRadius:'10px', color:C.muted, fontSize:'16px',
                        cursor:'pointer', fontFamily:'monospace', lineHeight:1 }}
                    >
                      ×
                    </button>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:'12px', flexWrap:'wrap', alignItems:'center' }}>
                      <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                        <TypeBadge type={person.topType}/>
                        <span style={{ color:C.text, fontSize:'13px' }}>{person.name}</span>
                        <CompatBadge level={compat.level}/>
                        {compat.level==='tension' && (
                          <span style={{ padding:'2px 8px', fontSize:'10px', borderRadius:'20px',
                            background:`${C.tension}18`, border:`1px solid ${C.tension}44`,
                            color:C.tension, fontFamily:'monospace' }}>
                            ⚠ Tensão com base
                          </span>
                        )}
                      </div>
                      <div style={{ display:'flex', gap:'8px' }}>
                        <button
                          disabled={already}
                          onClick={()=>addToGroup(person.assessmentId)}
                          style={{ background:already?'rgba(26,22,37,.04)':`${lc}18`,
                            border:`1px solid ${already?C.border:lc}55`, borderRadius:'10px',
                            padding:'8px 10px', color:already?C.faint:lc, fontSize:'11px',
                            cursor:already?'not-allowed':'pointer', fontFamily:'monospace' }}
                        >
                          {already?'No grupo':'Adicionar'}
                        </button>
                      </div>
                    </div>
                    <div style={{ marginTop:'8px', fontSize:'12px', color:C.muted, lineHeight:1.55 }}>
                      {compat.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:'14px' }}>
              <span style={{...S.label, marginBottom:'10px'}}>Grupo atual</span>
              {groupIds.length === 0 ? (
                <p style={{ color:C.faint, fontSize:'12px', fontStyle:'italic' }}>Nenhuma pessoa adicionada ainda.</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {groupIds.map(id => {
                    const p = results.find(r => String(r.assessmentId) === String(id));
                    if (!p) return null;
                    const baseCompat =
                      groupBase && String(p.assessmentId) !== String(groupBase.assessmentId)
                        ? getCompat(groupBase.topType, p.topType)
                        : null;
                    return (
                      <PersonMini
                        key={id}
                        person={p}
                        baseCompat={baseCompat}
                        onRemove={() => removeFromGroup(id)}
                      />
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop:'14px' }}>
                <span style={{...S.label, marginBottom:'6px'}}>Tensões internas</span>
                {groupTensions.length === 0 ? (
                  <p style={{ color:C.faint, fontSize:'12px', fontStyle:'italic' }}>Nenhuma tensão detectada no grupo atual.</p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    {groupTensions.slice(0, 8).map((p, idx) => (
                      <div key={idx} style={{ padding:'10px 12px', background:'rgba(232,71,71,.06)',
                        border:'1px solid rgba(232,71,71,.2)', borderRadius:'10px' }}>
                        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                          <TypeBadge type={p.a.topType}/><span style={{ color:C.muted, fontSize:'12px' }}>{p.a.name.split(' ')[0]}</span>
                          <span style={{ color:C.faint }}>×</span>
                          <TypeBadge type={p.b.topType}/><span style={{ color:C.muted, fontSize:'12px' }}>{p.b.name.split(' ')[0]}</span>
                        </div>
                        <div style={{ marginTop:'6px', fontSize:'12px', color:C.muted, lineHeight:1.55 }}>
                          {p.compat.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
