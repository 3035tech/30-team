'use client';

/**
 * Global search (Cmd+K / Ctrl+K) — candidates, vacancies, groups.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '../../lib/cn';
import { t } from '../../lib/i18n';
import { Icon } from './Icon';

const CATEGORY_KEYS = ['candidates', 'vacancies', 'groups'];

export function GlobalSearch({ locale = 'pt-BR', open: openProp, onOpenChange }) {
  const controlled = typeof openProp === 'boolean';
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlled ? openProp : internalOpen;
  const setOpen = (next) => {
    if (controlled && typeof onOpenChange === 'function') onOpenChange(next);
    else setInternalOpen(next);
  };

  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ candidates: [], vacancies: [], groups: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();
  const searchTimeoutRef = useRef(null);

  const categoryMeta = useMemo(
    () => ({
      candidates: {
        label: t(locale, 'dashboard.cmdSearch.catCandidates'),
        icon: 'users',
      },
      vacancies: {
        label: t(locale, 'dashboard.cmdSearch.catVacancies'),
        icon: 'vacancies',
      },
      groups: {
        label: t(locale, 'dashboard.cmdSearch.catGroups'),
        icon: 'group',
      },
    }),
    [locale]
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults({ candidates: [], vacancies: [], groups: [] });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults({
        candidates: Array.isArray(data.candidates) ? data.candidates : [],
        vacancies: Array.isArray(data.vacancies) ? data.vacancies : [],
        groups: Array.isArray(data.groups) ? data.groups : [],
      });
    } catch (err) {
      console.error('[GlobalSearch] Error:', err);
      setResults({ candidates: [], vacancies: [], groups: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, performSearch]);

  const flatResults = [
    ...results.candidates.map((item) => ({ ...item, type: 'candidates' })),
    ...results.vacancies.map((item) => ({ ...item, type: 'vacancies' })),
    ...results.groups.map((item) => ({ ...item, type: 'groups' })),
  ];

  const close = () => {
    setOpen(false);
    setQuery('');
    setSelectedIndex(0);
  };

  const handleSelect = (item) => {
    close();
    if (item.type === 'candidates') {
      router.push(`/dashboard?tab=team&search=${encodeURIComponent(item.name || '')}`);
    } else if (item.type === 'vacancies') {
      router.push(`/dashboard?tab=vacancies&vacancy=${item.id}`);
    } else if (item.type === 'groups') {
      router.push(`/dashboard?tab=group&teamGroup=${item.id}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(Math.max(flatResults.length - 1, 0), prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(flatResults[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-start justify-center bg-ink/45 p-4 pt-[10vh]"
      onClick={close}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-card border border-ink/12 bg-surface shadow-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t(locale, 'dashboard.cmdSearch.title')}
      >
        <div className="flex items-center gap-3 border-b border-ink/10 px-4 py-3">
          <Icon name="search" className="h-5 w-5 shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t(locale, 'dashboard.cmdSearch.placeholder')}
            aria-label={t(locale, 'dashboard.cmdSearch.placeholder')}
            className="min-h-touch flex-1 border-none bg-transparent font-ui text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          {isLoading ? (
            <span className="font-mono text-2xs text-ink-faint">{t(locale, 'panel.common.loading')}</span>
          ) : null}
          <kbd className="hidden rounded-control border border-ink/12 bg-canvas px-2 py-1 font-mono text-2xs text-ink-muted sm:inline">
            Esc
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query && flatResults.length === 0 && !isLoading ? (
            <p className="m-0 px-4 py-10 text-center font-ui text-prose text-ink-muted">
              {t(locale, 'dashboard.cmdSearch.noResults')}
            </p>
          ) : (
            CATEGORY_KEYS.map((key) => {
              const category = categoryMeta[key];
              const items = results[key] || [];
              if (!items.length) return null;
              return (
                <div key={key} className="py-2">
                  <div className="px-4 py-1.5 font-mono text-2xs font-semibold uppercase tracking-wide text-ink-faint">
                    {category.label}
                  </div>
                  {items.map((item) => {
                    const globalIdx = flatResults.findIndex((r) => r.type === key && r.id === item.id);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect({ ...item, type: key })}
                        className={cn(
                          'flex min-h-touch w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          isSelected ? 'bg-brand-500/10' : 'hover:bg-canvas'
                        )}
                      >
                        <Icon name={category.icon} className="h-4 w-4 shrink-0 text-brand-600" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-ui text-sm text-ink">{item.name || item.title}</div>
                          {item.subtitle ? (
                            <div className="truncate font-mono text-2xs text-ink-faint">{item.subtitle}</div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {flatResults.length > 0 ? (
          <div className="flex items-center gap-4 border-t border-ink/10 px-4 py-2.5 font-mono text-2xs text-ink-faint">
            <span>
              <kbd className="rounded border border-ink/12 bg-canvas px-1.5 py-0.5">↑↓</kbd>{' '}
              {t(locale, 'dashboard.cmdSearch.navigate')}
            </span>
            <span>
              <kbd className="rounded border border-ink/12 bg-canvas px-1.5 py-0.5">Enter</kbd>{' '}
              {t(locale, 'dashboard.cmdSearch.select')}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function GlobalSearchTrigger({ locale = 'pt-BR' }) {
  const [open, setOpen] = useState(false);
  const isMac =
    typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');
  const shortcut = isMac ? '⌘K' : 'Ctrl+K';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-touch items-center gap-2 rounded-control border border-ink/12 bg-canvas px-3 py-2 font-ui text-prose text-ink-muted"
        aria-label={t(locale, 'dashboard.cmdSearch.open')}
      >
        <Icon name="search" className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">{t(locale, 'dashboard.cmdSearch.trigger')}</span>
        <kbd className="hidden rounded border border-ink/12 bg-surface px-1.5 py-0.5 font-mono text-2xs sm:inline">
          {shortcut}
        </kbd>
      </button>
      <GlobalSearch locale={locale} open={open} onOpenChange={setOpen} />
    </>
  );
}
