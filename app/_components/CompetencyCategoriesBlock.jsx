'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAppFeedback } from './AppFeedback';
import { AppLoading } from './AppLoading';
import { StatusToneChip } from './StatusToneChip';
import { S, AdminPageHeader, AdminCreateButton, AdminEditButton, AdminDeleteButton } from '../dashboard/dashboard-shared';

export function CompetencyCategoriesBlock({ companyId, locale = 'pt-BR', onBack }) {
  const en = locale.startsWith('en');
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

  async function mutate(method, values) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/competency-categories', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, companyId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || String(response.status));
      toast(method === 'DELETE' ? (en ? 'Category deleted.' : 'Categoria excluída.') : (en ? 'Category saved.' : 'Categoria salva.'), 'ok');
      reload();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function edit(item) {
    const values = await promptForm({ title: en ? (item ? 'Edit category' : 'New category') : (item ? 'Editar categoria' : 'Nova categoria'),
      fields: [{ key: 'name', label: en ? 'Category name' : 'Nome da categoria', required: true, maxLength: 200, defaultValue: item?.name || '' }] });
    if (values) await mutate(item ? 'PATCH' : 'POST', { ...values, ...(item ? { id: item.id } : {}) });
  }
  async function toggle(item) {
    if (!await confirm({ title: item.name, message: item.active
      ? (en ? 'Deactivate this category? Existing links remain, but it will not be available for new assignments.' : 'Inativar esta categoria? Os vínculos existentes serão mantidos, mas ela não poderá receber novas competências.')
      : (en ? 'Reactivate this category?' : 'Reativar esta categoria?') })) return;
    await mutate('PATCH', { id: item.id, active: !item.active });
  }
  async function remove(item) {
    if (!await confirm({ title: en ? 'Delete category' : 'Excluir categoria', message: en ? `Delete “${item.name}”? This cannot be undone.` : `Excluir “${item.name}”? Esta ação não pode ser desfeita.`, danger: true, confirmLabel: en ? 'Delete' : 'Excluir' })) return;
    await mutate('DELETE', { id: item.id });
  }
  return <section className={`${S.stack} min-w-0 w-full max-w-full`}>
    <button type="button" className={`${S.btnGhost} self-start`} onClick={onBack}>{en ? 'Back to competencies' : 'Voltar às competências'}</button>
    <AdminPageHeader title={en ? 'Competency categories' : 'Categorias de competências'} actions={<AdminCreateButton label={en ? 'New category' : 'Nova categoria'} disabled={busy} onClick={() => void edit()} />} />
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">{en ? 'Search categories' : 'Buscar categorias'}<input className={S.input} value={search} maxLength={100} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
      <label className="flex flex-col gap-1 text-sm">{en ? 'Status' : 'Status'}<select className={S.select} value={includeInactive ? 'all' : 'active'} onChange={e => { setIncludeInactive(e.target.value === 'all'); setPage(1); }}><option value="all">{en ? 'All' : 'Todas'}</option><option value="active">{en ? 'Active only' : 'Somente ativas'}</option></select></label>
    </div>
    {error ? <div role="alert" className="text-sm text-danger">{error} <button type="button" className={S.btnGhost} onClick={reload}>{en ? 'Retry' : 'Tentar novamente'}</button></div> : null}
    {loading ? <AppLoading variant="panel" /> : <>
      {items.length ? <div className="min-w-0"><table style={{ minWidth: 0 }} className="block w-full text-left text-sm md:table">
        <thead className="hidden md:table-header-group"><tr className="border-b border-ink/10"><th scope="col" className="p-3">{en ? 'Name' : 'Nome'}</th><th scope="col" className="p-3">Status</th><th scope="col" className="p-3">{en ? 'Competencies' : 'Competências'}</th><th scope="col" className="p-3">{en ? 'Actions' : 'Ações'}</th></tr></thead>
        <tbody className="block md:table-row-group">{items.map(item => <tr key={item.id} className="grid grid-cols-2 border-b border-ink/10 py-3 md:table-row md:py-0">
          <th scope="row" className="col-span-2 min-w-0 break-words p-3 font-medium">{item.name}</th>
          <td className="p-3"><span className="mb-1 block text-ink-muted md:hidden">Status</span><StatusToneChip tone={item.active ? 'success' : 'neutral'}>{item.active ? (en ? 'Active' : 'Ativa') : (en ? 'Inactive' : 'Inativa')}</StatusToneChip></td>
          <td className="p-3 tabular-nums"><span className="mb-1 block text-ink-muted md:hidden">{en ? 'Competencies' : 'Competências'}</span>{item.usageCount}</td>
          <td className="col-span-2 p-3"><div className="flex flex-wrap items-center gap-2">
            <AdminEditButton label={en ? 'Edit' : 'Editar'} disabled={busy} onClick={() => void edit(item)} />
            <button type="button" className={S.btnGhost} disabled={busy} onClick={() => void toggle(item)}>{item.active ? (en ? 'Deactivate' : 'Inativar') : (en ? 'Activate' : 'Ativar')}</button>
            <AdminDeleteButton label={en ? 'Delete' : 'Excluir'} disabled={busy || item.usageCount > 0} onClick={() => void remove(item)} />
            {item.usageCount > 0 ? <span className={S.faint}>{en ? 'In use; deactivate to preserve links.' : 'Em uso; inative para manter os vínculos.'}</span> : null}
          </div></td>
        </tr>)}</tbody>
      </table></div> : <p className={S.muted}>{en ? 'No categories found. Create a category or change the search.' : 'Nenhuma categoria encontrada. Cadastre uma categoria ou altere a busca.'}</p>}
      <nav className="flex items-center justify-between gap-3" aria-label={en ? 'Category pages' : 'Páginas de categorias'}>
        <button type="button" className={S.btnGhost} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{en ? 'Previous' : 'Anterior'}</button>
        <span className={S.faint}>{page} / {Math.max(1, Math.ceil(total / 20))} · {total}</span>
        <button type="button" className={S.btnGhost} disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>{en ? 'Next' : 'Próxima'}</button>
      </nav>
    </>}
  </section>;
}
