'use client';

import { useEffect, useMemo, useState } from 'react';
import { TYPE_DATA } from '../../../lib/data';
import { t } from '../../../lib/i18n';
import { personListName, personSortKey } from '../../../lib/person-name';
import { typeShortLabel } from '../../../lib/type-en';
import { C } from '../../../lib/theme';
import { S, TypeBadge } from '../dashboard-shared';

function scoreOf(row, typeNum) {
  const v = row?.scores?.[typeNum] ?? row?.scores?.[String(typeNum)] ?? 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function InsightStrip({ locale, visible }) {
  const insight = useMemo(() => {
    if (!visible.length) return null;
    const byType = {};
    for (const r of visible) {
      const tt = r.topType;
      if (!tt) continue;
      byType[tt] = (byType[tt] || 0) + 1;
    }
    const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    const dominantCluster = typeEntries[0];
    const uniqueTypes = typeEntries.length;

    let maxSpread = null;
    for (const r of visible) {
      const scores = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => scoreOf(r, n));
      const hi = Math.max(...scores);
      const lo = Math.min(...scores.filter((s) => s > 0).concat([hi]));
      const spread = hi - lo;
      if (!maxSpread || spread > maxSpread.spread) {
        maxSpread = { name: personListName(r.name), spread, topType: r.topType };
      }
    }

    return { uniqueTypes, dominantCluster, maxSpread, n: visible.length };
  }, [visible]);

  if (!insight) return null;

  const [domType, domCount] = insight.dominantCluster || [];
  const chips = [];
  if (domType && domCount >= 2) {
    chips.push(
      t(locale, 'panel.compare.insightCluster', {
        count: domCount,
        type: `T${domType} · ${typeShortLabel(Number(domType), locale)}`,
      }),
    );
  }
  chips.push(
    t(locale, 'panel.compare.insightDiversity', {
      n: insight.uniqueTypes,
      total: insight.n,
    }),
  );
  if (insight.maxSpread) {
    chips.push(
      t(locale, 'panel.compare.insightSpread', {
        name: insight.maxSpread.name,
        type: `T${insight.maxSpread.topType}`,
      }),
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '18px',
        padding: '12px 14px',
        borderRadius: '12px',
        background: 'rgba(124,58,237,.06)',
        border: `1px solid ${C.purple}28`,
      }}
    >
      <span
        style={{
          fontSize: '10px',
          fontFamily: 'monospace',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: C.purple,
          alignSelf: 'center',
          marginRight: '4px',
        }}
      >
        {t(locale, 'panel.compare.insightLabel')}
      </span>
      {chips.map((text) => (
        <span
          key={text}
          style={{
            fontSize: '12px',
            color: C.muted,
            lineHeight: 1.45,
            padding: '4px 10px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,.55)',
            border: `1px solid ${C.border}`,
          }}
        >
          {text}
        </span>
      ))}
    </div>
  );
}

