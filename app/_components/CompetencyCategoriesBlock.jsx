'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAppFeedback } from './AppFeedback';
import { AppLoading } from './AppLoading';
import { StatusToneChip } from './StatusToneChip';
import { S, AdminPageHeader, AdminCreateButton, AdminEditButton, AdminDeleteButton } from '../dashboard/dashboard-shared';
import { t as i18nT, contentLocale } from '../../lib/i18n.js';

export function CompetencyCategoriesBlock({ companyId, locale = 'pt-BR', onBack }) {
  const en = contentLocale(locale) === 'en';
  const { promptForm, confirm, toast } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(() => setVersion(n => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ companyId, q: search, includeInactive, page, pageSize: 20 });
        const response = await fetch(`/api/admin/competency-categories?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || String(response.status));
        if (controller.signal.aborted) return;
        setItems(data.items); setTotal(data.total);
        if (page > 1 && !data.items.length) setPage(p => p - 1);
      } catch (e) { if (!controller.signal.aborted) { setError(e.message); setItems([]); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [companyId, search, includeInactive, page, version]);

  async function mutate(method, values, keepFormOpen = false) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/competency-categories', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, companyId }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || (i18nT(locale, 'ui.competencyCategoriesBlock.couldNotSaveTryAgain')));
      toast(method === 'DELETE' ? (i18nT(locale, 'ui.competencyCategoriesBlock.categoryDeleted')) : (i18nT(locale, 'ui.competencyCategoriesBlock.categorySaved')), 'ok');
      reload();
    } catch (e) { if (keepFormOpen) throw e; setError(e.message); }
    finally { setBusy(false); }
  }
  async function edit(item) {
    await promptForm({ title: en ? (item ? 'Edit category' : 'New category') : (item ? 'Editar categoria' : 'Nova categoria'),
      submit: values => mutate(item ? 'PATCH' : 'POST', { ...values, ...(item ? { id: item.id } : {}) }, true),
      fields: [{ key: 'name', label: i18nT(locale, 'ui.competencyCategoriesBlock.categoryName'), required: true, maxLength: 200, defaultValue: item?.name || '' }] });
  }
  async function toggle(item) {
    if (!await confirm({ title: item.name, message: item.active
      ? (i18nT(locale, 'ui.competencyCategoriesBlock.deactivateThisCategoryExistingLinks'))
      : (i18nT(locale, 'ui.competencyCategoriesBlock.reactivateThisCategory')) })) return;
    await mutate('PATCH', { id: item.id, active: !item.active });
  }
  async function remove(item) {
    if (!await confirm({ title: i18nT(locale, 'ui.competencyCategoriesBlock.deleteCategory'), message: i18nT(locale, 'ui.competencyCategoriesBlock.deleteThisCannotBeUndone', { name: item.name }), danger: true, confirmLabel: i18nT(locale, 'ui.competencyCategoriesBlock.delete') })) return;
    await mutate('DELETE', { id: item.id });
  }
  return <section className={`${S.stack} min-w-0 w-full max-w-full`}>
    <button type="button" className={`${S.btnGhost} self-start`} onClick={onBack}>{i18nT(locale, 'ui.competencyCategoriesBlock.backToCompetencies')}</button>
    <AdminPageHeader title={i18nT(locale, 'ui.competencyCategoriesBlock.competencyCategories')} actions={<AdminCreateButton label={i18nT(locale, 'ui.competencyCategoriesBlock.newCategory')} disabled={busy} onClick={() => void edit()} />} />
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">{i18nT(locale, 'ui.competencyCategoriesBlock.searchCategories')}<input className={S.input} value={search} maxLength={100} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
      <label className="flex flex-col gap-1 text-sm">{i18nT(locale, 'ui.competencyCategoriesBlock.status')}<select className={S.select} value={includeInactive ? 'all' : 'active'} onChange={e => { setIncludeInactive(e.target.value === 'all'); setPage(1); }}><option value="all">{i18nT(locale, 'ui.competencyCategoriesBlock.all')}</option><option value="active">{i18nT(locale, 'ui.competencyCategoriesBlock.activeOnly')}</option></select></label>
    </div>
    {error ? <div role="alert" className="text-sm text-red-800 dark:text-danger">{error} <button type="button" className={S.btnGhost} onClick={reload}>{i18nT(locale, 'ui.competencyCategoriesBlock.retry')}</button></div> : null}
    {loading ? <AppLoading locale={locale} variant="panel" /> : <>
      {items.length ? <div className="min-w-0"><table style={{ minWidth: 0 }} className="block w-full text-left text-sm md:table">
        <thead className="hidden md:table-header-group"><tr className="border-b border-ink/10"><th scope="col" className="p-3">{i18nT(locale, 'ui.competencyCategoriesBlock.name')}</th><th scope="col" className="p-3">Status</th><th scope="col" className="p-3">{i18nT(locale, 'ui.competencyCategoriesBlock.competencies')}</th><th scope="col" className="p-3">{i18nT(locale, 'ui.competencyCategoriesBlock.actions')}</th></tr></thead>
        <tbody className="block md:table-row-group">{items.map(item => <tr key={item.id} className="grid grid-cols-2 border-b border-ink/10 py-3 md:table-row md:py-0">
          <th scope="row" className="col-span-2 min-w-0 break-words p-3 font-medium">{item.name}</th>
          <td className="p-3"><span className="mb-1 block text-ink-muted md:hidden">Status</span><StatusToneChip tone={item.active ? 'success' : 'neutral'}>{item.active ? (i18nT(locale, 'ui.competencyCategoriesBlock.active')) : (i18nT(locale, 'ui.competencyCategoriesBlock.inactive'))}</StatusToneChip></td>
          <td className="p-3 tabular-nums"><span className="mb-1 block text-ink-muted md:hidden">{i18nT(locale, 'ui.competencyCategoriesBlock.competencies')}</span>{item.usageCount}</td>
          <td className="col-span-2 p-3"><div className="flex flex-wrap items-center gap-2">
            <AdminEditButton label={i18nT(locale, 'ui.competencyCategoriesBlock.edit')} disabled={busy} onClick={() => void edit(item)} />
            <button type="button" className={S.btnGhost} disabled={busy} onClick={() => void toggle(item)}>{item.active ? (i18nT(locale, 'ui.competencyCategoriesBlock.deactivate')) : (i18nT(locale, 'ui.competencyCategoriesBlock.activate'))}</button>
            <AdminDeleteButton label={i18nT(locale, 'ui.competencyCategoriesBlock.delete')} disabled={busy || item.usageCount > 0} onClick={() => void remove(item)} />
            {item.usageCount > 0 ? <span className={S.faint}>{i18nT(locale, 'ui.competencyCategoriesBlock.inUseDeactivateToPreserve')}</span> : null}
          </div></td>
        </tr>)}</tbody>
      </table></div> : <p className={S.muted}>{i18nT(locale, 'ui.competencyCategoriesBlock.noCategoriesFoundCreateA')}</p>}
      <nav className="flex items-center justify-between gap-3" aria-label={i18nT(locale, 'ui.competencyCategoriesBlock.categoryPages')}>
        <button type="button" className={S.btnGhost} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{i18nT(locale, 'ui.competencyCategoriesBlock.previous')}</button>
        <span className={S.faint}>{page} / {Math.max(1, Math.ceil(total / 20))} · {total}</span>
        <button type="button" className={S.btnGhost} disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>{i18nT(locale, 'ui.competencyCategoriesBlock.next')}</button>
      </nav>
    </>}
  </section>;
}
