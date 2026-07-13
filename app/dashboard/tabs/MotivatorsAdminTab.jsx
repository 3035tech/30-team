'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { t } from '../../../lib/i18n';
import { C } from '../../../lib/theme';
import { S, Bar } from '../dashboard-shared';
import { SystemNoticeModal } from '../SystemNoticeModal';

function dateLocale(locale) {
  return locale === 'en' ? 'en-US' : 'pt-BR';
}

function getViews(locale) {
  return [
    { id: 'invites', label: t(locale, 'panel.motivatorsAdmin.tabs.invites') },
    { id: 'results', label: t(locale, 'panel.motivatorsAdmin.tabs.results') },
    { id: 'dashboard', label: t(locale, 'panel.motivatorsAdmin.tabs.dashboard') },
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
  const colors = {
    sent: C.muted,
    opened: C.info,
    completed: C.synergy,
    cancelled: C.tension,
    expired: C.tension,
  };
  return (
    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: `${colors[status] || C.muted}18`, color: colors[status] || C.muted, fontFamily: 'monospace' }}>
      {inviteStatusLabel(locale, status)}
    </span>
  );
}

function InviteForm({ locale, isAdmin, companies, companyId, onSent }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (companyId && companyId !== 'all') {
      setCompany(String(companyId));
      return;
    }
    if (isAdmin && companies.length === 1) {
      setCompany(String(companies[0].id));
    }
  }, [companyId, isAdmin, companies]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const companyOk = !isAdmin || (company !== '' && Number.isFinite(Number(company)));
  const canSend = name.trim().length > 1 && emailOk && companyOk && !busy;

  const send = async () => {
    setErr('');
    setMsg('');
    if (!name.trim()) {
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
      const body = { candidateName: name.trim(), candidateEmail: email.trim().toLowerCase() };
      if (isAdmin) body.companyId = Number(company);
      const res = await fetch('/api/admin/ae/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(locale, 'panel.motivatorsAdmin.invite.sendError'));
      setMsg(t(locale, 'panel.motivatorsAdmin.invite.sendOk', { email: data.sentTo }));
      setName('');
      setEmail('');
      onSent?.();
      setTimeout(() => setMsg(''), 8000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...S.card, marginBottom: '20px' }}>
      <span style={S.label}>{t(locale, 'panel.motivatorsAdmin.invite.newInvite')}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        {isAdmin ? (
          <select value={company} onChange={(e) => setCompany(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, minWidth: '160px' }}>
            <option value="">{t(locale, 'panel.motivatorsAdmin.invite.companyPh')}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        ) : null}
        <input placeholder={t(locale, 'panel.motivatorsAdmin.invite.namePh')} value={name} onChange={(e) => setName(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, flex: '1 1 140px' }} />
        <input placeholder={t(locale, 'panel.motivatorsAdmin.invite.emailPh')} value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, flex: '2 1 200px' }} />
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: C.purple,
            color: '#fff',
            cursor: canSend ? 'pointer' : 'not-allowed',
            opacity: canSend ? 1 : 0.5,
          }}
        >
          {busy ? t(locale, 'panel.motivatorsAdmin.invite.sending') : t(locale, 'panel.motivatorsAdmin.invite.send')}
        </button>
      </div>
      {err ? <p style={{ color: C.tension, fontSize: '12px', marginTop: '8px' }}>{err}</p> : null}
      {msg ? <p style={{ color: C.synergy, fontSize: '12px', marginTop: '8px' }}>{msg}</p> : null}
    </div>
  );
}

