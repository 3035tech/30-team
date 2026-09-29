'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAppFeedback } from './AppFeedback';
import { AppLoading } from './AppLoading';
import { CompetencyCategoriesBlock } from './CompetencyCategoriesBlock';
import { S, AdminPageHeader, AdminCreateButton, AdminEditButton } from '../dashboard/dashboard-shared';
import { t as i18nT, contentLocale } from '../../lib/i18n.js';

export function CompetencyCatalogBlock({ companyId, locale = 'pt-BR' }) {
  const en = contentLocale(locale) === 'en';
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

  async function save(values, method, keepFormOpen = false) {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/formal-competencies', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, companyId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || (i18nT(locale, 'ui.competencyCatalogBlock.couldNotSaveTryAgain')));
      toast(method === 'PUT' ? (i18nT(locale, 'ui.competencyCatalogBlock.examplesAddedExistingCompetenciesWere')) : (i18nT(locale, 'ui.competencyCatalogBlock.competencySaved')), 'ok');
      await load();
    } catch (e) { if (keepFormOpen) throw e; toast(e.message, 'error'); }
    finally { setBusy(false); }
  }
  async function edit(item) {
    await promptForm({
      title: en ? (item ? 'Edit competency' : 'New competency') : (item ? 'Editar competência' : 'Nova competência'),
      submit: values => save({ ...values, categoryId: values.categoryId ? Number(values.categoryId) : null, ...(item ? { id: item.id } : {}) }, item ? 'PATCH' : 'POST', true),
      fields: [
        { key: 'name', label: i18nT(locale, 'ui.competencyCatalogBlock.name'), required: true, maxLength: 200, defaultValue: item?.name || '' },
        { key: 'description', label: i18nT(locale, 'ui.competencyCatalogBlock.descriptionThirdPerson'), type: 'textarea', maxLength: 2000, defaultValue: item?.description || '' },
        { key: 'selfDescription', label: i18nT(locale, 'ui.competencyCatalogBlock.selfAssessmentWordingFirstPerson'), type: 'textarea', maxLength: 2000, defaultValue: item?.selfDescription || '' },
        { key: 'categoryId', label: i18nT(locale, 'ui.competencyCatalogBlock.categoryOptional'), type: 'entitySearch', minChars: 0,
          searchUrl: `/api/admin/competency-categories?companyId=${companyId}`, defaultValue: item?.categoryId ? String(item.categoryId) : '',
          placeholder: i18nT(locale, 'ui.competencyCatalogBlock.searchCategories'), help: item?.categoryName ? `${i18nT(locale, 'ui.competencyCatalogBlock.current')}: ${item.categoryName}` : (i18nT(locale, 'ui.competencyCatalogBlock.optionalManageCategoriesFromThe')) },
      ],
    });
  }
  async function toggle(item) {
    if (!await confirm({ title: item.name, message: i18nT(locale, 'ui.competencyCatalogBlock.changeAvailabilityForNewReviews') })) return;
    await save({ id: item.id, active: !item.active }, 'PATCH');
  }
  if (!companyId) return <p>{i18nT(locale, 'ui.competencyCatalogBlock.selectACompany')}</p>;
  if (managingCategories) return <CompetencyCategoriesBlock key={companyId} companyId={companyId} locale={locale} onBack={() => { setManagingCategories(false); void load(); }} />;
  return <section className={S.stack}>
    <AdminPageHeader title={i18nT(locale, 'ui.competencyCatalogBlock.competencies')} actions={<AdminCreateButton label={i18nT(locale, 'ui.competencyCatalogBlock.newCompetency')} disabled={busy} onClick={() => void edit()} />} />
    <button type="button" className={`${S.btnGhost} self-start`} onClick={() => setManagingCategories(true)}>{i18nT(locale, 'ui.competencyCatalogBlock.manageCategories')}</button>
    <button type="button" className={`${S.btnGhost} self-start`} disabled={busy} onClick={async () => { if (await confirm({ title: i18nT(locale, 'ui.competencyCatalogBlock.add17ExampleCompetencies'), message: i18nT(locale, 'ui.competencyCatalogBlock.youCanEditTheseExamples') })) await save({}, 'PUT'); }}>{i18nT(locale, 'ui.competencyCatalogBlock.addExampleCompetencies')}</button>
    <input className={S.input} aria-label={i18nT(locale, 'ui.competencyCatalogBlock.searchCompetencies')} placeholder={i18nT(locale, 'ui.competencyCatalogBlock.searchCompetencies')} value={search} onChange={e => setSearch(e.target.value)} />
    {error ? <p role="alert">{error} <button className={S.btnGhost} onClick={load}>{i18nT(locale, 'ui.competencyCatalogBlock.retry')}</button></p> : null}
    {loading ? <AppLoading locale={locale} variant="panel" /> : <ul className="m-0 list-none space-y-4 p-0">
      {items.filter(item => `${item.name} ${item.description} ${item.categoryName || ''}`.toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale))).map(item => <li key={item.id} className="border-b border-ink/10 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="m-0 text-base font-medium">{item.name}</h3>
          <div className="flex items-center gap-2"><AdminEditButton label={i18nT(locale, 'ui.competencyCatalogBlock.edit')} disabled={busy} onClick={() => void edit(item)} /><button className={S.btnGhost} disabled={busy} onClick={() => void toggle(item)}>{item.active ? (i18nT(locale, 'ui.competencyCatalogBlock.deactivate')) : (i18nT(locale, 'ui.competencyCatalogBlock.activate'))}</button></div>
        </div>
        <p className="my-1 max-w-prose text-sm text-ink-muted">{item.description}</p>
        <p className={S.faint}>{item.active ? (i18nT(locale, 'ui.competencyCatalogBlock.active')) : (i18nT(locale, 'ui.competencyCatalogBlock.inactive'))} · {i18nT(locale, 'ui.competencyCatalogBlock.usesInReviews')}: {item.usageCount || 0}{item.categoryName ? ` · ${item.categoryName}` : ''}</p>
      </li>)}
      {!items.some(item => `${item.name} ${item.description} ${item.categoryName || ''}`.toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale))) ? <li>{i18nT(locale, 'ui.competencyCatalogBlock.noCompetenciesFound')}</li> : null}
    </ul>}
  </section>;
}
