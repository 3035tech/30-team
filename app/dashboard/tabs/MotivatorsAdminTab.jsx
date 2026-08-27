'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { C } from '../../../lib/theme';
import { Bar, PanelSubNav, S } from '../dashboard-shared';
import { SystemNoticeModal } from '../SystemNoticeModal';
import { useAppFeedback } from '../../_components/AppFeedback';
import { CopyableLink } from '../../_components/CopyableLink';

function dateLocale(locale) {
  return locale === 'en' ? 'en-US' : 'pt-BR';
}

function getViews(locale) {
  return [
    { id: 'dashboard', label: t(locale, 'panel.motivatorsAdmin.tabs.dashboard') },
    { id: 'invites', label: t(locale, 'panel.motivatorsAdmin.tabs.invites') },
    { id: 'results', label: t(locale, 'panel.motivatorsAdmin.tabs.results') },
    { id: 'config', label: t(locale, 'panel.motivatorsAdmin.tabs.config'), adminOnly: true },
  ];
}

function inviteStatusLabel(locale, status) {
  const s = String(status || '').toLowerCase();
  if (s === 'opened') return t(locale, 'panel.motivatorsAdmin.invites.statusOpened');
  if (s === 'completed') return t(locale, 'panel.motivatorsAdmin.invites.statusCompleted');
  if (s === 'cancelled') return t(locale, 'panel.motivatorsAdmin.invites.statusCancelled');
  if (s === 'expired') return t(locale, 'panel.motivatorsAdmin.invites.statusExpired');
  if (s === 'sent') return t(locale, 'panel.motivatorsAdmin.invites.statusSent');
  return status;
}

function statusBadge(locale, status) {
  const tone = {
    sent: 'bg-ink/[0.06] text-ink-muted',
    opened: 'bg-info/10 text-info',
    completed: 'bg-success/10 text-success',
    cancelled: 'bg-danger/10 text-danger',
    expired: 'bg-danger/10 text-danger',
  };
  return (
    <span
      className={cn(
        'rounded-xl px-2 py-0.5 font-mono text-[10px]',
        tone[status] || tone.sent
      )}
    >
      {inviteStatusLabel(locale, status)}
    </span>
  );
}