function InvitesList({ locale, refreshKey, isAdmin, companyFilter }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [notice, setNotice] = useState(null);

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
    if (!confirm(t(locale, 'panel.motivatorsAdmin.invites.cancelConfirm'))) return;
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
    <div style={S.card}>
      <SystemNoticeModal
        open={Boolean(notice)}
        locale={locale}
        tone={notice?.tone || 'info'}
        title={notice?.title}
        message={notice?.message || ''}
        onClose={() => setNotice(null)}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <span style={S.label}>{t(locale, 'panel.motivatorsAdmin.invites.title')}</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
          <option value="all">{t(locale, 'panel.motivatorsAdmin.invites.allStatuses')}</option>
          <option value="sent">{t(locale, 'panel.motivatorsAdmin.invites.statusSent')}</option>
          <option value="opened">{t(locale, 'panel.motivatorsAdmin.invites.statusOpened')}</option>
          <option value="completed">{t(locale, 'panel.motivatorsAdmin.invites.statusCompleted')}</option>
          <option value="cancelled">{t(locale, 'panel.motivatorsAdmin.invites.statusCancelled')}</option>
        </select>
      </div>
      {loading ? <p style={{ color: C.muted }}>{t(locale, 'panel.motivatorsAdmin.invites.loading')}</p> : null}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: C.muted, fontFamily: 'monospace', fontSize: '10px' }}>
            <th style={{ padding: '8px' }}>{t(locale, 'panel.motivatorsAdmin.invites.colEmployee')}</th>
            <th style={{ padding: '8px' }}>{t(locale, 'panel.motivatorsAdmin.invites.colStatus')}</th>
            <th style={{ padding: '8px' }}>{t(locale, 'panel.motivatorsAdmin.invites.colSent')}</th>
            <th style={{ padding: '8px' }}>{t(locale, 'panel.motivatorsAdmin.invites.colExpires')}</th>
            <th style={{ padding: '8px' }} />
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} style={{ borderTop: `1px solid ${C.border}` }}>
              <td style={{ padding: '10px 8px' }}>
                <div>{row.candidateName}</div>
                <div style={{ color: C.muted, fontSize: '11px' }}>{row.candidateEmail}</div>
              </td>
              <td style={{ padding: '10px 8px' }}>{statusBadge(locale, row.status)}</td>
              <td style={{ padding: '10px 8px', color: C.muted }}>{row.sentAt ? new Date(row.sentAt).toLocaleDateString(dateLocale(locale)) : t(locale, 'panel.common.notApplicable')}</td>
              <td style={{ padding: '10px 8px', color: C.muted }}>{row.expiresAt ? new Date(row.expiresAt).toLocaleDateString(dateLocale(locale)) : t(locale, 'panel.common.notApplicable')}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                {['sent', 'opened'].includes(row.status) ? (
                  <>
                    <button type="button" onClick={() => remind(row.id)} style={{ marginRight: '8px', fontSize: '11px', cursor: 'pointer', background: 'none', border: 'none', color: C.purple }}>{t(locale, 'panel.motivatorsAdmin.invites.resend')}</button>
                    <button type="button" onClick={() => cancel(row.id)} style={{ fontSize: '11px', cursor: 'pointer', background: 'none', border: 'none', color: C.tension }}>{t(locale, 'panel.motivatorsAdmin.invites.cancel')}</button>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && items.length === 0 ? <p style={{ color: C.muted, marginTop: '12px' }}>{t(locale, 'panel.motivatorsAdmin.invites.empty')}</p> : null}
    </div>
  );
}

