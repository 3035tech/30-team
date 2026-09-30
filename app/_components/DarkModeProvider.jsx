'use client';

/**
 * Dark mode: class on <html>, preference in localStorage (written only when the user toggles).
 * Resolution rules live in lib/theme-mode.js. Printing always renders light.
 */

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { cn } from '../../lib/cn';
import { DARK_MODE_STORAGE_KEY, resolveDarkMode } from '../../lib/theme-mode';

export { DARK_MODE_STORAGE_KEY };

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
  const isDarkRef = useRef(false);
  const printSwapRef = useRef(false);

  useEffect(() => {
    let stored = null;
    try {
      stored = localStorage.getItem(DARK_MODE_STORAGE_KEY);
    } catch {
      /* storage blocked */
    }
    const osDark = Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    const next = resolveDarkMode(stored, window.location.pathname, osDark);
    setIsDark(next);
    applyDarkClass(next);
    setMounted(true);
  }, []);

  useEffect(() => {
    isDarkRef.current = isDark;
    if (!mounted) return;
    applyDarkClass(isDark);
  }, [isDark, mounted]);

  useEffect(() => {
    if (!mounted) return undefined;
    const beforePrint = () => {
      if (!isDarkRef.current) return;
      printSwapRef.current = true;
      flushSync(() => setIsDark(false));
    };
    const afterPrint = () => {
      if (!printSwapRef.current) return;
      printSwapRef.current = false;
      setIsDark(true);
    };
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [mounted]);

  const setDark = (value) => {
    const next = Boolean(value);
    try {
      localStorage.setItem(DARK_MODE_STORAGE_KEY, String(next));
    } catch {
      /* storage blocked */
    }
    setIsDark(next);
  };
  const toggle = () => setDark(!isDarkRef.current);

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
