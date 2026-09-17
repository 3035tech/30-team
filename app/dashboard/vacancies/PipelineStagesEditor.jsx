'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { PIPELINE_STAGE } from '../../../lib/pipeline';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { EmptyState } from '../../_components/EmptyState';

const CANONICAL_OPTIONS_CUSTOM = [
  PIPELINE_STAGE.NEW,
  PIPELINE_STAGE.INTERVIEW,
  PIPELINE_STAGE.TEST_COMPLETED,
  PIPELINE_STAGE.SCREENING,
  PIPELINE_STAGE.APPROVED,
  PIPELINE_STAGE.HIRED,
  PIPELINE_STAGE.REJECTED,
  PIPELINE_STAGE.ARCHIVED,
];

const BTN_PRIMARY =
  'min-h-touch cursor-pointer rounded-control border-none bg-brand-500 px-3.5 py-2 font-mono text-xs uppercase tracking-[1px] text-white disabled:opacity-60';
const BTN_GHOST =
  'min-h-touch cursor-pointer rounded-control border border-ink/12 bg-transparent px-3 py-1.5 font-mono text-xs uppercase tracking-[1px] text-ink-muted disabled:opacity-60';
const BTN_DANGER =
  'min-h-touch cursor-pointer rounded-control border border-danger/35 bg-danger/[0.08] px-3 py-1.5 font-mono text-xs uppercase tracking-[1px] text-danger disabled:opacity-60';
const INPUT =
  'w-full rounded-control border border-ink/12 bg-surface px-2 py-1.5 font-ui text-xs text-ink outline-none focus:border-brand-500';

function apiErrorLabel(locale, code) {
  const key = `errors.${code}`;
  const label = t(locale, key);
  if (label && label !== key) return label;
  return t(locale, 'panel.common.error');
}

