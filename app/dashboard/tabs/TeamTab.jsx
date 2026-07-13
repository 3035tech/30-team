'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { TYPE_DATA } from '../../../lib/data';
import { t, localeHtmlLang } from '../../../lib/i18n';
import { C } from '../../../lib/theme';
import { Bar, getKanbanStages, S, TypeBadge } from '../dashboard-shared';
import { BrStateSelect } from '../../_components/BrStateSelect';
import { BrCitySelect } from '../../_components/BrCitySelect';
import { formatPhoneBr, formatSalaryBr, stripPhone, salaryToCentsDigits, stripSalary, digitsOnly } from '../../../lib/br-masks';
import { titleCasePersonName } from '../../../lib/person-name';
import { rejectionReasonLabel } from '../pipeline-prompts';
import { usePipelineExtras } from '../PipelineExtrasContext';

const PIPELINE_OPTIONS = [
  'new',
  'test_completed',
  'screening',
  'interview',
  'approved',
  'hired',
  'rejected',
  'archived',
];


function fitBandLabel(locale, code) {
  const map = {
    high: 'recruiting.fitHigh',
    medium: 'recruiting.fitMedium',
    low: 'recruiting.fitLow',
  };
  const key = map[code];
  return key ? t(locale, key) : code;
}

function pipelineLabel(locale, code) {
  const map = {
    new: 'recruiting.pipelineNew',
    test_completed: 'recruiting.pipelineTestCompleted',
    screening: 'recruiting.pipelineScreening',
    interview: 'recruiting.pipelineInterview',
    approved: 'recruiting.pipelineApproved',
    hired: 'recruiting.pipelineHired',
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

function availabilityLabel(locale, code) {
  const map = {
    immediate: 'recruiting.availabilityImmediate',
    '15_days': 'recruiting.availability15',
    '30_days': 'recruiting.availability30',
    '60_days': 'recruiting.availability60',
    other: 'recruiting.availabilityOther',
  };
  return code ? t(locale, map[code] || 'recruiting.availabilityOther') : null;
}

function sourceLabel(locale, code) {
  const map = {
    linkedin: 'recruiting.sourceLinkedin',
    referral: 'recruiting.sourceReferral',
    agency: 'recruiting.sourceAgency',
    job_board: 'recruiting.sourceJobBoard',
    other: 'recruiting.sourceOther',
  };
  return code ? t(locale, map[code] || 'recruiting.sourceOther') : null;
}

const emptyProfileDraft = () => ({
  phone: '',
  linkedinUrl: '',
  city: '',
  state: '',
  salaryExpectation: '',
  availability: '',
  source: '',
});

function profileFromCandidate(c) {
  return {
    phone: stripPhone(c?.phone) || '',
    linkedinUrl: c?.linkedinUrl || '',
    city: c?.city || '',
    state: c?.state || '',
    salaryExpectation: salaryToCentsDigits(c?.salaryExpectation),
    availability: c?.availability || '',
    source: c?.source || '',
  };
}

export function TeamTab({
  results,
  sortKey,
  sortDir,
  onSort,
  locale = 'pt-BR',
  isAdmin = false,
  search = '',
  onSearch,
  listTotal = 0,
}) {
  const [open, setOpen] = useState(null);
  const [searchDraft, setSearchDraft] = useState(search || '');
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
  const [notesMsgIsError, setNotesMsgIsError] = useState(false);
  const [profileDraft, setProfileDraft] = useState(emptyProfileDraft);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileMsgIsError, setProfileMsgIsError] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStage, setBulkStage] = useState('test_completed');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const [bulkMsgIsError, setBulkMsgIsError] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [stageOverrides, setStageOverrides] = useState({});
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const { requestPipelineExtras } = usePipelineExtras();

  useEffect(() => { setSelectedIds(new Set()); setStageOverrides({}); }, [results]);

  useEffect(() => {
    setSearchDraft(search || '');
  }, [search]);

  const commitSearch = () => {
    const trimmed = searchDraft.trim();
    if (trimmed === (search || '').trim()) return;
    if (typeof onSearch === 'function') onSearch(trimmed || null);
  };

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
    setProfileEditing(false);
    setProfileMsg('');
    try {
      const res = await fetch(`/api/admin/candidates/${encodeURIComponent(candidateId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.team.loadDetailError'));
      setDetail(data);
      setNotesDraft(data?.candidate?.hrNotes || '');
      setProfileDraft(profileFromCandidate(data?.candidate));
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
    const extras = await requestPipelineExtras(locale, pipelineStage);
    if (extras == null) return;
    setStageBusy(String(assessmentId));
    try {
      const res = await fetch(`/api/admin/assessments/${encodeURIComponent(assessmentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStage, ...extras }),
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
      setNotesMsgIsError(false);
      setNotesMsg(t(locale, 'panel.team.notesSaved'));
      setTimeout(() => setNotesMsg(''), 3000);
    } catch (e) {
      setNotesMsgIsError(true);
      setNotesMsg(e?.message || t(locale, 'panel.team.saveNotesError'));
    } finally {
      setNotesBusy(false);
    }
  };

  const saveProfile = async () => {
    if (!detail?.candidate?.id) return;
    setProfileBusy(true);
    setProfileMsg('');
    try {
      const res = await fetch(`/api/admin/candidates/${encodeURIComponent(detail.candidate.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: profileDraft.phone,
          linkedinUrl: profileDraft.linkedinUrl,
          city: profileDraft.city,
          state: profileDraft.state,
          salaryExpectation: stripSalary(profileDraft.salaryExpectation),
          availability: profileDraft.availability || null,
          source: profileDraft.source || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      setDetail((prev) => (prev ? {
        ...prev,
        candidate: {
          ...prev.candidate,
          phone: data.phone,
          linkedinUrl: data.linkedinUrl,
          city: data.city,
          state: data.state,
          salaryExpectation: data.salaryExpectation,
          availability: data.availability,
          source: data.source,
        },
      } : prev));
      setProfileDraft(profileFromCandidate(data));
      setProfileEditing(false);
      setProfileMsgIsError(false);
      setProfileMsg(t(locale, 'recruiting.profileSaved'));
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (e) {
      setProfileMsgIsError(true);
      setProfileMsg(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setProfileBusy(false);
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
    const extras = await requestPipelineExtras(locale, bulkStage);
    if (extras == null) return;
    setBulkBusy(true);
    setBulkMsg('');
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/admin/assessments/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pipelineStage: bulkStage, ...extras }),
          })
        )
      );
      setSelectedIds(new Set());
      setBulkMsgIsError(false);
      setBulkMsg(t(locale, 'panel.team.bulkUpdatedCount', { n: selectedIds.size }));
      setTimeout(() => setBulkMsg(''), 3000);
      router.refresh();
    } catch {
      setBulkMsgIsError(true);
      setBulkMsg(t(locale, 'panel.team.bulkUpdateError'));
    } finally {
      setBulkBusy(false);
    }
  };

  const getEffectiveStage = (r) => stageOverrides[String(r.assessmentId)] ?? r.pipelineStage ?? 'new';

  const filtered = results;
  const activeSearch = (search || '').trim();
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
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitSearch();
          }}
          onBlur={commitSearch}
          placeholder={t(locale, 'dashboard.searchPlaceholder')}
          aria-label={t(locale, 'panel.team.searchAriaLabel')}
          style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(26,22,37,.03)',
            border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px 16px 12px 40px',
            color: C.text, fontSize: '14px', fontFamily: "'Georgia',serif", outline: 'none' }}
        />
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
          color: C.faint, fontSize: '15px', pointerEvents: 'none' }}>
          ⌕
        </span>
        {activeSearch ? (
          <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
            color: C.faint, fontSize: '11px', fontFamily: 'monospace' }}>
            {t(locale, 'panel.team.searchResultsTotal', { n: listTotal })}
          </span>
        ) : null}
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
            aria-label={t(locale, 'panel.team.selectAllPage')}
            style={{ width: '14px', height: '14px', accentColor: C.purple }}
          />
          {t(locale, 'panel.team.all')}
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
            { id: 'list',   icon: '≡', label: t(locale, 'panel.team.viewList') },
            { id: 'kanban', icon: '⊞', label: t(locale, 'panel.team.viewKanban') },
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
            {getKanbanStages(locale).map((stage) => {
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
                              {titleCasePersonName(r.name)}
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
                                color: fitScore >= 7 ? C.success : fitScore >= 4 ? C.warning : C.danger,
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
                        {isDropTarget ? t(locale, 'panel.team.dropHere') : '—'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && activeSearch && (
            <div style={{ textAlign: 'center', padding: '40px', color: C.muted,
              fontStyle: 'italic', fontSize: '14px' }}>
              {t(locale, 'panel.team.noResultsFor', { query: activeSearch })}
            </div>
          )}
        </div>
      )}

      {viewMode === 'list' && selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
          padding: '12px 16px', borderRadius: '12px', border: `1px solid ${C.purple}44`,
          background: `${C.purple}0a` }}>
          <span style={{ fontSize: '13px', color: C.purple, fontFamily: 'monospace' }}>
            {t(locale, 'panel.team.selectedCount', { n: selectedIds.size })}
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
            {t(locale, 'panel.team.applyStage')}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            disabled={bulkBusy}
            style={{ fontSize: '12px', padding: '7px 12px', borderRadius: '8px',
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.muted, cursor: 'pointer', fontFamily: 'monospace' }}
          >
            {t(locale, 'panel.compare.clearSelection')}
          </button>
          {bulkMsg && (
            <span style={{ fontSize: '12px', color: bulkMsgIsError ? C.tension : C.synergy,
              fontFamily: 'monospace' }}>
              {bulkMsg}
            </span>
          )}
        </div>
      )}
      {viewMode === 'list' && filtered.length === 0 && activeSearch ? (
        <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontStyle: 'italic', fontSize: '14px' }}>
          {t(locale, 'panel.team.noResultsFor', { query: activeSearch })}
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
                aria-label={t(locale, 'panel.team.selectPersonAria', { name: titleCasePersonName(r.name) })}
                style={{ width: '16px', height: '16px', flexShrink: 0, accentColor: C.purple, cursor: 'pointer' }}
              />
              <div style={{ fontSize: '24px', flexShrink: 0 }}>{d.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', marginBottom: '4px' }}>
                  {titleCasePersonName(r.name)}
                  {detail?.candidate?.id === r.candidateId && detail?.candidate?.employmentStatus === 'employee' ? (
                    <span style={{
                      marginLeft: '8px', fontSize: '11px', fontFamily: 'monospace',
                      color: C.synergy, border: `1px solid ${C.synergy}55`, borderRadius: '999px', padding: '1px 8px',
                    }}>
                      {t(locale, 'recruiting.employmentEmployee')}
                    </span>
                  ) : null}
                </div>
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
                      {t(locale, 'recruiting.fitLabel')}: {fitBandLabel(locale, r.fitLabel)}
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
                  <span style={{ ...S.label, marginBottom: '8px', display: 'block' }}>{t(locale, 'recruiting.timelineTitle')}</span>
                  {detailLoading ? (
                    <p style={{ margin: 0, fontSize: '12px', color: C.muted }}>…</p>
                  ) : detail?.timeline?.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {detail.timeline.map((ev, i) => {
                        let text = t(locale, ev.labelKey || 'recruiting.timelinePipelineChange');
                        if (ev.type === 'pipeline.change') {
                          text = t(locale, 'recruiting.timelinePipelineChange', {
                            from: pipelineLabel(locale, ev.fromStage || '—'),
                            to: pipelineLabel(locale, ev.toStage || '—'),
                          });
                        }
                        const bits = [text];
                        if (ev.vacancyTitle) bits.push(ev.vacancyTitle);
                        if (ev.reason) bits.push(rejectionReasonLabel(locale, ev.reason));
                        if (ev.startDate) bits.push(`${t(locale, 'recruiting.startDateLabel')}: ${ev.startDate}`);
                        if (ev.topType != null) bits.push(`T${ev.topType}`);
                        return (
                          <div key={`${ev.type}-${i}`} style={{ fontSize: '12px', fontFamily: 'monospace', color: C.muted, lineHeight: 1.5 }}>
                            <span style={{ color: C.faint }}>
                              {ev.at
                                ? new Date(ev.at).toLocaleString(localeHtmlLang(locale), {
                                    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
                                  })
                                : '—'}
                            </span>
                            {' · '}
                            <span style={{ color: C.text }}>{bits.filter(Boolean).join(' · ')}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '12px', color: C.faint, fontStyle: 'italic' }}>
                      {t(locale, 'recruiting.timelineEmpty')}
                    </p>
                  )}
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
                                title={t(locale, 'panel.team.integrityTitle')}
                              >
                                {t(locale, 'panel.team.testDuration', {
                                  duration: formatFillDuration(a.fillDurationMs) || t(locale, 'panel.common.notApplicable'),
                                })}
                                {isSuspiciouslyFast(a.fillDurationMs) ? t(locale, 'panel.team.fastFlag') : ''}
                                {' · '}
                                {t(locale, 'panel.team.screenCopies', { n: a.copyEventCount ?? 0 })}
                                {(a.copyEventCount || 0) > 0 ? t(locale, 'panel.team.attentionFlag') : ''}
                              </div>
                            )}
                            {a.rejectionReason ? (
                              <div style={{ marginTop: '4px', fontSize: '11px', color: C.tension, fontFamily: 'monospace' }}>
                                {t(locale, 'recruiting.rejectionReasonLabel')}: {rejectionReasonLabel(locale, a.rejectionReason)}
                              </div>
                            ) : null}
                            {a.startDate && a.pipelineStage === 'hired' ? (
                              <div style={{ marginTop: '4px', fontSize: '11px', color: C.synergy, fontFamily: 'monospace' }}>
                                {t(locale, 'recruiting.startDateLabel')}: {a.startDate}
                              </div>
                            ) : null}
                            {a.pipelineHistory?.length > 0 && (
                              <div style={{ marginTop: '4px', fontSize: '10px', color: C.faint,
                                fontFamily: 'monospace', lineHeight: 1.8 }}>
                                {a.pipelineHistory.map((h, i) => (
                                  <span key={i} style={{ marginRight: '10px' }}>
                                    {h.fromStage || '—'} → {h.toStage}
                                    {h.reason ? ` (${rejectionReasonLabel(locale, h.reason)})` : ''}
                                    {h.startDate ? ` · ${h.startDate}` : ''}
                                    {' · '}
                                    {new Date(h.changedAt).toLocaleDateString(localeHtmlLang(locale), { day: '2-digit', month: '2-digit', year: '2-digit' })}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ ...S.label, marginBottom: 0 }}>{t(locale, 'recruiting.candidateProfile')}</span>
                    {!profileEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDraft(profileFromCandidate(detail?.candidate));
                          setProfileEditing(true);
                          setProfileMsg('');
                        }}
                        style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: `1px solid ${C.border}`,
                          background: 'transparent', color: C.muted, cursor: 'pointer', fontFamily: 'monospace' }}
                      >
                        {t(locale, 'panel.team.editNote')}
                      </button>
                    )}
                  </div>
                  {!profileEditing ? (
                    (() => {
                      const c = detail?.candidate;
                      const locBits = [c?.city, c?.state].filter(Boolean).join(' / ');
                      const bits = [
                        c?.phone,
                        locBits || null,
                        c?.linkedinUrl ? 'LinkedIn' : null,
                        c?.salaryExpectation,
                        availabilityLabel(locale, c?.availability),
                        sourceLabel(locale, c?.source),
                      ].filter(Boolean);
                      if (!bits.length) {
                        return (
                          <p style={{ margin: 0, fontSize: '12px', color: C.faint, fontStyle: 'italic' }}>—</p>
                        );
                      }
                      return (
                        <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.65, fontFamily: 'monospace' }}>
                          {c?.phone ? <div>{formatPhoneBr(c.phone)}</div> : null}
                          {locBits ? <div>{locBits}</div> : null}
                          {c?.linkedinUrl ? (
                            <div>
                              <a href={c.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: C.purpleLight }}>
                                {c.linkedinUrl}
                              </a>
                            </div>
                          ) : null}
                          {c?.salaryExpectation ? <div>{formatSalaryBr(c.salaryExpectation)}</div> : null}
                          {availabilityLabel(locale, c?.availability) ? (
                            <div>{availabilityLabel(locale, c.availability)}</div>
                          ) : null}
                          {sourceLabel(locale, c?.source) ? (
                            <div>{sourceLabel(locale, c.source)}</div>
                          ) : null}
                        </div>
                      );
                    })()
                  ) : (
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                        <input
                          value={formatPhoneBr(profileDraft.phone)}
                          onChange={(e) => setProfileDraft((p) => ({ ...p, phone: stripPhone(e.target.value) || '' }))}
                          placeholder={t(locale, 'recruiting.phonePh')}
                          inputMode="tel"
                          style={{ flex: '1 1 140px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`,
                            fontSize: '12px', fontFamily: 'monospace', background: 'rgba(26,22,37,.03)', color: C.text }}
                        />
                        <input
                          value={profileDraft.linkedinUrl}
                          onChange={(e) => setProfileDraft((p) => ({ ...p, linkedinUrl: e.target.value }))}
                          placeholder={t(locale, 'recruiting.linkedinPh')}
                          style={{ flex: '2 1 200px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`,
                            fontSize: '12px', fontFamily: 'monospace', background: 'rgba(26,22,37,.03)', color: C.text }}
                        />
                        <BrStateSelect
                          value={profileDraft.state}
                          onChange={(state) => setProfileDraft((p) => ({ ...p, state, city: '' }))}
                          locale={locale}
                          style={{ flex: '0 1 160px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`,
                            fontSize: '12px', fontFamily: 'monospace', background: 'rgba(26,22,37,.03)', color: C.text, cursor: 'pointer' }}
                        />
                        <BrCitySelect
                          uf={profileDraft.state}
                          value={profileDraft.city}
                          onChange={(city) => setProfileDraft((p) => ({ ...p, city }))}
                          locale={locale}
                          style={{ flex: '1 1 180px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`,
                            fontSize: '12px', fontFamily: 'monospace', background: 'rgba(26,22,37,.03)', color: C.text }}
                        />
                        <input
                          value={formatSalaryBr(profileDraft.salaryExpectation)}
                          onChange={(e) => setProfileDraft((p) => ({ ...p, salaryExpectation: digitsOnly(e.target.value).slice(0, 15) }))}
                          placeholder={t(locale, 'recruiting.salaryPh')}
                          inputMode="numeric"
                          style={{ flex: '1 1 160px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`,
                            fontSize: '12px', fontFamily: 'monospace', background: 'rgba(26,22,37,.03)', color: C.text }}
                        />
                        <select
                          value={profileDraft.availability}
                          onChange={(e) => setProfileDraft((p) => ({ ...p, availability: e.target.value }))}
                          aria-label={t(locale, 'recruiting.availabilityLabel')}
                          style={{ flex: '1 1 140px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`,
                            fontSize: '12px', fontFamily: 'monospace', background: 'rgba(26,22,37,.03)', color: C.text }}
                        >
                          <option value="">{t(locale, 'recruiting.availabilityLabel')}</option>
                          <option value="immediate">{t(locale, 'recruiting.availabilityImmediate')}</option>
                          <option value="15_days">{t(locale, 'recruiting.availability15')}</option>
                          <option value="30_days">{t(locale, 'recruiting.availability30')}</option>
                          <option value="60_days">{t(locale, 'recruiting.availability60')}</option>
                          <option value="other">{t(locale, 'recruiting.availabilityOther')}</option>
                        </select>
                        <select
                          value={profileDraft.source}
                          onChange={(e) => setProfileDraft((p) => ({ ...p, source: e.target.value }))}
                          aria-label={t(locale, 'recruiting.sourceLabel')}
                          style={{ flex: '1 1 140px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`,
                            fontSize: '12px', fontFamily: 'monospace', background: 'rgba(26,22,37,.03)', color: C.text }}
                        >
                          <option value="">{t(locale, 'recruiting.sourceLabel')}</option>
                          <option value="linkedin">{t(locale, 'recruiting.sourceLinkedin')}</option>
                          <option value="referral">{t(locale, 'recruiting.sourceReferral')}</option>
                          <option value="agency">{t(locale, 'recruiting.sourceAgency')}</option>
                          <option value="job_board">{t(locale, 'recruiting.sourceJobBoard')}</option>
                          <option value="other">{t(locale, 'recruiting.sourceOther')}</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={saveProfile}
                          disabled={profileBusy}
                          style={{ fontSize: '12px', padding: '7px 14px', borderRadius: '8px',
                            border: `1px solid ${C.purple}55`, background: `${C.purple}18`,
                            color: C.purple, cursor: 'pointer', fontFamily: 'monospace',
                            opacity: profileBusy ? 0.6 : 1 }}
                        >
                          {profileBusy ? t(locale, 'recruiting.savingNotes') : t(locale, 'recruiting.saveProfile')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileDraft(profileFromCandidate(detail?.candidate));
                            setProfileEditing(false);
                            setProfileMsg('');
                          }}
                          disabled={profileBusy}
                          style={{ fontSize: '12px', padding: '7px 14px', borderRadius: '8px',
                            border: `1px solid ${C.border}`, background: 'transparent',
                            color: C.muted, cursor: 'pointer', fontFamily: 'monospace' }}
                        >
                          {t(locale, 'panel.admin.cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                  {profileMsg ? (
                    <p style={{ margin: '8px 0 0', fontSize: '11px', fontFamily: 'monospace',
                      color: profileMsgIsError ? C.tension : C.synergy }}>
                      {profileMsg}
                    </p>
                  ) : null}
                </div>

                <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '10px',
                  border: `1px solid ${C.border}`, background: 'rgba(26,22,37,.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ ...S.label, marginBottom: 0 }}>{t(locale, 'panel.team.hrNotes')}</span>
                    {!notesEditing && (
                      <button
                        type="button"
                        onClick={() => { setNotesDraft(detail?.candidate?.hrNotes || ''); setNotesEditing(true); setNotesMsg(''); }}
                        style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: `1px solid ${C.border}`,
                          background: 'transparent', color: C.muted, cursor: 'pointer', fontFamily: 'monospace' }}
                      >
                        {detail?.candidate?.hrNotes ? t(locale, 'panel.team.editNote') : t(locale, 'panel.team.addNote')}
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
                        {t(locale, 'panel.team.noNotes')}
                      </p>
                    )
                  ) : (
                    <div>
                      <textarea
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        rows={4}
                        placeholder={t(locale, 'panel.team.notesPlaceholder')}
                        aria-label={t(locale, 'panel.team.notesAria')}
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
                          {t(locale, 'panel.admin.save')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setNotesEditing(false); setNotesDraft(detail?.candidate?.hrNotes || ''); }}
                          disabled={notesBusy}
                          style={{ fontSize: '12px', padding: '7px 12px', borderRadius: '8px',
                            border: `1px solid ${C.border}`, background: 'transparent',
                            color: C.muted, cursor: 'pointer', fontFamily: 'monospace' }}
                        >
                          {t(locale, 'panel.admin.cancel')}
                        </button>
                        {notesMsg && (
                          <span style={{ fontSize: '12px', color: notesMsgIsError ? C.tension : C.synergy,
                            fontFamily: 'monospace' }}>
                            {notesMsg}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {!notesEditing && notesMsg && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: notesMsgIsError ? C.tension : C.synergy, fontFamily: 'monospace' }}>
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
