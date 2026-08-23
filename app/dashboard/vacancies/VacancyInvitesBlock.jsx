'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../../lib/cn';
import { t, localeHtmlLang } from '../../../lib/i18n';
import { useAppFeedback } from '../../_components/AppFeedback';
import { inviteStatusLabel } from './vacancy-admin-shared';

export function VacancyInvitesBlock({ vacancyId, locale, refreshKey }) {
  const { confirm } = useAppFeedback();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState('');

  const fetchInvites = async (cancelled = { current: false }) => {
    setErr('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/invites`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      if (!cancelled.current) setRows(Array.isArray(data.invites) ? data.invites : []);
    } catch (e) {
      if (!cancelled.current) setErr(e?.message || t(locale, 'panel.common.error'));
    }
  };

  useEffect(() => {
    const cancelled = { current: false };
    fetchInvites(cancelled);
    return () => { cancelled.current = true; };
  }, [vacancyId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const remind = async (inviteId) => {
    setBusy(String(inviteId));
    setErr('');
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/invites/${encodeURIComponent(inviteId)}/remind`,
        { method: 'POST' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      await fetchInvites();
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setBusy(null);
    }
  };

  const removeInvite = async (inv) => {
    const ok = await confirm({
      message: t(locale, 'recruiting.inviteDeleteConfirm', {
        name: inv.candidateName || '—',
        email: inv.candidateEmail || '—',
      }),
      danger: true,
    });
    if (!ok) return;
    setBusy(`del:${inv.id}`);
    setErr('');
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/invites/${encodeURIComponent(inv.id)}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      await fetchInvites();
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setBusy(null);
    }
  };

  if (!rows.length && !err) {
    return (
      <div className="mt-2.5 font-mono text-xs text-ink-faint">
        {t(locale, 'recruiting.inviteListTitle')}: —
      </div>
    );
  }

  return (
    <div className="mt-3">
      <span className="mb-2 block font-mono text-xs text-ink-muted">
        {t(locale, 'recruiting.inviteListTitle')}
      </span>
      {err ? (
        <p className="mb-2 mt-0 font-mono text-xs text-danger">{err}</p>
      ) : null}
      <div className="flex max-h-[260px] flex-col gap-1.5 overflow-y-auto">
        {rows.map((inv) => {
          const lastReminder = inv.lastReminderAt ? new Date(inv.lastReminderAt) : null;
          const reminderCount = inv.reminderCount ?? 0;
          const canRemind = ['sent', 'opened'].includes(String(inv.status || ''));
          return (
            <div
              key={inv.id}
              className="flex flex-wrap items-start gap-2 rounded-lg border border-ink/12 bg-ink/[0.02] px-3 py-2.5 font-mono text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-ink">{inv.candidateName}</div>
                <div className="text-[11px] text-ink-muted">{inv.candidateEmail}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-brand-600">{inviteStatusLabel(locale, inv.status)}</span>
                  {reminderCount > 0 && (
                    <span className="text-[11px] text-ink-faint">
                      {t(locale, 'recruiting.reminderSentCount', { n: reminderCount })}
                      {lastReminder
                        ? t(locale, 'recruiting.lastReminderSuffix', {
                            date: lastReminder.toLocaleDateString(localeHtmlLang(locale)),
                          })
                        : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {canRemind ? (
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => remind(inv.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border border-success/35 bg-success/[0.07] px-2.5 py-1.5 text-[11px] text-success',
                      busy ? 'cursor-default' : 'cursor-pointer'
                    )}
                  >
                    {busy === String(inv.id)
                      ? <><span className="spinner" />{t(locale, 'recruiting.sendingShort')}</>
                      : t(locale, 'recruiting.inviteRemind')}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => removeInvite(inv)}
                  title={t(locale, 'recruiting.inviteDelete')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md border border-danger/35 bg-danger/[0.08] px-2.5 py-1.5 text-[11px] text-danger',
                    busy ? 'cursor-default' : 'cursor-pointer'
                  )}
                >
                  {busy === `del:${inv.id}`
                    ? <><span className="spinner" />{t(locale, 'recruiting.removingShort')}</>
                    : t(locale, 'recruiting.inviteRemove')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
