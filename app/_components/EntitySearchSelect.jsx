'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { dialogFieldClass } from './app-dialog-styles';

/**
 * Typeahead: search by label, store id.
 * Expects GET searchUrl?q=… → { ok, items: [{ id, label, email? }] }
 */
export function EntitySearchSelect({
  value = '',
  onChange,
  searchUrl,
  locale = 'pt-BR',
  placeholder = '',
  disabled = false,
  minChars = 1,
  debounceMs = 250,
  'aria-label': ariaLabel,
  className,
}) {
  const listId = useId();
  const wrapRef = useRef(null);
  const [query, setQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const emptyHint = locale === 'en' ? 'Type to search…' : 'Digite para buscar…';
  const noResults = locale === 'en' ? 'No matches' : 'Nenhum resultado';
  const clearLabel = locale === 'en' ? 'Clear' : 'Limpar';

  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      setQuery('');
    }
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (disabled || !searchUrl) return undefined;
    const q = String(query || '').trim();
    if (q.length < minChars || (value && q === selectedLabel)) {
      setItems([]);
      setLoading(false);
      return undefined;
    }

    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL(searchUrl, window.location.origin);
        url.searchParams.set('q', q);
        const res = await fetch(url.pathname + url.search, { signal: ctrl.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error('search failed');
        setItems(Array.isArray(data.items) ? data.items : []);
        setOpen(true);
      } catch (e) {
        if (e?.name === 'AbortError') return;
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, searchUrl, minChars, debounceMs, disabled, value, selectedLabel]);

  function pick(item) {
    setSelectedLabel(item.label);
    setQuery(item.label);
    onChange?.(String(item.id), item);
    setOpen(false);
    setItems([]);
  }

  function clear() {
    setSelectedLabel('');
    setQuery('');
    onChange?.('', null);
    setItems([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={cn('relative mt-1.5', className)}>
      <div className="flex gap-1.5">
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          disabled={disabled}
          value={query}
          placeholder={placeholder || emptyHint}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            if (value) onChange?.('', null);
            setSelectedLabel('');
            setOpen(true);
          }}
          onFocus={() => {
            if (items.length) setOpen(true);
          }}
          className={cn(dialogFieldClass, 'flex-1')}
          autoComplete="off"
        />
        {value ? (
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="min-h-touch shrink-0 rounded-control border border-ink/12 px-2.5 text-xs text-ink-muted hover:text-danger"
            title={clearLabel}
            aria-label={clearLabel}
          >
            ×
          </button>
        ) : null}
      </div>
      {open && (loading || items.length > 0 || String(query).trim().length >= minChars) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-control border border-ink/12 bg-surface py-1 shadow-md"
        >
          {loading ? (
            <li className="px-3 py-2 font-mono text-xs text-ink-faint">…</li>
          ) : items.length === 0 ? (
            <li className="px-3 py-2 font-mono text-xs text-ink-faint">{noResults}</li>
          ) : (
            items.map((item) => (
              <li key={item.id} role="option">
                <button
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-brand-500/10"
                  onClick={() => pick(item)}
                >
                  <span className="font-display text-sm text-ink">{item.label}</span>
                  {item.email ? (
                    <span className="font-mono text-[11px] text-ink-faint">{item.email}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
