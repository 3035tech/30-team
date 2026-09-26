'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAppFeedback } from './AppFeedback';
import { AppLoading } from './AppLoading';
import { CompetencyCategoriesBlock } from './CompetencyCategoriesBlock';
import { S, AdminPageHeader, AdminCreateButton, AdminEditButton } from '../dashboard/dashboard-shared';

export function CompetencyCatalogBlock({ companyId, locale = 'pt-BR' }) {
  const en = locale.startsWith('en');
  const { promptForm, confirm, toast } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [managingCategories, setManagingCategories] = useState(false);
  const load = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/admin/formal-competencies?companyId=${companyId}&includeInactive=true`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || String(response.status));
      setItems(data.competencies || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [companyId]);
  useEffect(() => { void load(); }, [load]);

  async function save(values, method) {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/formal-competencies', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, companyId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || String(response.status));
      toast(method === 'PUT' ? (en ? 'Examples added. Existing competencies were preserved.' : 'Exemplos adicionados. Competências existentes preservadas.') : (en ? 'Competency saved.' : 'Competência salva.'), 'ok');
      await load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  }
  async function edit(item) {
    const values = await promptForm({
      title: en ? (item ? 'Edit competency' : 'New competency') : (item ? 'Editar competência' : 'Nova competência'),
      fields: [
        { key: 'name', label: en ? 'Name' : 'Nome', required: true, maxLength: 200, defaultValue: item?.name || '' },
        { key: 'description', label: en ? 'Description (third person)' : 'Descrição (terceira pessoa)', type: 'textarea', maxLength: 2000, defaultValue: item?.description || '' },
        { key: 'selfDescription', label: en ? 'Self-assessment wording (first person)' : 'Texto da autoavaliação (primeira pessoa)', type: 'textarea', maxLength: 2000, defaultValue: item?.selfDescription || '' },
        { key: 'categoryId', label: en ? 'Category (optional)' : 'Categoria (opcional)', type: 'entitySearch', minChars: 0,
          searchUrl: `/api/admin/competency-categories?companyId=${companyId}`, defaultValue: item?.categoryId ? String(item.categoryId) : '',
          placeholder: en ? 'Search categories' : 'Buscar categorias', help: item?.categoryName ? `${en ? 'Current' : 'Atual'}: ${item.categoryName}` : (en ? 'Optional. Manage categories from the catalog.' : 'Opcional. Cadastre categorias pelo catálogo.') },
      ],
    });
    if (values) await save({ ...values, categoryId: values.categoryId ? Number(values.categoryId) : null, ...(item ? { id: item.id } : {}) }, item ? 'PATCH' : 'POST');
  }
  async function toggle(item) {
    if (!await confirm({ title: item.name, message: en ? 'Change availability for new reviews? Existing responses remain unchanged.' : 'Alterar a disponibilidade para novas avaliações? As respostas existentes serão preservadas.' })) return;
    await save({ id: item.id, active: !item.active }, 'PATCH');
  }
  if (!companyId) return <p>{en ? 'Select a company.' : 'Selecione uma empresa.'}</p>;
  if (managingCategories) return <CompetencyCategoriesBlock key={companyId} companyId={companyId} locale={locale} onBack={() => { setManagingCategories(false); void load(); }} />;
  return <section className={S.stack}>
    <AdminPageHeader title={en ? 'Competencies' : 'Competências'} actions={<AdminCreateButton label={en ? 'New competency' : 'Nova competência'} disabled={busy} onClick={() => void edit()} />} />
    <button type="button" className={`${S.btnGhost} self-start`} onClick={() => setManagingCategories(true)}>{en ? 'Manage categories' : 'Gerenciar categorias'}</button>
    <button type="button" className={`${S.btnGhost} self-start`} disabled={busy} onClick={async () => { if (await confirm({ title: en ? 'Add 17 example competencies?' : 'Adicionar 17 competências de exemplo?', message: en ? 'You can edit these examples. Existing items are not replaced.' : 'Você poderá editar os exemplos. Os itens existentes não serão substituídos.' })) await save({}, 'PUT'); }}>{en ? 'Add example competencies' : 'Adicionar competências de exemplo'}</button>
    <input className={S.input} aria-label={en ? 'Search competencies' : 'Buscar competências'} placeholder={en ? 'Search competencies' : 'Buscar competências'} value={search} onChange={e => setSearch(e.target.value)} />
    {error ? <p role="alert">{error} <button className={S.btnGhost} onClick={load}>{en ? 'Retry' : 'Tentar novamente'}</button></p> : null}
    {loading ? <AppLoading variant="panel" /> : <ul className="m-0 list-none space-y-4 p-0">
      {items.filter(item => `${item.name} ${item.description} ${item.categoryName || ''}`.toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale))).map(item => <li key={item.id} className="border-b border-ink/10 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="m-0 text-base font-medium">{item.name}</h3>
          <div className="flex items-center gap-2"><AdminEditButton label={en ? 'Edit' : 'Editar'} disabled={busy} onClick={() => void edit(item)} /><button className={S.btnGhost} disabled={busy} onClick={() => void toggle(item)}>{item.active ? (en ? 'Deactivate' : 'Inativar') : (en ? 'Activate' : 'Ativar')}</button></div>
        </div>
        <p className="my-1 max-w-prose text-sm text-ink-muted">{item.description}</p>
        <p className={S.faint}>{item.active ? (en ? 'Active' : 'Ativa') : (en ? 'Inactive' : 'Inativa')} · {en ? 'Uses in reviews' : 'Usos em avaliações'}: {item.usageCount || 0}{item.categoryName ? ` · ${item.categoryName}` : ''}</p>
      </li>)}
      {!items.some(item => `${item.name} ${item.description} ${item.categoryName || ''}`.toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale))) ? <li>{en ? 'No competencies found.' : 'Nenhuma competência encontrada.'}</li> : null}
    </ul>}
  </section>;
}
