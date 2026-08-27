'use client';

import { useEffect, useMemo, useState } from 'react';
import { TYPE_DATA } from '../../../lib/data';
import { t } from '../../../lib/i18n';
import { personListName, personSortKey } from '../../../lib/person-name';
import { typeHintTooltip, typeShortLabel } from '../../../lib/type-en';
import { C } from '../../../lib/theme';
import { cn } from '../../../lib/cn';
import { S, TypeBadge } from '../dashboard-shared';
import { EmptyState } from '../../_components/EmptyState';

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
    <div className="mb-[18px] flex flex-wrap gap-2 rounded-xl border border-brand-500/20 bg-brand-500/[0.06] px-3.5 py-3">
      <span className="mr-1 self-center font-mono text-[10px] uppercase tracking-wider text-brand-500">
        {t(locale, 'panel.compare.insightLabel')}
      </span>
      {chips.map((text) => (
        <span
          key={text}
          className="rounded-lg border border-ink/12 bg-surface/55 px-2.5 py-1 text-xs leading-snug text-ink-muted"
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

  const miniBtnBase =
    'cursor-pointer rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide';

  return (
    <div className="flex flex-col gap-3.5">
      <div className={cn(S.card, 'px-7 py-[22px]')}>
        <span className={S.label}>{t(locale, 'panel.compare.title')}</span>
        <h2 className="mt-2 mb-0 font-ui text-[22px] font-semibold font-normal leading-tight text-ink">
          {t(locale, 'panel.compare.headline')}
        </h2>
        <p className="mt-2.5 mb-0 max-w-[62ch] text-sm leading-relaxed text-ink-muted">
          {t(locale, 'panel.compare.intro')}
        </p>
        <p className="mt-2 mb-0 max-w-[62ch] text-xs leading-snug text-ink-faint">
          {t(locale, 'panel.compare.whyTeam')}
        </p>
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-xl border border-ink/12 bg-ink/[0.03] px-3.5 py-3"
            >
              <div className="mb-1.5 font-mono text-[10px] tracking-wide text-brand-500">
                {t(locale, 'panel.compare.useStep', { n })}
              </div>
              <div className="text-[13px] leading-snug text-ink-muted">
                {t(locale, `panel.compare.use${n}`)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={S.card}>
        <div className="mb-3.5 flex flex-wrap items-center gap-2.5 border-b border-ink/12 pb-3.5">
          <span className="font-mono text-xs text-ink-muted">
            {t(locale, 'panel.compare.inTable', { selected: nSel, total: nTot })}
          </span>
          <input
            id="compare-search"
            name="compareSearch"
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitSearch();
            }}
            onBlur={commitSearch}
            placeholder={t(locale, 'panel.compare.searchPh')}
            aria-label={t(locale, 'panel.compare.searchPh')}
            className="min-w-[140px] max-w-[260px] flex-[1_1_160px] rounded-control border border-ink/12 bg-ink/[0.04] px-3 py-2 text-[13px] text-ink"
          />
          {(search || '').trim() ? (
            <span className="font-mono text-[11px] text-ink-faint">
              {t(locale, 'panel.compare.searchResultsTotal', { n: listTotal })}
            </span>
          ) : null}
          <button
            type="button"
            onClick={selectAll}
            disabled={nTot === 0 || (nTot > 0 && nSel === nTot)}
            className={cn(
              miniBtnBase,
              allSelected
                ? 'border border-ink/12 bg-ink/[0.04] text-ink-faint'
                : 'border border-brand-500/40 bg-brand-500/[0.09] text-brand-500',
              nTot === 0 && 'opacity-50'
            )}
          >
            {t(locale, 'panel.compare.selectAll')}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={nSel === 0}
            className={cn(
              miniBtnBase,
              'border border-ink/12 bg-transparent text-ink-muted',
              nSel === 0 && 'opacity-50'
            )}
          >
            {t(locale, 'panel.compare.clearSelection')}
          </button>
        </div>

        <div className="mb-[18px] grid max-h-[200px] grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 overflow-y-auto py-0.5">
          {resultsByName.length === 0 ? (
            <span className="col-span-full text-[13px] italic text-ink-faint">
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
                  className={cn(
                    'flex min-w-0 cursor-pointer items-center gap-2 rounded-control border px-2.5 py-2 text-[13px] text-ink',
                    on
                      ? 'border-brand-500/25 bg-brand-500/[0.06]'
                      : 'border-ink/12 bg-ink/[0.03]'
                  )}
                >
                  <input
                    id={`compare-candidate-${id}`}
                    name="compareCandidateIds"
                    type="checkbox"
                    value={id}
                    checked={on}
                    onChange={() => toggleId(id)}
                    className="h-[15px] w-[15px] shrink-0 cursor-pointer accent-brand-500"
                  />
                  <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap leading-snug">
                    {displayName}
                  </span>
                  <TypeBadge type={r.topType} locale={locale} compact />
                </label>
              );
            })
          )}
        </div>

        <InsightStrip locale={locale} visible={visibleSorted} />

        {visible.length === 0 ? (
          <EmptyState message={t(locale, 'panel.compare.noneSelected')} />
        ) : (
          <div className="overflow-x-auto db-table-scroll">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th
                    onClick={() => toggleSort('name')}
                    className="sticky left-0 z-[1] cursor-pointer select-none border-b border-ink/12 bg-surface px-3 py-2.5 text-left font-normal font-mono text-ink-muted"
                  >
                    <span className="inline-flex items-center gap-2">
                      {t(locale, 'panel.compare.personCol')}
                      <span className="text-[11px] text-ink-faint">{sortMark('name')}</span>
                    </span>
                  </th>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((typeNum) => (
                    <th
                      key={typeNum}
                      onClick={() => toggleSort(typeNum)}
                      title={typeHintTooltip(typeNum, locale)}
                      className="min-w-[52px] cursor-pointer select-none border-b border-ink/12 px-1 py-2 text-center font-normal"
                      style={{ color: TYPE_DATA[typeNum].color }}
                    >
                      <span className="flex flex-col items-center gap-0.5">
                        <span className="text-sm">{TYPE_DATA[typeNum].emoji}</span>
                        <span className="font-mono text-[11px] tracking-wide">
                          T{typeNum}
                        </span>
                        <span className="min-h-3 text-[10px] text-ink-faint">{sortMark(typeNum)}</span>
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
                    <tr key={String(r.assessmentId) || i} className="border-b border-ink/[0.07]">
                      <td className="sticky left-0 z-[1] min-w-[180px] max-w-[280px] bg-surface px-3 py-2.5 text-ink">
                        <span title={r.name} className="inline-flex w-full min-w-0 items-center gap-2">
                          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                            {personListName(r.name)}
                          </span>
                          <TypeBadge type={r.topType} locale={locale} compact />
                        </span>
                      </td>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((typeNum) => {
                        const s = Math.round(scoreOf(r, typeNum));
                        const pct = Math.round((s / maxS) * 100);
                        const isTop = r.topType === typeNum;
                        return (
                          <td key={typeNum} className="p-1.5 text-center">
                            <div
                              title={typeHintTooltip(typeNum, locale) + ` · ${s}`}
                              className="mx-auto flex h-8 w-8 items-center justify-center rounded-full font-mono text-[10px]"
                              style={{
                                background: isTop
                                  ? TYPE_DATA[typeNum].color
                                  : `${TYPE_DATA[typeNum].color}${Math.max(20, Math.round(pct * 1.5))
                                      .toString(16)
                                      .padStart(2, '0')}`,
                                border: isTop ? `2px solid ${TYPE_DATA[typeNum].color}` : `1px solid ${C.border}`,
                                boxShadow: isTop ? `0 0 0 2px ${TYPE_DATA[typeNum].color}33` : 'none',
                                color: isTop ? '#fff' : 'rgba(26,22,37,.72)',
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
        <div className="mt-4 flex flex-wrap items-center gap-3.5 text-[11px] text-ink-faint">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-brand-500 bg-brand-500 ring-2 ring-brand-500/20" />
            {t(locale, 'panel.compare.legendDominant')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-full border border-ink/12 bg-brand-500/25" />
            {t(locale, 'panel.compare.legendRelative')}
          </span>
          <span className="italic">{t(locale, 'panel.compare.footerHint')}</span>
        </div>
      </div>
    </div>
  );
}
