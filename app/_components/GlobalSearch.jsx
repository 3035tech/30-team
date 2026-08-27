'use client';

/**
 * Busca Global com Cmd+K / Ctrl+K
 * UX/UX Melhoria #6 — Navegação rápida para candidatos/vagas/grupos
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '../../lib/cn';

const SEARCH_CATEGORIES = {
  candidates: { label: 'Candidatos', icon: '👤', color: 'text-blue-600' },
  vacancies: { label: 'Vagas', icon: '💼', color: 'text-purple-600' },
  groups: { label: 'Grupos', icon: '👥', color: 'text-green-600' },
};

export function GlobalSearch({ locale = 'pt-BR' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ candidates: [], vacancies: [], groups: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();
  const searchTimeoutRef = useRef(null);

  const labels = locale === 'en' ? {
    placeholder: 'Search candidates, vacancies, groups...',
    noResults: 'No results found',
    pressEnter: 'Press Enter to select',
    or: 'or',
    navigate: 'to navigate',
  } : {
    placeholder: 'Buscar candidatos, vagas, grupos...',
    noResults: 'Nenhum resultado encontrado',
    pressEnter: 'Pressione Enter para selecionar',
    or: 'ou',
    navigate: 'para navegar',
  };

  // Atalho Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus no input quando abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Busca com debounce
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
      setResults(data);
    } catch (err) {
      console.error('[GlobalSearch] Error:', err);
      setResults({ candidates: [], vacancies: [], groups: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  // Flatten results para navegação com teclado
  const flatResults = [
    ...results.candidates.map(item => ({ ...item, type: 'candidates' })),
    ...results.vacancies.map(item => ({ ...item, type: 'vacancies' })),
    ...results.groups.map(item => ({ ...item, type: 'groups' })),
  ];

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(flatResults.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(flatResults[selectedIndex]);
    }
  };

  const handleSelect = (item) => {
    setIsOpen(false);
    setQuery('');

    // Navigate based on type
    if (item.type === 'candidates') {
      router.push(`/dashboard?tab=team&search=${encodeURIComponent(item.name)}`);
    } else if (item.type === 'vacancies') {
      router.push(`/dashboard?tab=vagas&vacancy=${item.id}`);
    } else if (item.type === 'groups') {
      router.push(`/dashboard?tab=group&teamGroup=${item.id}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-[10vh]"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={labels.placeholder}
            className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
          />

          {isLoading && (
            <svg className="animate-spin h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}

          <kbd className="hidden sm:block px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query && flatResults.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-sm text-gray-500">{labels.noResults}</p>
            </div>
          ) : (
            <>
              {Object.entries(SEARCH_CATEGORIES).map(([key, category]) => {
                const items = results[key] || [];
                if (items.length === 0) return null;

                return (
                  <div key={key} className="py-2">
                    <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {category.icon} {category.label}
                    </div>
                    {items.map((item, idx) => {
                      const globalIdx = flatResults.findIndex(
                        r => r.type === key && r.id === item.id
                      );
                      const isSelected = globalIdx === selectedIndex;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect({ ...item, type: key })}
                          className={cn(
                            'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors',
                            isSelected ? 'bg-purple-50' : 'hover:bg-gray-50'
                          )}
                        >
                          <span className={cn('text-2xl', category.color)}>
                            {category.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {item.name || item.title}
                            </div>
                            {item.subtitle && (
                              <div className="text-sm text-gray-500 truncate">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        {flatResults.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono">↑↓</kbd>
                {labels.navigate}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono">Enter</kbd>
                {labels.pressEnter.toLowerCase()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Botão trigger para busca global (opcional)
 */
export function GlobalSearchTrigger({ locale = 'pt-BR' }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    // Trigger Cmd+K programmatically
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const shortcut = isMac ? '⌘K' : 'Ctrl+K';

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span className="hidden sm:inline">Buscar</span>
        <kbd className="hidden sm:inline px-1.5 py-0.5 text-xs font-mono bg-white border border-gray-300 rounded">
          {shortcut}
        </kbd>
      </button>

      {isOpen && <GlobalSearch locale={locale} />}
    </>
  );
}
