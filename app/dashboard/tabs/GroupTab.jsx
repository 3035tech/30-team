'use client';

import { useState } from 'react';
import { getCompat } from '../../../lib/data';
import { t } from '../../../lib/i18n';
import { C } from '../../../lib/theme';
import { cn } from '../../../lib/cn';
import { CompatBadge, S, TypeBadge } from '../dashboard-shared';

export function GroupTab({
  results,
  groupBase,
  setGroupBaseId,
  groupIds,
  setGroupIds,
  dismissedIds,
  setDismissedIds,
  suggestions,
  groupTensions,
  locale = 'pt-BR',
}) {
  const [search, setSearch] = useState('');
  const [baseSearch, setBaseSearch] = useState('');
  const [showAllBase, setShowAllBase] = useState(false);

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

  /** Mesmo padrão visual dos cards de sugestão: emoji só no TypeBadge; nome ao lado; × no canto se onRemove. */
  const PersonMini = ({ person, right, baseCompat = null, onRemove = null }) => {
    const showX = typeof onRemove === 'function';
    return (
      <div
        className={cn(
          'flex flex-col gap-2 rounded-xl border border-ink/12 bg-ink/[0.03] px-3.5 py-3',
          showX ? 'relative pr-11' : null
        )}
      >
        {showX && (
          <button
            type="button"
            onClick={onRemove}
            title={t(locale, 'panel.group.removeFromGroup')}
            aria-label={t(locale, 'panel.group.removeFromGroup')}
            className="absolute right-2.5 top-2.5 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-control border border-ink/12 bg-ink/[0.06] font-mono text-base leading-none text-ink-muted"
          >
            ×
          </button>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <TypeBadge type={person.topType} locale={locale} compact />
            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-ink">
              {person.name}
            </span>
            {baseCompat && (
              <>
                <CompatBadge level={baseCompat.level} locale={locale}/>
                {baseCompat.level === 'tension' && (
                  <span className="rounded-full border border-danger/30 bg-danger/[0.09] px-2 py-0.5 font-mono text-[10px] text-danger">
                    {t(locale, 'panel.group.tensionWithBase')}
                  </span>
                )}
              </>
            )}
          </div>
          {!showX && <div className="shrink-0">{right}</div>}
        </div>
        {(person.areaLabel || (person.areaFitScore010 !== null && person.areaFitScore010 !== undefined)) ? (
          <div className="flex flex-wrap items-center gap-2">
            {person.areaLabel && (
              <span className="rounded-full border border-ink/12 bg-ink/[0.04] px-2 py-0.5 font-mono text-[10px] text-ink-muted">
                {person.areaLabel}
              </span>
            )}
            {person.areaFitScore010 !== null && person.areaFitScore010 !== undefined && (
              <span className="rounded-full border border-success/25 bg-success/[0.08] px-2 py-0.5 font-mono text-[10px] text-success">
                {person.areaFitScore010}/10
              </span>
            )}
          </div>
        ) : null}
        {baseCompat ? (
          <div className="text-xs leading-snug text-ink-muted">
            {baseCompat.title ? (
              <span className="mb-1 block font-mono text-[11px] text-ink-faint">
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
    <div className="grid grid-cols-2 gap-4">
      <div className={S.card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={cn(S.label, 'mb-0')}>{t(locale, 'panel.group.title')}</span>
          <button
            type="button"
            onClick={clearGroup}
            className="cursor-pointer rounded-control border border-ink/12 bg-ink/[0.07] px-3 py-2 font-mono text-[11px] text-ink-muted"
          >
            {t(locale, 'panel.group.clear')}
          </button>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-ink-faint">
          {t(locale, 'panel.group.intro')}
        </p>
        <p className="mt-1.5 text-xs leading-snug text-ink-faint">
          {t(locale, 'panel.group.whyTeam')}
        </p>

        <span className={cn(S.label, 'mt-[18px]')}>{t(locale, 'panel.group.basePerson')}</span>
        {groupBase ? (
          <PersonMini
            person={groupBase}
            right={
              <button
                type="button"
                onClick={()=>setGroupBaseId(null)}
                className="cursor-pointer rounded-control border border-ink/12 bg-transparent px-2.5 py-2 font-mono text-[11px] text-ink-muted"
              >
                {t(locale, 'panel.group.swap')}
              </button>
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            <input
              value={baseSearch}
              onChange={(e)=>{ setBaseSearch(e.target.value); setShowAllBase(false); }}
              placeholder={t(locale, 'panel.group.searchBasePh')}
              className="rounded-control border border-ink/12 bg-ink/[0.07] px-3 py-2.5 font-mono text-xs text-ink"
            />
            {results
              .filter(r=>!baseSearch.trim() || r.name.toLowerCase().includes(baseSearch.trim().toLowerCase()))
              .slice(0, showAllBase ? 80 : 12)
              .map(r=>(
              <PersonMini
                key={r.assessmentId}
                person={r}
                right={
                  <button
                    type="button"
                    onClick={()=>setGroupBaseId(String(r.assessmentId))}
                    className="cursor-pointer rounded-control border border-brand-500/40 bg-brand-500/[0.13] px-2.5 py-2 font-mono text-[11px] text-brand-600"
                  >
                    {t(locale, 'panel.group.select')}
                  </button>
                }
              />
            ))}
            {results.filter(r=>!baseSearch.trim() || r.name.toLowerCase().includes(baseSearch.trim().toLowerCase())).length > (showAllBase ? 80 : 12) ? (
              <button
                type="button"
                onClick={() => setShowAllBase(true)}
                className="cursor-pointer rounded-control border border-ink/12 bg-transparent px-2.5 py-2 font-mono text-[11px] text-ink-muted"
              >
                {t(locale, 'panel.group.showMore')}
              </button>
            ) : null}
            <div className="mt-1.5 font-mono text-[11px] text-ink-faint">
              {t(locale, 'panel.group.filterHint')}
            </div>
          </div>
        )}
      </div>

      <div className={S.card}>
        <span className={S.label}>{t(locale, 'panel.group.suggestionsTitle')}</span>

        {!groupBase ? (
          <p className="text-[13px] italic text-ink-muted">
            {t(locale, 'panel.group.pickBaseFirst')}
          </p>
        ) : (
          <>
            <div className="my-2.5 mb-3.5 flex flex-wrap gap-2.5">
              <input
                value={search}
                onChange={(e)=>setSearch(e.target.value)}
                placeholder={t(locale, 'panel.group.searchAddPh')}
                className="min-w-0 flex-[1_1_240px] rounded-control border border-ink/12 bg-ink/[0.07] px-3 py-2.5 font-mono text-xs text-ink"
              />
              <select
                onChange={(e)=>{ const id=e.target.value; if(id) addToGroup(id); e.target.value=''; }}
                defaultValue=""
                className="w-full max-w-full flex-[0_0_240px] cursor-pointer rounded-control border border-ink/12 bg-ink/[0.05] px-3 py-2.5 font-mono text-xs text-ink-muted sm:w-auto"
              >
                <option value="">{t(locale, 'panel.group.addAnyone')}</option>
                {results
                  .filter(r=>String(r.assessmentId)!==String(groupBase.assessmentId))
                  .filter(r=>!groupIds.includes(String(r.assessmentId)))
                  .filter(r=>!search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase()))
                  .slice(0, 300)
                  .map(r=>{
                    const withBase = getCompat(groupBase.topType, r.topType, locale);
                    return (
                      <option key={r.assessmentId} value={String(r.assessmentId)}>
                        {r.name} (T{r.topType}) · {t(locale, `panel.compatLevel.${withBase.level}`)}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div className="mb-3.5 flex flex-wrap gap-2">
              <span className="rounded-full border border-success/30 bg-success/[0.09] px-2.5 py-0.5 font-mono text-[10px] text-success">
                {t(locale, 'panel.group.synergy')}
              </span>
              <span className="rounded-full border border-soft/30 bg-soft/[0.09] px-2.5 py-0.5 font-mono text-[10px] text-soft">
                {t(locale, 'panel.group.neutral')}
              </span>
              <span className="rounded-full border border-danger/30 bg-danger/[0.09] px-2.5 py-0.5 font-mono text-[10px] text-danger">
                {t(locale, 'panel.group.tension')}
              </span>
            </div>

            <div className="mb-4 flex flex-col gap-2.5">
              {suggestions.slice(0, 10).map(({ person, compat }) => {
                const lc = { synergy:C.synergy, tension:C.tension, neutral:C.neutral }[compat.level];
                const already = groupIds.includes(String(person.assessmentId));
                return (
                  <div
                    key={person.assessmentId}
                    className="rounded-xl border bg-ink/[0.03] px-3.5 py-3"
                    style={{ borderColor: `${lc}30` }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-[1_1_180px] flex-wrap items-center gap-2">
                        <TypeBadge type={person.topType} locale={locale} compact />
                        <span className="text-[13px] text-ink">{person.name}</span>
                        <CompatBadge level={compat.level} locale={locale}/>
                        {compat.level==='tension' && (
                          <span className="rounded-full border border-danger/30 bg-danger/[0.09] px-2 py-0.5 font-mono text-[10px] text-danger">
                            {t(locale, 'panel.group.tensionWithBase')}
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          disabled={already}
                          onClick={()=>addToGroup(person.assessmentId)}
                          className={cn(
                            'rounded-control border px-2.5 py-2 font-mono text-[11px]',
                            already ? 'cursor-not-allowed' : 'cursor-pointer'
                          )}
                          style={{
                            background: already ? 'rgba(26,22,37,.04)' : `${lc}18`,
                            borderColor: already ? C.border : `${lc}55`,
                            color: already ? C.faint : lc,
                          }}
                        >
                          {already ? t(locale, 'panel.group.inGroup') : t(locale, 'panel.group.add')}
                        </button>
                        <button
                          type="button"
                          onClick={()=>dismissSuggestion(person.assessmentId)}
                          title={t(locale, 'panel.group.removeFromList')}
                          aria-label={t(locale, 'panel.group.removeFromList')}
                          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-control border border-ink/12 bg-ink/[0.06] font-mono text-base leading-none text-ink-muted"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs leading-snug text-ink-muted">
                      {compat.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-ink/12 pt-3.5">
              <span className={cn(S.label, 'mb-2.5')}>{t(locale, 'panel.group.currentGroup')}</span>
              {groupIds.length === 0 ? (
                <p className="text-xs italic text-ink-faint">{t(locale, 'panel.group.noneInGroup')}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {groupIds.map(id => {
                    const p = results.find(r => String(r.assessmentId) === String(id));
                    if (!p) return null;
                    const baseCompat =
                      groupBase && String(p.assessmentId) !== String(groupBase.assessmentId)
                        ? getCompat(groupBase.topType, p.topType, locale)
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

              <div className="mt-3.5">
                <span className={cn(S.label, 'mb-1.5')}>{t(locale, 'panel.group.internalTensions')}</span>
                {groupTensions.length === 0 ? (
                  <p className="text-xs italic text-ink-faint">{t(locale, 'panel.group.noTensions')}</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {groupTensions.slice(0, 8).map((p, idx) => (
                      <div
                        key={idx}
                        className="rounded-control border border-danger/20 bg-danger/[0.06] px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <TypeBadge type={p.a.topType} locale={locale} compact /><span className="text-xs text-ink-muted">{p.a.name.split(' ')[0]}</span>
                          <span className="text-ink-faint">×</span>
                          <TypeBadge type={p.b.topType} locale={locale} compact /><span className="text-xs text-ink-muted">{p.b.name.split(' ')[0]}</span>
                        </div>
                        <div className="mt-1.5 text-xs leading-snug text-ink-muted">
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
