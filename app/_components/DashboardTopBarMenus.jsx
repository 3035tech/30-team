'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { redirectManagerIfUnauthorized } from '../../lib/manager-client-session';
import { notificationCopySpec, notificationVisual, NOTIF } from '../../lib/manager-notification-catalog';
import { GlobalSearch } from './GlobalSearch';
import { DarkModeToggle } from './DarkModeProvider';
import { statusToneClass } from './StatusToneChip';
import { EmptyState } from './EmptyState';
import { ContentEnter } from './AppLoading';
import { Icon } from './Icon';

function formatWhen(iso, locale) {
  if (!iso) return '';
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

function riskLevelLabel(locale, level) {
  if (level === 'high') return t(locale, 'turnoverRadar.riskHigh');
  if (level === 'medium') return t(locale, 'turnoverRadar.riskMedium');
  if (level === 'low') return t(locale, 'turnoverRadar.riskLow');
  return level || '—';
}

function notifTitle(locale, item) {
  const spec = notificationCopySpec(item.type, item.payload || {});
  const values = { ...spec.values };
  if (item.type === NOTIF.TURNOVER_RISK_CHANGE) {
    values.from = riskLevelLabel(locale, values.from);
    values.to = riskLevelLabel(locale, values.to);
  }
  return t(locale, spec.titleKey, {
    ...values,
    name: values.name === '—' ? t(locale, 'dashboard.notifSomeone') : values.name,
  });
}

function notifBody(locale, item) {
  const spec = notificationCopySpec(item.type, item.payload || {});
  if (!spec.bodyKey) return '';
  const values = { ...spec.values };
  if (item.type === NOTIF.TURNOVER_RISK_CHANGE) {
    values.from = riskLevelLabel(locale, values.from);
    values.to = riskLevelLabel(locale, values.to);
  }
  return t(locale, spec.bodyKey, values);
}

function toneClasses(tone) {
  if (tone === 'attention') return statusToneClass('warning', { bordered: false });
  if (tone === 'success') return statusToneClass('success', { bordered: false });
  return statusToneClass('brand', { bordered: false });
}

function NotifTypeIcon({ category, tone }) {
  const svgProps = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  let glyph = null;
  if (category === 'assessment') {
    glyph = (
      <svg {...svgProps}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </svg>
    );
  } else if (category === 'vacancy_deadline') {
    glyph = (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  } else if (category === 'vacancy_status') {
    glyph = (
      <svg {...svgProps}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    );
  } else if (category === 'retention') {
    glyph = (
      <svg {...svgProps}>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.3 4.3 2.6 18a1.5 1.5 0 0 0 1.3 2.2h16.2a1.5 1.5 0 0 0 1.3-2.2L13.7 4.3a1.5 1.5 0 0 0-2.6 0Z" />
      </svg>
    );
  } else {
    glyph = (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    );
  }
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-control',
        toneClasses(tone)
      )}
    >
      {glyph}
    </span>
  );
}

/**
 * Bell + dropdown of manager notifications; profile chip opens menu.
 */
