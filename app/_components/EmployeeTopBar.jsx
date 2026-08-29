'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { formatDisplayDateTime } from '../../lib/format-display-date';
import { S } from '../dashboard/dashboard-shared';
import { BrandMark } from './BrandMark';
import { DarkModeToggle } from './DarkModeProvider';
import LanguageSelect from './LanguageSelect';
import { EmptyState } from './EmptyState';
import { Icon } from './Icon';
import { useEmployeeNav } from './EmployeeNavContext';

/**
 * Collaborator chrome — theme, locale, notifications, profile menu.
 * Brand lives in the sidebar; this bar stays compact for notebook/desktop.
 */
export function EmployeeTopBar({
  locale,
  onLocaleChange,
  displayName,
  companyName,
}) {
  const router = useRouter();
  const { focusSection } = useEmployeeNav();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapRef = useRef(null);
  const pollRef = useRef(null);

  const loadNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/employee/notifications?limit=20');
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadNotifs();
    pollRef.current = setInterval(loadNotifs, 20000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadNotifs]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const persistLocale = async (next) => {
    onLocaleChange?.(next);
    try {
      await fetch('/api/employee/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredLocale: next }),
      });
    } catch {
      /* ignore */
    }
  };

  const markReadAndGo = async (item) => {
    try {
      if (!item.readAt) {
        await fetch('/api/employee/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id }),
        });
      }
    } catch {
      /* ignore */
    }
    setNotifOpen(false);
    const href = item.href || '/employee';
    const hash = href.includes('#') ? href.split('#')[1] : '';
    if (hash && (href.startsWith('/employee#') || href === `#${hash}`)) {
      router.push('/employee');
      // After navigation, focus expands + scrolls even if already on home
      window.setTimeout(() => focusSection(hash), 0);
    } else {
      router.push(href);
    }
    void loadNotifs();
  };

  const markAll = async () => {
    await fetch('/api/employee/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    void loadNotifs();
  };

  const logout = async () => {
    await fetch('/api/auth/employee/session', { method: 'DELETE' });
    router.replace('/employee/login');
  };

  return (
    <header className="emp-topbar sticky top-0 z-30 border-b border-ink/10 bg-canvas/90 backdrop-blur">
      <div
        ref={wrapRef}
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 pl-14 md:pl-4 lg:px-6"
      >
        <div className="flex min-w-0 items-center gap-2 md:hidden">
          <BrandMark size={22} withWordmark href="/employee" />
          {companyName ? (
            <span className="truncate font-mono text-2xs text-ink-faint">{companyName}</span>
          ) : null}
        </div>
        <p className="m-0 hidden min-w-0 truncate font-ui text-prose text-ink-muted md:block">
          {displayName
            ? t(locale, 'employeeHome.hello', { name: displayName })
            : t(locale, 'employeeHome.eyebrow')}
        </p>

        <div className="ml-auto flex items-center gap-1.5">
          <LanguageSelect locale={locale} onChange={persistLocale} compact />
          <DarkModeToggle />

          <div className="relative">
            <button
              type="button"
              className={cn(S.btnGhost, 'relative min-h-touch px-2')}
              aria-label={t(locale, 'employeeHome.notificationsAria')}
              onClick={() => {
                setNotifOpen((v) => !v);
                setProfileOpen(false);
                void loadNotifs();
              }}
            >
              <Icon name="bell" />
              {unreadCount > 0 ? (
                <span className="absolute right-1 top-1 min-w-[16px] rounded-full bg-danger px-1 text-center font-mono text-2xs text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </button>
            {notifOpen ? (
              <div className="absolute right-0 z-50 mt-1 w-[min(100vw-2rem,320px)] rounded-control border border-ink/12 bg-surface p-2 shadow-card">
                <div className="mb-1 flex items-center justify-between gap-2 px-1">
                  <span className={S.label}>{t(locale, 'employeeHome.notificationsTitle')}</span>
                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      className="border-none bg-transparent p-0 font-mono text-2xs text-brand-600"
                      onClick={markAll}
                    >
                      {t(locale, 'employeeHome.notificationsMarkAll')}
                    </button>
                  ) : null}
                </div>
                {items.length === 0 ? (
                  <EmptyState
                    className="border-0 bg-transparent px-2 py-4"
                    message={t(locale, 'employeeHome.notificationsEmpty')}
                    actionLabel={t(locale, 'employeeHome.notificationsEmptyCta')}
                    onAction={() => {
                      setNotifOpen(false);
                      router.push('/employee#tasks');
                    }}
                  />
                ) : (
                  <ul className="m-0 max-h-72 list-none overflow-y-auto p-0">
                    {items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={cn(
                            'w-full rounded-control border-none px-2 py-2 text-left',
                            item.readAt ? 'bg-transparent' : 'bg-brand-500/[0.06]'
                          )}
                          onClick={() => markReadAndGo(item)}
                        >
                          <div className="text-prose text-ink">
                            {t(locale, item.copy?.titleKey || 'employeeHome.notifGenericTitle', item.copy?.values)}
                          </div>
                          <div className="mt-0.5 text-2xs text-ink-muted">
                            {t(locale, item.copy?.bodyKey || 'employeeHome.notifGenericBody', item.copy?.values)}
                          </div>
                          <div className="mt-1 font-mono text-2xs text-ink-faint">
                            {formatDisplayDateTime(item.createdAt, locale, { fallback: '' })}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              className={cn(S.btnGhost, 'min-h-touch max-w-[140px] truncate px-2 text-xs')}
              aria-label={t(locale, 'employeeHome.profileMenuAria')}
              onClick={() => {
                setProfileOpen((v) => !v);
                setNotifOpen(false);
              }}
            >
              {displayName || t(locale, 'employeeHome.profile')}
            </button>
            {profileOpen ? (
              <div className="absolute right-0 z-50 mt-1 w-44 rounded-control border border-ink/12 bg-surface p-1 shadow-card">
                <Link
                  href="/employee/profile"
                  className={cn(S.btnGhost, 'flex min-h-touch w-full justify-start no-underline')}
                  onClick={() => setProfileOpen(false)}
                >
                  {t(locale, 'employeeHome.profile')}
                </Link>
                <button
                  type="button"
                  className={cn(S.btnGhost, 'flex min-h-touch w-full justify-start text-danger')}
                  onClick={logout}
                >
                  {t(locale, 'employeeHome.logout')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
