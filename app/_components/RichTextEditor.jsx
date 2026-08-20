'use client';

import { useEffect, useRef } from 'react';
import { t } from '../../lib/i18n';
import { isRichTextEmpty } from '../../lib/sanitize-html';
import { C } from '../../lib/theme';

const FONT_SIZES = [
  { value: '12px', key: 'fontSizeSm' },
  { value: '14px', key: 'fontSizeMd' },
  { value: '16px', key: 'fontSizeLg' },
  { value: '18px', key: 'fontSizeXl' },
];

function ToolbarButton({ label, title, onClick, style: extraStyle }) {
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
        color: C.text,
        cursor: 'pointer',
        lineHeight: 1.2,
        ...extraStyle,
      }}
    >
      {label}
    </button>
  );
}

function ToolbarSelect({ value, onChange, title, children }) {
  return (
    <select
      title={title}
      value={value}
      onMouseDown={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: 'rgba(26,22,37,.04)',
        border: `1px solid ${C.border}`,
        borderRadius: '6px',
        padding: '4px 6px',
        fontSize: '11px',
        fontFamily: 'monospace',
        color: C.text,
        cursor: 'pointer',
        maxWidth: '110px',
      }}
    >
      {children}
    </select>
  );
}

/**
 * Editor rico leve para notas livres.
 * Valor em HTML; onChange recebe HTML.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 140,
  locale = 'pt-BR',
  'aria-label': ariaLabel,
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

  const pushHtml = () => {
    const html = ref.current?.innerHTML || '';
    lastHtml.current = html;
    onChange?.(html);
  };

  const run = (cmd, arg = null) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    pushHtml();
  };

  const applyFontSize = (px) => {
    if (!px) return;
    ref.current?.focus();
    document.execCommand('styleWithCSS', false, true);
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      // Sem seleção: aplica ao bloco atual via fontSize legado e troca o span
      document.execCommand('fontSize', false, '3');
    } else {
      document.execCommand('fontSize', false, '7');
    }
    const root = ref.current;
    if (root) {
      root.querySelectorAll('font[size], span[style*="font-size"]').forEach((node) => {
        if (node.tagName === 'FONT') {
          const span = document.createElement('span');
          span.style.fontSize = px;
          while (node.firstChild) span.appendChild(node.firstChild);
          node.parentNode?.replaceChild(span, node);
        } else if (node.style?.fontSize) {
          node.style.fontSize = px;
        }
      });
    }
    pushHtml();
  };

  const emit = () => pushHtml();

  const onKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      run(e.shiftKey ? 'outdent' : 'indent');
    }
  };

  const isEmpty = isRichTextEmpty(value);

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,.85)' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '6px',
          padding: '8px',
          borderBottom: `1px solid ${C.border}`,
          background: 'rgba(26,22,37,.04)',
        }}
      >
        <ToolbarButton label="B" title={t(locale, 'editor.bold')} onClick={() => run('bold')} style={{ fontWeight: 700 }} />
        <ToolbarButton label="I" title={t(locale, 'editor.italic')} onClick={() => run('italic')} style={{ fontStyle: 'italic' }} />
        <ToolbarButton label="U" title={t(locale, 'editor.underline')} onClick={() => run('underline')} style={{ textDecoration: 'underline' }} />
        <ToolbarButton
          label="S"
          title={t(locale, 'editor.strike')}
          onClick={() => run('strikeThrough')}
          style={{ textDecoration: 'line-through' }}
        />
        <ToolbarSelect
          value=""
          title={t(locale, 'editor.fontSize')}
          onChange={(px) => applyFontSize(px)}
        >
          <option value="">{t(locale, 'editor.fontSize')}</option>
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {t(locale, `editor.${s.key}`)}
            </option>
          ))}
        </ToolbarSelect>
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
        <ToolbarButton label="⇥" title={t(locale, 'editor.indent')} onClick={() => run('indent')} />
        <ToolbarButton label="⇤" title={t(locale, 'editor.outdent')} onClick={() => run('outdent')} />
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
          aria-label={ariaLabel || ph}
          onInput={emit}
          onBlur={emit}
          onKeyDown={onKeyDown}
          className="rich-text-body"
          style={{
            minHeight,
            padding: '12px 14px',
            outline: 'none',
            fontSize: '14px',
            lineHeight: 1.55,
            color: C.text,
            fontFamily: 'Georgia, "Times New Roman", serif',
          }}
          suppressContentEditableWarning
        />
      </div>
      <style>{`
        .rich-text-body ul, .rich-text-view ul { margin: 0.35em 0; padding-left: 1.4em; list-style: disc; }
        .rich-text-body ol, .rich-text-view ol { margin: 0.35em 0; padding-left: 1.4em; list-style: decimal; }
        .rich-text-body li, .rich-text-view li { margin: 0.15em 0; }
        .rich-text-body h2, .rich-text-view h2 { font-size: 1.15em; margin: 0.5em 0 0.25em; font-weight: 600; }
        .rich-text-body p, .rich-text-view p { margin: 0.35em 0; }
        .rich-text-body blockquote, .rich-text-view blockquote { margin: 0.4em 0; padding-left: 0.8em; border-left: 3px solid ${C.border}; color: ${C.muted}; }
      `}</style>
    </div>
  );
}
