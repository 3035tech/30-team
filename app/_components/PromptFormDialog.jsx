'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import {
  dialogBtnGhostClass,
  dialogBtnPrimaryClass,
  dialogCardClass,
  dialogFieldClass,
  dialogOverlayClass,
} from './app-dialog-styles';

/**
 * Multi-field form dialog (replaces window.prompt chains).
 * fields: [{
 *   key (or legacy name), label, defaultValue?,
 *   type?: 'text'|'password'|'textarea'|'select'|'boolean'|'checkboxGroup'|'imageUpload',
 *   options?: [{value,label}],
 *   showWhen?: (values) => boolean,
 *   placeholder?: string,
 *   help?: string,
 *   rows?: number,
 *   // imageUpload:
 *   uploadUrl?: string,
 *   storageConfigured?: boolean,
 *   accept?: string,
 *   uploadLabel?: string,
 *   removeLabel?: string,
 *   uploadingLabel?: string,
 *   storageOffHelp?: string,
 * }]
 */
function fieldKeyOf(f) {
  return f?.key || f?.name || '';
}

export function PromptFormDialog({
  open,
  title,
  message,
  fields = [],
  locale = 'pt-BR',
  confirmLabel,
  cancelLabel,
  onSubmit,
  onCancel,
}) {
  const [mounted, setMounted] = useState(false);
  const [values, setValues] = useState({});
  const [uploadBusyKey, setUploadBusyKey] = useState('');
  const [uploadError, setUploadError] = useState('');
  const blobUrlsRef = useRef([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const init = {};
    for (const f of fields) {
      const fieldKey = fieldKeyOf(f);
      if (!fieldKey) continue;
      if (f.type === 'checkboxGroup') {
        init[fieldKey] = Array.isArray(f.defaultValue) ? [...f.defaultValue] : [];
      } else if (f.type === 'boolean') {
        init[fieldKey] = f.defaultValue === true || f.defaultValue === 'true' || f.defaultValue === true;
      } else if (f.type === 'imageUpload') {
        init[fieldKey] = {
          url: f.defaultValue ? String(f.defaultValue) : '',
          file: null,
          removed: false,
        };
      } else {
        init[fieldKey] = f.defaultValue != null ? String(f.defaultValue) : '';
      }
    }
    setValues(init);
    setUploadBusyKey('');
    setUploadError('');
    // Reset only when opening; callers pass a fresh fields array per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      for (const u of blobUrlsRef.current) {
        try {
          URL.revokeObjectURL(u);
        } catch {
          /* ignore */
        }
      }
      blobUrlsRef.current = [];
    };
  }, [open, onCancel]);

  if (!mounted || !open) return null;

  const heading = title || t(locale, 'panel.common.editTitle');

  const toggleCheck = (key, value) => {
    setValues((prev) => {
      const cur = Array.isArray(prev[key]) ? prev[key] : [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...prev, [key]: next };
    });
  };

  const setField = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  const visibleFields = fields.filter((f) => {
    if (typeof f.showWhen !== 'function') return true;
    try {
      return Boolean(f.showWhen(values));
    } catch {
      return true;
    }
  });

  const onImageFile = async (f, file) => {
    if (!file) return;
    const fk = fieldKeyOf(f);
    setUploadError('');
    if (f.uploadUrl && f.storageConfigured !== false) {
      setUploadBusyKey(fk);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(f.uploadUrl, { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
        setField(fk, { url: data.logoUrl || data.url || '', file: null, removed: false });
      } catch (e) {
        setUploadError(e?.message || t(locale, 'panel.common.error'));
      } finally {
        setUploadBusyKey('');
      }
      return;
    }
    const localUrl = URL.createObjectURL(file);
    blobUrlsRef.current.push(localUrl);
    setField(fk, { url: localUrl, file, removed: false });
  };

  const onImageRemove = async (f) => {
    const fk = fieldKeyOf(f);
    setUploadError('');
    if (f.uploadUrl && f.storageConfigured !== false) {
      setUploadBusyKey(fk);
      try {
        const res = await fetch(f.uploadUrl, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
        setField(fk, { url: '', file: null, removed: true });
      } catch (e) {
        setUploadError(e?.message || t(locale, 'panel.common.error'));
      } finally {
        setUploadBusyKey('');
      }
      return;
    }
    setField(fk, { url: '', file: null, removed: true });
  };

  const renderControl = (f) => {
    const fk = fieldKeyOf(f);
    if (f.type === 'imageUpload') {
      const cur = values[fk] && typeof values[fk] === 'object' ? values[fk] : { url: '', file: null };
      const preview = String(cur.url || '').trim();
      const busy = uploadBusyKey === fk;
      const off = f.storageConfigured === false;
      return (
        <div className="mt-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink/12 bg-ink/[0.03]">
              {preview ? (
                <img src={preview} alt="" width={72} height={72} className="object-contain" />
              ) : (
                <span className="font-mono text-[10px] text-ink-faint">—</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label
                className={cn(
                  dialogBtnGhostClass,
                  'm-0 inline-flex min-h-touch items-center justify-center px-3 py-2',
                  off || busy ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'
                )}
              >
                <input
                  type="file"
                  accept={f.accept || 'image/png,image/jpeg,image/webp'}
                  disabled={off || busy}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void onImageFile(f, file);
                  }}
                />
                {busy
                  ? f.uploadingLabel || t(locale, 'common.loading')
                  : f.uploadLabel || t(locale, 'panel.admin.companyLogoChoose')}
              </label>
              {preview ? (
                <button
                  type="button"
                  disabled={off || busy}
                  onClick={() => void onImageRemove(f)}
                  className={cn(dialogBtnGhostClass, 'min-h-touch', (off || busy) && 'opacity-55')}
                >
                  {f.removeLabel || t(locale, 'panel.admin.companyLogoRemove')}
                </button>
              ) : null}
            </div>
          </div>
          {off && f.storageOffHelp ? (
            <p className="mb-0 mt-2 text-xs leading-[1.45] text-ink-muted">
              {f.storageOffHelp}
            </p>
          ) : null}
          {uploadError ? (
            <p className="mb-0 mt-2 text-xs leading-[1.45] text-danger">
              {uploadError}
            </p>
          ) : null}
        </div>
      );
    }

    if (f.type === 'checkboxGroup') {
      return (
        <div
          role="group"
          aria-label={f.label}
          className="prompt-checkbox-grid mt-2 grid max-h-[220px] grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto rounded-control border border-ink/12 bg-ink/[0.03] px-3 py-2.5"
        >
          {(f.options || []).map((opt) => {
            const checked = Array.isArray(values[fk]) && values[fk].includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 font-display text-[13px] text-ink"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCheck(fk, opt.value)}
                  className="h-4 w-4 accent-brand-500"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      );
    }

    if (f.type === 'select') {
      return (
        <select
          value={values[fk] ?? ''}
          onChange={(e) => setField(fk, e.target.value)}
          disabled={Boolean(f.disabled)}
          className={cn(dialogFieldClass, f.disabled ? 'cursor-default opacity-60' : 'cursor-pointer')}
        >
          {(f.options || []).map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (f.type === 'boolean') {
      const checked = values[fk] === true || values[fk] === 'true';
      return (
        <label
          className={cn(
            'flex cursor-pointer items-start gap-2.5 font-display text-sm leading-[1.45] text-ink',
            !f.help && 'mt-1'
          )}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setField(fk, e.target.checked)}
            className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 accent-brand-500"
          />
          <span>{f.label}</span>
        </label>
      );
    }

    if (f.type === 'textarea') {
      return (
        <textarea
          value={values[fk] ?? ''}
          onChange={(e) => setField(fk, e.target.value)}
          placeholder={f.placeholder || ''}
          rows={f.rows || 4}
          className={cn(dialogFieldClass, 'min-h-[88px] resize-y font-display')}
        />
      );
    }

    return (
      <input
        type={f.type === 'password' ? 'password' : f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
        value={values[fk] ?? ''}
        onChange={(e) => setField(fk, e.target.value)}
        placeholder={f.placeholder || ''}
        className={dialogFieldClass}
        autoComplete={f.type === 'password' ? 'new-password' : 'off'}
      />
    );
  };

  return createPortal(
    <div
      className={cn('app-dialog-overlay', dialogOverlayClass)}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-form-title"
        className={cn('prompt-form-card', dialogCardClass, 'max-h-[90vh] max-w-[520px] overflow-y-auto')}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-brand-500">
          30Team
        </span>
        <h2
          id="prompt-form-title"
          className="mb-0 mt-2 font-display text-xl font-normal leading-tight text-ink"
        >
          {heading}
        </h2>
        {message ? (
          <p className="mb-0 mt-3 text-sm leading-[1.55] text-ink-muted">{message}</p>
        ) : null}
        <div className="mt-4 flex flex-col gap-3">
          {visibleFields.map((f) => (
            <div key={fieldKeyOf(f)} className="block">
              {f.type !== 'boolean' ? (
                <span className="font-mono text-[11px] text-ink-faint">{f.label}</span>
              ) : null}
              {renderControl(f)}
              {f.help && f.type !== 'imageUpload' ? (
                <p
                  className={cn(
                    'text-xs leading-[1.45] text-ink-muted',
                    f.type === 'boolean' ? 'ml-7 mt-1.5 mb-0' : 'mt-1.5 mb-0'
                  )}
                >
                  {f.help}
                </p>
              ) : null}
              {f.help && f.type === 'imageUpload' && f.storageConfigured !== false ? (
                <p className="mb-0 mt-1.5 text-xs leading-[1.45] text-ink-muted">{f.help}</p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-[22px] flex justify-end gap-2.5">
          <button type="button" onClick={onCancel} className={dialogBtnGhostClass} disabled={Boolean(uploadBusyKey)}>
            {cancelLabel || t(locale, 'panel.common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onSubmit?.(values)}
            disabled={Boolean(uploadBusyKey)}
            className={cn(dialogBtnPrimaryClass, uploadBusyKey && 'opacity-60')}
          >
            {confirmLabel || t(locale, 'panel.common.save')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
