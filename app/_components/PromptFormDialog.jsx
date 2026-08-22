'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../lib/i18n';
import { C } from '../../lib/theme';
import {
  dialogBtnGhost,
  dialogBtnPrimary,
  dialogCardStyle,
  dialogFieldStyle,
  dialogOverlayStyle,
} from './app-dialog-styles';

/**
 * Multi-field form dialog (replaces window.prompt chains).
 * fields: [{
 *   key, label, defaultValue?,
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
      if (f.type === 'checkboxGroup') {
        init[f.key] = Array.isArray(f.defaultValue) ? [...f.defaultValue] : [];
      } else if (f.type === 'boolean') {
        init[f.key] = f.defaultValue === true || f.defaultValue === 'true' || f.defaultValue === true;
      } else if (f.type === 'imageUpload') {
        init[f.key] = {
          url: f.defaultValue ? String(f.defaultValue) : '',
          file: null,
          removed: false,
        };
      } else {
        init[f.key] = f.defaultValue != null ? String(f.defaultValue) : '';
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
    setUploadError('');
    if (f.uploadUrl && f.storageConfigured !== false) {
      setUploadBusyKey(f.key);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(f.uploadUrl, { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
        setField(f.key, { url: data.logoUrl || data.url || '', file: null, removed: false });
      } catch (e) {
        setUploadError(e?.message || t(locale, 'panel.common.error'));
      } finally {
        setUploadBusyKey('');
      }
      return;
    }
    const localUrl = URL.createObjectURL(file);
    blobUrlsRef.current.push(localUrl);
    setField(f.key, { url: localUrl, file, removed: false });
  };

  const onImageRemove = async (f) => {
    setUploadError('');
    if (f.uploadUrl && f.storageConfigured !== false) {
      setUploadBusyKey(f.key);
      try {
        const res = await fetch(f.uploadUrl, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
        setField(f.key, { url: '', file: null, removed: true });
      } catch (e) {
        setUploadError(e?.message || t(locale, 'panel.common.error'));
      } finally {
        setUploadBusyKey('');
      }
      return;
    }
    setField(f.key, { url: '', file: null, removed: true });
  };

  const renderControl = (f) => {
    if (f.type === 'imageUpload') {
      const cur = values[f.key] && typeof values[f.key] === 'object' ? values[f.key] : { url: '', file: null };
      const preview = String(cur.url || '').trim();
      const busy = uploadBusyKey === f.key;
      const off = f.storageConfigured === false;
      return (
        <div style={{ marginTop: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '12px',
                border: `1px solid ${C.border}`,
                background: 'rgba(26,22,37,.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {preview ? (
                <img src={preview} alt="" width={72} height={72} style={{ objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '10px', color: C.faint, fontFamily: 'monospace' }}>—</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                style={{
                  ...dialogBtnGhost,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '40px',
                  padding: '8px 12px',
                  cursor: off || busy ? 'not-allowed' : 'pointer',
                  opacity: off || busy ? 0.55 : 1,
                  margin: 0,
                }}
              >
                <input
                  type="file"
                  accept={f.accept || 'image/png,image/jpeg,image/webp'}
                  disabled={off || busy}
                  style={{ display: 'none' }}
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
                  style={{
                    ...dialogBtnGhost,
                    minHeight: '40px',
                    opacity: off || busy ? 0.55 : 1,
                  }}
                >
                  {f.removeLabel || t(locale, 'panel.admin.companyLogoRemove')}
                </button>
              ) : null}
            </div>
          </div>
          {off && f.storageOffHelp ? (
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: C.muted, lineHeight: 1.45 }}>
              {f.storageOffHelp}
            </p>
          ) : null}
          {uploadError ? (
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: C.tension, lineHeight: 1.45 }}>
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
          className="prompt-checkbox-grid"
          style={{
            marginTop: '8px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px 12px',
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '10px 12px',
            borderRadius: '10px',
            border: `1px solid ${C.border}`,
            background: 'rgba(26,22,37,.03)',
          }}
        >
          {(f.options || []).map((opt) => {
            const checked = Array.isArray(values[f.key]) && values[f.key].includes(opt.value);
            return (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: C.text,
                  cursor: 'pointer',
                  fontFamily: 'Georgia, serif',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCheck(f.key, opt.value)}
                  style={{ width: '16px', height: '16px', accentColor: C.purple }}
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
          value={values[f.key] ?? ''}
          onChange={(e) => setField(f.key, e.target.value)}
          disabled={Boolean(f.disabled)}
          style={{ ...dialogFieldStyle, cursor: f.disabled ? 'default' : 'pointer', opacity: f.disabled ? 0.6 : 1 }}
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
      const checked = values[f.key] === true || values[f.key] === 'true';
      return (
        <label
          style={{
            marginTop: f.help ? 0 : '4px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            color: C.text,
            fontFamily: 'Georgia, serif',
            lineHeight: 1.45,
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setField(f.key, e.target.checked)}
            style={{ width: '18px', height: '18px', marginTop: '2px', flexShrink: 0, accentColor: C.purple }}
          />
          <span>{f.label}</span>
        </label>
      );
    }

    if (f.type === 'textarea') {
      return (
        <textarea
          value={values[f.key] ?? ''}
          onChange={(e) => setField(f.key, e.target.value)}
          placeholder={f.placeholder || ''}
          rows={f.rows || 4}
          style={{ ...dialogFieldStyle, resize: 'vertical', minHeight: '88px', fontFamily: 'Georgia, serif' }}
        />
      );
    }

    return (
      <input
        type={f.type === 'password' ? 'password' : f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
        value={values[f.key] ?? ''}
        onChange={(e) => setField(f.key, e.target.value)}
        placeholder={f.placeholder || ''}
        style={dialogFieldStyle}
        autoComplete={f.type === 'password' ? 'new-password' : 'off'}
      />
    );
  };

  return createPortal(
    <div
      className="app-dialog-overlay"
      style={dialogOverlayStyle}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-form-title"
        className="prompt-form-card"
        style={{ ...dialogCardStyle, maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          style={{
            fontSize: '10px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: C.purple,
            fontFamily: 'monospace',
          }}
        >
          30Team
        </span>
        <h2
          id="prompt-form-title"
          style={{
            margin: '8px 0 0',
            fontSize: '20px',
            fontWeight: 'normal',
            fontFamily: 'Georgia, serif',
            color: C.text,
            lineHeight: 1.25,
          }}
        >
          {heading}
        </h2>
        {message ? (
          <p style={{ margin: '12px 0 0', fontSize: '14px', color: C.muted, lineHeight: 1.55 }}>{message}</p>
        ) : null}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {visibleFields.map((f) => (
            <div key={f.key} style={{ display: 'block' }}>
              {f.type !== 'boolean' ? (
                <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>{f.label}</span>
              ) : null}
              {renderControl(f)}
              {f.help && f.type !== 'imageUpload' ? (
                <p
                  style={{
                    margin: f.type === 'boolean' ? '6px 0 0 28px' : '6px 0 0',
                    fontSize: '12px',
                    color: C.muted,
                    lineHeight: 1.45,
                  }}
                >
                  {f.help}
                </p>
              ) : null}
              {f.help && f.type === 'imageUpload' && f.storageConfigured !== false ? (
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: C.muted, lineHeight: 1.45 }}>{f.help}</p>
              ) : null}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={onCancel} style={dialogBtnGhost} disabled={Boolean(uploadBusyKey)}>
            {cancelLabel || t(locale, 'panel.common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onSubmit?.(values)}
            disabled={Boolean(uploadBusyKey)}
            style={{ ...dialogBtnPrimary(C.purple), opacity: uploadBusyKey ? 0.6 : 1 }}
          >
            {confirmLabel || t(locale, 'panel.common.save')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
