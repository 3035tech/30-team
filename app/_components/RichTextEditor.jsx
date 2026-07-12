'use client';

import { useEffect, useRef } from 'react';
import { t } from '../../lib/i18n';
import { C } from '../../lib/theme';

function ToolbarButton({ label, title, onClick }) {
  return (
    <button
      type="button"
      title={title || label}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      style={{
        background: 'rgba(26,22,37,.04)',
        border: `1px solid ${C.border}`,
        borderRadius: '6px',
        padding: '4px 8px',
        fontSize: '11px',
        fontFamily: 'monospace',
        color: C.muted,
        cursor: 'pointer',
        lineHeight: 1.2,
      }}
    >
      {label}
    </button>
  );
}

/**
 * Editor rico leve (negrito, itálico, listas) para anotações de entrevista.
 * Valor em HTML; onChange recebe HTML.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 140,
  locale = 'pt-BR',
}) {
  const ref = useRef(null);
  const lastHtml = useRef('');
  const ph = placeholder || t(locale, 'recruiting.interviewNotesPh');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = value || '';
    if (next !== lastHtml.current && next !== el.innerHTML) {
      el.innerHTML = next;
      lastHtml.current = next;
    }
  }, [value]);

  const run = (cmd, arg = null) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    const html = ref.current?.innerHTML || '';
    lastHtml.current = html;
    onChange?.(html);
  };

  const emit = () => {
    const html = ref.current?.innerHTML || '';
    lastHtml.current = html;
    onChange?.(html);
  };

  const isEmpty = !value || value === '<br>' || value === '<p><br></p>' || value === '<div><br></div>';

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,.55)' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          padding: '8px',
          borderBottom: `1px solid ${C.border}`,
          background: 'rgba(26,22,37,.03)',
        }}
      >
        <ToolbarButton label="B" title={t(locale, 'editor.bold')} onClick={() => run('bold')} />
        <ToolbarButton label="I" title={t(locale, 'editor.italic')} onClick={() => run('italic')} />
        <ToolbarButton label="U" title={t(locale, 'editor.underline')} onClick={() => run('underline')} />
        <ToolbarButton
          label={t(locale, 'editor.bulletLabel')}
          title={t(locale, 'editor.bulletList')}
          onClick={() => run('insertUnorderedList')}
        />
        <ToolbarButton
          label={t(locale, 'editor.numberedLabel')}
          title={t(locale, 'editor.numberedList')}
          onClick={() => run('insertOrderedList')}
        />
        <ToolbarButton label="H2" title={t(locale, 'editor.heading')} onClick={() => run('formatBlock', 'h2')} />
        <ToolbarButton label="¶" title={t(locale, 'editor.paragraph')} onClick={() => run('formatBlock', 'p')} />
        <ToolbarButton
          label={t(locale, 'editor.clear')}
          title={t(locale, 'editor.clearTitle')}
          onClick={() => run('removeFormat')}
        />
      </div>
      <div style={{ position: 'relative' }}>
        {isEmpty ? (
          <span
            style={{
              position: 'absolute',
              left: '14px',
              top: '12px',
              color: C.faint,
              fontSize: '13px',
              fontFamily: 'Georgia, "Times New Roman", serif',
              pointerEvents: 'none',
            }}
          >
            {ph}
          </span>
        ) : null}
        <div
          ref={ref}
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label={ph}
          onInput={emit}
          onBlur={emit}
          style={{
            minHeight,
            padding: '12px 14px',
            outline: 'none',
            fontSize: '13px',
            lineHeight: 1.55,
            color: C.text,
            fontFamily: 'Georgia, "Times New Roman", serif',
          }}
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
}
