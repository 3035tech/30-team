'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { t } from '../../../lib/i18n';
import { C } from '../../../lib/theme';
import {
  PAGE_SIZE_OPTIONS,
  parseVacanciesPagination,
  parseVacanciesSort,
} from '../../../lib/assessment-filters';
import { clientSortNextDir, S } from '../dashboard-shared';

export function VacancyInviteByEmail({ vacancyId, onSent }) {
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState('');
  const [localOk, setLocalOk] = useState('');

  const send = async () => {
    const name = candidateName.trim();
    const mail = candidateEmail.trim().toLowerCase();
    setLocalErr('');
    setLocalOk('');
    if (!name) {
      setLocalErr('Informe o nome do candidato.');
      return;
    }
    if (!mail) {
      setLocalErr('Informe o e-mail do candidato.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateName: name, candidateEmail: mail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Não foi possível enviar.');
      setLocalOk(`E-mail enviado para ${mail}.`);
      setCandidateName('');
      setCandidateEmail('');
      onSent?.();
      setTimeout(() => setLocalOk(''), 5000);
    } catch (e) {
      setLocalErr(e?.message || 'Erro');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${C.border}`, width: '100%' }}>
      <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace', display: 'block', marginBottom: '8px' }}>
        Convidar candidato — nome, e-mail e envio do desafio por e-mail
      </span>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={candidateName}
          onChange={(e) => setCandidateName(e.target.value)}
          placeholder="Nome do candidato"
          disabled={busy}
          aria-label="Nome do candidato"
          style={{
            flex: '1 1 160px', minWidth: '140px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
            borderRadius: '10px', padding: '8px 10px', color: C.text, fontSize: '12px', fontFamily: 'monospace',
          }}
        />
        <input
          type="email"
          value={candidateEmail}
          onChange={(e) => setCandidateEmail(e.target.value)}
          placeholder="email@exemplo.com"
          disabled={busy}
          aria-label="E-mail do candidato"
          style={{
            flex: '2 1 220px', minWidth: '180px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
            borderRadius: '10px', padding: '8px 10px', color: C.text, fontSize: '12px', fontFamily: 'monospace',
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={busy}
          style={{
            flex: '0 0 auto', background: `${C.synergy}18`, border: `1px solid ${C.synergy}55`,
            borderRadius: '10px', padding: '8px 14px', color: C.synergy, fontSize: '12px',
            cursor: 'pointer', fontFamily: 'monospace', opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Enviando…' : 'Enviar desafio'}
        </button>
      </div>
      {localErr ? (
        <p style={{ marginTop: '8px', marginBottom: 0, color: C.tension, fontSize: '11px', fontFamily: 'monospace' }}>
          {localErr}
        </p>
      ) : null}
      {localOk ? (
        <p style={{ marginTop: '8px', marginBottom: 0, color: C.synergy, fontSize: '11px', fontFamily: 'monospace' }}>
          {localOk}
        </p>
      ) : null}
    </div>
  );
}

function inviteStatusLabel(locale, status) {
  const s = String(status || '');
  if (s === 'opened') return t(locale, 'recruiting.inviteOpened');
  if (s === 'completed') return t(locale, 'recruiting.inviteCompleted');
  if (s === 'cancelled') return t(locale, 'recruiting.inviteCancelled');
  return t(locale, 'recruiting.inviteSent');
}

function VacancyInvitesBlock({ vacancyId, locale, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr('');
      try {
        const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/invites`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Erro');
        if (!cancelled) setRows(Array.isArray(data.invites) ? data.invites : []);
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Erro');
      }
    })();
    return () => { cancelled = true; };
  }, [vacancyId, refreshKey]);

  const remind = async (inviteId) => {
    setBusy(String(inviteId));
    setErr('');
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/invites/${encodeURIComponent(inviteId)}/remind`,
        { method: 'POST' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Falha');
      const r2 = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/invites`);
      const d2 = await r2.json().catch(() => ({}));
      if (r2.ok) setRows(Array.isArray(d2.invites) ? d2.invites : []);
    } catch (e) {
      setErr(e?.message || 'Erro');
    } finally {
      setBusy(null);
    }
  };

  if (!rows.length && !err) {
    return (
      <div style={{ marginTop: '10px', fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
        {t(locale, 'recruiting.inviteListTitle')}: —
      </div>
    );
  }

  return (
    <div style={{ marginTop: '12px' }}>
      <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace', display: 'block', marginBottom: '8px' }}>
        {t(locale, 'recruiting.inviteListTitle')}
      </span>
      {err ? (
        <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: C.tension, fontFamily: 'monospace' }}>{err}</p>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
        {rows.map((inv) => (
          <div
            key={inv.id}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '8px 10px',
              borderRadius: '8px',
              border: `1px solid ${C.border}`,
              background: 'rgba(26,22,37,.02)',
            }}
          >
            <span style={{ color: C.text }}>{inv.candidateName}</span>
            <span style={{ color: C.muted }}>{inv.candidateEmail}</span>
            <span style={{ color: C.purpleLight }}>{inviteStatusLabel(locale, inv.status)}</span>
            {['sent', 'opened'].includes(String(inv.status || '')) ? (
              <button
                type="button"
                disabled={busy === String(inv.id)}
                onClick={() => remind(inv.id)}
                style={{
                  marginLeft: 'auto',
                  fontSize: '10px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: `1px solid ${C.synergy}55`,
                  background: `${C.synergy}12`,
                  color: C.synergy,
                  cursor: 'pointer',
                }}
              >
                {busy === String(inv.id) ? '…' : t(locale, 'recruiting.inviteRemind')}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function VacancyRubricEditor({ vacancyId, locale }) {
  const [weights, setWeights] = useState(() => Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, ''])));
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Erro');
        if (cancelled) return;
        const w = data.vacancyFitWeights || {};
        const next = {};
        for (let t = 1; t <= 9; t++) {
          const v = w[String(t)] ?? w[t];
          next[t] = v != null && v !== '' ? String(v) : '';
        }
        setWeights(next);
        setNotes(data.vacancyRubricNotes != null ? String(data.vacancyRubricNotes) : '');
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Erro');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [vacancyId]);

  const save = async () => {
    setErr('');
    setMsg('');
    const wObj = {};
    for (let t = 1; t <= 9; t++) {
      const raw = String(weights[t] ?? '').trim();
      if (!raw) continue;
      const n = parseFloat(raw);
      if (Number.isFinite(n) && n > 0) wObj[String(t)] = n;
    }
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vacancyFitWeights: wObj, vacancyRubricNotes: notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Falha');
      setMsg(t(locale, 'recruiting.rubricSaved'));
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setErr(e?.message || 'Erro');
    }
  };

  return (
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${C.border}` }}>
      <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace', display: 'block', marginBottom: '8px' }}>
        {t(locale, 'recruiting.rubricTitle')}
      </span>
      {loading ? <p style={{ fontSize: '11px', color: C.faint }}>…</p> : null}
      {err ? <p style={{ fontSize: '11px', color: C.tension }}>{err}</p> : null}
      {msg ? <p style={{ fontSize: '11px', color: C.synergy }}>{msg}</p> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => (
          <label key={t} style={{ fontSize: '10px', color: C.muted, display: 'flex', alignItems: 'center', gap: '4px' }}>
            T{t}
            <input
              value={weights[t] ?? ''}
              onChange={(e) => setWeights((prev) => ({ ...prev, [t]: e.target.value }))}
              placeholder="0"
              style={{
                width: '44px',
                padding: '4px 6px',
                borderRadius: '6px',
                border: `1px solid ${C.border}`,
                fontSize: '11px',
                fontFamily: 'monospace',
                background: 'rgba(26,22,37,.03)',
                color: C.text,
              }}
            />
          </label>
        ))}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t(locale, 'recruiting.rubricNotes')}
        rows={2}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          marginBottom: '8px',
          padding: '8px 10px',
          borderRadius: '8px',
          border: `1px solid ${C.border}`,
          fontSize: '11px',
          fontFamily: 'monospace',
          background: 'rgba(26,22,37,.03)',
          color: C.text,
        }}
      />
      <button
        type="button"
        onClick={save}
        disabled={loading}
        style={{
          fontSize: '11px',
          padding: '6px 12px',
          borderRadius: '8px',
          border: `1px solid ${C.purple}55`,
          background: `${C.purple}18`,
          color: C.purple,
          cursor: 'pointer',
          fontFamily: 'monospace',
        }}
      >
        {t(locale, 'recruiting.rubricSave')}
      </button>
    </div>
  );
}

function VacancyRankingBlock({ vacancyId, locale }) {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/ranking`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro');
      setRows(Array.isArray(data.ranking) ? data.ranking : []);
    } catch (e) {
      setErr(e?.message || 'Erro');
      setRows([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>{t(locale, 'recruiting.rankingTitle')}</span>
        <button
          type="button"
          onClick={load}
          disabled={busy}
          style={{
            fontSize: '11px',
            padding: '6px 10px',
            borderRadius: '8px',
            border: `1px solid ${C.border}`,
            background: 'transparent',
            color: C.muted,
            cursor: busy ? 'default' : 'pointer',
            fontFamily: 'monospace',
          }}
        >
          {busy ? t(locale, 'recruiting.rankingLoading') : t(locale, 'recruiting.rankingLoad')}
        </button>
      </div>
      {err ? <p style={{ fontSize: '11px', color: C.tension }}>{err}</p> : null}
      {rows && rows.length === 0 ? (
        <p style={{ fontSize: '11px', color: C.faint }}>{t(locale, 'recruiting.rankingEmpty')}</p>
      ) : null}
      {rows && rows.length > 0 ? (
        <div style={{ marginTop: '8px', maxHeight: '220px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px' }}>
          {rows.map((r, i) => (
            <div
              key={r.assessmentId}
              style={{
                display: 'flex',
                gap: '10px',
                padding: '6px 0',
                borderBottom: `1px solid ${C.border}`,
                color: C.muted,
              }}
            >
              <span style={{ color: C.faint, width: '22px' }}>{i + 1}</span>
              <span style={{ flex: 1, color: C.text }}>{r.name}</span>
              <span>T{r.topType}</span>
              <span>{r.vacancyFitScore010 != null ? `${r.vacancyFitScore010}/10` : '—'}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function toDatetimeLocalValue(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  // datetime-local (horário local do navegador)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function VacanciesAdminTab({ isAdmin, navigateDashboard, locale = 'pt-BR' }) {
  const urlParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [vacancies, setVacancies] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [invitesRefresh, setInvitesRefresh] = useState(0);
  const [linkExpiryEdit, setLinkExpiryEdit] = useState(null);

  const { page: vacPage, pageSize: vacPageSize } = parseVacanciesPagination(
    Object.fromEntries(urlParams.entries())
  );
  const vacSortSt = parseVacanciesSort(Object.fromEntries(urlParams.entries()), { isAdmin });
  const vacFilterFromUrl = String(urlParams.get('vacancy') || 'all');
  const [vacTotal, setVacTotal] = useState(0);
  const [vacTotalPages, setVacTotalPages] = useState(1);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('open');
  const [companyId, setCompanyId] = useState('');

  const appUrl =
    (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';

  const pushVacanciesSort = (column) => {
    const cur = parseVacanciesSort(Object.fromEntries(urlParams.entries()), { isAdmin });
    const nextDir = clientSortNextDir(column, cur.sort, cur.dir);
    navigateDashboard({
      vacanciesSort: column,
      vacanciesSortDir: nextDir,
      vacanciesPage: 1,
      tab: 'vacancies',
    });
  };

  const loadVacancies = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        page: String(vacPage),
        pageSize: String(vacPageSize),
        sort: vacSortSt.sort,
        sortDir: vacSortSt.dir,
      });
      if (vacFilterFromUrl && vacFilterFromUrl !== 'all') qs.set('vacancy', vacFilterFromUrl);
      const res = await fetch(`/api/admin/vacancies?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao carregar vagas');
      const rows = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];
      setVacancies(rows);
      const total = typeof data?.total === 'number' ? data.total : rows.length;
      const tpg = typeof data?.totalPages === 'number'
        ? data.totalPages
        : Math.max(1, Math.ceil(total / vacPageSize));
      setVacTotal(total);
      setVacTotalPages(tpg);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/companies?forSelect=1');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao carregar empresas');
      setCompanies(Array.isArray(data) ? data : []);
      if (!companyId && Array.isArray(data) && data.length) setCompanyId(String(data[0].id));
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVacancies();
  }, [vacPage, vacPageSize, vacSortSt.sort, vacSortSt.dir, vacFilterFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadCompanies();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg('Copiado.');
      setTimeout(() => setMsg(''), 1200);
    } catch {
      setMsg('Não foi possível copiar automaticamente.');
      setTimeout(() => setMsg(''), 1600);
    }
  };

  const createVacancy = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const body = { title: title.trim(), status, slug: slug.trim() || undefined };
      if (isAdmin) body.companyId = companyId ? parseInt(companyId, 10) : null;
      const res = await fetch('/api/admin/vacancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao criar vaga');
      setTitle(''); setSlug(''); setStatus('open');
      setMsg('Vaga criada.');
      await loadVacancies();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const rotateLink = async (vacancyId) => {
    setLoading(true);
    setError('');
    setMsg('');
    setLinkExpiryEdit((cur) => (cur?.vacancyId === vacancyId ? null : cur));
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/link`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao rotacionar link');
      setMsg('Link rotacionado.');
      await loadVacancies();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const saveLinkExpiry = async () => {
    if (!linkExpiryEdit?.vacancyId) return;
    const parsed = new Date(linkExpiryEdit.value);
    if (Number.isNaN(parsed.getTime())) {
      setError('Data de expiração inválida.');
      return;
    }
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(linkExpiryEdit.vacancyId)}/link`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresAt: parsed.toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao atualizar expiração');
      setMsg('Expiração do link atualizada.');
      setLinkExpiryEdit(null);
      await loadVacancies();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const setVacancyStatus = async (vacancyId, nextStatus) => {
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao atualizar vaga');
      setMsg('Vaga atualizada.');
      await loadVacancies();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const editVacancy = async (v) => {
    const nextTitle = window.prompt('Título da vaga', v?.title ?? '');
    if (nextTitle == null) return;
    const nextSlug = window.prompt('Slug (URL-friendly)', v?.slug ?? '');
    if (nextSlug == null) return;
    const nextStatus = window.prompt('Status (open/closed)', v?.status ?? 'open');
    if (nextStatus == null) return;

    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(v.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: String(nextTitle).trim(), slug: String(nextSlug).trim(), status: String(nextStatus).trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao atualizar vaga');
      setMsg('Vaga atualizada.');
      await loadVacancies();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const archiveVacancy = async (vacancyId, title) => {
    const ok = window.confirm(
      `Arquivar vaga "${title}"? Ela some das listagens e o link público deixa de funcionar. Candidatos que já responderam continuam no dashboard.`
    );
    if (!ok) return;
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao arquivar vaga');
      setMsg('Vaga arquivada.');
      await loadVacancies();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...S.card, padding: '22px 28px' }}>
        <span style={S.label}>Vagas</span>
        <p style={{ fontSize: '13px', color: C.muted, marginTop: '10px', lineHeight: 1.65, marginBottom: 0 }}>
          {t(locale, 'recruiting.vacanciesIntro')}
        </p>
        {error ? (
          <p style={{ marginTop: '10px', marginBottom: 0, color: C.tension, fontSize: '12px', fontFamily: 'monospace' }}>
            {error}
          </p>
        ) : null}
        {msg ? (
          <p style={{ marginTop: '10px', marginBottom: 0, color: C.synergy, fontSize: '12px', fontFamily: 'monospace' }}>
            {msg}
          </p>
        ) : null}
      </div>

      <div style={{ ...S.card }}>
        <span style={S.label}>Criar vaga</span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
          {isAdmin && (
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              style={{ flex: '1 1 240px', background: 'rgba(26,22,37,.03)', border: `1px solid ${C.border}`,
                borderRadius: '10px', padding: '10px 12px', color: C.muted, fontSize: '12px',
                cursor: 'pointer', fontFamily: 'monospace' }}
            >
              {companies.length === 0 ? (
                <option value="">(carregando empresas…)</option>
              ) : companies.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name} (#{c.id})</option>
              ))}
            </select>
          )}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (ex.: Pessoa Dev Fullstack)"
            style={{ flex: '2 1 320px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px', fontFamily: 'monospace' }}
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Slug opcional (ex.: dev-fullstack)"
            style={{ flex: '1 1 220px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px', fontFamily: 'monospace' }}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ flex: '0 0 160px', background: 'rgba(26,22,37,.03)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.muted, fontSize: '12px',
              cursor: 'pointer', fontFamily: 'monospace' }}
          >
            <option value="open">open</option>
            <option value="closed">closed</option>
          </select>
          <button
            type="button"
            onClick={createVacancy}
            disabled={loading || !title.trim() || (isAdmin && !companyId)}
            style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
              borderRadius: '10px', padding: '10px 14px', color: C.purple, fontSize: '12px',
              cursor: 'pointer', fontFamily: 'monospace', opacity: (loading || !title.trim() || (isAdmin && !companyId)) ? 0.6 : 1 }}
          >
            Criar
          </button>
          <button
            type="button"
            onClick={loadVacancies}
            disabled={loading}
            style={{ background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 14px', color: C.muted, fontSize: '12px',
              cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
          >
            Atualizar
          </button>
        </div>
      </div>

      <div style={{ ...S.card }}>
        <span style={S.label}>Vagas cadastradas</span>
        {vacFilterFromUrl !== 'all' ? (
          <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'rgba(26,22,37,.03)' }}>
            <p style={{ margin: 0, fontSize: '12px', color: C.muted, lineHeight: 1.55 }}>
              A lista abaixo está limitada à vaga do filtro superior.{' '}
              <button
                type="button"
                onClick={() => navigateDashboard({ vacancy: 'all', vacanciesPage: 1, tab: 'vacancies' })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: C.purpleLight,
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  textDecoration: 'underline',
                }}
              >
                Mostrar todas as vagas
              </button>
            </p>
          </div>
        ) : null}
        {vacTotal === 0 ? (
          <p style={{ color: C.muted, fontStyle: 'italic', marginTop: '10px' }}>
            {vacFilterFromUrl !== 'all' ? 'Nenhuma vaga corresponde ao filtro atual.' : 'Nenhuma vaga ainda.'}
          </p>
        ) : (
          <>
            <div
              role="group"
              aria-label="Ordenar vagas"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '10px',
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(26,22,37,.03)',
                borderRadius: '12px',
                border: `1px solid ${C.border}`,
              }}
            >
              <span style={{ fontSize: '10px', color: C.faint, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Ordenar por
              </span>
              {[
                { k: 'id', label: 'ID' },
                { k: 'title', label: 'Título' },
                { k: 'status', label: 'Status' },
                ...(isAdmin ? [{ k: 'companyName', label: 'Empresa' }] : []),
                { k: 'createdAt', label: 'Criada em' },
              ].map(({ k, label }) => {
                const active = vacSortSt.sort === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => pushVacanciesSort(k)}
                    aria-pressed={active}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      border: `1px solid ${active ? `${C.purple}55` : C.border}`,
                      background: active ? `${C.purple}18` : 'transparent',
                      color: active ? C.purple : C.muted,
                    }}
                  >
                    {label}
                    {active ? (vacSortSt.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                );
              })}
            </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {vacancies.map((v) => {
              const token = v.activeToken || '';
              const link = token ? `${appUrl}/v/${token}` : '';
              const exp = v.activeTokenExpiresAt ? new Date(v.activeTokenExpiresAt) : null;
              return (
                <div key={v.id} style={{ background: 'rgba(26,22,37,.03)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: C.text, fontSize: '13px' }}>
                        <span style={{ fontFamily: 'monospace', color: C.faint, marginRight: '8px' }}>#{v.id}</span>
                        <strong style={{ fontWeight: 'normal' }}>{v.title}</strong>
                        <span style={{ fontFamily: 'monospace', color: C.faint, marginLeft: '10px' }}>({v.status})</span>
                        {isAdmin && (
                          <span style={{ fontFamily: 'monospace', color: C.faint, marginLeft: '10px' }}>
                            · {v.companyName}
                          </span>
                        )}
                      </div>
                      {token ? (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: C.muted, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {link}
                        </div>
                      ) : (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
                          (sem link ativo)
                        </div>
                      )}
                      {token && exp ? (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
                          expira em {exp.toLocaleString()}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => editVacancy(v)}
                        disabled={loading}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setVacancyStatus(v.id, v.status === 'open' ? 'closed' : 'open')}
                        disabled={loading}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        {v.status === 'open' ? 'Fechar' : 'Reabrir'}
                      </button>
                      <button
                        type="button"
                        onClick={() => rotateLink(v.id)}
                        disabled={loading}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        Rotacionar link
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!token) return;
                          setLinkExpiryEdit((cur) =>
                            cur?.vacancyId === v.id
                              ? null
                              : {
                                  vacancyId: v.id,
                                  value: v.activeTokenExpiresAt
                                    ? toDatetimeLocalValue(new Date(v.activeTokenExpiresAt))
                                    : toDatetimeLocalValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
                                }
                          );
                        }}
                        disabled={loading || !token}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: (loading || !token) ? 0.6 : 1 }}
                      >
                        Editar expiração
                      </button>
                      <button
                        type="button"
                        onClick={() => token && copy(link)}
                        disabled={loading || !token}
                        style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
                          borderRadius: '10px', padding: '8px 10px', color: C.purple, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: (loading || !token) ? 0.6 : 1 }}
                      >
                        Copiar link
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveVacancy(v.id, v.title)}
                        disabled={loading}
                        style={{ background: 'rgba(232,71,71,.08)', border: '1px solid rgba(232,71,71,.35)',
                          borderRadius: '10px', padding: '8px 10px', color: C.tension, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        Arquivar
                      </button>
                    </div>
                  </div>
                  {linkExpiryEdit?.vacancyId === v.id ? (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        borderRadius: '10px',
                        border: `1px solid ${C.border}`,
                        background: 'rgba(26,22,37,.04)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                        Nova data de expiração (horário local)
                      </span>
                      <input
                        type="datetime-local"
                        value={linkExpiryEdit.value}
                        onChange={(e) =>
                          setLinkExpiryEdit((cur) =>
                            cur && cur.vacancyId === v.id ? { ...cur, value: e.target.value } : cur
                          )
                        }
                        disabled={loading}
                        aria-label="Nova data de expiração do link"
                        style={{
                          flex: '1 1 200px',
                          minWidth: '180px',
                          background: 'rgba(26,22,37,.04)',
                          border: `1px solid ${C.border}`,
                          borderRadius: '10px',
                          padding: '8px 10px',
                          color: C.text,
                          fontSize: '12px',
                          fontFamily: 'monospace',
                        }}
                      />
                      <button
                        type="button"
                        onClick={saveLinkExpiry}
                        disabled={loading}
                        style={{
                          background: `${C.synergy}18`,
                          border: `1px solid ${C.synergy}55`,
                          borderRadius: '10px',
                          padding: '8px 12px',
                          color: C.synergy,
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                          opacity: loading ? 0.6 : 1,
                        }}
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setLinkExpiryEdit(null)}
                        disabled={loading}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${C.border}`,
                          borderRadius: '10px',
                          padding: '8px 12px',
                          color: C.muted,
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                          opacity: loading ? 0.6 : 1,
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : null}
                  <VacancyInviteByEmail vacancyId={v.id} onSent={() => setInvitesRefresh((x) => x + 1)} />
                  <VacancyInvitesBlock vacancyId={v.id} locale={locale} refreshKey={invitesRefresh} />
                  <VacancyRubricEditor vacancyId={v.id} locale={locale} />
                  <VacancyRankingBlock vacancyId={v.id} locale={locale} />
                </div>
              );
            })}
          </div>
            <div style={{
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', justifyContent: 'space-between',
              marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                {vacTotal} vaga(s) · página {vacPage}/{vacTotalPages}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <select
                  value={String(vacPageSize)}
                  onChange={(e) => {
                    const ps = parseInt(e.target.value, 10);
                    navigateDashboard({ vacanciesPage: 1, vacanciesPageSize: ps, tab: 'vacancies' });
                  }}
                  disabled={loading}
                  style={{ background: 'rgba(26,22,37,.05)', border: `1px solid ${C.border}`,
                    borderRadius: '10px', padding: '6px 10px', color: C.muted, fontSize: '11px',
                    cursor: 'pointer', fontFamily: 'monospace' }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={String(n)}>{n}/pág.</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={loading || vacPage <= 1}
                  onClick={() => navigateDashboard({ vacanciesPage: Math.max(1, vacPage - 1), tab: 'vacancies' })}
                  style={{ background: vacPage <= 1 ? 'transparent' : `${C.purple}18`,
                    border: `1px solid ${vacPage <= 1 ? C.border : `${C.purple}55`}`,
                    borderRadius: '10px', padding: '6px 12px', color: vacPage <= 1 ? C.faint : C.purple,
                    fontSize: '11px', cursor: vacPage <= 1 ? 'default' : 'pointer', fontFamily: 'monospace' }}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={loading || vacPage >= vacTotalPages}
                  onClick={() => navigateDashboard({ vacanciesPage: Math.min(vacTotalPages, vacPage + 1), tab: 'vacancies' })}
                  style={{ background: vacPage >= vacTotalPages ? 'transparent' : `${C.purple}18`,
                    border: `1px solid ${vacPage >= vacTotalPages ? C.border : `${C.purple}55`}`,
                    borderRadius: '10px', padding: '6px 12px',
                    color: vacPage >= vacTotalPages ? C.faint : C.purple,
                    fontSize: '11px', cursor: vacPage >= vacTotalPages ? 'default' : 'pointer', fontFamily: 'monospace' }}
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
