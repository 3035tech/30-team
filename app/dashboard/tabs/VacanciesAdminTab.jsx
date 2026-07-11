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
import { clientSortNextDir, KANBAN_STAGES, S } from '../dashboard-shared';
import { VacancyInterviewCandidates } from '../VacancyInterviewCandidates';

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

  const fetchInvites = async (cancelled = { current: false }) => {
    setErr('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/invites`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro');
      if (!cancelled.current) setRows(Array.isArray(data.invites) ? data.invites : []);
    } catch (e) {
      if (!cancelled.current) setErr(e?.message || 'Erro');
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
      if (!res.ok) throw new Error(data?.error || 'Falha');
      await fetchInvites();
    } catch (e) {
      setErr(e?.message || 'Erro');
    } finally {
      setBusy(null);
    }
  };

  const removeInvite = async (inv) => {
    const ok = window.confirm(
      t(locale, 'recruiting.inviteDeleteConfirm', {
        name: inv.candidateName || '—',
        email: inv.candidateEmail || '—',
      })
    );
    if (!ok) return;
    setBusy(`del:${inv.id}`);
    setErr('');
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/invites/${encodeURIComponent(inv.id)}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Falha');
      await fetchInvites();
    } catch (e) {
      setErr(e?.message || 'Erro');
    } finally {
      setBusy(null);
    }
  };

  if (!rows.length && !err) {
    return (
      <div style={{ marginTop: '10px', fontSize: '12px', color: C.faint, fontFamily: 'monospace' }}>
        {t(locale, 'recruiting.inviteListTitle')}: —
      </div>
    );
  }

  return (
    <div style={{ marginTop: '12px' }}>
      <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace', display: 'block', marginBottom: '8px' }}>
        {t(locale, 'recruiting.inviteListTitle')}
      </span>
      {err ? (
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: C.tension, fontFamily: 'monospace' }}>{err}</p>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
        {rows.map((inv) => {
          const lastReminder = inv.lastReminderAt ? new Date(inv.lastReminderAt) : null;
          const reminderCount = inv.reminderCount ?? 0;
          const canRemind = ['sent', 'opened'].includes(String(inv.status || ''));
          return (
            <div
              key={inv.id}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${C.border}`,
                background: 'rgba(26,22,37,.02)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontWeight: 500 }}>{inv.candidateName}</div>
                <div style={{ color: C.muted, fontSize: '11px' }}>{inv.candidateEmail}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px', alignItems: 'center' }}>
                  <span style={{ color: C.purpleLight }}>{inviteStatusLabel(locale, inv.status)}</span>
                  {reminderCount > 0 && (
                    <span style={{ color: C.faint, fontSize: '11px' }}>
                      {reminderCount} lembrete{reminderCount > 1 ? 's' : ''} enviado{reminderCount > 1 ? 's' : ''}
                      {lastReminder ? ` · último: ${lastReminder.toLocaleDateString('pt-BR')}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                {canRemind ? (
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => remind(inv.id)}
                    style={{
                      fontSize: '11px', padding: '5px 10px', borderRadius: '6px',
                      border: `1px solid ${C.synergy}55`, background: `${C.synergy}12`,
                      color: C.synergy, cursor: busy ? 'default' : 'pointer', display: 'flex',
                      alignItems: 'center', gap: '6px',
                    }}
                  >
                    {busy === String(inv.id)
                      ? <><span className="spinner" />Enviando</>
                      : t(locale, 'recruiting.inviteRemind')}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => removeInvite(inv)}
                  title={t(locale, 'recruiting.inviteDelete')}
                  style={{
                    fontSize: '11px', padding: '5px 10px', borderRadius: '6px',
                    border: '1px solid rgba(232,71,71,.35)', background: 'rgba(232,71,71,.08)',
                    color: C.tension, cursor: busy ? 'default' : 'pointer', display: 'flex',
                    alignItems: 'center', gap: '6px',
                  }}
                >
                  {busy === `del:${inv.id}`
                    ? <><span className="spinner" />Removendo</>
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
      setTimeout(() => setMsg(''), 3000);
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
          <label key={t} style={{ fontSize: '12px', color: C.muted, display: 'flex', alignItems: 'center', gap: '4px' }}>
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

function VacancyKanbanBlock({ vacancyId, locale }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [moving, setMoving] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/ranking`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Erro');
        if (!cancelled) setRows(Array.isArray(data.ranking) ? data.ranking : []);
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Erro');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [vacancyId]);

  const moveTo = async (assessmentId, stage) => {
    setMoving(String(assessmentId));
    try {
      const res = await fetch(`/api/admin/assessments/${encodeURIComponent(assessmentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStage: stage }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro');
      setRows((prev) =>
        prev.map((r) => String(r.assessmentId) === String(assessmentId) ? { ...r, pipelineStage: stage } : r)
      );
    } catch (e) {
      setErr(e?.message || 'Erro ao mover candidato');
    } finally {
      setMoving(null);
    }
  };

  const grouped = Object.fromEntries(KANBAN_STAGES.map((s) => [s.id, []]));
  rows.forEach((r) => {
    const stage = r.pipelineStage || 'new';
    if (grouped[stage]) grouped[stage].push(r);
    else grouped['new'].push(r);
  });

  const hasAny = rows.length > 0;

  return (
    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace', textTransform: 'uppercase',
          letterSpacing: '1.5px' }}>
          Pipeline de Candidatos
        </span>
        {loading && <span className="spinner" style={{ color: C.muted }} />}
        {!loading && hasAny && (
          <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
            {rows.length} candidato{rows.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {err ? <p style={{ fontSize: '12px', color: C.tension, fontFamily: 'monospace', margin: '0 0 10px' }}>{err}</p> : null}

      {!loading && !hasAny ? (
        <p style={{ fontSize: '12px', color: C.faint, fontStyle: 'italic' }}>
          Nenhum candidato nesta vaga ainda.
        </p>
      ) : null}

      {hasAny && (
        <div className="kanban-scroll" style={{ overflowX: 'auto', paddingBottom: '8px',
          WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', gap: '10px', minWidth: 'max-content', alignItems: 'flex-start' }}>
            {KANBAN_STAGES.map((stage) => {
              const cards = grouped[stage.id] || [];
              const isDropTarget = dragOverStage === stage.id;
              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStage(null); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain');
                    setDragOverStage(null);
                    setDraggingId(null);
                    if (!id) return;
                    const r = rows.find((r) => String(r.assessmentId) === id);
                    if (!r || (r.pipelineStage || 'new') === stage.id) return;
                    await moveTo(parseInt(id, 10), stage.id);
                  }}
                  style={{ width: '200px', flexShrink: 0, borderRadius: '12px',
                    outline: isDropTarget ? `2px dashed ${stage.color}` : '2px dashed transparent',
                    outlineOffset: '3px', transition: 'outline-color 0.12s' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 10px', borderRadius: '10px 10px 0 0',
                    background: isDropTarget ? `${stage.color}22` : `${stage.color}12`,
                    borderTop: `3px solid ${stage.color}`, border: `1px solid ${stage.color}30`,
                    marginBottom: '8px', transition: 'background 0.12s' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%',
                      background: stage.color, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: stage.color,
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', flex: 1 }}>
                      {stage.label}
                    </span>
                    <span style={{ fontSize: '11px', color: stage.color, fontFamily: 'monospace',
                      background: `${stage.color}25`, borderRadius: '8px', padding: '1px 7px', fontWeight: 700 }}>
                      {cards.length}
                    </span>
                  </div>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    style={{ minHeight: isDropTarget ? '60px' : '30px', display: 'flex',
                      flexDirection: 'column', gap: '7px', transition: 'min-height 0.12s' }}
                  >
                    {cards.map((r) => {
                      const rid = String(r.assessmentId);
                      const isDragging = draggingId === rid;
                      const isBusy = moving === rid;
                      return (
                        <div
                          key={rid}
                          draggable
                          onDragStart={(e) => {
                            setDraggingId(rid);
                            e.dataTransfer.setData('text/plain', rid);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => { setDraggingId(null); setDragOverStage(null); }}
                          style={{ background: 'rgba(255,255,255,.88)',
                            border: `1px solid ${C.border}`, borderRadius: '8px',
                            padding: '9px 10px', cursor: 'grab', userSelect: 'none',
                            opacity: isDragging ? 0.4 : isBusy ? 0.65 : 1,
                            transition: 'opacity 0.15s',
                            pointerEvents: draggingId && !isDragging ? 'none' : 'auto' }}
                        >
                          <div style={{ fontSize: '13px', color: C.text, marginBottom: '4px',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            fontFamily: "'Georgia',serif" }}>
                            {r.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: C.muted }}>
                              T{r.topType}
                            </span>
                            {r.vacancyFitScore010 != null && (
                              <span style={{ fontSize: '11px', fontFamily: 'monospace',
                                color: r.vacancyFitScore010 >= 7 ? C.synergy : r.vacancyFitScore010 >= 4 ? '#d97706' : C.tension }}>
                                {r.vacancyFitScore010}/10
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {cards.length === 0 && (
                      <div style={{ padding: '14px 10px', textAlign: 'center',
                        color: isDropTarget ? stage.color : C.faint, fontSize: '11px',
                        fontFamily: 'monospace', fontStyle: 'italic',
                        border: isDropTarget ? `2px dashed ${stage.color}55` : '2px dashed transparent',
                        borderRadius: '8px', transition: 'all 0.12s' }}>
                        {isDropTarget ? '↓' : '—'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
  const [editingVacancy, setEditingVacancy] = useState(null);
  const [detailVacancy, setDetailVacancy] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const vacancyDetailId = String(urlParams.get('vacancyDetail') || '').trim();
  const isDetailView = Boolean(vacancyDetailId);

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
  const [positionsCount, setPositionsCount] = useState('1');
  const [targetDate, setTargetDate] = useState('');
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
    if (isDetailView) return;
    loadVacancies();
  }, [vacPage, vacPageSize, vacSortSt.sort, vacSortSt.dir, vacFilterFromUrl, isDetailView]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadCompanies();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadVacancyDetail = async (id) => {
    setDetailLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Falha ao carregar vaga');
      setDetailVacancy(data);
    } catch (e) {
      setDetailVacancy(null);
      setError(e?.message || 'Erro');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!vacancyDetailId) {
      setDetailVacancy(null);
      return;
    }
    loadVacancyDetail(vacancyDetailId);
  }, [vacancyDetailId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openVacancyDetail = (id) => {
    navigateDashboard({ tab: 'vacancies', vacancyDetail: String(id) });
  };

  const backToVacanciesList = () => {
    setDetailVacancy(null);
    setLinkExpiryEdit(null);
    setEditingVacancy(null);
    navigateDashboard({ tab: 'vacancies', vacancyDetail: '' });
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg('Copiado.');
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('Não foi possível copiar automaticamente.');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const createVacancy = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const body = {
        title: title.trim(), status, slug: slug.trim() || undefined,
        positionsCount: parseInt(positionsCount, 10) || 1,
        targetDate: targetDate || null,
      };
      if (isAdmin) body.companyId = companyId ? parseInt(companyId, 10) : null;
      const res = await fetch('/api/admin/vacancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao criar vaga');
      setTitle(''); setSlug(''); setStatus('open'); setPositionsCount('1'); setTargetDate('');
      setMsg('Vaga criada.');
      await loadVacancies();
      setTimeout(() => setMsg(''), 3000);
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
      if (isDetailView) await loadVacancyDetail(vacancyId);
      else await loadVacancies();
      setTimeout(() => setMsg(''), 3000);
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
      if (isDetailView) await loadVacancyDetail(linkExpiryEdit.vacancyId);
      else await loadVacancies();
      setTimeout(() => setMsg(''), 3000);
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
      if (isDetailView) await loadVacancyDetail(vacancyId);
      else await loadVacancies();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const editVacancy = (v) => {
    setEditingVacancy({
      id: v.id,
      title: v.title ?? '',
      slug: v.slug ?? '',
      status: v.status ?? 'open',
      positionsCount: String(v.positionsCount ?? 1),
      targetDate: v.targetDate ? String(v.targetDate).slice(0, 10) : '',
    });
  };

  const saveVacancyEdit = async () => {
    if (!editingVacancy) return;
    const { id, title, slug, status, positionsCount, targetDate } = editingVacancy;
    if (!title.trim()) { setError('O título é obrigatório.'); return; }
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || undefined,
          status,
          positionsCount: parseInt(positionsCount, 10) || 1,
          targetDate: targetDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao atualizar vaga');
      setMsg('Vaga atualizada.');
      setEditingVacancy(null);
      if (isDetailView) await loadVacancyDetail(id);
      else await loadVacancies();
      setTimeout(() => setMsg(''), 3000);
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
      if (isDetailView) {
        backToVacanciesList();
      } else {
        await loadVacancies();
      }
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  if (isDetailView) {
    const v = detailVacancy;
    const token = v?.activeToken || null;
    const link = token ? `${appUrl}/v/${token}` : '';
    const exp = v?.activeTokenExpiresAt ? new Date(v.activeTokenExpiresAt) : null;
    const isEditing = editingVacancy?.id === v?.id;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ ...S.card, padding: '22px 28px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <button
              type="button"
              onClick={backToVacanciesList}
              style={{
                background: 'transparent', border: `1px solid ${C.border}`,
                borderRadius: '10px', padding: '8px 12px', color: C.muted, fontSize: '12px',
                cursor: 'pointer', fontFamily: 'monospace',
              }}
            >
              ← Voltar para vagas
            </button>
            <span style={S.label}>Detalhes da vaga</span>
          </div>
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
          {(detailLoading || loading) && !v ? (
            <p style={{ marginTop: '14px', color: C.muted, fontSize: '13px', fontFamily: 'monospace' }}>
              Carregando vaga…
            </p>
          ) : null}
          {!detailLoading && !v && error ? (
            <button
              type="button"
              onClick={backToVacanciesList}
              style={{
                marginTop: '14px', background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
                borderRadius: '10px', padding: '8px 14px', color: C.purple, fontSize: '12px',
                cursor: 'pointer', fontFamily: 'monospace',
              }}
            >
              Voltar à listagem
            </button>
          ) : null}
        </div>

        {v ? (
          <div style={{ ...S.card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '18px', color: C.text }}>{v.title}</span>
                  <span
                    style={{
                      fontFamily: 'monospace', fontSize: '11px',
                      color: v.status === 'open' ? C.synergy : C.faint,
                      border: `1px solid ${v.status === 'open' ? `${C.synergy}55` : C.border}`,
                      borderRadius: '999px', padding: '2px 8px',
                    }}
                  >
                    {v.status === 'open' ? 'Aberta' : 'Fechada'}
                  </span>
                  {isAdmin && (
                    <span style={{ fontFamily: 'monospace', color: C.faint, fontSize: '12px' }}>
                      · {v.companyName}
                    </span>
                  )}
                </div>
                {token ? (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: C.muted, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {link}
                  </div>
                ) : (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: C.faint, fontFamily: 'monospace' }}>
                    (sem link ativo)
                  </div>
                )}
                {token && exp ? (
                  <div style={{ marginTop: '4px', fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
                    expira em {exp.toLocaleString()}
                  </div>
                ) : null}
                <div style={{ marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {v.positionsCount != null && v.positionsCount > 0 && (
                    <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                      {v.positionsCount} vaga{v.positionsCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {v.targetDate && (
                    <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                      alvo: {new Date(v.targetDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => navigateDashboard({ tab: 'team', vacancy: String(v.id), vacancyDetail: '' })}
                  style={{ background: `${C.purple}12`, border: `1px solid ${C.purple}44`,
                    borderRadius: '10px', padding: '8px 10px', color: C.purpleLight, fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'monospace' }}
                >
                  Ver candidatos
                </button>
                <button
                  type="button"
                  onClick={() => editVacancy(v)}
                  disabled={loading}
                  style={{ background: 'transparent', border: `1px solid ${C.border}`,
                    borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setVacancyStatus(v.id, v.status === 'open' ? 'closed' : 'open')}
                  disabled={loading}
                  style={{ background: 'transparent', border: `1px solid ${C.border}`,
                    borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                >
                  {v.status === 'open' ? 'Fechar' : 'Reabrir'}
                </button>
                <button
                  type="button"
                  onClick={() => rotateLink(v.id)}
                  disabled={loading}
                  style={{ background: 'transparent', border: `1px solid ${C.border}`,
                    borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                >
                  Rotacionar link
                </button>
                <button
                  type="button"
                  onClick={() => token && copy(link)}
                  disabled={loading || !token}
                  style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
                    borderRadius: '10px', padding: '8px 10px', color: C.purple, fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'monospace', opacity: (loading || !token) ? 0.6 : 1 }}
                >
                  Copiar link
                </button>
                <button
                  type="button"
                  onClick={() => archiveVacancy(v.id, v.title)}
                  disabled={loading}
                  style={{ background: 'rgba(232,71,71,.08)', border: '1px solid rgba(232,71,71,.35)',
                    borderRadius: '10px', padding: '8px 10px', color: C.tension, fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                >
                  Arquivar
                </button>
              </div>
            </div>

            {isEditing && (
              <div style={{
                marginTop: '12px', padding: '16px', borderRadius: '10px',
                border: `1px solid ${C.purple}44`, background: `${C.purple}08`,
              }}>
                <span style={{ fontSize: '11px', color: C.purpleLight, fontFamily: 'monospace',
                  textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '12px' }}>
                  Editar vaga
                </span>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <input
                    value={editingVacancy.title}
                    onChange={(e) => setEditingVacancy((cur) => ({ ...cur, title: e.target.value }))}
                    placeholder="Título da vaga"
                    aria-label="Título da vaga"
                    style={{ flex: '2 1 280px', background: 'rgba(255,255,255,.8)', border: `1px solid ${C.border}`,
                      borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '13px', fontFamily: 'monospace' }}
                  />
                  <input
                    value={editingVacancy.slug}
                    onChange={(e) => setEditingVacancy((cur) => ({ ...cur, slug: e.target.value }))}
                    placeholder="Slug (ex.: dev-fullstack)"
                    aria-label="Slug da vaga"
                    style={{ flex: '1 1 200px', background: 'rgba(255,255,255,.8)', border: `1px solid ${C.border}`,
                      borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '13px', fontFamily: 'monospace' }}
                  />
                  <select
                    value={editingVacancy.status}
                    onChange={(e) => setEditingVacancy((cur) => ({ ...cur, status: e.target.value }))}
                    aria-label="Status da vaga"
                    style={{ flex: '0 0 140px', background: 'rgba(255,255,255,.8)', border: `1px solid ${C.border}`,
                      borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '13px',
                      cursor: 'pointer', fontFamily: 'monospace' }}
                  >
                    <option value="open">Aberta</option>
                    <option value="closed">Fechada</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
                    Nº de vagas
                    <input
                      type="number"
                      min="1"
                      value={editingVacancy.positionsCount}
                      onChange={(e) => setEditingVacancy((cur) => ({ ...cur, positionsCount: e.target.value }))}
                      aria-label="Número de posições"
                      style={{ width: '70px', background: 'rgba(255,255,255,.8)', border: `1px solid ${C.border}`,
                        borderRadius: '10px', padding: '8px 10px', color: C.text, fontSize: '13px',
                        fontFamily: 'monospace' }}
                    />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
                    Data-alvo
                    <input
                      type="date"
                      value={editingVacancy.targetDate}
                      onChange={(e) => setEditingVacancy((cur) => ({ ...cur, targetDate: e.target.value }))}
                      aria-label="Data-alvo de encerramento"
                      style={{ background: 'rgba(255,255,255,.8)', border: `1px solid ${C.border}`,
                        borderRadius: '10px', padding: '8px 10px', color: C.text, fontSize: '13px',
                        fontFamily: 'monospace' }}
                    />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={saveVacancyEdit}
                    disabled={loading}
                    style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
                      borderRadius: '10px', padding: '9px 18px', color: C.purple, fontSize: '13px',
                      cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                  >
                    Salvar alterações
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingVacancy(null)}
                    disabled={loading}
                    style={{ background: 'transparent', border: `1px solid ${C.border}`,
                      borderRadius: '10px', padding: '9px 14px', color: C.muted, fontSize: '13px',
                      cursor: 'pointer', fontFamily: 'monospace' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {linkExpiryEdit?.vacancyId === v.id && (
              <div style={{
                marginTop: '12px', padding: '12px', borderRadius: '10px',
                border: `1px solid ${C.border}`, background: 'rgba(26,22,37,.04)',
                display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
              }}>
                <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
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
                  style={{ flex: '1 1 200px', minWidth: '180px', background: 'rgba(26,22,37,.04)',
                    border: `1px solid ${C.border}`, borderRadius: '10px', padding: '8px 10px',
                    color: C.text, fontSize: '13px', fontFamily: 'monospace' }}
                />
                <button type="button" onClick={saveLinkExpiry} disabled={loading}
                  style={{ background: `${C.synergy}18`, border: `1px solid ${C.synergy}55`,
                    borderRadius: '10px', padding: '8px 12px', color: C.synergy, fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}>
                  Salvar
                </button>
                <button type="button" onClick={() => setLinkExpiryEdit(null)} disabled={loading}
                  style={{ background: 'transparent', border: `1px solid ${C.border}`,
                    borderRadius: '10px', padding: '8px 12px', color: C.muted, fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}>
                  Cancelar
                </button>
              </div>
            )}

            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
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
                    borderRadius: '10px', padding: '7px 10px', color: C.muted, fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'monospace', opacity: (loading || !token) ? 0.6 : 1 }}
                >
                  Editar expiração do link
                </button>
              </div>
              <VacancyInterviewCandidates vacancyId={v.id} locale={locale} />
              <VacancyInviteByEmail vacancyId={v.id} onSent={() => setInvitesRefresh((x) => x + 1)} />
              <VacancyInvitesBlock vacancyId={v.id} locale={locale} refreshKey={invitesRefresh} />
              <VacancyRubricEditor vacancyId={v.id} locale={locale} />
              <VacancyKanbanBlock vacancyId={v.id} locale={locale} />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

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
            <option value="open">Aberta</option>
            <option value="closed">Fechada</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
            Vagas
            <input
              type="number"
              min="1"
              value={positionsCount}
              onChange={(e) => setPositionsCount(e.target.value)}
              aria-label="Número de posições"
              style={{ width: '60px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                borderRadius: '10px', padding: '10px 8px', color: C.text, fontSize: '12px', fontFamily: 'monospace' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
            Alvo
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              aria-label="Data-alvo de encerramento"
              style={{ background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                borderRadius: '10px', padding: '9px 8px', color: C.text, fontSize: '12px', fontFamily: 'monospace' }}
            />
          </label>
          <button
            type="button"
            onClick={createVacancy}
            disabled={loading || !title.trim() || (isAdmin && !companyId)}
            style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
              borderRadius: '10px', padding: '10px 14px', color: C.purple, fontSize: '12px',
              cursor: 'pointer', fontFamily: 'monospace', opacity: (loading || !title.trim() || (isAdmin && !companyId)) ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {loading ? <span className="spinner" /> : null}
            Criar
          </button>
          <button
            type="button"
            onClick={loadVacancies}
            disabled={loading}
            style={{ background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 14px', color: C.muted, fontSize: '12px',
              cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {loading ? <span className="spinner" /> : null}
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
              <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
              const isEditing = editingVacancy?.id === v.id;
              return (
                <div key={v.id} style={{ background: 'rgba(26,22,37,.03)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px' }}>
                  {/* Header da vaga */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: C.text, fontSize: '14px' }}>
                        <span style={{ fontFamily: 'monospace', color: C.faint, marginRight: '8px', fontSize: '12px' }}>#{v.id}</span>
                        <strong style={{ fontWeight: 'normal' }}>{v.title}</strong>
                        <span
                          style={{
                            marginLeft: '10px',
                            padding: '2px 8px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            background: v.status === 'open' ? 'rgba(21,128,61,.12)' : 'rgba(26,22,37,.08)',
                            color: v.status === 'open' ? C.synergy : C.muted,
                            border: `1px solid ${v.status === 'open' ? 'rgba(21,128,61,.3)' : C.border}`,
                          }}
                        >
                          {v.status === 'open' ? 'Aberta' : 'Fechada'}
                        </span>
                        {isAdmin && (
                          <span style={{ fontFamily: 'monospace', color: C.faint, marginLeft: '10px', fontSize: '12px' }}>
                            · {v.companyName}
                          </span>
                        )}
                      </div>
                      {token ? (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: C.muted, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {link}
                        </div>
                      ) : (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: C.faint, fontFamily: 'monospace' }}>
                          (sem link ativo)
                        </div>
                      )}
                      {token && exp ? (
                        <div style={{ marginTop: '4px', fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
                          expira em {exp.toLocaleString()}
                        </div>
                      ) : null}
                      <div style={{ marginTop: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {v.positionsCount != null && v.positionsCount > 0 && (
                          <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                            {v.positionsCount} vaga{v.positionsCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {v.targetDate && (
                          <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                            alvo: {new Date(v.targetDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => navigateDashboard({ tab: 'team', vacancy: String(v.id) })}
                        style={{ background: `${C.purple}12`, border: `1px solid ${C.purple}44`,
                          borderRadius: '10px', padding: '8px 10px', color: C.purpleLight, fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'monospace' }}
                      >
                        Ver candidatos
                      </button>
                      <button
                        type="button"
                        onClick={() => editVacancy(v)}
                        disabled={loading}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setVacancyStatus(v.id, v.status === 'open' ? 'closed' : 'open')}
                        disabled={loading}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        {v.status === 'open' ? 'Fechar' : 'Reabrir'}
                      </button>
                      <button
                        type="button"
                        onClick={() => rotateLink(v.id)}
                        disabled={loading}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        Rotacionar link
                      </button>
                      <button
                        type="button"
                        onClick={() => token && copy(link)}
                        disabled={loading || !token}
                        style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
                          borderRadius: '10px', padding: '8px 10px', color: C.purple, fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: (loading || !token) ? 0.6 : 1 }}
                      >
                        Copiar link
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveVacancy(v.id, v.title)}
                        disabled={loading}
                        style={{ background: 'rgba(232,71,71,.08)', border: '1px solid rgba(232,71,71,.35)',
                          borderRadius: '10px', padding: '8px 10px', color: C.tension, fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        Arquivar
                      </button>
                      <button
                        type="button"
                        onClick={() => openVacancyDetail(v.id)}
                        style={{ background: `${C.synergy}14`, border: `1px solid ${C.synergy}44`,
                          borderRadius: '10px', padding: '8px 10px', color: C.synergy, fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'monospace' }}
                        title="Abrir detalhes da vaga"
                      >
                        Detalhes
                      </button>
                    </div>
                  </div>

                  {/* Formulário de edição inline */}
                  {isEditing && (
                    <div style={{
                      marginTop: '12px', padding: '16px', borderRadius: '10px',
                      border: `1px solid ${C.purple}44`, background: `${C.purple}08`,
                    }}>
                      <span style={{ fontSize: '11px', color: C.purpleLight, fontFamily: 'monospace',
                        textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '12px' }}>
                        Editar vaga
                      </span>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <input
                          value={editingVacancy.title}
                          onChange={(e) => setEditingVacancy((cur) => ({ ...cur, title: e.target.value }))}
                          placeholder="Título da vaga"
                          aria-label="Título da vaga"
                          style={{ flex: '2 1 280px', background: 'rgba(255,255,255,.8)', border: `1px solid ${C.border}`,
                            borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '13px', fontFamily: 'monospace' }}
                        />
                        <input
                          value={editingVacancy.slug}
                          onChange={(e) => setEditingVacancy((cur) => ({ ...cur, slug: e.target.value }))}
                          placeholder="Slug (ex.: dev-fullstack)"
                          aria-label="Slug da vaga"
                          style={{ flex: '1 1 200px', background: 'rgba(255,255,255,.8)', border: `1px solid ${C.border}`,
                            borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '13px', fontFamily: 'monospace' }}
                        />
                        <select
                          value={editingVacancy.status}
                          onChange={(e) => setEditingVacancy((cur) => ({ ...cur, status: e.target.value }))}
                          aria-label="Status da vaga"
                          style={{ flex: '0 0 140px', background: 'rgba(255,255,255,.8)', border: `1px solid ${C.border}`,
                            borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '13px',
                            cursor: 'pointer', fontFamily: 'monospace' }}
                        >
                          <option value="open">Aberta</option>
                          <option value="closed">Fechada</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
                          fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
                          Nº de vagas
                          <input
                            type="number"
                            min="1"
                            value={editingVacancy.positionsCount}
                            onChange={(e) => setEditingVacancy((cur) => ({ ...cur, positionsCount: e.target.value }))}
                            aria-label="Número de posições"
                            style={{ width: '70px', background: 'rgba(255,255,255,.8)', border: `1px solid ${C.border}`,
                              borderRadius: '10px', padding: '8px 10px', color: C.text, fontSize: '13px',
                              fontFamily: 'monospace' }}
                          />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
                          fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
                          Data-alvo
                          <input
                            type="date"
                            value={editingVacancy.targetDate}
                            onChange={(e) => setEditingVacancy((cur) => ({ ...cur, targetDate: e.target.value }))}
                            aria-label="Data-alvo de encerramento"
                            style={{ background: 'rgba(255,255,255,.8)', border: `1px solid ${C.border}`,
                              borderRadius: '10px', padding: '8px 10px', color: C.text, fontSize: '13px',
                              fontFamily: 'monospace' }}
                          />
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={saveVacancyEdit}
                          disabled={loading}
                          style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
                            borderRadius: '10px', padding: '9px 18px', color: C.purple, fontSize: '13px',
                            cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                        >
                          Salvar alterações
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingVacancy(null)}
                          disabled={loading}
                          style={{ background: 'transparent', border: `1px solid ${C.border}`,
                            borderRadius: '10px', padding: '9px 14px', color: C.muted, fontSize: '13px',
                            cursor: 'pointer', fontFamily: 'monospace' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
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
