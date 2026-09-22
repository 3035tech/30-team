'use client';

import { useState } from 'react';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { ORG_UNIT, orgUnitOptions } from '../../../lib/org-unit-constants.js';
import { AdminPageHeader, AdminCreateButton, AdminListPager, S } from '../dashboard-shared';
import { useOrgUnits, orgUnitRequest } from '../../_components/OrgUnitField';
import { FormField } from '../../_components/FormField';
import { SelectField } from '../../_components/SelectField';
import { EmptyState } from '../../_components/EmptyState';
import { InlineCallout } from '../../_components/InlineCallout';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { useAppFeedback } from '../../_components/AppFeedback';
import { OrgChartBlock } from '../../_components/OrgChartBlock';

const PAGE_SIZE = 20;
export function OrganizationTab({ companyId, locale, navigateDashboard }) {
  const { units, loading, error, reload } = useOrgUnits(companyId);
  const { confirm, toast } = useAppFeedback();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [page, setPage] = useState(1);
  const options = orgUnitOptions(units);
  const safePage = Math.min(page, Math.max(1, Math.ceil(options.length / PAGE_SIZE)));
  const listTitle = locale === 'en' ? 'Organizational units' : 'Unidades organizacionais';
  function edit(unit = {}) { setForm({ id: unit.id, name: unit.name || '', parentId: unit.parentId || '' }); setSaveError(''); }
  async function save(event) {
    event.preventDefault(); if (busy) return; setBusy(true); setSaveError('');
    try {
      await orgUnitRequest(companyId, { method: form.id ? 'PATCH' : 'POST', body: { ...form, parentId: form.parentId ? Number(form.parentId) : null } });
      setForm(null); reload(); toast(t(locale, 'panel.orgUnits.saved'), 'ok');
    } catch (e) { setSaveError(e.message); }
    finally { setBusy(false); }
  }
  async function archive(unit) {
    if (!await confirm({ title: t(locale, 'panel.orgUnits.archive'), message: t(locale, 'panel.orgUnits.archiveConfirm', { name: unit.name }) })) return;
    setBusy(true);
    try {
      await orgUnitRequest(companyId, { method: 'PATCH', body: { id: unit.id, active: false } });
      reload(); toast(t(locale, 'panel.orgUnits.saved'), 'ok');
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  }
  if (!companyId) return <EmptyState title={t(locale, 'panel.orgUnits.chooseCompany')} />;
  return <div className="flex flex-col gap-4">
    <AdminPageHeader title={listTitle} description={t(locale, 'panel.orgUnits.hint')}
      actions={<AdminCreateButton label={t(locale, units.length ? 'panel.orgUnits.create' : 'panel.orgUnits.firstCreate')} disabled={busy || loading || Boolean(error) || Boolean(form)} onClick={() => edit()} />} />
    {form ? <ContentEnter animKey={`org-form-${form.id || 'new'}`}><form className={S.card} onSubmit={save} aria-label={t(locale, form.id ? 'panel.orgUnits.edit' : 'panel.orgUnits.create')}>
      <h2 className={S.cardTitle}>{t(locale, form.id ? 'panel.orgUnits.edit' : 'panel.orgUnits.create')}</h2>
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        <FormField label={t(locale, 'panel.orgUnits.name')}><input autoFocus required maxLength={ORG_UNIT.MAX_NAME} className={S.input} value={form.name} disabled={busy} aria-label={t(locale, 'panel.orgUnits.name')} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FormField>
        <FormField label={t(locale, 'panel.orgUnits.parent')}><SelectField value={form.parentId} disabled={busy} aria-label={t(locale, 'panel.orgUnits.parent')} onChange={(event) => setForm({ ...form, parentId: event.target.value })}>
          <option value="">{t(locale, 'panel.orgUnits.noParent')}</option>
          {options.filter((unit) => unit.id !== form.id).map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
        </SelectField></FormField>
      </div>
      {saveError ? <InlineCallout tone="danger"><span role="alert">{saveError}</span></InlineCallout> : null}
      <div className="mt-4 flex flex-wrap gap-2"><button type="submit" className={S.btnPrimary} disabled={busy || !form.name.trim()}>{t(locale, busy ? 'panel.orgUnits.saving' : 'panel.orgUnits.save')}</button><button type="button" className={S.btnGhost} disabled={busy} onClick={() => setForm(null)}>{t(locale, 'panel.orgUnits.cancel')}</button></div>
    </form></ContentEnter> : null}
    {loading ? <AppLoading variant="panel" /> : error ? <InlineCallout tone="danger"><span role="alert">{error}</span><button type="button" className={S.btnGhost} onClick={reload}>{t(locale, 'panel.orgUnits.retry')}</button></InlineCallout> : !units.length ? <EmptyState title={t(locale, 'panel.orgUnits.empty')} description={t(locale, 'panel.orgUnits.emptyHint')} /> : <ContentEnter animKey={`units-${companyId}-${units.length}`}>
      <ul className="m-0 list-none space-y-3 p-0">{options.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE).map((unit) => <li key={unit.id} className={S.cardTight}>
        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h2 className={`${S.cardTitle} break-words`}>{unit.name}</h2>
            {unit.label && unit.label.trim().toLocaleLowerCase(locale) !== String(unit.name || '').trim().toLocaleLowerCase(locale) ? (
              <p className={`${S.faint} break-words`}>{unit.label}</p>
            ) : null}
            <p className={cn(S.muted, 'mb-0 mt-1.5')}>{t(locale, 'panel.orgUnits.people', { n: unit.peopleCount })}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <button type="button" className={S.btnGhost} onClick={() => navigateDashboard({ tab: 'team', orgUnit: unit.id, roster: 'internal', teamPage: 1, search: '', area: 'all', vacancy: 'all', pipeline: 'all', filter: null, teamGroup: null, dateFrom: '', dateTo: '', enneagram: 'all' })}>{t(locale, 'panel.orgUnits.viewPeople')}</button>
            <button type="button" className={S.btnGhost} disabled={busy || Boolean(form)} onClick={() => edit(unit)}>{t(locale, 'panel.orgUnits.edit')}</button>
            <button type="button" className={S.btnGhost} disabled={busy || Boolean(form)} onClick={() => archive(unit)}>{t(locale, 'panel.orgUnits.archive')}</button>
          </div>
        </div>
      </li>)}</ul>
      <AdminListPager locale={locale} page={safePage} pageSize={PAGE_SIZE} pageSizeOptions={[PAGE_SIZE]} total={units.length} onPageChange={setPage} />
    </ContentEnter>}
    <OrgChartBlock key={companyId} locale={locale} companyId={companyId} navigateDashboard={navigateDashboard} />
  </div>;
}
