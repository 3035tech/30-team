'use client';

import { useRef, useState } from 'react';
import { t } from '../../lib/i18n';
import { AdminRichFormDrawer } from './AdminRichFormDrawer';
import { FormField } from './FormField';
import { InlineCallout } from './InlineCallout';
import { dialogBtnGhostClass, dialogBtnPrimaryClass, dialogFieldClass } from './app-dialog-styles';

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
    name: item.name || '', cpf: item.cpf || '', relation: item.relation || '',
    birthDate: item.birthDate ? String(item.birthDate).slice(0, 10) : '',
  })) : [emptyDependent()]);
  const [hasDependents, setHasDependents] = useState(initial.length > 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const en = String(locale).startsWith('en');
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
      setError(en ? 'Enter an 11-digit CPF or leave it blank.' : 'Informe um CPF com 11 dígitos ou deixe em branco.');
      return;
    }
    if (next.some((row) => !validBirthDate(row.birthDate))) {
      setError(en ? 'Enter a valid birth date or leave it blank.' : 'Informe uma data de nascimento válida ou deixe em branco.');
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
        <fieldset disabled={saving} className="m-0 min-w-0 space-y-4 border-0 p-0">
          <fieldset className="m-0 flex gap-4 border-0 p-0">
            <legend className="mb-2 text-sm">{en ? 'Has dependents?' : 'Possui dependentes?'}</legend>
            {[true, false].map((value) => (
              <label key={String(value)} className="flex items-center gap-2 text-sm">
                <input type="radio" name="hasDependents" checked={hasDependents === value}
                  onChange={() => { setHasDependents(value); setError(''); }} />
                {value ? (en ? 'Yes' : 'Sim') : (en ? 'No' : 'Não')}
              </label>
            ))}
          </fieldset>
          {hasDependents ? <>
            <p className="m-0 text-xs text-ink-muted">{en ? 'All fields are optional. Up to 20 dependents.' : 'Todos os campos são opcionais. Até 20 dependentes.'}</p>
            {rows.map((row, index) => (
              <fieldset key={index} className="grid gap-3 rounded-control border border-ink/12 p-3 sm:grid-cols-2">
                <legend className="px-1 text-sm">{en ? 'Dependent' : 'Dependente'} {index + 1}</legend>
                <FormField label={t(locale, 'panel.dp.fullName')}>
                  <input className={dialogFieldClass} value={row.name} maxLength={120}
                    onChange={(event) => update(index, 'name', event.target.value)} />
                </FormField>
                <FormField label={t(locale, 'panel.dp.cpf')}>
                  <input className={dialogFieldClass} value={row.cpf} maxLength={14} inputMode="numeric"
                    onChange={(event) => update(index, 'cpf', event.target.value)} />
                </FormField>
                <FormField label={en ? 'Relationship' : 'Parentesco'}>
                  <input className={dialogFieldClass} value={row.relation} maxLength={80}
                    onChange={(event) => update(index, 'relation', event.target.value)} />
                </FormField>
                <FormField label={t(locale, 'panel.dp.birthDate')}>
                  <input className={dialogFieldClass} type="date" value={row.birthDate} min="0001-01-01" max="9999-12-31"
                    onChange={(event) => update(index, 'birthDate', event.target.value)} />
                </FormField>
                <button type="button" className={dialogBtnGhostClass} onClick={() => {
                  setRows((previous) => previous.filter((_, i) => i !== index));
                  setError('');
                }}>{en ? 'Remove' : 'Remover'} {index + 1}</button>
              </fieldset>
            ))}
            <button type="button" className={dialogBtnGhostClass} disabled={rows.length >= 20}
              onClick={() => setRows((previous) => [...previous, emptyDependent()])}>
              {en ? 'Add dependent' : 'Adicionar dependente'}
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