export function PipelineStagesEditor({ locale, onChange }) {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [labelDraft, setLabelDraft] = useState({ pt: '', en: '' });
  const [canonicalDraft, setCanonicalDraft] = useState(PIPELINE_STAGE.SCREENING);
  const [addingLabelPt, setAddingLabelPt] = useState('');
  const [addingLabelEn, setAddingLabelEn] = useState('');
  const [addingCanonical, setAddingCanonical] = useState(PIPELINE_STAGE.SCREENING);
  const [showAdd, setShowAdd] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const orderPending = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/pipeline-stages?includeCounts=1');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ? apiErrorLabel(locale, data.error) : t(locale, 'panel.common.error'));
      const list = Array.isArray(data.stages) ? data.stages : [];
      setStages(list);
      if (typeof onChange === 'function') onChange(list);
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  }, [locale, onChange]);

  useEffect(() => { load(); }, [load]);

  const beginEdit = (s) => {
    setEditingId(s.id);
    setLabelDraft({ pt: s.labelPt || '', en: s.labelEn || '' });
    setCanonicalDraft(s.canonicalKey || PIPELINE_STAGE.SCREENING);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setLabelDraft({ pt: '', en: '' });
  };

  const saveEdit = async (s) => {
    if (!labelDraft.pt.trim()) return;
    setSaving(true);
    setErr('');
    try {
      const body = { labelPt: labelDraft.pt.trim(), labelEn: labelDraft.en.trim() || labelDraft.pt.trim() };
      if (!s.required) body.canonicalKey = canonicalDraft;
      const res = await fetch(`/api/admin/pipeline-stages/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiErrorLabel(locale, data?.error));
      cancelEdit();
      await load();
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setSaving(false);
    }
  };

  const addStage = async () => {
    const pt = addingLabelPt.trim();
    if (!pt) return;
    setSaving(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/pipeline-stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labelPt: pt,
          labelEn: addingLabelEn.trim() || pt,
          canonicalKey: addingCanonical,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiErrorLabel(locale, data?.error));
      setAddingLabelPt('');
      setAddingLabelEn('');
      setAddingCanonical(PIPELINE_STAGE.SCREENING);
      setShowAdd(false);
      await load();
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setSaving(false);
    }
  };

  const removeStage = async (s) => {
    if (s.required) return;
    if (s.count > 0) {
      setErr(t(locale, 'panel.pipelineEditor.deleteBlockedInUse', { n: s.count }));
      return;
    }
    if (!window.confirm(t(locale, 'panel.pipelineEditor.deleteConfirm', { name: s.labelPt }))) return;
    setSaving(true);
    setErr('');
    try {
      const res = await fetch(`/api/admin/pipeline-stages/${s.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error === 'PIPELINE_STAGE_IN_USE') {
          throw new Error(t(locale, 'panel.pipelineEditor.deleteBlockedInUse', { n: data.usage || 0 }));
        }
        throw new Error(apiErrorLabel(locale, data?.error));
      }
      await load();
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setSaving(false);
    }
  };

  const commitReorder = async (nextOrder) => {
    if (orderPending.current) return;
    orderPending.current = true;
    setStages(nextOrder);
    try {
      const res = await fetch('/api/admin/pipeline-stages/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: nextOrder.map((s) => s.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiErrorLabel(locale, data?.error));
      if (Array.isArray(data.stages)) {
        const usageMap = Object.fromEntries(stages.map((s) => [s.id, s.count || 0]));
        setStages(data.stages.map((s) => ({ ...s, count: usageMap[s.id] || 0 })));
        if (typeof onChange === 'function') onChange(data.stages);
      }
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
      await load();
    } finally {
      orderPending.current = false;
    }
  };

  const onDrop = (targetId) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null); setDragOverId(null); return;
    }
    const from = stages.findIndex((s) => s.id === draggingId);
    const to = stages.findIndex((s) => s.id === targetId);
    if (from < 0 || to < 0) {
      setDraggingId(null); setDragOverId(null); return;
    }
    const next = [...stages];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraggingId(null); setDragOverId(null);
    commitReorder(next);
  };

  const canonicalOptions = useMemo(() =>
    CANONICAL_OPTIONS_CUSTOM.map((c) => ({
      value: c,
      label: t(locale, `recruiting.pipeline${c.replace(/(^|_)([a-z])/g, (_, __, ch) => ch.toUpperCase())}`),
    })),
  [locale]);

  if (loading) {
    return <AppLoading variant="panel" />;
  }

  return (
    <ContentEnter animKey="pipeline-editor">
      <div className="space-y-2">
        {err ? (
          <p className="mb-1 mt-0 font-mono text-xs text-danger">{err}</p>
        ) : null}
        {stages.length === 0 ? (
          <EmptyState title={t(locale, 'panel.pipelineEditor.emptyTitle')} className="py-4" />
        ) : (
          <ul className="space-y-1.5 pl-0">
            {stages.map((s) => {
              const editing = editingId === s.id;
              const dragOver = dragOverId === s.id;
              return (
                <li
                  key={s.id}
                  className={cn(
                    'flex flex-wrap items-center gap-2 rounded-control border border-ink/12 bg-surface/85 px-3 py-2',
                    dragOver && 'border-brand-500/60 bg-brand-500/[0.06]'
                  )}
                  draggable={!editing}
                  onDragStart={(e) => {
                    if (editing) return;
                    setDraggingId(s.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => { e.preventDefault(); if (draggingId && draggingId !== s.id) setDragOverId(s.id); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverId((cur) => (cur === s.id ? null : cur)); }}
                  onDrop={(e) => { e.preventDefault(); onDrop(s.id); }}
                  onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                >
                  <span className="cursor-grab select-none font-mono text-2xs text-ink-faint" aria-hidden>⋮⋮</span>
                  {editing ? (
                    <>
                      <input
                        value={labelDraft.pt}
                        onChange={(e) => setLabelDraft((d) => ({ ...d, pt: e.target.value }))}
                        maxLength={60}
                        className={cn(INPUT, 'flex-1 min-w-[140px]')}
                        placeholder={t(locale, 'panel.pipelineEditor.labelPtPlaceholder')}
                      />
                      <input
                        value={labelDraft.en}
                        onChange={(e) => setLabelDraft((d) => ({ ...d, en: e.target.value }))}
                        maxLength={60}
                        className={cn(INPUT, 'flex-1 min-w-[140px]')}
                        placeholder={t(locale, 'panel.pipelineEditor.labelEnPlaceholder')}
                      />
                      {!s.required ? (
                        <select
                          value={canonicalDraft}
                          onChange={(e) => setCanonicalDraft(e.target.value)}
                          className={cn(INPUT, 'w-[160px]')}
                          aria-label={t(locale, 'panel.pipelineEditor.canonicalLabel')}
                        >
                          {canonicalOptions.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      ) : null}
                      <button type="button" className={BTN_PRIMARY} onClick={() => saveEdit(s)} disabled={saving}>
                        {t(locale, 'panel.pipelineEditor.save')}
                      </button>
                      <button type="button" className={BTN_GHOST} onClick={cancelEdit} disabled={saving}>
                        {t(locale, 'panel.pipelineEditor.cancel')}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 min-w-[140px] font-ui text-sm text-ink">
                        {locale === 'en' ? (s.labelEn || s.labelPt) : (s.labelPt || s.labelEn)}
                      </span>
                      <span className="font-mono text-2xs uppercase tracking-[1px] text-ink-faint">
                        {t(locale, `recruiting.pipeline${s.canonicalKey.replace(/(^|_)([a-z])/g, (_, __, ch) => ch.toUpperCase())}`)}
                      </span>
                      {s.required ? (
                        <span className="rounded-full bg-ink/10 px-2 py-0.5 font-mono text-2xs uppercase tracking-[1px] text-ink-muted">
                          {t(locale, 'panel.pipelineEditor.required')}
                        </span>
                      ) : null}
                      <span className="font-mono text-2xs text-ink-faint">
                        {t(locale, 'panel.pipelineEditor.usageCount', { n: s.count || 0 })}
                      </span>
                      <div className="ml-auto flex gap-1.5">
                        <button type="button" className={BTN_GHOST} onClick={() => beginEdit(s)} disabled={saving}>
                          {t(locale, 'panel.pipelineEditor.edit')}
                        </button>
                        {!s.required ? (
                          <button
                            type="button"
                            className={BTN_DANGER}
                            onClick={() => removeStage(s)}
                            disabled={saving}
                            title={s.count > 0 ? t(locale, 'panel.pipelineEditor.deleteBlockedInUse', { n: s.count }) : undefined}
                          >
                            {t(locale, 'panel.pipelineEditor.delete')}
                          </button>
                        ) : null}
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="pt-2">
          {showAdd ? (
            <div className="flex flex-wrap items-center gap-2 rounded-control border border-brand-500/40 bg-brand-500/[0.05] px-3 py-2">
              <input
                value={addingLabelPt}
                onChange={(e) => setAddingLabelPt(e.target.value)}
                maxLength={60}
                className={cn(INPUT, 'flex-1 min-w-[140px]')}
                placeholder={t(locale, 'panel.pipelineEditor.labelPtPlaceholder')}
              />
              <input
                value={addingLabelEn}
                onChange={(e) => setAddingLabelEn(e.target.value)}
                maxLength={60}
                className={cn(INPUT, 'flex-1 min-w-[140px]')}
                placeholder={t(locale, 'panel.pipelineEditor.labelEnPlaceholder')}
              />
              <select
                value={addingCanonical}
                onChange={(e) => setAddingCanonical(e.target.value)}
                className={cn(INPUT, 'w-[160px]')}
                aria-label={t(locale, 'panel.pipelineEditor.canonicalLabel')}
              >
                {canonicalOptions.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <button type="button" className={BTN_PRIMARY} onClick={addStage} disabled={saving || !addingLabelPt.trim()}>
                {t(locale, 'panel.pipelineEditor.addSubmit')}
              </button>
              <button type="button" className={BTN_GHOST} onClick={() => { setShowAdd(false); setAddingLabelPt(''); setAddingLabelEn(''); }} disabled={saving}>
                {t(locale, 'panel.pipelineEditor.cancel')}
              </button>
            </div>
          ) : (
            <button type="button" className={BTN_PRIMARY} onClick={() => setShowAdd(true)} disabled={saving}>
              {t(locale, 'panel.pipelineEditor.addCta')}
            </button>
          )}
        </div>
      </div>
    </ContentEnter>
  );
}
