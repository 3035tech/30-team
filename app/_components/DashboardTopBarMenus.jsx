'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../../lib/i18n';
import { C } from '../../lib/theme';
import { notificationCopySpec, notificationVisual } from '../../lib/manager-notification-catalog';

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

function notifTitle(locale, item) {
  const spec = notificationCopySpec(item.type, item.payload || {});
  return t(locale, spec.titleKey, {
    ...spec.values,
    name: spec.values.name === '—' ? t(locale, 'dashboard.notifSomeone') : spec.values.name,
  });
}

function notifBody(locale, item) {
  const spec = notificationCopySpec(item.type, item.payload || {});
  if (!spec.bodyKey) return '';
  return t(locale, spec.bodyKey, spec.values);
}

function toneColors(tone) {
  if (tone === 'attention') {
    return { fg: C.warning, bg: `${C.warning}18` };
  }
  if (tone === 'success') {
    return { fg: C.synergy, bg: `${C.synergy}16` };
  }
  return { fg: C.purple, bg: `${C.purple}14` };
}

function NotifTypeIcon({ category, tone }) {
  const { fg, bg } = toneColors(tone);
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
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '10px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        color: fg,
      }}
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
  const [displayLabel, setDisplayLabel] = useState(auth?.email || auth?.displayName || '');
  const wrapRef = useRef(null);

  const loadNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/me/notifications?limit=20');
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
    const id = setInterval(loadNotifs, 60000);
    return () => clearInterval(id);
  }, [loadNotifs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const u = data.user || {};
        setDisplayLabel(u.displayName || u.email || '');
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [auth?.email, auth?.displayName]);

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

  const dropdown = {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 8px)',
    width: '320px',
    maxWidth: 'min(320px, 92vw)',
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
    zIndex: 40,
    overflow: 'hidden',
  };

  return (
    <div ref={wrapRef} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); if (!notifOpen) loadNotifs(); }}
          aria-label={t(locale, 'dashboard.notificationsAria')}
          aria-expanded={notifOpen}
          style={{
            position: 'relative',
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            border: `1px solid ${C.border}`,
            background: notifOpen ? `${C.purple}12` : 'rgba(255,255,255,.9)',
            color: C.muted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.7 1.7 0 0 0 3.4 0" />
          </svg>
          {unreadCount > 0 ? (
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              minWidth: '16px',
              height: '16px',
              padding: '0 4px',
              borderRadius: '999px',
              background: C.purple,
              color: '#fff',
              fontSize: '10px',
              fontFamily: 'monospace',
              lineHeight: '16px',
              textAlign: 'center',
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
        {notifOpen ? (
          <div style={dropdown} role="menu">
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: C.text }}>
                {t(locale, 'dashboard.notificationsTitle')}
              </span>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAll}
                  disabled={loading}
                  style={{
                    background: 'transparent', border: 'none', color: C.purple,
                    fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer',
                  }}
                >
                  {t(locale, 'dashboard.notificationsMarkAll')}
                </button>
              ) : null}
            </div>
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {items.length === 0 ? (
                <p style={{ margin: 0, padding: '16px', fontSize: '12px', color: C.muted }}>
                  {t(locale, 'dashboard.notificationsEmpty')}
                </p>
              ) : items.map((item) => {
                const visual = notificationVisual(item.type, item.payload || {});
                return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => markReadAndGo(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    border: 'none',
                    borderBottom: `1px solid ${C.border}`,
                    background: item.readAt ? 'transparent' : `${C.purple}08`,
                    cursor: 'pointer',
                  }}
                >
                  <NotifTypeIcon category={visual.category} tone={visual.tone} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '13px', color: C.text, fontWeight: item.readAt ? 400 : 600, lineHeight: 1.35 }}>
                      {notifTitle(locale, item)}
                    </div>
                    {notifBody(locale, item) ? (
                      <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>{notifBody(locale, item)}</div>
                    ) : null}
                    <div style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace', marginTop: '6px' }}>
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

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
          aria-expanded={profileOpen}
          aria-label={t(locale, 'dashboard.profileMenuAria')}
          style={{
            maxWidth: '200px',
            height: '42px',
            borderRadius: '12px',
            border: `1px solid ${C.border}`,
            background: profileOpen ? `${C.purple}12` : 'rgba(255,255,255,.9)',
            color: C.muted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 12px',
            fontFamily: 'monospace',
            fontSize: '12px',
          }}
        >
          <span style={{
            width: '26px', height: '26px', borderRadius: '8px',
            background: `${C.purple}18`, color: C.purple, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0,
          }}>
            {(displayLabel || '?').slice(0, 1).toUpperCase()}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayLabel || t(locale, 'dashboard.profile')}
          </span>
        </button>
        {profileOpen ? (
          <div style={{ ...dropdown, width: '220px' }} role="menu">
            <button
              type="button"
              onClick={() => { setProfileOpen(false); navigateToTab('profile'); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px',
                border: 'none', borderBottom: `1px solid ${C.border}`, background: 'transparent',
                cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', color: C.text,
              }}
            >
              {t(locale, 'dashboard.profile')}
            </button>
            <button
              type="button"
              onClick={() => { setProfileOpen(false); onLogout(); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px',
                border: 'none', background: 'transparent',
                cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', color: 'rgba(220,38,38,.75)',
              }}
            >
              {t(locale, 'dashboard.logout')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
