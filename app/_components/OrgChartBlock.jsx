'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { flattenOrgChart, orgChartLayout, orgDescendantIds, ORG_CARD_WIDTH, ORG_CARD_HEIGHT, filterOrgPeople } from '../../lib/people/org-chart-layout';
import { S } from '../dashboard/dashboard-shared';
import { AppLoading } from './AppLoading';
import { EmptyState } from './EmptyState';
import { CollapsibleBlock } from './CollapsibleBlock';
import { InlineCallout } from './InlineCallout';
import { useAppFeedback } from './AppFeedback';
import { SelectField } from './SelectField';

export function OrgChartBlock({ locale = 'pt-BR', companyId, navigateDashboard = null }) {
  const { toast, confirm } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [manager, setManager] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [collapsed, setCollapsed] = useState(new Set());
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState('');
  const viewport = useRef(null);
  const requestVersion = useRef(0);
  const msg = (key, values) => t(locale, `panel.orgChart.${key}`, values);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/org-chart?companyId=${encodeURIComponent(companyId)}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || t(locale, 'panel.orgChart.loadError'));
      if (version === requestVersion.current) setData(json);
    } catch (e) {
      if (version === requestVersion.current) { setError(e.message); setData(null); }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [companyId, locale]);
  useEffect(() => {
    setSelectedId(null); setCollapsed(new Set());
    if (companyId) void load(); else setLoading(false);
    return () => { requestVersion.current += 1; };
  }, [companyId, load]);

  const people = useMemo(() => flattenOrgChart(data?.roots || []), [data]);
  const layout = useMemo(() => orgChartLayout(data?.roots || [], collapsed), [data, collapsed]);
  const selected = people.find((person) => person.id === selectedId);
  const excluded = useMemo(() => orgDescendantIds(selected), [selected]);
  const choices = people.filter((person) => !excluded.has(person.id));
  const currentManager = people.find((person) => person.id === selected?.managerCandidateId);
  const dirty = selected && manager !== String(selected.managerCandidateId ?? '');

  const matches = useMemo(() => filterOrgPeople(people, search), [people, search]);

  async function select(person) {
    if (saving) return false;
    if (person.id === selectedId) return true;
    if (dirty && person.id !== selectedId && !await confirm({
      title: msg('discardTitle'), message: msg('discardMessage'),
      confirmLabel: msg('discardConfirm'), cancelLabel: msg('keepEditing'),
    })) return false;
    setSelectedId(person.id); setManager(String(person.managerCandidateId ?? '')); setSaveError('');
    return true;
  }
  async function reveal(person) {
    if (!await select(person)) return;
    setCollapsed((previous) => {
      const next = new Set(previous);
      let current = person;
      const seen = new Set();
      while (current && !seen.has(current.id)) {
        seen.add(current.id); next.delete(current.id);
        current = people.find((item) => item.id === current.managerCandidateId);
      }
      return next;
    });
  }
  useEffect(() => {
    const canvas = viewport.current;
    const card = canvas?.querySelector(`[data-person-id="${selectedId}"]`);
    if (!card) return;
    const bounds = card.getBoundingClientRect();
    const visible = canvas.getBoundingClientRect();
    // Scroll only the canvas; selecting a person must not jump the dashboard.
    if (bounds.left < visible.left || bounds.right > visible.right) {
      canvas.scrollLeft += bounds.left - visible.left - (canvas.clientWidth - bounds.width) / 2;
    }
    if (bounds.top < visible.top || bounds.bottom > visible.bottom) {
      canvas.scrollTop += bounds.top - visible.top - (canvas.clientHeight - bounds.height) / 2;
    }
  }, [selectedId, collapsed]);

  async function save(event) {
    event.preventDefault();
    if (!selected || !dirty || saving) return;
    setSaving(true); setSaveError('');
    try {
      const response = await fetch('/api/admin/org-chart', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: Number(companyId), candidateId: selected.id, managerCandidateId: manager ? Number(manager) : null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || msg('managerError'));
      setCollapsed(new Set());
      await load();
      toast(msg('managerSaved'), 'ok');
    } catch (e) { setSaveError(e.message); }
    finally { setSaving(false); }
  }

  if (!companyId) return null;
  return <CollapsibleBlock locale={locale} title={msg('title')} count={data?.total || null} defaultOpen variant="card" collapsedHint={msg('hint')}>
    {loading ? <AppLoading locale={locale} variant="panel" /> : error ? <InlineCallout tone="danger" role="alert">{error}<button type="button" className={S.btnGhost} onClick={load}>{t(locale, 'panel.common.retry')}</button></InlineCallout> : !people.length ? <EmptyState title={msg('empty')} description={msg('emptyHint')} /> : <>
      <p className={cn(S.muted, 'mb-3')}>{msg('hint')}</p>
      {data.capped ? <InlineCallout tone="info">{msg('capped')}</InlineCallout> : null}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1 font-ui text-sm sm:max-w-sm">
          {msg('findPerson')}
          <input type="search" className={S.input} value={search} disabled={saving} onChange={(event) => setSearch(event.target.value)} placeholder={msg('searchPlaceholder')} />
        </label>
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label={msg('viewControls')}>
          <button type="button" className={S.btnGhost} aria-label={msg('zoomOut')} disabled={zoom <= .1} onClick={() => setZoom((value) => Math.max(.1, Number((value - .2).toFixed(2))))}>−</button>
          <span className="w-12 text-center font-ui text-xs tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" className={S.btnGhost} aria-label={msg('zoomIn')} disabled={zoom >= 1.6} onClick={() => setZoom((value) => Math.min(1.6, Number((value + .2).toFixed(2))))}>+</button>
          <button type="button" className={S.btnGhost} onClick={() => { setZoom(Math.min(1, (viewport.current?.clientWidth || layout.width) / layout.width)); viewport.current?.scrollTo({ top: 0, left: 0 }); }}>{msg('fit')}</button>
          <button type="button" className={S.btnGhost} onClick={() => setCollapsed(new Set())}>{msg('expandAll')}</button>
          <button type="button" className={S.btnGhost} onClick={() => setCollapsed(new Set(people.filter((person) => person.children?.length).map((person) => person.id)))}>{msg('collapseAll')}</button>
        </div>
      </div>
      {search.trim() ? <div className="mb-3 flex max-h-40 flex-wrap gap-2 overflow-auto" aria-label={msg('searchResults')}>
        {matches.map((person) => <button key={person.id} type="button" disabled={saving} className={S.btnGhost} onClick={() => reveal(person)}>{person.name}</button>)}
        {!matches.length ? <p className={S.muted}>{msg('noResults')}</p> : null}
      </div> : null}
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div ref={viewport} role="region" tabIndex={0} aria-label={msg('canvas')} className="relative max-h-[640px] min-h-72 min-w-0 overflow-auto overscroll-contain rounded-card border border-ink/15 bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500" style={{ backgroundImage: 'radial-gradient(var(--color-ink-faint, #b4acbf) 0.6px, transparent 0.6px)', backgroundSize: '20px 20px' }}>
          <div style={{ width: layout.width * zoom, height: layout.height * zoom }}>
            <div className="relative origin-top-left" style={{ width: layout.width, height: layout.height, transform: `scale(${zoom})` }}>
              <svg className="pointer-events-none absolute inset-0 text-brand-500/50" width={layout.width} height={layout.height} aria-hidden="true">
                {layout.edges.map(({ from, to }) => {
                  const x1 = from.x + ORG_CARD_WIDTH / 2, y1 = from.y + ORG_CARD_HEIGHT, x2 = to.x + ORG_CARD_WIDTH / 2, y2 = to.y;
                  return <path key={to.id} d={`M ${x1} ${y1} V ${(y1 + y2) / 2} H ${x2} V ${y2}`} fill="none" stroke="currentColor" strokeWidth="2" />;
                })}
              </svg>
              {layout.nodes.map((person) => <article key={person.id} data-person-id={person.id} className={cn('absolute flex flex-col overflow-hidden rounded-card border bg-surface shadow-sm', selectedId === person.id ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-ink/15')} style={{ left: person.x, top: person.y, width: ORG_CARD_WIDTH, height: ORG_CARD_HEIGHT }}>
                <button type="button" disabled={saving} aria-pressed={selectedId === person.id} aria-label={msg('selectPerson', { name: person.name })} className="flex min-h-0 flex-1 flex-col gap-2 border-0 bg-transparent px-4 py-3 text-left hover:bg-brand-500/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500" onClick={() => select(person)}>
                  <span className="flex w-full items-center justify-between gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 font-ui text-xs font-semibold text-brand-700" aria-hidden="true">{person.name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('')}</span><span className="font-ui text-xs text-ink-muted">{msg('level', { n: person.depth + 1 })}</span></span>
                  <span className="line-clamp-2 font-ui text-sm font-semibold leading-snug text-ink" title={person.name}>{person.name}</span>
                  <span className="w-full truncate font-ui text-xs text-ink-muted" title={person.jobRoleName || ''}>{person.jobRoleName || msg('noRole')}</span>
                  <span className="w-full truncate font-ui text-xs text-ink-faint">{person.orgUnitName || t(locale, 'panel.orgUnits.none')}</span>
                </button>
                {person.children?.length ? <button type="button" className="min-h-9 border-0 border-t border-solid border-ink/10 bg-brand-500/[0.04] px-3 font-ui text-xs text-brand-700" aria-expanded={!collapsed.has(person.id)} aria-label={msg(collapsed.has(person.id) ? 'expandPerson' : 'collapsePerson', { name: person.name })} onClick={() => setCollapsed((previous) => { const next = new Set(previous); if (next.has(person.id)) next.delete(person.id); else next.add(person.id); return next; })}>{msg('reportsCount', { n: person.children.length })} {collapsed.has(person.id) ? '+' : '−'}</button> : null}
              </article>)}
            </div>
          </div>
        </div>
        <aside className="min-w-0 rounded-card border border-ink/10 bg-surface p-4" aria-label={msg('editHierarchy')}>
          {!selected ? <><h3 className={S.cardTitle}>{msg('editHierarchy')}</h3><p className={S.muted}>{msg('selectHint')}</p></> : <form onSubmit={save}>
            <h3 className={cn(S.cardTitle, 'break-words')}>{selected.name}</h3>
            <p className={S.muted}>{msg('level', { n: selected.depth + 1 })}{currentManager ? ` · ${msg('managerHintNamed', { name: currentManager.name })}` : ` · ${(selected.managerCandidateId ? msg('outsideView') : msg('managerHintEmpty'))}`}</p>
            <label className="flex flex-col gap-2 font-ui text-sm">{msg('managerTitle')}<SelectField aria-label={msg('managerTitle')} value={manager} disabled={saving} onChange={(event) => { setManager(event.target.value); setSaveError(''); }}>
              <option value="">{msg('rootOption')}</option>
              {selected.managerCandidateId && !people.some((person) => person.id === selected.managerCandidateId) ? <option value={selected.managerCandidateId} disabled>{msg('outsideView')}</option> : null}
              {choices.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </SelectField></label>
            <p className={cn(S.faint, 'mt-3')}>{msg('moveHint')}</p>
            {saveError ? <InlineCallout tone="danger" role="alert">{saveError}</InlineCallout> : null}
            <div className="mt-4 flex flex-wrap gap-2"><button type="submit" className={S.btnPrimary} disabled={saving || !dirty}>{t(locale, saving ? 'panel.orgUnits.saving' : 'panel.common.save')}</button><button type="button" className={S.btnGhost} disabled={saving || !dirty} onClick={() => { setManager(String(selected.managerCandidateId ?? '')); setSaveError(''); }}>{t(locale, 'panel.common.cancel')}</button></div>
            {navigateDashboard ? <button type="button" className={cn(S.btnGhost, 'mt-3')} disabled={saving} onClick={async () => { if (!dirty || await confirm({ title: msg('discardTitle'), message: msg('discardMessage'), confirmLabel: msg('discardConfirm'), cancelLabel: msg('keepEditing') })) navigateDashboard({ tab: 'team', candidate: String(selected.id), roster: 'internal' }); }}>{msg('viewProfile')}</button> : null}
          </form>}
        </aside>
      </div>
      <p className={cn(S.faint, 'mb-0 mt-3')} role="status">{msg('meta', { total: data.total, linked: data.withManager })}</p>
    </>}
  </CollapsibleBlock>;
}
