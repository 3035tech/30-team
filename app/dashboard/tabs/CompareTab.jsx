'use client';

import { useEffect, useMemo, useState } from 'react';
import { TYPE_DATA } from '../../../lib/data';
import { C } from '../../../lib/theme';
import { S, TypeBadge } from '../dashboard-shared';

export function CompareTab({ results }) {
  const allIds = useMemo(() => results.map((r) => String(r.assessmentId)), [results]);
  const [selectedIds, setSelectedIds] = useState(() => new Set(allIds));
  const [sortBy, setSortBy] = useState(() => ({ key: 'name', dir: 'asc' })); // key: 'name' | 1..9

  useEffect(() => {
    setSelectedIds((prev) => {
      const idSet = new Set(allIds);
      const next = new Set([...prev].filter((id) => idSet.has(id)));
      if (next.size === 0 && allIds.length > 0) allIds.forEach((id) => next.add(id));
      return next;
    });
  }, [allIds]);

  const toggleId = (id) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAll = () => setSelectedIds(new Set(allIds));
  const clearSelection = () => setSelectedIds(new Set());

  const visible = results.filter((r) => selectedIds.has(String(r.assessmentId)));
  const resultsByFirstName = useMemo(() => {
    const first = (row) => String(row?.name ?? '').trim().split(' ')[0].toLowerCase();
    return [...results].sort((a, b) => {
      const an = first(a);
      const bn = first(b);
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
  }, [results]);
  const visibleSorted = useMemo(() => {
    const dirMul = sortBy.dir === 'asc' ? 1 : -1;
    const getScore = (row, t) => {
      const v = row?.scores?.[t] ?? row?.scores?.[String(t)] ?? 0;
      const n = typeof v === 'number' ? v : parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    const getName = (row) => String(row?.name ?? '').trim().split(' ')[0].toLowerCase();
    return [...visible].sort((a, b) => {
      if (sortBy.key === 'name') {
        const an = getName(a);
        const bn = getName(b);
        if (an < bn) return -1 * dirMul;
        if (an > bn) return 1 * dirMul;
        return 0;
      }
      const t = sortBy.key;
      const av = getScore(a, t);
      const bv = getScore(b, t);
      if (av < bv) return -1 * dirMul;
      if (av > bv) return 1 * dirMul;
      const an = getName(a);
      const bn = getName(b);
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
  }, [visible, sortBy]);

  const toggleSort = (key) => {
    setSortBy((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      // padrão: nome A→Z; números maior→menor
      return { key, dir: key === 'name' ? 'asc' : 'desc' };
    });
  };
  const sortMark = (key) => (sortBy.key === key ? (sortBy.dir === 'asc' ? '▲' : '▼') : '');
  const nSel = selectedIds.size;
  const nTot = results.length;
  const allSelected = nTot > 0 && nSel === nTot;

  const btnBar = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: `1px solid ${C.border}`,
  };
  const miniBtn = {
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '11px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  };

  return (
    <div style={S.card}>
      <span style={S.label}>Mapa de perfis da equipe</span>
      <p style={{ fontSize: '13px', color: C.muted, marginTop: '8px', marginBottom: '14px', lineHeight: 1.55 }}>
        Escolha quem entra na comparação. Use os atalhos abaixo ou marque/desmarque cada pessoa.
      </p>

      <div style={btnBar}>
        <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
          {nSel} de {nTot} na tabela
        </span>
        <button
          type="button"
          onClick={selectAll}
          disabled={nTot === 0 || allSelected}
          style={{
            ...miniBtn,
            background: allSelected ? 'rgba(26,22,37,.04)' : `${C.purple}18`,
            border: `1px solid ${allSelected ? C.border : `${C.purple}55`}`,
            color: allSelected ? C.faint : C.purple,
            opacity: nTot === 0 ? 0.5 : 1,
          }}
        >
          Selecionar todos
        </button>
        <button
          type="button"
          onClick={clearSelection}
          disabled={nSel === 0}
          style={{
            ...miniBtn,
            background: 'transparent',
            border: `1px solid ${C.border}`,
            color: C.muted,
            opacity: nSel === 0 ? 0.5 : 1,
          }}
        >
          Limpar seleção
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 14px',
          marginBottom: '20px',
          maxHeight: '160px',
          overflowY: 'auto',
          padding: '4px 0',
        }}
      >
        {resultsByFirstName.map((r) => {
          const id = String(r.assessmentId);
          const on = selectedIds.has(id);
          return (
            <label
              key={id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '10px',
                border: `1px solid ${on ? `${C.purple}40` : C.border}`,
                background: on ? `${C.purple}10` : 'rgba(26,22,37,.03)',
                fontSize: '12px',
                color: C.text,
              }}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggleId(id)}
                style={{ accentColor: C.purple, width: '15px', height: '15px', cursor: 'pointer' }}
              />
              <span style={{ whiteSpace: 'nowrap' }}>{r.name.split(' ')[0]}</span>
              <TypeBadge type={r.topType} />
            </label>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p style={{ color: C.muted, fontStyle: 'italic', fontSize: '14px', padding: '24px 0' }}>
          Ninguém selecionado. Marque uma ou mais pessoas acima para ver o comparativo lado a lado.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th
                  onClick={() => toggleSort('name')}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    color: C.muted,
                    fontWeight: 'normal',
                    fontFamily: 'monospace',
                    borderBottom: `1px solid ${C.border}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    Pessoa
                    <span style={{ color: C.faint, fontSize: '11px' }}>{sortMark('name')}</span>
                  </span>
                </th>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => (
                  <th
                    key={t}
                    onClick={() => toggleSort(t)}
                    style={{
                      padding: '8px 6px',
                      color: TYPE_DATA[t].color,
                      fontWeight: 'normal',
                      fontFamily: 'monospace',
                      borderBottom: `1px solid ${C.border}`,
                      textAlign: 'center',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minWidth: '34px' }}>
                      {TYPE_DATA[t].emoji}
                      <span style={{ color: C.faint, fontSize: '11px' }}>{sortMark(t)}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleSorted.map((r, i) => {
                const maxS = Math.max(...Object.values(r.scores).map(Number));
                return (
                  <tr key={String(r.assessmentId) || i} style={{ borderBottom: '1px solid rgba(26,22,37,.07)' }}>
                    <td style={{ padding: '10px 12px', color: C.text, whiteSpace: 'nowrap' }}>
                      {r.name.split(' ')[0]} <TypeBadge type={r.topType} />
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => {
                      const s = parseInt(r.scores[t] || 0);
                      const pct = Math.round((s / maxS) * 100);
                      const isTop = r.topType === t;
                      return (
                        <td key={t} style={{ padding: '6px', textAlign: 'center' }}>
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              background: isTop
                                ? TYPE_DATA[t].color
                                : `${TYPE_DATA[t].color}${Math.max(20, Math.round(pct * 1.5))
                                    .toString(16)
                                    .padStart(2, '0')}`,
                              margin: '0 auto',
                              border: isTop ? `2px solid ${TYPE_DATA[t].color}` : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              color: isTop ? '#fff' : 'rgba(26,22,37,.72)',
                              fontFamily: 'monospace',
                            }}
                          >
                            {s}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: '11px', color: C.faint, marginTop: '16px', fontStyle: 'italic' }}>
        Círculo com borda = tipo dominante. Intensidade da cor = pontuação relativa.
      </p>
    </div>
  );
}
