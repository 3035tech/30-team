'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { t, localeHtmlLang } from '../../lib/i18n';
import { TIME_PUNCH_KIND } from '../../lib/domain-status.js';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { AppLoading, ContentEnter } from './AppLoading';
import { useAppFeedback } from './AppFeedback';
import { InlineCallout } from './InlineCallout';
import { StatusToneChip } from './StatusToneChip';
import { EmptyState } from './EmptyState';

function formatTime(value, locale) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(localeHtmlLang(locale), {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Collaborator web time clock (B-2721 MVP).
 */
export function EmployeeTimeClockSection({ locale = 'pt-BR', onBadge = null }) {
  const { toast } = useAppFeedback();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [useGeo, setUseGeo] = useState(false);
  const onBadgeRef = useRef(onBadge);
  onBadgeRef.current = onBadge;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employee/time-clock');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'load');
      setData(json);
      if (typeof onBadgeRef.current === 'function') {
        onBadgeRef.current(json.open ? 1 : 0);
      }
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.timeClock.loadError'), 'error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [locale, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const readGeo = () =>
    new Promise((resolve) => {
      if (!useGeo || typeof navigator === 'undefined' || !navigator.geolocation) {
        resolve({ latitude: null, longitude: null });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        () => resolve({ latitude: null, longitude: null }),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    });

  const punch = async () => {
    if (!data?.nextKind) return;
    const kind = data.nextKind;
    setBusy(true);
    try {
      const geo = await readGeo();
      const res = await fetch('/api/employee/time-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          punchKind: kind,
          latitude: geo.latitude,
          longitude: geo.longitude,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'punch');
      setData(json);
      if (typeof onBadgeRef.current === 'function') onBadgeRef.current(json.open ? 1 : 0);
      toast(
        kind === TIME_PUNCH_KIND.IN
          ? t(locale, 'employeeHome.timeClock.punchedIn')
          : t(locale, 'employeeHome.timeClock.punchedOut'),
        'ok'
      );
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.timeClock.punchError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <AppLoading variant="panel" />;
  if (!data) {
    return (
      <EmptyState
        title={t(locale, 'employeeHome.timeClock.emptyTitle')}
        message={t(locale, 'employeeHome.timeClock.loadError')}
      />
    );
  }

  const nextLabel =
    data.nextKind === TIME_PUNCH_KIND.IN
      ? t(locale, 'employeeHome.timeClock.punchIn')
      : t(locale, 'employeeHome.timeClock.punchOut');

  return (
    <ContentEnter animKey={`emp-clock|${data.day}|${(data.punches || []).length}|${data.open ? 1 : 0}`}>
      <InlineCallout tone="info" className="mb-3">
        {t(locale, 'employeeHome.timeClock.hint', {
          start: data.schedule?.workdayStart || '09:00',
          end: data.schedule?.workdayEnd || '18:00',
        })}
      </InlineCallout>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          className={cn(S.btnPrimary, 'min-h-touch w-full px-5 sm:w-auto')}
          onClick={() => void punch()}
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? t(locale, 'employeeHome.timeClock.punching') : nextLabel}
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {data.open ? (
            <StatusToneChip tone="success">{t(locale, 'employeeHome.timeClock.openShift')}</StatusToneChip>
          ) : (
            <StatusToneChip tone="neutral">{t(locale, 'employeeHome.timeClock.closedShift')}</StatusToneChip>
          )}
          <label className="inline-flex min-h-touch cursor-pointer items-center gap-2 font-mono text-2xs text-ink-muted">
            <input
              type="checkbox"
              className={S.checkbox}
              checked={useGeo}
              onChange={(e) => setUseGeo(e.target.checked)}
              disabled={busy}
            />
            {t(locale, 'employeeHome.timeClock.geoOpt')}
          </label>
        </div>
      </div>

      <p className="mb-2 mt-0 font-mono text-2xs text-ink-faint">
        {t(locale, 'employeeHome.timeClock.dayLabel', { day: data.day })}
      </p>
      {(data.punches || []).length === 0 ? (
        <p className={cn(S.muted, 'mb-0 text-prose')}>{t(locale, 'employeeHome.timeClock.noPunches')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {data.punches.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-2 rounded-control border border-ink/8 bg-ink/[0.02] px-3 py-2"
            >
              <span className="font-mono text-prose text-ink">{formatTime(p.punchedAt, locale)}</span>
              <StatusToneChip tone={p.punchKind === TIME_PUNCH_KIND.IN ? 'success' : 'info'}>
                {p.punchKind === TIME_PUNCH_KIND.IN
                  ? t(locale, 'employeeHome.timeClock.kindIn')
                  : t(locale, 'employeeHome.timeClock.kindOut')}
              </StatusToneChip>
              {p.flag ? (
                <StatusToneChip tone="warning">
                  {t(locale, `employeeHome.timeClock.flag.${p.flag}`)}
                </StatusToneChip>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </ContentEnter>
  );
}
