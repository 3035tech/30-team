'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const EmployeeNavContext = createContext(null);

const COLLAPSE_KEY = 'team30_employee_nav_collapsed';

function readCollapsed() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Home section hashes the sidebar can focus (dedicated modules use their own routes). */
export const EMPLOYEE_SECTION_IDS = Object.freeze([
  'tasks',
  'journey',
  'surveys',
  'pdi',
  'okr',
  'oneOnOne',
  'variablePay',
  'feedback',
  'feed',
  'kudos',
  'company',
]);

/**
 * Shared nav state for collaborator chrome (badges, scroll-spy, collapse, section focus).
 * Menu always lists functionalities; empty sections show EmptyState when focused.
 */
export function EmployeeNavProvider({ children }) {
  const [activeSection, setActiveSection] = useState('tasks');
  const [badges, setBadges] = useState({});
  const [navCollapsed, setNavCollapsedState] = useState(false);
  /** { id, nonce } — nonce bumps so re-clicking the same item still opens + scrolls. */
  const [sectionFocus, setSectionFocus] = useState(null);

  useEffect(() => {
    setNavCollapsedState(readCollapsed());
  }, []);

  const setNavCollapsed = useCallback((next) => {
    setNavCollapsedState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0');
      } catch {
        /* ignore */
      }
      return value;
    });
  }, []);

  const setNavMeta = useCallback(({ badges: nextBadges, active } = {}) => {
    if (nextBadges) setBadges((prev) => ({ ...prev, ...nextBadges }));
    if (active) setActiveSection(active);
  }, []);

  const focusSection = useCallback((id) => {
    if (!id || !EMPLOYEE_SECTION_IDS.includes(id)) return;
    setActiveSection(id);
    setSectionFocus((prev) => ({ id, nonce: (prev?.nonce || 0) + 1 }));
  }, []);

  const value = useMemo(
    () => ({
      activeSection,
      setActiveSection,
      badges,
      setNavMeta,
      navCollapsed,
      setNavCollapsed,
      sectionFocus,
      focusSection,
    }),
    [
      activeSection,
      badges,
      setNavMeta,
      navCollapsed,
      setNavCollapsed,
      sectionFocus,
      focusSection,
    ]
  );

  return <EmployeeNavContext.Provider value={value}>{children}</EmployeeNavContext.Provider>;
}

export function useEmployeeNav() {
  const ctx = useContext(EmployeeNavContext);
  if (!ctx) {
    return {
      activeSection: 'tasks',
      setActiveSection: () => {},
      badges: {},
      setNavMeta: () => {},
      navCollapsed: false,
      setNavCollapsed: () => {},
      sectionFocus: null,
      focusSection: () => {},
    };
  }
  return ctx;
}
