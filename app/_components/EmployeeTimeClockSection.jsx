'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { t, localeHtmlLang } from '../../lib/i18n';
import { TIME_PUNCH_KIND } from '../../lib/domain-status.js';
import { cn } from '../../lib/cn';
import { formatDisplayDate } from '../../lib/format-display-date';
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
      <div>
        <EmptyState
          title={t(locale, 'employeeHome.timeClock.emptyTitle')}
          message={t(locale, 'employeeHome.timeClock.loadError')}
        />
        <button type="button" className={S.btnGhost} onClick={() => void load()}>
          {t(locale, 'common.retry')}
        </button>
      </div>
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
          <label className="inline-flex min-h-touch cursor-pointer items-center gap-2 text-xs text-ink-muted">
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

      <p className="mb-2 mt-0 text-xs text-ink-muted">
        {t(locale, 'employeeHome.timeClock.dayLabel', { day: formatDisplayDate(data.day, locale) })}
      </p>
      {(data.punches || []).length === 0 ? (
        <p className={cn(S.muted, 'mb-0 text-prose')}>{t(locale, 'employeeHome.timeClock.noPunches')}</p>
      ) : (
        <ol aria-label={t(locale, 'employeeHome.timeClock.timelineLabel')} className="m-0 list-none p-0">
          {data.punches.map((p, index) => (
            <li
              key={p.id}
              className="grid grid-cols-[4rem_1rem_minmax(0,1fr)] gap-x-3"
            >
              <time dateTime={p.punchedAt} className="pt-3 text-right font-mono text-sm tabular-nums text-ink">{formatTime(p.punchedAt, locale)}</time>
              <div className="relative flex justify-center" aria-hidden="true">
                {index < data.punches.length - 1 ? <span className="absolute -bottom-5 left-1/2 top-5 w-px -translate-x-1/2 bg-ink/15" /> : null}
                <span className={cn('relative mt-4 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-canvas', p.punchKind === TIME_PUNCH_KIND.IN ? 'bg-success' : 'bg-info')} />
              </div>
              <div className={cn('min-w-0 pt-2', index < data.punches.length - 1 ? 'pb-6' : 'pb-2')}>
                <div className="flex min-h-8 flex-wrap items-center gap-2">
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
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </ContentEnter>
  );
}
