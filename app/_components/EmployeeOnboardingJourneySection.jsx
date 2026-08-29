'use client';

import { useCallback, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { formatDisplayDate } from '../../lib/format-display-date';
import { S } from '../dashboard/dashboard-shared';
import { useAppFeedback } from './AppFeedback';

function itemTitle(locale, item) {
  if (item.kind === 'checkin') {
    return t(locale, 'employeeHome.journeyCheckin', { days: item.milestoneDays });
  }
  return t(locale, `employeeHome.journeyItem.${item.itemKey}`);
}

function statusBadge(locale, item) {
  if (item.hrDone) {
    return (
      <span className="font-mono text-2xs text-success">
        {t(locale, 'employeeHome.journeyHrDone')}
      </span>
    );
  }
  if (item.overdue) {
    return (
      <span className="font-mono text-2xs text-warning">
        {t(locale, 'employeeHome.journeyOverdue')}
      </span>
    );
  }
  return (
    <span className="font-mono text-2xs text-ink-faint">
      {t(locale, 'employeeHome.journeyPending')}
    </span>
  );
}

/**
 * Minha chegada — timeline D1 + D30/D60/D90 no espaço do colaborador.
 */
export function EmployeeOnboardingJourneySection({ locale, journey, onChanged }) {
  const { toast } = useAppFeedback();
  const [busyId, setBusyId] = useState(null);

  const ack = useCallback(
    async (item) => {
      if (item.employeeAckAt || !item.canAck) return;
      setBusyId(`${item.kind}-${item.id}`);
      try {
        const res = await fetch('/api/employee/onboarding', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: item.kind, itemId: item.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'ack');
        toast(t(locale, 'employeeHome.journeyAckOk'), 'ok');
        if (typeof onChanged === 'function') await onChanged(data.journey);
      } catch (e) {
        toast(e?.message || t(locale, 'employeeHome.journeyAckError'), 'error');
      } finally {
        setBusyId(null);
      }
    },
    [locale, onChanged, toast]
  );

  if (!journey?.preItems?.length && !journey?.checkins?.length) return null;

  const timeline = [
    ...(journey.preItems || []).map((item) => ({ ...item, phase: 'd1' })),
    ...(journey.checkins || []).map((item) => ({ ...item, phase: 'post' })),
  ];

  return (
    <div className="flex flex-col gap-2">
      {journey.startDate ? (
        <p className={cn(S.muted, 'm-0')}>
          {t(locale, 'employeeHome.journeyStart', {
            date: formatDisplayDate(journey.startDate, locale),
          })}
        </p>
      ) : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {timeline.map((item) => {
          const key = `${item.kind}-${item.id}`;
          const ackLabel =
            item.ackType === 'received'
              ? t(locale, 'employeeHome.journeyAckReceived')
              : t(locale, 'employeeHome.journeyAckCall');
          return (
            <li
              key={key}
              className={cn(
                'rounded-control border px-3 py-2.5',
                item.overdue && !item.hrDone
                  ? 'border-warning/30 bg-warning/[0.05]'
                  : 'border-ink/12 bg-canvas/50'
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className={S.cardBody}>{itemTitle(locale, item)}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-2xs text-ink-muted">
                    {item.dueDate ? (
                      <span>
                        {t(locale, 'employeeHome.dueBy', {
                          date: formatDisplayDate(item.dueDate, locale),
                        })}
                      </span>
                    ) : null}
                    {statusBadge(locale, item)}
                    {item.employeeAckAt ? (
                      <span className="text-success">{t(locale, 'employeeHome.journeyAcked')}</span>
                    ) : null}
                  </div>
                </div>
                {item.meetUrl ? (
                  <a
                    href={item.meetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(S.btnBrandSoft, 'shrink-0 text-prose no-underline')}
                  >
                    {t(locale, 'employeeHome.journeyOpenMeet')}
                  </a>
                ) : null}
              </div>
              {item.canAck && !item.employeeAckAt ? (
                <button
                  type="button"
                  disabled={busyId === key}
                  className={cn(S.btnGhost, 'mt-2 text-xs')}
                  onClick={() => ack(item)}
                >
                  {ackLabel}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
