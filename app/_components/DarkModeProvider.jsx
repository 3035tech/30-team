'use client';

/**
 * Dark mode — class on <html>, preference in localStorage.
 * Default: light (does not follow OS until the user chooses dark once).
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { cn } from '../../lib/cn';

export const DARK_MODE_STORAGE_KEY = 'team30_dark_mode';

const DarkModeContext = createContext({
  isDark: false,
  toggle: () => {},
  setDark: () => {},
});

export function useDarkMode() {
  return useContext(DarkModeContext);
}

function applyDarkClass(isDark) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', Boolean(isDark));
}

export function DarkModeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY);
    // Default light when nothing saved (ignore OS preference).
    const next = stored === 'true';
    setIsDark(next);
    applyDarkClass(next);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyDarkClass(isDark);
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(isDark));
  }, [isDark, mounted]);

  const toggle = () => setIsDark((prev) => !prev);
  const setDark = (value) => setIsDark(Boolean(value));

  return (
    <DarkModeContext.Provider value={{ isDark, toggle, setDark }}>
      {children}
    </DarkModeContext.Provider>
  );
}

/** Toggle in the dashboard top bar (persists via provider). */
export function DarkModeToggle({ className = '' }) {
  const { isDark, toggle } = useDarkMode();

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'flex h-10 w-10 min-h-touch min-w-touch items-center justify-center rounded-control border border-ink/12 transition-colors',
        isDark
          ? 'bg-ink/[0.08] text-warning hover:bg-ink/[0.12]'
          : 'bg-ink/[0.04] text-ink-muted hover:bg-ink/[0.08]',
        className
      )}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
    >
      {isDark ? (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );
}