function ResultsList({ locale, isAdmin, companyFilter }) {
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
    if (!confirm(t(locale, 'panel.motivatorsAdmin.results.deleteConfirm'))) return;
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
    <div style={{ display: 'grid', gridTemplateColumns: detail ? '1fr 1fr' : '1fr', gap: '20px' }}>
      <SystemNoticeModal
        open={Boolean(notice)}
        locale={locale}
        tone={notice?.tone || 'info'}
        title={notice?.title}
        message={notice?.message || ''}
        onClose={() => setNotice(null)}
      />
      <div style={S.card}>
        <span style={S.label}>{t(locale, 'panel.motivatorsAdmin.results.title')}</span>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ color: C.muted, fontFamily: 'monospace', fontSize: '10px' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>{t(locale, 'panel.motivatorsAdmin.results.colEmployee')}</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>{t(locale, 'panel.motivatorsAdmin.results.colDate')}</th>
              <th style={{ padding: '8px' }} />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '10px 8px' }}>
                  <div>{row.candidateName}</div>
                  <div style={{ fontSize: '11px', color: C.muted }}>{row.areaLabel || t(locale, 'panel.common.notApplicable')}</div>
                </td>
                <td style={{ padding: '10px 8px', color: C.muted }}>
                  {row.completedAt ? new Date(row.completedAt).toLocaleDateString(dateLocale(locale)) : t(locale, 'panel.common.notApplicable')}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                  <button type="button" onClick={() => setSelected(row.id)} style={{ background: 'none', border: 'none', color: C.purple, cursor: 'pointer', fontSize: '11px', marginRight: '10px' }}>{t(locale, 'panel.motivatorsAdmin.results.view')}</button>
                  <button type="button" disabled={busy} onClick={() => removeAttempt(row.id)} style={{ background: 'none', border: 'none', color: C.tension, cursor: busy ? 'not-allowed' : 'pointer', fontSize: '11px' }}>{t(locale, 'panel.motivatorsAdmin.results.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detail?.attempt ? (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
            <div>
              <span style={S.label}>{t(locale, 'panel.motivatorsAdmin.results.profileTitle')}</span>
              <div style={{ fontSize: '18px', color: C.text, marginTop: '4px' }}>{detail.attempt.candidateName}</div>
              <div style={{ fontSize: '12px', color: C.muted, marginTop: '6px', lineHeight: 1.5 }}>
                {detail.attempt.candidateEmail}
                {detail.attempt.areaLabel ? ` · ${detail.attempt.areaLabel}` : ''}
                {detail.attempt.companyName ? ` · ${detail.attempt.companyName}` : ''}
              </div>
              <div style={{ fontSize: '11px', color: C.faint, marginTop: '4px', fontFamily: 'monospace' }}>
                {t(locale, 'panel.motivatorsAdmin.results.completedAt', {
                  date: detail.attempt.completedAt
                    ? new Date(detail.attempt.completedAt).toLocaleString(dateLocale(locale))
                    : t(locale, 'panel.common.notApplicable'),
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {allScoresZero ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => rescoreAttempt(detail.attempt.id)}
                  style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', border: `1px solid ${C.purple}44`, background: `${C.purple}10`, color: C.purple, cursor: busy ? 'not-allowed' : 'pointer' }}
                >
                  {t(locale, 'panel.motivatorsAdmin.results.rescore')}
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => removeAttempt(detail.attempt.id)}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', border: `1px solid ${C.tension}44`, background: `${C.tension}10`, color: C.tension, cursor: busy ? 'not-allowed' : 'pointer' }}
              >
                {t(locale, 'panel.motivatorsAdmin.results.deleteResult')}
              </button>
            </div>
          </div>

          {detail.rescore?.ok === false && detail.rescore.error ? (
            <div style={{ marginBottom: '14px', padding: '10px 12px', borderRadius: '10px', background: `${C.tension}10`, border: `1px solid ${C.tension}33`, fontSize: '12px', color: C.tension }}>
              <div>{detail.rescore.error}</div>
              {detail.rescore.diagnostics ? (
                <div style={{ marginTop: '8px', fontSize: '11px', color: C.muted, fontFamily: 'monospace', lineHeight: 1.5 }}>
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
            <div style={{ marginBottom: '20px', padding: '14px', borderRadius: '12px', background: `${C.purple}08`, border: `1px solid ${C.purple}22` }}>
              <div style={{ fontSize: '10px', color: C.purple, marginBottom: '10px', fontFamily: 'monospace' }}>{t(locale, 'panel.motivatorsAdmin.results.topMotivators')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {detail.hrInsights.topMotivators.map((d) => (
                  <span key={d.key} style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', background: `${d.color || C.purple}18`, color: d.color || C.purple }}>
                    {d.label} · {d.score}
                  </span>
                ))}
              </div>
              {detail.hrInsights.summaryNote ? (
                <p style={{ margin: 0, fontSize: '13px', color: C.muted, lineHeight: 1.6 }}>{detail.hrInsights.summaryNote}</p>
              ) : null}
            </div>
          ) : null}

          <p style={{ fontSize: '14px', color: C.text, lineHeight: 1.6, marginBottom: '16px' }}>{detail.attempt.profileSummary}</p>

          <div style={{ fontSize: '10px', color: C.muted, marginBottom: '10px', fontFamily: 'monospace' }}>{t(locale, 'panel.motivatorsAdmin.results.allDimensions')}</div>
          {(detail.attempt.ranking || []).map((dim) => (
            <div key={dim.key} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ width: '110px', fontSize: '11px', color: dim.color }}>{dim.label}</span>
              <div style={{ flex: 1 }}><Bar value={dim.score} max={100} color={dim.color} h={6} /></div>
              <span style={{ fontSize: '11px', color: C.muted, width: '24px', textAlign: 'right' }}>{dim.score}</span>
            </div>
          ))}

          {detail.hrInsights?.suggestedActions?.do?.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
              <div style={{ padding: '14px', borderRadius: '12px', background: `${C.synergy}0a`, border: `1px solid ${C.synergy}33` }}>
                <div style={{ fontSize: '10px', color: C.synergy, marginBottom: '10px', fontFamily: 'monospace' }}>{t(locale, 'panel.motivatorsAdmin.results.actionsDo')}</div>
                <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none', fontSize: '12px', color: C.muted, lineHeight: 1.6 }}>
                  {detail.hrInsights.suggestedActions.do.map((item) => (
                    <li key={item.dimensionKey} style={{ marginBottom: '10px' }}>
                      <span style={{ fontSize: '10px', color: C.synergy, fontFamily: 'monospace' }}>{item.dimension}</span>
                      <div style={{ marginTop: '2px' }}>{item.text}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ padding: '14px', borderRadius: '12px', background: `${C.tension}08`, border: `1px solid ${C.tension}33` }}>
                <div style={{ fontSize: '10px', color: C.tension, marginBottom: '10px', fontFamily: 'monospace' }}>{t(locale, 'panel.motivatorsAdmin.results.actionsAvoid')}</div>
                <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none', fontSize: '12px', color: C.muted, lineHeight: 1.6 }}>
                  {detail.hrInsights.suggestedActions.avoid.map((item) => (
                    <li key={item.dimensionKey} style={{ marginBottom: '10px' }}>
                      <span style={{ fontSize: '10px', color: C.tension, fontFamily: 'monospace' }}>{item.dimension}</span>
                      <div style={{ marginTop: '2px' }}>{item.text}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {detail.history?.length > 1 ? (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '11px', color: C.muted, marginBottom: '8px', fontFamily: 'monospace' }}>{t(locale, 'panel.motivatorsAdmin.results.evolution', { count: detail.history.length })}</div>
              {detail.history.map((h) => (
                <div key={h.id} style={{ fontSize: '12px', color: C.muted, marginBottom: '4px' }}>
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

  if (!data) return <div style={S.card}><p style={{ color: C.muted }}>{t(locale, 'panel.motivatorsAdmin.analytics.loading')}</p></div>;

  const maxAvg = Math.max(...(data.distribution || []).map((d) => d.average), 1);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
      <div style={S.card}>
        <span style={S.label}>{t(locale, 'panel.motivatorsAdmin.analytics.avgDistribution')}</span>
        <p style={{ fontSize: '12px', color: C.muted, marginBottom: '16px' }}>{t(locale, 'panel.motivatorsAdmin.analytics.completedCount', { count: data.totalAttempts })}</p>
        {(data.distribution || []).slice(0, 8).map((d) => (
          <div key={d.key} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ width: '100px', fontSize: '11px', fontFamily: 'monospace' }}>{d.key}</span>
            <div style={{ flex: 1 }}><Bar value={d.average} max={maxAvg} color={C.purple} h={6} /></div>
            <span style={{ fontSize: '11px', color: C.muted }}>{d.average}</span>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <span style={S.label}>{t(locale, 'panel.motivatorsAdmin.analytics.topMotivators')}</span>
        {(data.topMotivators || []).slice(0, 6).map((row) => (
          <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
            <span>{row.key}</span>
            <span style={{ color: C.muted }}>{row.pct}% ({row.count})</span>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <span style={S.label}>{t(locale, 'panel.motivatorsAdmin.analytics.invitesByStatus')}</span>
        {(data.inviteStats || []).map((s) => (
          <div key={s.status} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
            <span>{statusBadge(locale, s.status)}</span>
            <span>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigPanel({ locale }) {
  const [questions, setQuestions] = useState([]);
  const [dims, setDims] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [deleteBusy, setDeleteBusy] = useState(null);
  const [notice, setNotice] = useState(null);

  const loadConfig = useCallback(() => {
    fetch('/api/admin/ae/config/questions?definition=motivators')
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
    if (!confirm(msg)) return;
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
    <div style={{ display: 'grid', gap: '20px' }}>
      <SystemNoticeModal
        open={Boolean(notice)}
        locale={locale}
        tone={notice?.tone || 'info'}
        title={notice?.title}
        message={notice?.message || ''}
        onClose={() => setNotice(null)}
      />
      {definitions.length > 0 ? (
        <div style={S.card}>
          <span style={S.label}>{t(locale, 'panel.motivatorsAdmin.config.definitionsTitle')}</span>
          <p style={{ fontSize: '12px', color: C.muted, margin: '0 0 12px' }}>
            {t(locale, 'panel.motivatorsAdmin.config.definitionsIntro')}
          </p>
          {definitions.map((def) => (
            <div key={def.id} style={{ padding: '12px 0', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '14px', color: C.text }}>{def.name}</div>
                <div style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace', marginTop: '4px' }}>
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
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', border: `1px solid ${C.tension}44`, background: 'transparent', color: C.tension, cursor: deleteBusy === def.id ? 'not-allowed' : 'pointer', flexShrink: 0 }}
              >
                {deleteBusy === def.id ? t(locale, 'panel.motivatorsAdmin.config.deleting') : t(locale, 'panel.motivatorsAdmin.config.delete')}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div style={S.card}>
        <span style={S.label}>{t(locale, 'panel.motivatorsAdmin.config.dimensionsTitle', { count: dims.length })}</span>
        <p style={{ fontSize: '12px', color: C.muted }}>{t(locale, 'panel.motivatorsAdmin.config.dimensionsHint')}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
          {dims.map((d) => (
            <span key={d.id} style={{ padding: '4px 10px', borderRadius: '16px', fontSize: '11px', background: `${d.color || C.purple}18`, color: d.color || C.purple, opacity: d.active ? 1 : 0.4 }}>
              {d.label}
            </span>
          ))}
        </div>
      </div>
      <div style={S.card}>
        <span style={S.label}>{t(locale, 'panel.motivatorsAdmin.config.questionBankTitle')}</span>
        <p style={{ fontSize: '12px', color: C.muted, marginBottom: '12px' }}>{t(locale, 'panel.motivatorsAdmin.config.questionBankIntro')}</p>
        {questions.map((q) => (
          <div key={q.id} style={{ padding: '10px 0', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <button type="button" onClick={() => toggleQuestion(q.id, q.active)} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '8px', border: `1px solid ${C.border}`, background: q.active ? `${C.synergy}18` : 'transparent', cursor: 'pointer' }}>
              {q.active ? t(locale, 'panel.motivatorsAdmin.config.questionActive') : t(locale, 'panel.motivatorsAdmin.config.questionInactive')}
            </button>
            <div style={{ flex: 1, fontSize: '12px', color: q.active ? C.text : C.muted, lineHeight: 1.5 }}>
              <span style={{ fontFamily: 'monospace', fontSize: '10px', color: C.faint }}>{q.questionType} · {q.key}</span>
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
  const view = searchParams.get('motivatorsView') || 'invites';
  const companyFilter = searchParams.get('company') || 'all';
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
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 'normal', color: C.text }}>{t(locale, 'panel.motivatorsAdmin.title')}</h2>
        <p style={{ margin: 0, fontSize: '13px', color: C.muted }}>{t(locale, 'panel.motivatorsAdmin.intro')}</p>
      </div>

      {moduleStatus && !moduleStatus.ready ? (
        <div style={{ ...S.card, marginBottom: '20px', borderColor: `${C.tension}44`, background: `${C.tension}08` }}>
          <span style={{ ...S.label, color: C.tension }}>{t(locale, 'panel.motivatorsAdmin.setup.pendingTitle')}</span>
          <p style={{ fontSize: '13px', color: C.muted, margin: '0 0 12px', lineHeight: 1.6 }}>
            {moduleStatus.reason === 'schema_missing'
              ? t(locale, 'panel.motivatorsAdmin.setup.schemaMissing')
              : t(locale, 'panel.motivatorsAdmin.setup.notInitialized')}
          </p>
          {moduleStatus.reason !== 'schema_missing' ? (
            <button type="button" disabled={setupBusy} onClick={runSetup} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: C.purple, color: '#fff', cursor: 'pointer' }}>
              {setupBusy ? t(locale, 'panel.motivatorsAdmin.setup.initializing') : t(locale, 'panel.motivatorsAdmin.setup.initializeNow')}
            </button>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {visibleViews.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: `1px solid ${view === v.id ? C.purple : C.border}`,
              background: view === v.id ? `${C.purple}14` : 'transparent',
              color: view === v.id ? C.purpleDark : C.muted,
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'invites' ? (
        <>
          <InviteForm locale={locale} isAdmin={isAdmin} companies={companies} companyId={companyFilter !== 'all' ? companyFilter : ''} onSent={() => setRefreshKey((k) => k + 1)} />
          <InvitesList locale={locale} refreshKey={refreshKey} isAdmin={isAdmin} companyFilter={companyFilter} />
        </>
      ) : null}
      {view === 'results' ? <ResultsList locale={locale} isAdmin={isAdmin} companyFilter={companyFilter} /> : null}
      {view === 'dashboard' ? <AnalyticsPanel locale={locale} isAdmin={isAdmin} companyFilter={companyFilter} /> : null}
      {view === 'config' && isAdmin ? <ConfigPanel locale={locale} /> : null}
    </div>
  );
}
