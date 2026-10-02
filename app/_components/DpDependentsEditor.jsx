'use client';

import { useRef, useState } from 'react';
import { t, t as i18nT } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { formatCpfBr } from '../../lib/br-masks';
import { AdminRichFormDrawer } from './AdminRichFormDrawer';
import { DateField } from './DateField';
import { FormField } from './FormField';
import { InlineCallout } from './InlineCallout';
import { SegmentedControl } from './SegmentedControl';
import { SelectField } from './SelectField';
import { dialogBtnGhostClass, dialogBtnPrimaryClass, dialogFieldClass, dialogSelectClass } from './app-dialog-styles';
import { DEPENDENT_KINSHIP_RELATIONS } from '../../lib/domain-status.js';
import { kinshipOptions, normalizeDependentRelation } from '../../lib/kinship-relation.js';

const emptyDependent = () => ({ name: '', cpf: '', relation: '', birthDate: '' });

function validBirthDate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function DpDependentsEditor({ locale, dependents, onClose, onSave }) {
  const initial = Array.isArray(dependents) ? dependents : [];
  const [rows, setRows] = useState(() => initial.length ? initial.map((item) => ({
    name: item.name || '', cpf: formatCpfBr(item.cpf || ''), relation: normalizeDependentRelation(item.relation),
    birthDate: item.birthDate ? String(item.birthDate).slice(0, 10) : '',
  })) : [emptyDependent()]);
  const [hasDependents, setHasDependents] = useState(initial.length > 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const close = () => { if (!savingRef.current) onClose(); };
  const update = (index, field, value) => {
    setRows((previous) => previous.map((row, i) => i === index ? { ...row, [field]: value } : row));
    setError('');
  };
  const submit = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (savingRef.current) return;
    const next = hasDependents ? rows.map((row) => Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, value.trim()])
    )).filter((row) => Object.values(row).some(Boolean)) : [];
    if (next.some((row) => row.cpf && !/^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(row.cpf))) {
      setError(i18nT(locale, 'ui.dpDependentsEditor.enterAn11DigitCpf'));
      return;
    }
    if (next.some((row) => !validBirthDate(row.birthDate))) {
      setError(i18nT(locale, 'ui.dpDependentsEditor.enterAValidBirthDate'));
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await onSave(next.map((row) => ({ ...row, cpf: row.cpf.replace(/\D/g, '') })));
    } catch (err) {
      setError(err?.message || t(locale, 'panel.dp.saveError'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <AdminRichFormDrawer open title={t(locale, 'panel.dp.dependents')} locale={locale} onClose={close}>
      <form onSubmit={submit}>
        <fieldset disabled={saving} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
          <FormField as="div" label={i18nT(locale, 'ui.dpDependentsEditor.hasDependents')}>
            <SegmentedControl
              aria-label={i18nT(locale, 'ui.dpDependentsEditor.hasDependents')}
              value={hasDependents ? 'yes' : 'no'}
              onChange={(id) => { setHasDependents(id === 'yes'); setError(''); }}
              options={[
                { id: 'yes', label: i18nT(locale, 'ui.dpDependentsEditor.yes') },
                { id: 'no', label: i18nT(locale, 'ui.dpDependentsEditor.no') },
              ]}
            />
          </FormField>
          {hasDependents ? <>
            <p className="m-0 text-xs text-ink-muted">{i18nT(locale, 'ui.dpDependentsEditor.allFieldsAreOptionalUp')}</p>
            {rows.map((row, index) => (
              <section key={index} className="rounded-control border border-ink/12 p-3" aria-label={`${i18nT(locale, 'ui.dpDependentsEditor.dependent')} ${index + 1}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="m-0 font-ui text-sm font-semibold text-ink">{i18nT(locale, 'ui.dpDependentsEditor.dependent')} {index + 1}</h3>
                  <button type="button" className={cn(dialogBtnGhostClass, 'min-h-9 px-3 text-xs')}
                    aria-label={`${i18nT(locale, 'ui.dpDependentsEditor.remove')} ${i18nT(locale, 'ui.dpDependentsEditor.dependent')} ${index + 1}`}
                    onClick={() => { setRows((previous) => previous.filter((_, i) => i !== index)); setError(''); }}>
                    {i18nT(locale, 'ui.dpDependentsEditor.remove')}
                  </button>
                </div>
                <div className="grid items-start gap-3 sm:grid-cols-3">
                  <FormField label={t(locale, 'panel.dp.fullName')} className="sm:col-span-3">
                    <input className={dialogFieldClass} value={row.name} maxLength={120}
                      onChange={(event) => update(index, 'name', event.target.value)} />
                  </FormField>
                  <FormField label={t(locale, 'panel.dp.cpf')}>
                    <input className={dialogFieldClass} value={row.cpf} maxLength={14} inputMode="numeric" placeholder="000.000.000-00"
                      onChange={(event) => update(index, 'cpf', formatCpfBr(event.target.value))} />
                  </FormField>
                  <FormField label={i18nT(locale, 'ui.dpDependentsEditor.relationship')}>
                    <SelectField className={dialogSelectClass} value={row.relation}
                      aria-label={i18nT(locale, 'ui.dpDependentsEditor.relationship')}
                      onChange={(event) => update(index, 'relation', event.target.value)}>
                      {kinshipOptions(locale, DEPENDENT_KINSHIP_RELATIONS).map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </SelectField>
                  </FormField>
                  <FormField label={t(locale, 'panel.dp.birthDate')}>
                    <DateField locale={locale} className={dialogFieldClass} value={row.birthDate} min="1900-01-01" max="9999-12-31"
                      aria-label={t(locale, 'panel.dp.birthDate')}
                      onChange={(event) => update(index, 'birthDate', event.target.value)} />
                  </FormField>
                </div>
              </section>
            ))}
            <button type="button" className={cn(dialogBtnGhostClass, 'self-start')} disabled={rows.length >= 20}
              onClick={() => setRows((previous) => [...previous, emptyDependent()])}>
              {i18nT(locale, 'ui.dpDependentsEditor.addDependent')}
            </button>
          </> : null}
          {error ? <div role="alert"><InlineCallout tone="danger">{error}</InlineCallout></div> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={dialogBtnGhostClass} onClick={close}>{t(locale, 'panel.common.cancel')}</button>
            <button type="submit" className={dialogBtnPrimaryClass}>{t(locale, 'panel.dp.save')}</button>
          </div>
        </fieldset>
      </form>
    </AdminRichFormDrawer>
  );
}
