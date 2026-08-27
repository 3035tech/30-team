'use client';

/**
 * Dark Mode Provider + Toggle
 * UX/UX Melhoria #9 — Modo escuro com persistência
 */

import { createContext, useContext, useState, useEffect } from 'react';

const DarkModeContext = createContext({
  isDark: false,
  toggle: () => {},
  setDark: () => {},
});

export function useDarkMode() {
  return useContext(DarkModeContext);
}

export function DarkModeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('team30_dark_mode');
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (stored !== null) {
      setIsDark(stored === 'true');
    } else {
      setIsDark(systemPreference);
    }

    setMounted(true);
  }, []);

  // Apply dark class to document
  useEffect(() => {
    if (!mounted) return;

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    localStorage.setItem('team30_dark_mode', String(isDark));
  }, [isDark, mounted]);

  const toggle = () => setIsDark(prev => !prev);
  const setDark = (value) => setIsDark(value);

  // Prevent flash of unstyled content
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <DarkModeContext.Provider value={{ isDark, toggle, setDark }}>
      {children}
    </DarkModeContext.Provider>
  );
}

/**
 * Toggle button component
 */
export function DarkModeToggle({ className = '' }) {
  const { isDark, toggle } = useDarkMode();

  return (
    <button
      onClick={toggle}
      className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
        isDark
          ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      } ${className}`}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );
}
