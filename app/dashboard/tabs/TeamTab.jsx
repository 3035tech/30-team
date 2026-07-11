'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { TYPE_DATA } from '../../../lib/data';
import { t, localeHtmlLang } from '../../../lib/i18n';
import { C } from '../../../lib/theme';
import { Bar, KANBAN_STAGES, S, TypeBadge } from '../dashboard-shared';

const PIPELINE_OPTIONS = [
  'new',
  'test_completed',
  'screening',
  'interview',
  'approved',
  'rejected',
  'archived',
];


function pipelineLabel(locale, code) {
  const map = {
    new: 'recruiting.pipelineNew',
    test_completed: 'recruiting.pipelineTestCompleted',
    screening: 'recruiting.pipelineScreening',
    interview: 'recruiting.pipelineInterview',
    approved: 'recruiting.pipelineApproved',
    rejected: 'recruiting.pipelineRejected',
    archived: 'recruiting.pipelineArchived',
  };
  return t(locale, map[code] || 'recruiting.pipelineNew');
}

/** Formata ms → "Xm Ys" / "Xh Ym" para telemetria admin. */
function formatFillDuration(ms) {
  if (ms == null || !Number.isFinite(Number(ms))) return null;
  const totalSec = Math.max(0, Math.round(Number(ms) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** 54 perguntas: < ~3 min é bem rápido (sinal soft). */
function isSuspiciouslyFast(ms) {
  return ms != null && Number.isFinite(Number(ms)) && Number(ms) < 3 * 60 * 1000;
}

export function TeamTab({ results, sortKey, sortDir, onSort, locale = 'pt-BR', isAdmin = false }) {
  const [open, setOpen] = useState(null);
  const [localSearch, setLocalSearch] = useState('');
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState('');
  const [stageBusy, setStageBusy] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [notesEditing, setNotesEditing] = useState(false);
  const [notesBusy, setNotesBusy] = useState(false);
  const [notesMsg, setNotesMsg] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStage, setBulkStage] = useState('test_completed');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [stageOverrides, setStageOverrides] = useState({});
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  useEffect(() => { setSelectedIds(new Set()); setStageOverrides({}); }, [results]);

  const sortColumns = [
    { k: 'createdAt', labelKey: 'panel.team.sortDate' },
    { k: 'name', labelKey: 'panel.team.sortName' },
    { k: 'area', labelKey: 'panel.team.sortArea' },
    { k: 'type', labelKey: 'panel.team.sortProfileType' },
    { k: 'vacancy', labelKey: 'panel.team.sortVacancy' },
    { k: 'pipeline', labelKey: 'recruiting.pipelineShort' },
  ];

  const loadDetail = useCallback(async (candidateId) => {
    setDetailLoading(true);
    setDetailErr('');
    setNotesEditing(false);
    setNotesMsg('');
    try {
      const res = await fetch(`/api/admin/candidates/${encodeURIComponent(candidateId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.team.loadDetailError'));
      setDetail(data);
      setNotesDraft(data?.candidate?.hrNotes || '');
    } catch (e) {
      setDetailErr(e?.message || t(locale, 'panel.common.error'));
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [locale]);

  const deleteCandidate = async (candidateId, name) => {
    const id = String(candidateId || '').trim();
    if (!id) return;
    const ok = window.confirm(t(locale, 'panel.team.confirmDeletePerson', { name }));
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/candidates/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.team.deletePersonError'));
      router.refresh();
    } catch (e) {
      window.alert(e?.message || t(locale, 'panel.team.deletePersonError'));
    } finally {
      setDeleting(false);
    }
  };

  const deleteAssessment = async (assessmentId) => {
    const ok = window.confirm(t(locale, 'recruiting.allowRetake') + t(locale, 'panel.team.allowRetakeConfirmSuffix'));
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/assessments/${encodeURIComponent(assessmentId)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      router.refresh();
      if (detail?.candidate?.id) await loadDetail(detail.candidate.id);
    } catch (e) {
      window.alert(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setDeleting(false);
    }
  };

  const patchPipeline = async (assessmentId, pipelineStage) => {
    setStageBusy(String(assessmentId));
    try {
      const res = await fetch(`/api/admin/assessments/${encodeURIComponent(assessmentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStage }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      router.refresh();
      if (detail?.candidate?.id) await loadDetail(detail.candidate.id);
    } catch (e) {
      window.alert(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setStageBusy(null);
    }
  };

  const saveNotes = async () => {
    if (!detail?.candidate?.id) return;
    setNotesBusy(true);
    setNotesMsg('');
    try {
      const res = await fetch(`/api/admin/candidates/${encodeURIComponent(detail.candidate.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hrNotes: notesDraft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      setDetail((prev) => prev ? { ...prev, candidate: { ...prev.candidate, hrNotes: data.hrNotes } } : prev);
      setNotesEditing(false);
      setNotesMsg('Notas salvas.');
      setTimeout(() => setNotesMsg(''), 3000);
    } catch (e) {
      setNotesMsg(e?.message || 'Erro ao salvar notas.');
    } finally {
      setNotesBusy(false);
    }
  };

  const toggleSelect = (assessmentId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(String(assessmentId))) next.delete(String(assessmentId));
      else next.add(String(assessmentId));
      return next;
    });
  };

  const applyBulk = async () => {
    if (selectedIds.size === 0 || !bulkStage) return;
    setBulkBusy(true);
    setBulkMsg('');
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/admin/assessments/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pipelineStage: bulkStage }),
          })
        )
      );
      setSelectedIds(new Set());
      setBulkMsg(`${selectedIds.size} candidato(s) atualizados.`);
      setTimeout(() => setBulkMsg(''), 3000);
      router.refresh();
    } catch {
      setBulkMsg('Erro ao atualizar em massa.');
    } finally {
      setBulkBusy(false);
    }
  };

  const getEffectiveStage = (r) => stageOverrides[String(r.assessmentId)] ?? r.pipelineStage ?? 'new';

  const q = localSearch.trim().toLowerCase();
  const filtered = q ? results.filter((r) => (r.name || '').toLowerCase().includes(q)) : results;
  const allSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(String(r.assessmentId)));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((r) => next.delete(String(r.assessmentId)));
      else filtered.forEach((r) => next.add(String(r.assessmentId)));
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="search"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Buscar candidato por nome…"
          aria-label="Buscar candidato por nome"
          style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(26,22,37,.03)',
            border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px 16px 12px 40px',
            color: C.text, fontSize: '14px', fontFamily: "'Georgia',serif", outline: 'none' }}
        />
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
          color: C.faint, fontSize: '15px', pointerEvents: 'none' }}>
          ⌕
        </span>
        {q && (
          <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
            color: C.faint, fontSize: '11px', fontFamily: 'monospace' }}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} nesta página
          </span>
        )}
      </div>
      <div
        role="group"
        aria-label={t(locale, 'panel.team.sortAria')}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          background: 'rgba(26,22,37,.03)',
          borderRadius: '12px',
          border: `1px solid ${C.border}`,
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '11px', color: C.muted, fontFamily: 'monospace', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            aria-label="Selecionar todos nesta página"
            style={{ width: '14px', height: '14px', accentColor: C.purple }}
          />
          Todos
        </label>
        <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {t(locale, 'panel.team.sortBy')}
        </span>
        {viewMode === 'list' && sortColumns.map(({ k, labelKey }) => {
          const active = sortKey === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onSort(k)}
              aria-pressed={active}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                cursor: 'pointer',
                border: `1px solid ${active ? `${C.purple}55` : C.border}`,
                background: active ? `${C.purple}18` : 'transparent',
                color: active ? C.purple : C.muted,
              }}
            >
              {t(locale, labelKey)}
              {active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
            </button>
          );
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {[
            { id: 'list',   icon: '≡', label: 'Lista' },
            { id: 'kanban', icon: '⊞', label: 'Kanban' },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setViewMode(id)}
              title={label}
              aria-pressed={viewMode === id}
              style={{ padding: '5px 10px', borderRadius: '8px', fontSize: '12px',
                fontFamily: 'monospace', cursor: 'pointer',
                border: `1px solid ${viewMode === id ? `${C.purple}55` : C.border}`,
                background: viewMode === id ? `${C.purple}18` : 'transparent',
                color: viewMode === id ? C.purple : C.muted }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'kanban' && (
        <div
          className="kanban-scroll"
          style={{ overflowX: 'auto', paddingBottom: '16px',
            marginLeft: '-24px', marginRight: '-24px',
            paddingLeft: '24px', paddingRight: '24px',
            WebkitOverflowScrolling: 'touch' }}
        >
          <div style={{ display: 'flex', gap: '12px', minWidth: 'max-content', alignItems: 'flex-start' }}>
            {KANBAN_STAGES.map((stage) => {
              const items = filtered.filter((r) => getEffectiveStage(r) === stage.id);
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
                    const r = results.find((r) => String(r.assessmentId) === id);
                    if (!r || getEffectiveStage(r) === stage.id) return;
                    setStageOverrides((prev) => ({ ...prev, [id]: stage.id }));
                    await patchPipeline(parseInt(id, 10), stage.id);
                  }}
                  style={{ width: '260px', flexShrink: 0, borderRadius: '12px',
                    outline: isDropTarget ? `2px dashed ${stage.color}` : '2px dashed transparent',
                    outlineOffset: '3px', transition: 'outline-color 0.12s' }}
                >
                  <div style={{ padding: '10px 14px', borderRadius: '10px 10px 0 0',
                    background: isDropTarget ? `${stage.color}22` : `${stage.color}12`,
                    borderTop: `3px solid ${stage.color}`, border: `1px solid ${stage.color}30`,
                    marginBottom: '8px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', transition: 'background 0.12s' }}>
                    <span style={{ fontSize: '12px', color: stage.color, fontFamily: 'monospace',
                      fontWeight: 700, letterSpacing: '0.5px' }}>
                      {stage.label}
                    </span>
                    <span style={{ fontSize: '12px', color: stage.color, fontFamily: 'monospace',
                      background: `${stage.color}25`, borderRadius: '10px', padding: '1px 8px',
                      fontWeight: 700 }}>
                      {items.length}
                    </span>
                  </div>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    style={{ minHeight: isDropTarget ? '80px' : '40px', display: 'flex',
                      flexDirection: 'column', gap: '8px', transition: 'min-height 0.12s' }}
                  >
                    {items.map((r) => {
                      const rid = String(r.assessmentId);
                      const d = TYPE_DATA[r.topType];
                      const fitScore = r.vacancyFitScore010 ?? r.areaFitScore010;
                      const isDragging = draggingId === rid;
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
                          style={{ background: 'rgba(255,255,255,.92)',
                            border: `1px solid ${C.border}`, borderRadius: '10px',
                            padding: '11px 13px', boxShadow: '0 1px 6px rgba(0,0,0,.05)',
                            opacity: isDragging ? 0.4 : 1, cursor: 'grab',
                            transition: 'opacity 0.15s', userSelect: 'none',
                            pointerEvents: draggingId && !isDragging ? 'none' : 'auto' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>{d.emoji}</span>
                            <span style={{ fontSize: '13px', lineHeight: 1.3,
                              fontFamily: "'Georgia',serif", color: C.text, flex: 1,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '7px' }}>
                            <TypeBadge type={r.topType} locale={locale} />
                            {r.areaLabel && (
                              <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '20px',
                                background: C.inputBg, border: `1px solid ${C.border}`,
                                color: C.muted, fontFamily: 'monospace' }}>
                                {r.areaLabel}
                              </span>
                            )}
                            {fitScore != null && (
                              <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '20px',
                                background: fitScore >= 7 ? 'rgba(21,128,61,.1)' : fitScore >= 4 ? 'rgba(217,119,6,.1)' : 'rgba(220,38,38,.1)',
                                border: `1px solid ${fitScore >= 7 ? 'rgba(21,128,61,.3)' : fitScore >= 4 ? 'rgba(217,119,6,.3)' : 'rgba(220,38,38,.3)'}`,
                                color: fitScore >= 7 ? C.synergy : fitScore >= 4 ? '#d97706' : C.tension,
                                fontFamily: 'monospace' }}>
                                {fitScore}/10
                              </span>
                            )}
                          </div>
                          {r.vacancyTitle && (
                            <div style={{ fontSize: '10px', color: C.faint, fontFamily: 'monospace',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.vacancyTitle}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {items.length === 0 && (
                      <div style={{ padding: '20px 12px', textAlign: 'center',
                        color: isDropTarget ? stage.color : C.faint, fontSize: '12px',
                        fontFamily: 'monospace', fontStyle: 'italic',
                        border: isDropTarget ? `2px dashed ${stage.color}55` : '2px dashed transparent',
                        borderRadius: '8px', transition: 'all 0.12s' }}>
                        {isDropTarget ? '↓ Soltar aqui' : '—'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && q && (
            <div style={{ textAlign: 'center', padding: '40px', color: C.muted,
              fontStyle: 'italic', fontSize: '14px' }}>
              Nenhum candidato encontrado para &quot;{localSearch}&quot; nesta página.
            </div>
          )}
        </div>
      )}

      {viewMode === 'list' && selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
          padding: '12px 16px', borderRadius: '12px', border: `1px solid ${C.purple}44`,
          background: `${C.purple}0a` }}>
          <span style={{ fontSize: '13px', color: C.purple, fontFamily: 'monospace' }}>
            {selectedIds.size} selecionado(s)
          </span>
          <select
            value={bulkStage}
            onChange={(e) => setBulkStage(e.target.value)}
            disabled={bulkBusy}
            style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '8px',
              border: `1px solid ${C.border}`, background: 'transparent', color: C.text }}
          >
            {PIPELINE_OPTIONS.map((code) => (
              <option key={code} value={code}>{pipelineLabel(locale, code)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyBulk}
            disabled={bulkBusy}
            style={{ fontSize: '12px', padding: '7px 14px', borderRadius: '8px',
              border: `1px solid ${C.purple}55`, background: `${C.purple}18`,
              color: C.purple, cursor: 'pointer', fontFamily: 'monospace',
              display: 'flex', alignItems: 'center', gap: '6px',
              opacity: bulkBusy ? 0.6 : 1 }}
          >
            {bulkBusy ? <span className="spinner" /> : null}
            Aplicar estágio
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            disabled={bulkBusy}
            style={{ fontSize: '12px', padding: '7px 12px', borderRadius: '8px',
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.muted, cursor: 'pointer', fontFamily: 'monospace' }}
          >
            Limpar seleção
          </button>
          {bulkMsg && (
            <span style={{ fontSize: '12px', color: bulkMsg.includes('Erro') ? C.tension : C.synergy,
              fontFamily: 'monospace' }}>
              {bulkMsg}
            </span>
          )}
        </div>
      )}
      {viewMode === 'list' && filtered.length === 0 && q ? (
        <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontStyle: 'italic', fontSize: '14px' }}>
          Nenhum candidato encontrado para &quot;{localSearch}&quot; nesta página.
        </div>
      ) : null}
      {viewMode === 'list' && filtered.map((r) => {
        const id = String(r.assessmentId);
        const d = TYPE_DATA[r.topType];
        const isOpen = open === id;
        const sorted = Object.entries(r.scores || {}).sort((a, b) => b[1] - a[1]);
        const second = sorted[1];
        const maxS = sorted[0] ? parseInt(sorted[0][1], 10) : 0;
        const showVacancyFit = r.vacancyFitScore010 != null && r.vacancyFitScore010 !== undefined;
        const created = r.createdAt != null ? new Date(r.createdAt) : null;
        const createdLabel =
          created && !Number.isNaN(created.getTime())
            ? created.toLocaleString(localeHtmlLang(locale), { dateStyle: 'short', timeStyle: 'short' })
            : null;
        return (
          <div
            key={id}
            style={{
              ...S.card,
              padding: 0,
              overflow: 'hidden',
              cursor: 'pointer',
              border: isOpen ? `1px solid ${d.color}44` : `1px solid ${C.border}`,
            }}
            onClick={() => {
              const next = isOpen ? null : id;
              setOpen(next);
              if (next && r.candidateId) {
                loadDetail(r.candidateId);
              } else {
                setDetail(null);
                setDetailErr('');
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 24px' }}>
              <input
                type="checkbox"
                checked={selectedIds.has(id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleSelect(id)}
                aria-label={`Selecionar ${r.name}`}
                style={{ width: '16px', height: '16px', flexShrink: 0, accentColor: C.purple, cursor: 'pointer' }}
              />
              <div style={{ fontSize: '24px', flexShrink: 0 }}>{d.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', marginBottom: '4px' }}>{r.name}</div>
                {createdLabel ? (
                  <div
                    title={t(locale, 'dashboard.teamListDateHelp')}
                    style={{
                      fontSize: '12px',
                      color: C.faint,
                      fontFamily: 'monospace',
                      marginBottom: '6px',
                    }}
                  >
                    {t(locale, 'dashboard.teamAssessmentDate')}: {createdLabel}
                  </div>
                ) : null}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <TypeBadge type={r.topType} locale={locale} />
                  {r.areaLabel && (
                    <span
                      style={{
                        padding: '3px 10px',
                        fontSize: '12px',
                        borderRadius: '20px',
                        background: 'rgba(26,22,37,.04)',
                        border: `1px solid ${C.border}`,
                        color: C.muted,
                        fontFamily: 'monospace',
                      }}
                    >
                      {r.areaLabel}
                    </span>
                  )}
                  {r.pipelineStage ? (
                    <span
                      style={{
                        padding: '3px 10px',
                        fontSize: '12px',
                        borderRadius: '20px',
                        background: 'rgba(124,58,237,.12)',
                        border: '1px solid rgba(124,58,237,.35)',
                        color: C.purpleLight,
                        fontFamily: 'monospace',
                      }}
                    >
                      {t(locale, 'recruiting.pipelineShort')}: {pipelineLabel(locale, r.pipelineStage)}
                    </span>
                  ) : null}
                  {r.fitLabel && (
                    <span
                      style={{
                        padding: '3px 10px',
                        fontSize: '12px',
                        borderRadius: '20px',
                        background: `${C.purple}18`,
                        border: `1px solid ${C.purple}44`,
                        color: C.purpleLight,
                        fontFamily: 'monospace',
                      }}
                    >
                      {t(locale, 'recruiting.fitLabel')}: {r.fitLabel}
                    </span>
                  )}
                  {showVacancyFit ? (
                    <span
                      style={{
                        padding: '3px 10px',
                        fontSize: '12px',
                        borderRadius: '20px',
                        background: 'rgba(71,232,123,.08)',
                        border: '1px solid rgba(71,232,123,.25)',
                        color: 'rgba(71,232,123,.95)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {t(locale, 'recruiting.vacancyFitShort')}: {r.vacancyFitScore010}/10
                    </span>
                  ) : r.areaFitScore010 !== null && r.areaFitScore010 !== undefined ? (
                    <span
                      style={{
                        padding: '3px 10px',
                        fontSize: '12px',
                        borderRadius: '20px',
                        background: 'rgba(71,232,123,.08)',
                        border: '1px solid rgba(71,232,123,.25)',
                        color: 'rgba(71,232,123,.95)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {t(locale, 'recruiting.areaFitShort')}: {r.areaFitScore010}/10
                    </span>
                  ) : null}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {r.candidateId ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCandidate(r.candidateId, r.name);
                    }}
                    disabled={deleting}
                    title={t(locale, 'panel.team.ariaDeletePerson')}
                    aria-label={t(locale, 'panel.team.ariaDeletePerson')}
                    style={{
                      background: 'rgba(232,71,71,.08)',
                      border: '1px solid rgba(232,71,71,.35)',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      color: C.tension,
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      opacity: deleting ? 0.6 : 1,
                    }}
                  >
                    {t(locale, 'panel.team.deletePerson')}
                  </button>
                ) : null}
                <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>
            {isOpen && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '20px 24px' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <span style={{ ...S.label, marginBottom: '8px' }}>{t(locale, 'candidate.strengths')}</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {d.strengths.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          style={{
                            padding: '3px 10px',
                            background: `${d.color}15`,
                            border: `1px solid ${d.color}35`,
                            borderRadius: '20px',
                            fontSize: '11px',
                            color: d.color,
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span style={{ ...S.label, marginBottom: '8px' }}>{t(locale, 'candidate.wing')}</span>
                    {second && <TypeBadge type={parseInt(second[0], 10)} locale={locale} />}
                  </div>
                </div>
                <div
                  style={{
                    background: `${d.color}0a`,
                    border: `1px solid ${d.color}20`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    marginBottom: '16px',
                  }}
                >
                  <span style={{ ...S.label, marginBottom: '6px', color: `${d.color}70` }}>{t(locale, 'candidate.teamContribution')}</span>
                  <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.65, margin: 0 }}>{d.team}</p>
                </div>

                <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'rgba(26,22,37,.02)' }}>
                  <span style={{ ...S.label, marginBottom: '8px', display: 'block' }}>{t(locale, 'recruiting.assessmentsForCandidate')}</span>
                  {detailLoading ? (
                    <p style={{ margin: 0, fontSize: '12px', color: C.muted }}>…</p>
                  ) : detailErr ? (
                    <p style={{ margin: 0, fontSize: '12px', color: C.tension }}>{detailErr}</p>
                  ) : detail?.assessments?.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {detail.assessments.map((a) => (
                        <div
                          key={a.id}
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '10px',
                            alignItems: 'center',
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1px solid ${C.border}`,
                            background: 'rgba(255,255,255,.4)',
                          }}
                        >
                          <div>
                            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: C.muted }}>
                              #{a.id} · {a.areaLabel}
                              {a.vacancyTitle ? ` · ${a.vacancyTitle}` : ''}
                            </span>
                            {isAdmin && (a.fillDurationMs != null || a.copyEventCount != null) && (
                              <div
                                style={{
                                  marginTop: '6px',
                                  fontSize: '11px',
                                  fontFamily: 'monospace',
                                  lineHeight: 1.5,
                                  color: isSuspiciouslyFast(a.fillDurationMs) || (a.copyEventCount || 0) > 0
                                    ? '#b45309'
                                    : C.faint,
                                }}
                                title="Telemetria de integridade (somente admin)"
                              >
                                Tempo do teste:{' '}
                                {formatFillDuration(a.fillDurationMs) || '—'}
                                {isSuspiciouslyFast(a.fillDurationMs) ? ' · rápido' : ''}
                                {' · '}
                                Cópias na tela: {a.copyEventCount ?? 0}
                                {(a.copyEventCount || 0) > 0 ? ' · atenção' : ''}
                              </div>
                            )}
                            {a.pipelineHistory?.length > 0 && (
                              <div style={{ marginTop: '4px', fontSize: '10px', color: C.faint,
                                fontFamily: 'monospace', lineHeight: 1.8 }}>
                                {a.pipelineHistory.map((h, i) => (
                                  <span key={i} style={{ marginRight: '10px' }}>
                                    {h.fromStage || '—'} → {h.toStage} ·{' '}
                                    {new Date(h.changedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <label style={{ fontSize: '12px', color: C.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {t(locale, 'recruiting.stageLabel')}
                            <select
                              value={a.pipelineStage || 'test_completed'}
                              disabled={!!stageBusy}
                              onChange={(e) => patchPipeline(a.id, e.target.value)}
                              style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: `1px solid ${C.border}`,
                                background: 'transparent',
                                color: C.text,
                              }}
                            >
                              {PIPELINE_OPTIONS.map((code) => (
                                <option key={code} value={code}>
                                  {pipelineLabel(locale, code)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() => deleteAssessment(a.id)}
                            style={{
                              marginLeft: 'auto',
                              fontSize: '12px',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid rgba(232,71,71,.35)',
                              background: 'rgba(232,71,71,.08)',
                              color: C.tension,
                              cursor: 'pointer',
                              fontFamily: 'monospace',
                            }}
                          >
                            {t(locale, 'recruiting.allowRetake')}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '12px', color: C.muted }}>—</p>
                  )}
                </div>

                <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '10px',
                  border: `1px solid ${C.border}`, background: 'rgba(26,22,37,.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ ...S.label, marginBottom: 0 }}>Notas de RH</span>
                    {!notesEditing && (
                      <button
                        type="button"
                        onClick={() => { setNotesDraft(detail?.candidate?.hrNotes || ''); setNotesEditing(true); setNotesMsg(''); }}
                        style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: `1px solid ${C.border}`,
                          background: 'transparent', color: C.muted, cursor: 'pointer', fontFamily: 'monospace' }}
                      >
                        {detail?.candidate?.hrNotes ? 'Editar' : '+ Adicionar nota'}
                      </button>
                    )}
                  </div>
                  {!notesEditing ? (
                    detail?.candidate?.hrNotes ? (
                      <p style={{ margin: 0, fontSize: '13px', color: C.text, lineHeight: 1.6,
                        whiteSpace: 'pre-wrap', fontFamily: "'Georgia',serif" }}>
                        {detail.candidate.hrNotes}
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: '12px', color: C.faint, fontStyle: 'italic' }}>
                        Nenhuma nota registrada.
                      </p>
                    )
                  ) : (
                    <div>
                      <textarea
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        rows={4}
                        placeholder="Observações sobre o candidato…"
                        aria-label="Notas de RH"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                          borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '13px',
                          fontFamily: "'Georgia',serif", background: 'rgba(26,22,37,.03)',
                          color: C.text, resize: 'vertical', marginBottom: '8px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={saveNotes}
                          disabled={notesBusy}
                          style={{ fontSize: '12px', padding: '7px 14px', borderRadius: '8px',
                            border: `1px solid ${C.purple}55`, background: `${C.purple}18`,
                            color: C.purple, cursor: 'pointer', fontFamily: 'monospace',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            opacity: notesBusy ? 0.6 : 1 }}
                        >
                          {notesBusy ? <span className="spinner" /> : null}
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setNotesEditing(false); setNotesDraft(detail?.candidate?.hrNotes || ''); }}
                          disabled={notesBusy}
                          style={{ fontSize: '12px', padding: '7px 12px', borderRadius: '8px',
                            border: `1px solid ${C.border}`, background: 'transparent',
                            color: C.muted, cursor: 'pointer', fontFamily: 'monospace' }}
                        >
                          Cancelar
                        </button>
                        {notesMsg && (
                          <span style={{ fontSize: '12px', color: notesMsg.includes('Erro') ? C.tension : C.synergy,
                            fontFamily: 'monospace' }}>
                            {notesMsg}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {!notesEditing && notesMsg && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: C.synergy, fontFamily: 'monospace' }}>
                      {notesMsg}
                    </p>
                  )}
                </div>

                <span style={{ ...S.label, marginBottom: '8px' }}>{t(locale, 'panel.team.scoresByType')}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {sorted.map(([t, s]) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        title={TYPE_DATA?.[parseInt(t, 10)]?.name ? `${TYPE_DATA[parseInt(t, 10)].name} (T${t})` : `T${t}`}
                        style={{ width: '60px', fontSize: '11px', color: TYPE_DATA[parseInt(t, 10)].color, fontFamily: 'monospace' }}
                      >
                        {TYPE_DATA[parseInt(t, 10)].emoji} T{t}
                      </span>
                      <div style={{ flex: 1 }}>
                        <Bar value={parseInt(s, 10)} max={maxS} color={TYPE_DATA[parseInt(t, 10)].color} h={5} />
                      </div>
                      <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace', width: '24px', textAlign: 'right' }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
