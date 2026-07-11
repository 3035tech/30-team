'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { C } from '../../lib/theme';
import { RichTextEditor } from '../_components/RichTextEditor';
import { S } from './dashboard-shared';

function inviteStatusLabel(locale, status) {
  const s = String(status || '');
  if (s === 'opened') return t(locale, 'recruiting.inviteOpened');
  if (s === 'completed') return t(locale, 'recruiting.inviteCompleted');
  if (s === 'cancelled') return t(locale, 'recruiting.inviteCancelled');
  if (s === 'sent') return t(locale, 'recruiting.inviteSent');
  return 'Sem convite';
}

function CandidateCard({ row, vacancyId, locale, onChanged }) {
  const [notes, setNotes] = useState(row.interviewNotes || '');
  const [busy, setBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setNotes(row.interviewNotes || '');
  }, [row.interviewNotes, row.candidateId]);

  const saveNotes = async () => {
    setBusy(true);
    setErr('');
    setOk('');
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates/${encodeURIComponent(row.candidateId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interviewNotes: notes }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Falha ao salvar notas');
      setOk('Notas salvas.');
      onChanged?.();
      setTimeout(() => setOk(''), 3000);
    } catch (e) {
      setErr(e?.message || 'Erro');
    } finally {
      setBusy(false);
    }
  };

  const sendChallenge = async () => {
    setInviteBusy(true);
    setErr('');
    setOk('');
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates/${encodeURIComponent(row.candidateId)}/invite`,
        { method: 'POST' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Falha ao enviar desafio');
      setOk(`Desafio enviado para ${data.sentTo || row.email}.`);
      onChanged?.();
      setTimeout(() => setOk(''), 5000);
    } catch (e) {
      setErr(e?.message || 'Erro');
    } finally {
      setInviteBusy(false);
    }
  };

  const alreadyCompleted = Boolean(row.assessmentId) || row.inviteStatus === 'completed';

  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: '12px',
        padding: '14px',
        background: 'rgba(26,22,37,.02)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '14px', color: C.text }}>
            <strong style={{ fontWeight: 600 }}>{row.fullName}</strong>
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px', fontFamily: 'monospace', color: C.muted }}>
            {row.email}
          </div>
          <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                padding: '2px 8px',
                borderRadius: '8px',
                border: `1px solid ${C.border}`,
                color: C.muted,
              }}
            >
              {inviteStatusLabel(locale, row.inviteStatus)}
            </span>
            {row.topType != null && (
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: C.purpleLight }}>
                Tipo {row.topType}
              </span>
            )}
            {row.pipelineStage && (
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: C.faint }}>
                {row.pipelineStage}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setExpanded((x) => !x)}
            style={{
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              padding: '8px 10px',
              color: C.muted,
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            {expanded ? 'Ocultar notas' : 'Notas / ações'}
          </button>
          <button
            type="button"
            onClick={sendChallenge}
            disabled={inviteBusy || alreadyCompleted}
            title={alreadyCompleted ? 'Teste já respondido' : 'Enviar desafio de eneagrama por e-mail'}
            style={{
              background: alreadyCompleted ? 'transparent' : `${C.synergy}18`,
              border: `1px solid ${alreadyCompleted ? C.border : `${C.synergy}55`}`,
              borderRadius: '10px',
              padding: '8px 10px',
              color: alreadyCompleted ? C.faint : C.synergy,
              fontSize: '12px',
              cursor: alreadyCompleted ? 'default' : 'pointer',
              fontFamily: 'monospace',
              opacity: inviteBusy ? 0.6 : 1,
            }}
          >
            {inviteBusy ? 'Enviando…' : alreadyCompleted ? 'Teste ok' : 'Enviar eneagrama'}
          </button>
        </div>
      </div>

      {err ? (
        <p style={{ marginTop: '10px', marginBottom: 0, color: C.tension, fontSize: '11px', fontFamily: 'monospace' }}>
          {err}
        </p>
      ) : null}
      {ok ? (
        <p style={{ marginTop: '10px', marginBottom: 0, color: C.synergy, fontSize: '11px', fontFamily: 'monospace' }}>
          {ok}
        </p>
      ) : null}

      {expanded && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${C.border}` }}>
          <span
            style={{
              fontSize: '11px',
              color: C.muted,
              fontFamily: 'monospace',
              display: 'block',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
            }}
          >
            Anotações da entrevista
          </span>
          <RichTextEditor value={notes} onChange={setNotes} />
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={saveNotes}
              disabled={busy}
              style={{
                background: `${C.purple}18`,
                border: `1px solid ${C.purple}55`,
                borderRadius: '10px',
                padding: '8px 14px',
                color: C.purple,
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? 'Salvando…' : 'Salvar notas'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function VacancyInterviewCandidates({ vacancyId, locale = 'pt-BR' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Falha ao carregar candidatos');
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setErr(e?.message || 'Erro');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [vacancyId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setCreating(true);
    setErr('');
    setCreateMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name.trim(),
          email: email.trim().toLowerCase(),
          interviewNotes: createNotes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Falha ao cadastrar');
      setName('');
      setEmail('');
      setCreateNotes('');
      setCreateMsg('Candidato cadastrado.');
      await load();
      setTimeout(() => setCreateMsg(''), 3000);
    } catch (e) {
      setErr(e?.message || 'Erro');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
      <span style={S.label}>Candidatos da entrevista</span>
      <p style={{ fontSize: '12px', color: C.muted, marginTop: '8px', lineHeight: 1.55, marginBottom: '12px' }}>
        Cadastre o candidato com nome e e-mail após a entrevista. O e-mail é a chave para enviar o eneagrama
        (e depois os motivadores) e unificar os resultados.
      </p>

      <div
        style={{
          padding: '14px',
          borderRadius: '12px',
          border: `1px solid ${C.purple}33`,
          background: `${C.purple}08`,
          marginBottom: '14px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            color: C.purpleLight,
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            display: 'block',
            marginBottom: '10px',
          }}
        >
          Novo candidato
        </span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome completo"
            aria-label="Nome do candidato"
            style={{
              flex: '1 1 200px',
              background: 'rgba(255,255,255,.8)',
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              padding: '10px 12px',
              color: C.text,
              fontSize: '13px',
              fontFamily: 'monospace',
            }}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            aria-label="E-mail do candidato"
            style={{
              flex: '1 1 220px',
              background: 'rgba(255,255,255,.8)',
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              padding: '10px 12px',
              color: C.text,
              fontSize: '13px',
              fontFamily: 'monospace',
            }}
          />
        </div>
        <RichTextEditor
          value={createNotes}
          onChange={setCreateNotes}
          placeholder="Anotações iniciais da entrevista (opcional)…"
          minHeight={100}
        />
        <div style={{ marginTop: '10px' }}>
          <button
            type="button"
            onClick={create}
            disabled={creating || !name.trim() || !email.trim()}
            style={{
              background: `${C.purple}18`,
              border: `1px solid ${C.purple}55`,
              borderRadius: '10px',
              padding: '9px 16px',
              color: C.purple,
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              opacity: creating || !name.trim() || !email.trim() ? 0.55 : 1,
            }}
          >
            {creating ? 'Cadastrando…' : 'Cadastrar candidato'}
          </button>
        </div>
        {createMsg ? (
          <p style={{ marginTop: '8px', marginBottom: 0, color: C.synergy, fontSize: '11px', fontFamily: 'monospace' }}>
            {createMsg}
          </p>
        ) : null}
      </div>

      {err ? (
        <p style={{ marginBottom: '10px', color: C.tension, fontSize: '12px', fontFamily: 'monospace' }}>{err}</p>
      ) : null}

      {loading ? (
        <p style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>Carregando candidatos…</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: '12px', color: C.faint, fontFamily: 'monospace' }}>
          Nenhum candidato cadastrado nesta vaga ainda.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map((row) => (
            <CandidateCard
              key={row.candidateId}
              row={row}
              vacancyId={vacancyId}
              locale={locale}
              onChanged={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}