function InviteForm({ locale, isAdmin, companies, companyId, onSent }) {
  const { promptForm, toast } = useAppFeedback();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const defaultCompanyId = (() => {
    if (companyId && companyId !== 'all') return String(companyId);
    if (isAdmin && companies.length === 1) return String(companies[0].id);
    return '';
  })();

  const openInvite = async () => {
    setErr('');
    setMsg('');
    const fields = [
      {
        key: 'name',
        label: t(locale, 'panel.motivatorsAdmin.invite.namePh'),
        placeholder: t(locale, 'panel.motivatorsAdmin.invite.namePh'),
        defaultValue: '',
      },
      {
        key: 'email',
        label: t(locale, 'panel.motivatorsAdmin.invite.emailPh'),
        placeholder: t(locale, 'panel.motivatorsAdmin.invite.emailPh'),
        defaultValue: '',
      },
    ];
    if (isAdmin) {
      fields.unshift({
        key: 'companyId',
        type: 'select',
        label: t(locale, 'panel.motivatorsAdmin.invite.companyPh'),
        options: [
          { value: '', label: t(locale, 'panel.motivatorsAdmin.invite.companyPh') },
          ...companies.map((c) => ({ value: String(c.id), label: c.name })),
        ],
        defaultValue: defaultCompanyId,
      });
    }

    const values = await promptForm({
      title: t(locale, 'panel.motivatorsAdmin.invite.newInvite'),
      confirmLabel: t(locale, 'panel.motivatorsAdmin.invite.send'),
      fields,
    });
    if (!values) return;

    const name = String(values.name || '').trim();
    const email = String(values.email || '').trim().toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const company = isAdmin ? String(values.companyId || '') : '';
    const companyOk = !isAdmin || (company !== '' && Number.isFinite(Number(company)));

    if (!name) {
      setErr(t(locale, 'panel.motivatorsAdmin.invite.needName'));
      return;
    }
    if (!emailOk) {
      setErr(t(locale, 'panel.motivatorsAdmin.invite.needEmail'));
      return;
    }
    if (isAdmin && !companyOk) {
      setErr(t(locale, 'panel.motivatorsAdmin.invite.needCompany'));
      return;
    }

    setBusy(true);
    try {
      const body = { candidateName: name, candidateEmail: email };
      if (isAdmin) body.companyId = Number(company);
      const res = await fetch('/api/admin/ae/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, 'panel.motivatorsAdmin.invite.sendError'));
      setMsg(t(locale, 'panel.motivatorsAdmin.invite.sendOk', { email: data.sentTo }));
      onSent?.();
      setTimeout(() => setMsg(''), 8000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openBatchInvite = async () => {
    setErr('');
    setMsg('');

    let targetCompanyId = !isAdmin ? null : defaultCompanyId;
    if (isAdmin && !targetCompanyId) {
      const companyPick = await promptForm({
        title: t(locale, 'panel.motivatorsAdmin.invite.batchTitle'),
        confirmLabel: t(locale, 'panel.motivatorsAdmin.invite.batchContinue'),
        fields: [
          {
            key: 'companyId',
            type: 'select',
            label: t(locale, 'panel.motivatorsAdmin.invite.companyPh'),
            options: [
              { value: '', label: t(locale, 'panel.motivatorsAdmin.invite.companyPh') },
              ...companies.map((c) => ({ value: String(c.id), label: c.name })),
            ],
            defaultValue: '',
          },
        ],
      });
      if (!companyPick) return;
      targetCompanyId = String(companyPick.companyId || '');
      if (!targetCompanyId || !Number.isFinite(Number(targetCompanyId))) {
        setErr(t(locale, 'panel.motivatorsAdmin.invite.needCompany'));
        return;
      }
    }

    setBusy(true);
    try {
      const q = new URLSearchParams();
      if (isAdmin && targetCompanyId) q.set('companyId', String(targetCompanyId));
      const res = await fetch(`/api/admin/ae/invites/batch?${q}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, 'panel.motivatorsAdmin.invite.batchLoadError'));

      const eligible = Array.isArray(data.eligible) ? data.eligible : [];
      const cap = Number(data.cap) || 25;
      if (eligible.length === 0) {
        setErr(t(locale, 'panel.motivatorsAdmin.invite.batchEmpty', {
          total: data.total || 0,
        }));
        return;
      }

      const defaultSelected = eligible.slice(0, Math.min(cap, eligible.length)).map((p) => String(p.candidateId));
      const values = await promptForm({
        title: t(locale, 'panel.motivatorsAdmin.invite.batchTitle'),
        confirmLabel: t(locale, 'panel.motivatorsAdmin.invite.batchSend'),
        fields: [
          {
            key: 'people',
            type: 'checkboxGroup',
            label: t(locale, 'panel.motivatorsAdmin.invite.batchPickLabel', {
              n: eligible.length,
              cap,
              skipped: Math.max(0, (data.total || 0) - eligible.length),
            }),
            options: eligible.map((p) => ({
              value: String(p.candidateId),
              label: `${p.name || '—'} · ${p.email}`,
            })),
            defaultValue: defaultSelected,
          },
        ],
      });
      if (!values) return;

      const selected = (Array.isArray(values.people) ? values.people : [])
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));
      if (selected.length === 0) {
        setErr(t(locale, 'panel.motivatorsAdmin.invite.batchNeedPeople'));
        return;
      }

      const body = { candidateIds: selected.slice(0, cap) };
      if (isAdmin && targetCompanyId) body.companyId = Number(targetCompanyId);

      const sendRes = await fetch('/api/admin/ae/invites/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const sendData = await sendRes.json().catch(() => ({}));
      if (!sendRes.ok) {
        throw new Error(sendData.error || t(locale, 'panel.motivatorsAdmin.invite.batchSendError'));
      }

      const summary = t(locale, 'panel.motivatorsAdmin.invite.batchSendOk', {
        sent: sendData.sentCount || 0,
        skipped: sendData.skippedCount || 0,
        failed: sendData.failedCount || 0,
      });
      setMsg(summary);
      toast(summary, sendData.failedCount > 0 ? 'error' : 'ok');
      onSent?.();
      setTimeout(() => setMsg(''), 10000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn(S.card, 'mb-5')}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0">
          <span className={cn(S.label, 'mb-0')}>{t(locale, 'panel.motivatorsAdmin.invite.newInvite')}</span>
          <p className="mb-0 mt-1 text-[11px] leading-snug text-ink-muted">
            {t(locale, 'panel.motivatorsAdmin.invite.batchHint')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openBatchInvite}
            disabled={busy}
            className={cn(
              'min-h-touch rounded-lg border border-brand-500/35 bg-brand-500/[0.09] px-3.5 py-2 font-mono text-xs text-brand-500',
              busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            )}
          >
            {busy ? t(locale, 'panel.motivatorsAdmin.invite.sending') : t(locale, 'panel.motivatorsAdmin.invite.batchOpenBtn')}
          </button>
          <button
            type="button"
            onClick={openInvite}
            disabled={busy}
            className={cn(
              'min-h-touch rounded-lg border-none bg-brand-500 px-4 py-2 font-mono text-xs text-white',
              busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            )}
          >
            {busy ? t(locale, 'panel.motivatorsAdmin.invite.sending') : t(locale, 'panel.motivatorsAdmin.invite.openInviteBtn')}
          </button>
        </div>
      </div>
      {err ? <p className="mt-2 text-xs text-danger">{err}</p> : null}
      {msg ? <p className="mt-2 text-xs text-success">{msg}</p> : null}
    </div>
  );
}

function InvitesList({ locale, refreshKey, isAdmin, companyFilter }) {
  const { confirm } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [notice, setNotice] = useState(null);
  const appUrl =
    (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ pageSize: '30' });
    if (status !== 'all') p.set('status', status);
    if (isAdmin && companyFilter && companyFilter !== 'all') p.set('company', companyFilter);
    const res = await fetch(`/api/admin/ae/invites?${p}`);
    const data = await res.json().catch(() => ({}));
    setItems(data.items || []);
    setLoading(false);
  }, [status, isAdmin, companyFilter, refreshKey]);

  useEffect(() => { load(); }, [load]);

  const cancel = async (id) => {
    const ok = await confirm({
      message: t(locale, 'panel.motivatorsAdmin.invites.cancelConfirm'),
      danger: true,
    });
    if (!ok) return;
    await fetch(`/api/admin/ae/invites/${id}`, { method: 'DELETE' });
    load();
  };

  const remind = async (id) => {
    try {
      const res = await fetch(`/api/admin/ae/invites/${id}/remind`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, 'panel.common.error'));
      setNotice({
        tone: 'ok',
        title: t(locale, 'panel.common.successTitle'),
        message: t(locale, 'panel.motivatorsAdmin.invites.reminderSent'),
      });
      load();
    } catch (e) {
      setNotice({
        tone: 'error',
        title: t(locale, 'panel.common.error'),
        message: e?.message || t(locale, 'panel.common.error'),
      });
    }
  };

  return (
    <div className={S.card}>
      <SystemNoticeModal
        open={Boolean(notice)}
        locale={locale}
        tone={notice?.tone || 'info'}
        title={notice?.title}
        message={notice?.message || ''}
        onClose={() => setNotice(null)}
      />
      <div className="mb-4 flex flex-wrap justify-between gap-2.5">
        <span className={S.label}>{t(locale, 'panel.motivatorsAdmin.invites.title')}</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={S.select}>
          <option value="all">{t(locale, 'panel.motivatorsAdmin.invites.allStatuses')}</option>
          <option value="sent">{t(locale, 'panel.motivatorsAdmin.invites.statusSent')}</option>
          <option value="opened">{t(locale, 'panel.motivatorsAdmin.invites.statusOpened')}</option>
          <option value="completed">{t(locale, 'panel.motivatorsAdmin.invites.statusCompleted')}</option>
          <option value="cancelled">{t(locale, 'panel.motivatorsAdmin.invites.statusCancelled')}</option>
        </select>
      </div>
      {loading ? <p className="text-ink-muted">{t(locale, 'panel.motivatorsAdmin.invites.loading')}</p> : null}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="text-left font-mono text-[10px] text-ink-muted">
            <th className="p-2">{t(locale, 'panel.motivatorsAdmin.invites.colEmployee')}</th>
            <th className="p-2">{t(locale, 'panel.motivatorsAdmin.invites.colStatus')}</th>
            <th className="p-2">{t(locale, 'panel.motivatorsAdmin.invites.colSent')}</th>
            <th className="p-2">{t(locale, 'panel.motivatorsAdmin.invites.colExpires')}</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const inviteUrl =
              row.token && appUrl ? `${appUrl}/assessment/motivators/${row.token}` : '';
            const canShareLink = ['sent', 'opened'].includes(row.status) && Boolean(inviteUrl);
            return (
            <tr key={row.id} className="border-t border-ink/12">
              <td className="px-2 py-2.5">
                <div>{row.candidateName}</div>
                <div className="text-[11px] text-ink-muted">{row.candidateEmail}</div>
                {canShareLink ? (
                  <div className="mt-1.5 max-w-[320px]">
                    <CopyableLink
                      url={inviteUrl}
                      locale={locale}
                      compact
                      label={t(locale, 'panel.motivatorsAdmin.invites.assessmentLink')}
                    />
                  </div>
                ) : null}
              </td>
              <td className="px-2 py-2.5">{statusBadge(locale, row.status)}</td>
              <td className="px-2 py-2.5 text-ink-muted">{row.sentAt ? new Date(row.sentAt).toLocaleDateString(dateLocale(locale)) : t(locale, 'panel.common.notApplicable')}</td>
              <td className="px-2 py-2.5 text-ink-muted">{row.expiresAt ? new Date(row.expiresAt).toLocaleDateString(dateLocale(locale)) : t(locale, 'panel.common.notApplicable')}</td>
              <td className="px-2 py-2.5 text-right">
                {['sent', 'opened'].includes(row.status) ? (
                  <>
                    <button type="button" onClick={() => remind(row.id)} className="mr-2 cursor-pointer border-none bg-transparent font-mono text-[11px] text-brand-500">{t(locale, 'panel.motivatorsAdmin.invites.resend')}</button>
                    <button type="button" onClick={() => cancel(row.id)} className="cursor-pointer border-none bg-transparent font-mono text-[11px] text-danger">{t(locale, 'panel.motivatorsAdmin.invites.cancel')}</button>
                  </>
                ) : null}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      {!loading && items.length === 0 ? <p className="mt-3 text-ink-muted">{t(locale, 'panel.motivatorsAdmin.invites.empty')}</p> : null}
    </div>
  );
}

function ResultsList({ locale, isAdmin, companyFilter, focusAttemptId = null }) {
  const { confirm } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(() => {
    const p = new URLSearchParams({ status: 'completed', pageSize: '30' });
    if (isAdmin && companyFilter && companyFilter !== 'all') p.set('company', companyFilter);
    fetch(`/api/admin/ae/attempts?${p}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }, [isAdmin, companyFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!focusAttemptId) return;
    const id = Number(focusAttemptId);
    if (!Number.isFinite(id)) return;
    setSelected(id);
  }, [focusAttemptId]);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    fetch(`/api/admin/ae/attempts/${selected}`)
      .then((r) => r.json())
      .then((d) => setDetail(d));
  }, [selected]);

  const reloadDetail = () => {
    if (!selected) return;
    fetch(`/api/admin/ae/attempts/${selected}`)
      .then((r) => r.json())
      .then((d) => setDetail(d));
  };

  const rescoreAttempt = async (id) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ae/attempts/${id}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, 'panel.motivatorsAdmin.results.rescoreError'));
      reloadDetail();
      load();
    } catch (e) {
      setNotice({
        tone: 'error',
        title: t(locale, 'panel.common.error'),
        message: e.message || t(locale, 'panel.motivatorsAdmin.results.rescoreError'),
      });
    } finally {
      setBusy(false);
    }
  };

  const allScoresZero = detail?.attempt?.ranking?.length
    ? detail.attempt.ranking.every((d) => !d.score)
    : false;

  const removeAttempt = async (id) => {
    const ok = await confirm({
      message: t(locale, 'panel.motivatorsAdmin.results.deleteConfirm'),
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ae/attempts/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, 'panel.motivatorsAdmin.results.deleteError'));
      if (selected === id) {
        setSelected(null);
        setDetail(null);
      }
      load();
    } catch (e) {
      setNotice({
        tone: 'error',
        title: t(locale, 'panel.common.error'),
        message: e.message || t(locale, 'panel.motivatorsAdmin.results.deleteError'),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn('grid gap-5', detail ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1')}>
      <SystemNoticeModal
        open={Boolean(notice)}
        locale={locale}
        tone={notice?.tone || 'info'}
        title={notice?.title}
        message={notice?.message || ''}
        onClose={() => setNotice(null)}
      />
      <div className={S.card}>
        <span className={S.label}>{t(locale, 'panel.motivatorsAdmin.results.title')}</span>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="font-mono text-[10px] text-ink-muted">
              <th className="p-2 text-left">{t(locale, 'panel.motivatorsAdmin.results.colEmployee')}</th>
              <th className="p-2 text-left">{t(locale, 'panel.motivatorsAdmin.results.colDate')}</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t border-ink/12">
                <td className="px-2 py-2.5">
                  <div>{row.candidateName}</div>
                  <div className="text-[11px] text-ink-muted">{row.areaLabel || t(locale, 'panel.common.notApplicable')}</div>
                </td>
                <td className="px-2 py-2.5 text-ink-muted">
                  {row.completedAt ? new Date(row.completedAt).toLocaleDateString(dateLocale(locale)) : t(locale, 'panel.common.notApplicable')}
                </td>
                <td className="px-2 py-2.5 text-right">
                  <button type="button" onClick={() => setSelected(row.id)} className="mr-2.5 cursor-pointer border-none bg-transparent text-[11px] text-brand-500">{t(locale, 'panel.motivatorsAdmin.results.view')}</button>
                  <button type="button" disabled={busy} onClick={() => removeAttempt(row.id)} className={cn('border-none bg-transparent text-[11px] text-danger', busy ? 'cursor-not-allowed' : 'cursor-pointer')}>{t(locale, 'panel.motivatorsAdmin.results.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detail?.attempt ? (
        <div className={S.card}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <span className={S.label}>{t(locale, 'panel.motivatorsAdmin.results.profileTitle')}</span>
              <div className="mt-1 text-lg text-ink">{detail.attempt.candidateName}</div>
              <div className="mt-1.5 text-xs leading-snug text-ink-muted">
                {detail.attempt.candidateEmail}
                {detail.attempt.areaLabel ? ` · ${detail.attempt.areaLabel}` : ''}
                {detail.attempt.companyName ? ` · ${detail.attempt.companyName}` : ''}
              </div>
              <div className="mt-1 font-mono text-[11px] text-ink-faint">
                {t(locale, 'panel.motivatorsAdmin.results.completedAt', {
                  date: detail.attempt.completedAt
                    ? new Date(detail.attempt.completedAt).toLocaleString(dateLocale(locale))
                    : t(locale, 'panel.common.notApplicable'),
                })}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {allScoresZero ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => rescoreAttempt(detail.attempt.id)}
                  className={cn(
                    'rounded-lg border border-brand-500/25 bg-brand-500/10 px-2.5 py-1 text-[11px] text-brand-500',
                    busy ? 'cursor-not-allowed' : 'cursor-pointer'
                  )}
                >
                  {t(locale, 'panel.motivatorsAdmin.results.rescore')}
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => removeAttempt(detail.attempt.id)}
                className={cn(
                  'rounded-lg border border-danger/25 bg-danger/10 px-2.5 py-1 text-[11px] text-danger',
                  busy ? 'cursor-not-allowed' : 'cursor-pointer'
                )}
              >
                {t(locale, 'panel.motivatorsAdmin.results.deleteResult')}
              </button>
            </div>
          </div>

          {detail.rescore?.ok === false && detail.rescore.error ? (
            <div className="mb-3.5 rounded-control border border-danger/20 bg-danger/10 px-3 py-2.5 text-xs text-danger">
              <div>{detail.rescore.error}</div>
              {detail.rescore.diagnostics ? (
                <div className="mt-2 font-mono text-[11px] leading-snug text-ink-muted">
                  {t(locale, 'panel.motivatorsAdmin.results.rescoreDiag', {
                    loaded: detail.rescore.diagnostics.questionsLoaded,
                    answers: detail.rescore.diagnostics.answersCount,
                    fc: detail.rescore.diagnostics.fcWithoutWeights,
                    likert: detail.rescore.diagnostics.likertWithoutWeights,
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {detail.hrInsights?.topMotivators?.length > 0 ? (
            <div className="mb-5 rounded-xl border border-brand-500/15 bg-brand-500/[0.03] p-3.5">
              <div className="mb-2.5 font-mono text-[10px] text-brand-500">{t(locale, 'panel.motivatorsAdmin.results.topMotivators')}</div>
              <div className="mb-2.5 flex flex-wrap gap-2">
                {detail.hrInsights.topMotivators.map((d) => (
                  <span
                    key={d.key}
                    className="rounded-full px-3 py-1.5 text-xs"
                    style={{ background: `${d.color || C.purple}18`, color: d.color || C.purple }}
                  >
                    {d.label} · {d.score}
                  </span>
                ))}
              </div>
              {detail.hrInsights.summaryNote ? (
                <p className="m-0 text-[13px] leading-relaxed text-ink-muted">{detail.hrInsights.summaryNote}</p>
              ) : null}
            </div>
          ) : null}

          <p className="mb-4 text-sm leading-relaxed text-ink">{detail.attempt.profileSummary}</p>

          <div className="mb-2.5 font-mono text-[10px] text-ink-muted">{t(locale, 'panel.motivatorsAdmin.results.allDimensions')}</div>
          {(detail.attempt.ranking || []).map((dim) => (
            <div key={dim.key} className="mb-2 flex items-center gap-2.5">
              <span className="w-[110px] text-[11px]" style={{ color: dim.color }}>{dim.label}</span>
              <div className="flex-1"><Bar value={dim.score} max={100} color={dim.color} h={6} /></div>
              <span className="w-6 text-right text-[11px] text-ink-muted">{dim.score}</span>
            </div>
          ))}

          {detail.hrInsights?.suggestedActions?.do?.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-ink/12 pt-4 sm:grid-cols-2">
              <div className="rounded-xl border border-success/20 bg-success/[0.04] p-3.5">
                <div className="mb-2.5 font-mono text-[10px] text-success">{t(locale, 'panel.motivatorsAdmin.results.actionsDo')}</div>
                <ul className="m-0 list-none p-0 text-xs leading-relaxed text-ink-muted">
                  {detail.hrInsights.suggestedActions.do.map((item) => (
                    <li key={item.dimensionKey} className="mb-2.5">
                      <span className="font-mono text-[10px] text-success">{item.dimension}</span>
                      <div className="mt-0.5">{item.text}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-danger/20 bg-danger/[0.03] p-3.5">
                <div className="mb-2.5 font-mono text-[10px] text-danger">{t(locale, 'panel.motivatorsAdmin.results.actionsAvoid')}</div>
                <ul className="m-0 list-none p-0 text-xs leading-relaxed text-ink-muted">
                  {detail.hrInsights.suggestedActions.avoid.map((item) => (
                    <li key={item.dimensionKey} className="mb-2.5">
                      <span className="font-mono text-[10px] text-danger">{item.dimension}</span>
                      <div className="mt-0.5">{item.text}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {detail.history?.length > 1 ? (
            <div className="mt-5 border-t border-ink/12 pt-4">
              <div className="mb-2 font-mono text-[11px] text-ink-muted">{t(locale, 'panel.motivatorsAdmin.results.evolution', { count: detail.history.length })}</div>
              {detail.history.map((h) => (
                <div key={h.id} className="mb-1 text-xs text-ink-muted">
                  {t(locale, 'panel.motivatorsAdmin.results.historyTop', {
                    date: h.completedAt
                      ? new Date(h.completedAt).toLocaleDateString(dateLocale(locale))
                      : t(locale, 'panel.common.notApplicable'),
                    top: Array.isArray(h.ranking) ? h.ranking.slice(0, 2).join(', ') : t(locale, 'panel.common.notApplicable'),
                  })}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AnalyticsPanel({ locale, isAdmin, companyFilter }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const p = new URLSearchParams();
    if (isAdmin && companyFilter && companyFilter !== 'all') p.set('company', companyFilter);
    fetch(`/api/admin/ae/analytics?${p}`)
      .then((r) => r.json())
      .then(setData);
  }, [isAdmin, companyFilter]);

  if (!data) return <div className={S.card}><p className="text-ink-muted">{t(locale, 'panel.motivatorsAdmin.analytics.loading')}</p></div>;

  const maxAvg = Math.max(...(data.distribution || []).map((d) => d.average), 1);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
      <div className={S.card}>
        <span className={S.label}>{t(locale, 'panel.motivatorsAdmin.analytics.avgDistribution')}</span>
        <p className="mb-4 text-xs text-ink-muted">{t(locale, 'panel.motivatorsAdmin.analytics.completedCount', { count: data.totalAttempts })}</p>
        {(data.distribution || []).slice(0, 8).map((d) => (
          <div key={d.key} className="mb-2.5 flex items-center gap-2.5">
            <span className="w-[100px] font-mono text-[11px]">{d.key}</span>
            <div className="flex-1"><Bar value={d.average} max={maxAvg} color={C.purple} h={6} /></div>
            <span className="text-[11px] text-ink-muted">{d.average}</span>
          </div>
        ))}
      </div>
      <div className={S.card}>
        <span className={S.label}>{t(locale, 'panel.motivatorsAdmin.analytics.topMotivators')}</span>
        {(data.topMotivators || []).slice(0, 6).map((row) => (
          <div key={row.key} className="mb-2.5 flex justify-between text-[13px]">
            <span>{row.key}</span>
            <span className="text-ink-muted">{row.pct}% ({row.count})</span>
          </div>
        ))}
      </div>
      <div className={S.card}>
        <span className={S.label}>{t(locale, 'panel.motivatorsAdmin.analytics.invitesByStatus')}</span>
        {(data.inviteStats || []).map((s) => (
          <div key={s.status} className="mb-2 flex justify-between text-[13px]">
            <span>{statusBadge(locale, s.status)}</span>
            <span>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigPanel({ locale }) {
  const { confirm } = useAppFeedback();
  const [questions, setQuestions] = useState([]);
  const [dims, setDims] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [deleteBusy, setDeleteBusy] = useState(null);
  const [notice, setNotice] = useState(null);

  const loadConfig = useCallback(() => {
    fetch('/api/admin/ae/config/questions?definition=motivators&activeOnly=1')
      .then((r) => r.json())
      .then((d) => setQuestions((d.items || []).slice(0, 100)));
    fetch('/api/admin/ae/config/dimensions')
      .then((r) => r.json())
      .then((d) => setDims(d.items || []));
    fetch('/api/admin/ae/definitions')
      .then((r) => r.json())
      .then((d) => setDefinitions(d.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const removeDefinition = async (def) => {
    const msg = def.attemptsCount > 0
      ? t(locale, 'panel.motivatorsAdmin.config.deleteConfirmWithAttempts', { name: def.name, count: def.attemptsCount })
      : t(locale, 'panel.motivatorsAdmin.config.deleteConfirmNoAttempts', { name: def.name });
    const ok = await confirm({ message: msg, danger: true });
    if (!ok) return;
    setDeleteBusy(def.id);
    try {
      const res = await fetch(`/api/admin/ae/definitions/${def.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, 'panel.motivatorsAdmin.config.deleteError'));
      loadConfig();
    } catch (e) {
      setNotice({
        tone: 'error',
        title: t(locale, 'panel.common.error'),
        message: e.message || t(locale, 'panel.motivatorsAdmin.config.deleteError'),
      });
    } finally {
      setDeleteBusy(null);
    }
  };

  const toggleQuestion = async (id, active) => {
    await fetch('/api/admin/ae/config/questions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, active: !active } : q)));
  };

  return (
    <div className="grid gap-5">
      <SystemNoticeModal
        open={Boolean(notice)}
        locale={locale}
        tone={notice?.tone || 'info'}
        title={notice?.title}
        message={notice?.message || ''}
        onClose={() => setNotice(null)}
      />
      {definitions.length > 0 ? (
        <div className={S.card}>
          <span className={S.label}>{t(locale, 'panel.motivatorsAdmin.config.definitionsTitle')}</span>
          <p className="mb-3 mt-0 text-xs text-ink-muted">
            {t(locale, 'panel.motivatorsAdmin.config.definitionsIntro')}
          </p>
          {definitions.map((def) => (
            <div key={def.id} className="flex items-start justify-between gap-3 border-t border-ink/12 py-3">
              <div>
                <div className="text-sm text-ink">{def.name}</div>
                <div className="mt-1 font-mono text-[11px] text-ink-muted">
                  {t(locale, 'panel.motivatorsAdmin.config.defMeta', {
                    slug: def.slug,
                    version: def.version,
                    questions: def.questionsCount,
                    results: def.attemptsCount,
                  })}
                  {!def.active ? t(locale, 'panel.motivatorsAdmin.config.defInactive') : ''}
                </div>
              </div>
              <button
                type="button"
                disabled={deleteBusy === def.id}
                onClick={() => removeDefinition(def)}
                className={cn(
                  'shrink-0 rounded-lg border border-danger/25 bg-transparent px-2.5 py-1 text-[11px] text-danger',
                  deleteBusy === def.id ? 'cursor-not-allowed' : 'cursor-pointer'
                )}
              >
                {deleteBusy === def.id ? t(locale, 'panel.motivatorsAdmin.config.deleting') : t(locale, 'panel.motivatorsAdmin.config.delete')}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className={S.card}>
        <span className={S.label}>{t(locale, 'panel.motivatorsAdmin.config.dimensionsTitle', { count: dims.length })}</span>
        <p className="text-xs text-ink-muted">{t(locale, 'panel.motivatorsAdmin.config.dimensionsHint')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {dims.map((d) => (
            <span
              key={d.id}
              className={cn('rounded-2xl px-2.5 py-1 text-[11px]', !d.active && 'opacity-40')}
              style={{ background: `${d.color || C.purple}18`, color: d.color || C.purple }}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
      <div className={S.card}>
        <span className={S.label}>{t(locale, 'panel.motivatorsAdmin.config.questionBankTitle')}</span>
        <p className="mb-3 text-xs text-ink-muted">{t(locale, 'panel.motivatorsAdmin.config.questionBankIntro')}</p>
        {questions.map((q) => (
          <div key={q.id} className="flex items-start gap-3 border-t border-ink/12 py-2.5">
            <button
              type="button"
              onClick={() => toggleQuestion(q.id, q.active)}
              className={cn(
                'cursor-pointer rounded-lg border border-ink/12 px-2 py-0.5 text-[10px]',
                q.active ? 'bg-success/10' : 'bg-transparent'
              )}
            >
              {q.active ? t(locale, 'panel.motivatorsAdmin.config.questionActive') : t(locale, 'panel.motivatorsAdmin.config.questionInactive')}
            </button>
            <div className={cn('flex-1 text-xs leading-snug', q.active ? 'text-ink' : 'text-ink-muted')}>
              <span className="font-mono text-[10px] text-ink-faint">{q.questionType} · {q.key}</span>
              <div>{q.text.length > 120 ? `${q.text.slice(0, 120)}…` : q.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MotivatorsAdminTab({ isAdmin, companies = [], locale }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view =
    searchParams.get('motivatorsView') ||
    (searchParams.get('attempt') ? 'results' : 'dashboard');
  const companyFilter = searchParams.get('company') || 'all';
  const focusAttemptId = searchParams.get('attempt') || null;
  const [refreshKey, setRefreshKey] = useState(0);
  const [moduleStatus, setModuleStatus] = useState(null);
  const [setupBusy, setSetupBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    fetch('/api/admin/ae/status')
      .then((r) => r.json())
      .then(setModuleStatus)
      .catch(() => {});
  }, [refreshKey]);

  const runSetup = async () => {
    setSetupBusy(true);
    try {
      const res = await fetch('/api/admin/ae/setup', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, 'panel.motivatorsAdmin.setup.initFailed'));
      setRefreshKey((k) => k + 1);
      setNotice({
        tone: 'ok',
        title: t(locale, 'panel.common.successTitle'),
        message: t(locale, 'panel.motivatorsAdmin.setup.initOk'),
      });
    } catch (e) {
      setNotice({
        tone: 'error',
        title: t(locale, 'panel.common.error'),
        message: e.message || t(locale, 'panel.common.error'),
      });
    } finally {
      setSetupBusy(false);
    }
  };

  const setView = (id) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', 'motivators');
    p.set('motivatorsView', id);
    router.replace(`?${p.toString()}`);
  };

  const visibleViews = getViews(locale).filter((v) => !v.adminOnly || isAdmin);

  return (
    <div>
      <SystemNoticeModal
        open={Boolean(notice)}
        locale={locale}
        tone={notice?.tone || 'info'}
        title={notice?.title}
        message={notice?.message || ''}
        onClose={() => setNotice(null)}
      />
      <div className="mb-5">
        <h2 className="mb-2 mt-0 text-[22px] font-normal text-ink">{t(locale, 'panel.motivatorsAdmin.title')}</h2>
        <p className="m-0 text-[13px] text-ink-muted">{t(locale, 'panel.motivatorsAdmin.intro')}</p>
      </div>

      {moduleStatus && !moduleStatus.ready ? (
        <div className={cn(S.card, 'mb-5 border-danger/25 bg-danger/[0.03]')}>
          <span className={cn(S.label, 'text-danger')}>{t(locale, 'panel.motivatorsAdmin.setup.pendingTitle')}</span>
          <p className="mb-3 mt-0 text-[13px] leading-relaxed text-ink-muted">
            {moduleStatus.reason === 'schema_missing'
              ? t(locale, 'panel.motivatorsAdmin.setup.schemaMissing')
              : t(locale, 'panel.motivatorsAdmin.setup.notInitialized')}
          </p>
          {moduleStatus.reason !== 'schema_missing' ? (
            <button type="button" disabled={setupBusy} onClick={runSetup} className="cursor-pointer rounded-lg border-none bg-brand-500 px-4 py-2 text-white disabled:cursor-not-allowed">
              {setupBusy ? t(locale, 'panel.motivatorsAdmin.setup.initializing') : t(locale, 'panel.motivatorsAdmin.setup.initializeNow')}
            </button>
          ) : null}
        </div>
      ) : null}

      <PanelSubNav
        ariaLabel={t(locale, 'panel.motivatorsAdmin.tabsAria')}
        active={view}
        onChange={setView}
        tabs={visibleViews.map((v) => ({ id: v.id, label: v.label }))}
      />

      {view === 'dashboard' ? <AnalyticsPanel locale={locale} isAdmin={isAdmin} companyFilter={companyFilter} /> : null}
      {view === 'invites' ? (
        <>
          <InviteForm locale={locale} isAdmin={isAdmin} companies={companies} companyId={companyFilter !== 'all' ? companyFilter : ''} onSent={() => setRefreshKey((k) => k + 1)} />
          <InvitesList locale={locale} refreshKey={refreshKey} isAdmin={isAdmin} companyFilter={companyFilter} />
        </>
      ) : null}
      {view === 'results' ? (
        <ResultsList
          locale={locale}
          isAdmin={isAdmin}
          companyFilter={companyFilter}
          focusAttemptId={focusAttemptId}
        />
      ) : null}
      {view === 'config' && isAdmin ? <ConfigPanel locale={locale} /> : null}
    </div>
  );
}
