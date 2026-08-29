'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { BrandMark } from './BrandMark';
import { DarkModeToggle } from './DarkModeProvider';
import LanguageSelect from './LanguageSelect';
import { Icon } from './Icon';

function formatWhen(iso, locale) {
  try {
    return new Date(iso).toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Collaborator chrome — theme, locale, notifications, profile menu.
 */
export function EmployeeTopBar({
  locale,
  onLocaleChange,
  displayName,
  companyName,
}) {
  const router = useRouter();
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
    router.push(item.href || '/employee');
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
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-canvas/90 backdrop-blur">
      <div
        ref={wrapRef}
        className="mx-auto flex max-w-lg flex-wrap items-center justify-between gap-2 px-4 py-2.5"
      >
        <Link href="/employee" className="flex min-w-0 items-center gap-2 no-underline">
          <BrandMark size={24} withWordmark />
          {companyName ? (
            <span className="hidden truncate font-mono text-2xs text-ink-faint sm:inline">
              {companyName}
            </span>
          ) : null}
        </Link>

        <div className="flex items-center gap-1.5">
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
                  <p className={cn(S.faint, 'm-0 px-1 py-3 text-xs')}>
                    {t(locale, 'employeeHome.notificationsEmpty')}
                  </p>
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
                          <div className="text-xs text-ink">
                            {t(locale, item.copy?.titleKey || 'employeeHome.notifGenericTitle', item.copy?.values)}
                          </div>
                          <div className="mt-0.5 text-2xs text-ink-muted">
                            {t(locale, item.copy?.bodyKey || 'employeeHome.notifGenericBody', item.copy?.values)}
                          </div>
                          <div className="mt-1 font-mono text-2xs text-ink-faint">
                            {formatWhen(item.createdAt, locale)}
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