export function CompareTab({ results, locale = 'pt-BR', search = '', onSearch, listTotal = 0 }) {
  const allIds = useMemo(() => results.map((r) => String(r.assessmentId)), [results]);
  const [selectedIds, setSelectedIds] = useState(() => new Set(allIds));
  const [sortBy, setSortBy] = useState(() => ({ key: 'name', dir: 'asc' }));
  const [searchDraft, setSearchDraft] = useState(search || '');

  useEffect(() => {
    setSelectedIds((prev) => {
      const idSet = new Set(allIds);
      const next = new Set([...prev].filter((id) => idSet.has(id)));
      if (next.size === 0 && allIds.length > 0) allIds.forEach((id) => next.add(id));
      return next;
    });
  }, [allIds]);

  useEffect(() => {
    setSearchDraft(search || '');
  }, [search]);

  const commitSearch = () => {
    const trimmed = searchDraft.trim();
    if (trimmed === (search || '').trim()) return;
    if (typeof onSearch === 'function') onSearch(trimmed || null);
  };

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
  const resultsByName = useMemo(() => {
    return [...results].sort((a, b) => {
      const an = personSortKey(a?.name);
      const bn = personSortKey(b?.name);
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
  }, [results]);

  const visibleSorted = useMemo(() => {
    const dirMul = sortBy.dir === 'asc' ? 1 : -1;
    const getName = (row) => personSortKey(row?.name);
    return [...visible].sort((a, b) => {
      if (sortBy.key === 'name') {
        const an = getName(a);
        const bn = getName(b);
        if (an < bn) return -1 * dirMul;
        if (an > bn) return 1 * dirMul;
        return 0;
      }
      const typeKey = sortBy.key;
      const av = scoreOf(a, typeKey);
      const bv = scoreOf(b, typeKey);
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
      return { key, dir: key === 'name' ? 'asc' : 'desc' };
    });
  };
  const sortMark = (key) => (sortBy.key === key ? (sortBy.dir === 'asc' ? '▲' : '▼') : '');
  const nSel = selectedIds.size;
  const nTot = results.length;
  const allSelected = nTot > 0 && nSel === nTot;

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ ...S.card, padding: '22px 28px' }}>
        <span style={S.label}>{t(locale, 'panel.compare.title')}</span>
        <h2
          style={{
            margin: '8px 0 0',
            fontSize: '22px',
            fontWeight: 'normal',
            fontFamily: "'Georgia',serif",
            color: C.text,
            lineHeight: 1.25,
          }}
        >
          {t(locale, 'panel.compare.headline')}
        </h2>
        <p style={{ fontSize: '14px', color: C.muted, margin: '10px 0 0', lineHeight: 1.65, maxWidth: '62ch' }}>
          {t(locale, 'panel.compare.intro')}
        </p>
        <div
          style={{
            marginTop: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
          }}
        >
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(26,22,37,.03)',
                border: `1px solid ${C.border}`,
              }}
            >
              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: C.purple, letterSpacing: '1px', marginBottom: '6px' }}>
                {t(locale, 'panel.compare.useStep', { n })}
              </div>
              <div style={{ fontSize: '13px', color: C.muted, lineHeight: 1.5 }}>
                {t(locale, `panel.compare.use${n}`)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={S.card}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '14px',
            paddingBottom: '14px',
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
            {t(locale, 'panel.compare.inTable', { selected: nSel, total: nTot })}
          </span>
          <input
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitSearch();
            }}
            onBlur={commitSearch}
            placeholder={t(locale, 'panel.compare.searchPh')}
            aria-label={t(locale, 'panel.compare.searchPh')}
            style={{
              flex: '1 1 160px',
              minWidth: '140px',
              maxWidth: '260px',
              background: 'rgba(26,22,37,.04)',
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              padding: '8px 12px',
              color: C.text,
              fontSize: '13px',
              fontFamily: 'inherit',
            }}
          />
          {(search || '').trim() ? (
            <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
              {t(locale, 'panel.compare.searchResultsTotal', { n: listTotal })}
            </span>
          ) : null}          <button
            type="button"
            onClick={selectAll}
            disabled={nTot === 0 || (nTot > 0 && nSel === nTot)}
            style={{
              ...miniBtn,
              background: allSelected ? 'rgba(26,22,37,.04)' : `${C.purple}18`,
              border: `1px solid ${allSelected ? C.border : `${C.purple}55`}`,
              color: allSelected ? C.faint : C.purple,
              opacity: nTot === 0 ? 0.5 : 1,
            }}
          >
            {t(locale, 'panel.compare.selectAll')}
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
            {t(locale, 'panel.compare.clearSelection')}
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 10px',
            marginBottom: '18px',
            maxHeight: '148px',
            overflowY: 'auto',
            padding: '2px 0',
          }}
        >
          {resultsByName.length === 0 ? (
            <span style={{ fontSize: '13px', color: C.faint, fontStyle: 'italic' }}>
              {(search || '').trim()
                ? t(locale, 'panel.compare.searchEmpty')
                : t(locale, 'panel.compare.noneSelected')}
            </span>
          ) : (
            resultsByName.map((r) => {
              const id = String(r.assessmentId);
              const on = selectedIds.has(id);
              const displayName = personListName(r.name);
              return (
                <label
                  key={id}
                  title={r.name}
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
                    maxWidth: '220px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleId(id)}
                    style={{ accentColor: C.purple, width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                    {displayName}
                  </span>
                  <TypeBadge type={r.topType} locale={locale} />
                </label>
              );
            })
          )}
        </div>

        <InsightStrip locale={locale} visible={visibleSorted} />

        {visible.length === 0 ? (
          <div
            style={{
              padding: '28px 20px',
              textAlign: 'center',
              borderRadius: '12px',
              background: 'rgba(26,22,37,.03)',
              border: `1px dashed ${C.border}`,
            }}
          >
            <p style={{ color: C.muted, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              {t(locale, 'panel.compare.noneSelected')}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th
                    onClick={() => toggleSort('name')}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      color: C.muted,
                      fontWeight: 'normal',
                      fontFamily: 'monospace',
                      borderBottom: `1px solid ${C.border}`,
                      cursor: 'pointer',
                      userSelect: 'none',
                      position: 'sticky',
                      left: 0,
                      background: C.card,
                      zIndex: 1,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      {t(locale, 'panel.compare.personCol')}
                      <span style={{ color: C.faint, fontSize: '11px' }}>{sortMark('name')}</span>
                    </span>
                  </th>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((typeNum) => (
                    <th
                      key={typeNum}
                      onClick={() => toggleSort(typeNum)}
                      title={TYPE_DATA[typeNum]?.name}
                      style={{
                        padding: '8px 4px',
                        color: TYPE_DATA[typeNum].color,
                        fontWeight: 'normal',
                        borderBottom: `1px solid ${C.border}`,
                        textAlign: 'center',
                        cursor: 'pointer',
                        userSelect: 'none',
                        minWidth: '52px',
                      }}
                    >
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span style={{ fontSize: '14px' }}>{TYPE_DATA[typeNum].emoji}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.5px' }}>
                          T{typeNum}
                        </span>
                        <span style={{ fontSize: '9px', color: C.faint, maxWidth: '56px', lineHeight: 1.2 }}>
                          {typeShortLabel(typeNum, locale)}
                        </span>
                        <span style={{ color: C.faint, fontSize: '10px', minHeight: '12px' }}>{sortMark(typeNum)}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleSorted.map((r, i) => {
                  const scores = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => scoreOf(r, n));
                  const maxS = Math.max(...scores, 1);
                  return (
                    <tr key={String(r.assessmentId) || i} style={{ borderBottom: '1px solid rgba(26,22,37,.07)' }}>
                      <td
                        style={{
                          padding: '10px 12px',
                          color: C.text,
                          maxWidth: '200px',
                          position: 'sticky',
                          left: 0,
                          background: C.card,
                          zIndex: 1,
                        }}
                      >
                        <span title={r.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {personListName(r.name)}
                          </span>
                          <TypeBadge type={r.topType} locale={locale} />
                        </span>
                      </td>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((typeNum) => {
                        const s = Math.round(scoreOf(r, typeNum));
                        const pct = Math.round((s / maxS) * 100);
                        const isTop = r.topType === typeNum;
                        return (
                          <td key={typeNum} style={{ padding: '6px', textAlign: 'center' }}>
                            <div
                              title={`T${typeNum}: ${s}`}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: isTop
                                  ? TYPE_DATA[typeNum].color
                                  : `${TYPE_DATA[typeNum].color}${Math.max(20, Math.round(pct * 1.5))
                                      .toString(16)
                                      .padStart(2, '0')}`,
                                margin: '0 auto',
                                border: isTop ? `2px solid ${TYPE_DATA[typeNum].color}` : `1px solid ${C.border}`,
                                boxShadow: isTop ? `0 0 0 2px ${TYPE_DATA[typeNum].color}33` : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                color: isTop ? '#fff' : 'rgba(26,22,37,.72)',
                                fontFamily: 'monospace',
                                fontWeight: isTop ? 600 : 400,
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
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px',
            alignItems: 'center',
            fontSize: '11px',
            color: C.faint,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: C.purple,
                border: `2px solid ${C.purple}`,
                boxShadow: `0 0 0 2px ${C.purple}33`,
              }}
            />
            {t(locale, 'panel.compare.legendDominant')}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: `${C.purple}40`,
                border: `1px solid ${C.border}`,
              }}
            />
            {t(locale, 'panel.compare.legendRelative')}
          </span>
          <span style={{ fontStyle: 'italic' }}>{t(locale, 'panel.compare.footerHint')}</span>
        </div>
      </div>
    </div>
  );
}