export function DashboardTopBarMenus({
  locale,
  auth,
  navigateToTab,
  onNavigateHref,
  onLogout,
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [displayLabel, setDisplayLabel] = useState(
    () => auth?.displayName || auth?.email || ''
  );
  const wrapRef = useRef(null);
  const pollTimerRef = useRef(null);

  const loadNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/me/notifications?limit=20');
      if (redirectManagerIfUnauthorized(res.status)) return;
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
    } catch {
      /* ignore */
    }
  }, []);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current != null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPoll = useCallback(() => {
    clearPoll();
    pollTimerRef.current = setInterval(loadNotifs, 15000);
  }, [clearPoll, loadNotifs]);

  useEffect(() => {
    loadNotifs();
    const syncPolling = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        clearPoll();
        return;
      }
      loadNotifs();
      startPoll();
    };
    syncPolling();
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncPolling();
      else clearPoll();
    };
    const onFocus = () => {
      loadNotifs();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      clearPoll();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadNotifs, startPoll, clearPoll]);

  useEffect(() => {
    setDisplayLabel(auth?.displayName || auth?.email || '');
  }, [auth?.displayName, auth?.email]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const markReadAndGo = async (item) => {
    try {
      if (!item.readAt) {
        const res = await fetch('/api/me/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : Math.max(0, unreadCount - 1));
          setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, readAt: new Date().toISOString() } : x)));
        }
      }
    } catch {
      /* still navigate */
    }
    setNotifOpen(false);
    if (item.href && typeof onNavigateHref === 'function') {
      onNavigateHref(item.href);
    }
  };

  const markAll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/me/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUnreadCount(0);
        setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
      }
    } finally {
      setLoading(false);
    }
  };

  const dropdownClass =
    'absolute right-0 top-[calc(100%+8px)] z-40 w-80 max-w-[min(320px,92vw)] overflow-hidden rounded-xl border border-ink/12 bg-surface shadow-menu';

  return (
    <div ref={wrapRef} className="flex shrink-0 items-center gap-2">
      {/* Global Search */}
      <GlobalSearch locale={locale} />
      
      {/* Dark Mode Toggle */}
      <DarkModeToggle />
      
      <div className="relative">
        <button
          type="button"
          onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); if (!notifOpen) loadNotifs(); }}
          aria-label={t(locale, 'dashboard.notificationsAria')}
          aria-expanded={notifOpen}
          aria-haspopup="true"
          aria-controls="dashboard-notif-menu"
          className={cn(
            'relative flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-xl border border-ink/12 text-ink-muted',
            notifOpen ? 'bg-brand-500/[0.07]' : 'bg-surface/90'
          )}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.7 1.7 0 0 0 3.4 0" />
          </svg>
          {unreadCount > 0 ? (
            <span className="absolute right-1 top-1 min-w-[16px] rounded-full bg-brand-500 px-1 text-center font-mono text-2xs leading-4 text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
        {notifOpen ? (
          <div id="dashboard-notif-menu" className={cn(dropdownClass, 'db-dropdown-panel')} role="menu">
            <div className="flex items-center justify-between border-b border-ink/12 px-3.5 py-3">
              <span className="font-mono text-xs text-ink">
                {t(locale, 'dashboard.notificationsTitle')}
              </span>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAll}
                  disabled={loading}
                  className="cursor-pointer border-none bg-transparent font-mono text-2xs text-brand-500"
                >
                  {t(locale, 'dashboard.notificationsMarkAll')}
                </button>
              ) : null}
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {items.length === 0 ? (
                <ContentEnter animKey="notif-empty">
                  <div className="p-3">
                    <EmptyState
                      className="px-3 py-5"
                      message={t(locale, 'dashboard.notificationsEmpty')}
                      actionLabel={
                        typeof navigateToTab === 'function'
                          ? t(locale, 'dashboard.notificationsEmptyCta')
                          : undefined
                      }
                      onAction={
                        typeof navigateToTab === 'function'
                          ? () => {
                              setNotifOpen(false);
                              navigateToTab('overview');
                            }
                          : undefined
                      }
                    />
                  </div>
                </ContentEnter>
              ) : items.map((item) => {
                const visual = notificationVisual(item.type, item.payload || {});
                return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => markReadAndGo(item)}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-2.5 border-none border-b border-ink/12 px-3.5 py-3 text-left',
                    item.readAt ? 'bg-transparent' : 'bg-brand-500/[0.03]'
                  )}
                >
                  <NotifTypeIcon category={visual.category} tone={visual.tone} />
                  <div className="min-w-0 flex-1">
                    <div className={cn('text-prose leading-[1.35] text-ink', item.readAt ? 'font-normal' : 'font-semibold')}>
                      {notifTitle(locale, item)}
                    </div>
                    {notifBody(locale, item) ? (
                      <div className="mt-1 text-xs text-ink-muted">{notifBody(locale, item)}</div>
                    ) : null}
                    <div className="mt-1.5 font-mono text-2xs text-ink-faint">
                      {formatWhen(item.createdAt, locale)}
                    </div>
                  </div>
                </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          className={cn(
            'db-profile-btn flex h-[42px] max-w-[200px] cursor-pointer items-center gap-2 rounded-xl border border-ink/12 px-3 font-mono text-xs text-ink-muted',
            profileOpen ? 'bg-brand-500/[0.07]' : 'bg-surface/90'
          )}
          onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
          aria-expanded={profileOpen}
          aria-haspopup="true"
          aria-controls="dashboard-profile-menu"
          aria-label={t(locale, 'dashboard.profileMenuAria')}
        >
          <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-2xs text-brand-500">
            {(displayLabel || '?').slice(0, 1).toUpperCase()}
          </span>
          <span className="db-profile-label overflow-hidden text-ellipsis whitespace-nowrap">
            {displayLabel || t(locale, 'dashboard.profile')}
          </span>
        </button>
        {profileOpen ? (
          <div id="dashboard-profile-menu" className={cn(dropdownClass, 'w-[220px]', 'db-dropdown-panel')} role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => { setProfileOpen(false); navigateToTab('profile'); }}
              className="flex w-full cursor-pointer items-center gap-2.5 border-none border-b border-ink/12 bg-transparent px-3.5 py-3 text-left font-mono text-xs text-ink"
            >
              <Icon name="user" className="h-4 w-4 shrink-0 opacity-80" />
              <span>{t(locale, 'dashboard.profile')}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => { setProfileOpen(false); onLogout(); }}
              className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3.5 py-3 text-left font-mono text-xs text-danger/75"
            >
              <Icon name="logout" className="h-4 w-4 shrink-0 opacity-80" />
              <span>{t(locale, 'dashboard.logout')}</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
