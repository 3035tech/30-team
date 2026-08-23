'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { t } from '../../lib/i18n';
import { BR_UF_SET } from '../../lib/candidate-profile';
import { cn } from '../../lib/cn';

function foldCity(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Select / autocomplete de município IBGE, filtrado pela UF. */
export function BrCitySelect({
  uf = '',
  value = '',
  onChange,
  locale = 'pt-BR',
  style,
  className,
  id,
  'aria-label': ariaLabel,
  /** `select` = lista nativa; `autocomplete` = digitar + sugestões IBGE */
  mode = 'select',
}) {
  const ufCode = String(uf || '').trim().toUpperCase();
  const hasUf = BR_UF_SET.has(ufCode);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(String(value || ''));
  const listId = useId();
  const wrapRef = useRef(null);
  const autocomplete = mode === 'autocomplete';

  useEffect(() => {
    setQuery(String(value || ''));
  }, [value]);

  useEffect(() => {
    if (!hasUf) {
      setCities([]);
      setLoading(false);
      setLoadErr(false);
      setOpen(false);
      return undefined;
    }

    let cancelled = false;
    const ctrl = new AbortController();
    setLoading(true);
    setLoadErr(false);

    (async () => {
      try {
        const res = await fetch(`/api/public/br-cities?uf=${encodeURIComponent(ufCode)}`, {
          signal: ctrl.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'fail');
        if (!cancelled) setCities(Array.isArray(data.cities) ? data.cities : []);
      } catch (e) {
        if (e?.name === 'AbortError') return;
        if (!cancelled) {
          setCities([]);
          setLoadErr(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [ufCode, hasUf]);

  useEffect(() => {
    if (!autocomplete) return undefined;
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [autocomplete]);

  const cityValue = String(value || '').trim();
  const inList = cities.includes(cityValue);
  const showLegacy = Boolean(cityValue && !loading && cities.length > 0 && !inList);

  let placeholder = t(locale, 'recruiting.cityPh');
  if (!hasUf) placeholder = t(locale, 'recruiting.citySelectUfFirst');
  else if (loading) placeholder = t(locale, 'recruiting.cityLoading');
  else if (loadErr) placeholder = t(locale, 'recruiting.cityLoadFailed');

  const suggestions = useMemo(() => {
    if (!autocomplete || !hasUf || loading || loadErr) return [];
    const q = foldCity(query);
    const list = !q
      ? cities.slice(0, 12)
      : cities.filter((name) => foldCity(name).includes(q)).slice(0, 12);
    return list;
  }, [autocomplete, hasUf, loading, loadErr, query, cities]);

  if (autocomplete) {
    const showList = open && hasUf && !loading && !loadErr && suggestions.length > 0;
    return (
      <div ref={wrapRef} className={cn('relative w-full', className)}>
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ariaLabel || t(locale, 'recruiting.cityPh')}
          autoComplete="off"
          disabled={!hasUf || loading}
          value={!hasUf ? '' : query}
          placeholder={placeholder}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setOpen(true);
            onChange?.(next);
          }}
          onFocus={() => {
            if (hasUf && !loading) setOpen(true);
          }}
          className={cn(
            'box-border w-full',
            !hasUf || loading ? 'cursor-default' : 'cursor-text',
            !hasUf && 'opacity-65'
          )}
          style={style}
        />
        {loading && hasUf ? (
          <span
            aria-live="polite"
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] opacity-70"
          >
            …
          </span>
        ) : null}
        {showList ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 m-0 max-h-[220px] list-none overflow-y-auto rounded-control border border-ink/16 bg-white py-1.5 shadow-menu"
          >
            {suggestions.map((name) => (
              <li key={name} role="option" aria-selected={name === cityValue}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery(name);
                    onChange?.(name);
                    setOpen(false);
                  }}
                  className={cn(
                    'block w-full cursor-pointer border-none px-3 py-2 text-left font-inherit text-[13px] text-inherit',
                    name === cityValue ? 'bg-ink/[0.06]' : 'bg-transparent'
                  )}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <select
      id={id}
      className={cn(className, !hasUf && 'opacity-65', !hasUf || loading ? 'cursor-default' : 'cursor-pointer')}
      value={showLegacy || inList ? cityValue : ''}
      disabled={!hasUf || loading}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label={ariaLabel || t(locale, 'recruiting.cityPh')}
      style={style}
    >
      <option value="">{placeholder}</option>
      {showLegacy ? <option value={cityValue}>{cityValue}</option> : null}
      {cities.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
