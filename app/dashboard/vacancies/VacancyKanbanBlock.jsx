'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { titleCasePersonName } from '../../../lib/person-name';
import { PIPELINE_STAGE } from '../../../lib/pipeline';
import { getKanbanStages } from '../dashboard-shared';
import { rejectionReasonLabel } from '../pipeline-prompts';
import { usePipelineExtras } from '../PipelineExtrasContext';
import { formatRelativeAgo, inviteStatusShort, daysInStage, stageAgingTone } from './vacancy-admin-shared';
import { VacancyOfferBlock } from './VacancyOfferBlock';

export function VacancyKanbanBlock({ vacancyId, locale, refreshKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [moving, setMoving] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const stages = getKanbanStages(locale);
  const { requestPipelineExtras } = usePipelineExtras();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/ranking`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
        if (!cancelled) setRows(Array.isArray(data.ranking) ? data.ranking : []);
      } catch (e) {
        if (!cancelled) setErr(e?.message || t(locale, 'panel.common.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [vacancyId, refreshKey, locale]);

  const cardKey = (r) =>
    r.assessmentId != null ? `a:${r.assessmentId}` : `vc:${r.vacancyCandidateId}`;

  const moveTo = async (row, stage) => {
    const extras = await requestPipelineExtras(locale, stage);
    if (extras == null) return;
    const key = cardKey(row);
    setMoving(key);
    try {
      if (row.pendingTest || !row.assessmentId) {
        const res = await fetch(
          `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates/${encodeURIComponent(row.candidateId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pipelineStage: stage, ...extras }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
        setRows((prev) =>
          prev.map((r) => (cardKey(r) === key ? {
            ...r,
            pipelineStage: stage,
            rejectionReason: data.rejectionReason ?? extras.rejectionReason ?? r.rejectionReason,
            startDate: data.startDate ?? extras.startDate ?? r.startDate,
          } : r))
        );
      } else {
        const res = await fetch(`/api/admin/assessments/${encodeURIComponent(row.assessmentId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pipelineStage: stage, ...extras }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
        setRows((prev) =>
          prev.map((r) => (cardKey(r) === key ? {
            ...r,
            pipelineStage: stage,
            rejectionReason: data.rejectionReason ?? extras.rejectionReason ?? r.rejectionReason,
            startDate: data.startDate ?? extras.startDate ?? r.startDate,
          } : r))
        );
      }
    } catch (e) {
      setErr(e?.message || t(locale, 'recruiting.moveCandidateError'));
    } finally {
      setMoving(null);
    }
  };

  const grouped = Object.fromEntries(stages.map((s) => [s.id, []]));
  rows.forEach((r) => {
    const stage = r.pipelineStage || 'new';
    if (grouped[stage]) grouped[stage].push(r);
    else grouped['new'].push(r);
  });

  const hasAny = rows.length > 0;
  const fitTone = (s) => (s >= 7 ? 'text-success' : s >= 4 ? 'text-warning' : 'text-danger');

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="font-mono text-xs uppercase tracking-[1.5px] text-ink-muted">
          {t(locale, 'recruiting.pipelineTitle')}
        </span>
        {loading && <span className="spinner text-ink-muted" />}
        {!loading && hasAny && (
          <span className="font-mono text-2xs text-ink-faint">
            {t(locale, 'recruiting.candidatesCount', { n: rows.length })}
          </span>
        )}
      </div>

      {err ? <p className="mb-2.5 mt-0 font-mono text-xs text-danger">{err}</p> : null}

      {!loading && !hasAny ? (
        <p className="text-xs italic text-ink-faint">
          {t(locale, 'recruiting.pipelineEmpty')}
        </p>
      ) : null}

      {hasAny && (
        <div className="kanban-scroll overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
          <div className="flex min-w-max items-start gap-2.5">
            {stages.map((stage) => {
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
                    const r = rows.find((row) => cardKey(row) === id);
                    if (!r || (r.pipelineStage || 'new') === stage.id) return;
                    await moveTo(r, stage.id);
                  }}
                  className="w-[210px] shrink-0 rounded-xl outline outline-2 outline-offset-[3px] transition-[outline-color] duration-100"
                  style={{
                    outlineColor: isDropTarget ? stage.color : 'transparent',
                  }}
                >
                  <div
                    className="mb-2 flex items-center gap-1.5 rounded-t-[10px] px-2.5 py-2 transition-colors duration-100"
                    style={{
                      background: isDropTarget ? `${stage.color}22` : `${stage.color}12`,
                      borderTop: `3px solid ${stage.color}`,
                      border: `1px solid ${stage.color}30`,
                      borderTopWidth: 3,
                      borderTopStyle: 'solid',
                      borderTopColor: stage.color,
                    }}
                  >
                    <span
                      className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
                      style={{ background: stage.color }}
                    />
                    <span
                      className="flex-1 font-mono text-2xs font-bold uppercase tracking-[0.8px]"
                      style={{ color: stage.color }}
                    >
                      {stage.label}
                    </span>
                    <span
                      className="rounded-lg px-[7px] py-px font-mono text-2xs font-bold"
                      style={{ color: stage.color, background: `${stage.color}25` }}
                    >
                      {cards.length}
                    </span>
                  </div>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    className={cn(
                      'flex flex-col gap-[7px] transition-[min-height] duration-100',
                      isDropTarget ? 'min-h-[60px]' : 'min-h-[30px]'
                    )}
                  >
                    {cards.map((r) => {
                      const rid = cardKey(r);
                      const isDragging = draggingId === rid;
                      const isBusy = moving === rid;
                      const inviteLabel = inviteStatusShort(locale, r.inviteStatus);
                      const ago = formatRelativeAgo(r.inviteSentAt, locale);
                      const days = daysInStage(r.stageEnteredAt || r.createdAt);
                      const aging = stageAgingTone(days, r.pipelineStage || 'new');
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
                          className={cn(
                            'cursor-grab select-none rounded-lg border border-ink/12 bg-surface/[0.88] px-2.5 py-[9px] transition-opacity duration-150',
                            isDragging && 'opacity-40',
                            isBusy && !isDragging && 'opacity-65',
                            draggingId && !isDragging && 'pointer-events-none'
                          )}
                        >
                          <div className="mb-[3px] flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-ui text-prose text-ink">
                              {titleCasePersonName(r.name)}
                            </div>
                            {days != null && aging ? (
                              <span
                                className={cn(
                                  'shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-2xs',
                                  aging === 'danger'
                                    ? 'border-danger/30 bg-danger/[0.09] text-danger'
                                    : 'border-warning/30 bg-warning/[0.1] text-warning'
                                )}
                                title={t(locale, 'recruiting.stageAgingTitle', { n: days })}
                              >
                                {t(locale, 'recruiting.stageAgingDays', { n: days })}
                              </span>
                            ) : days != null && days > 0 ? (
                              <span
                                className="shrink-0 font-mono text-2xs text-ink-faint"
                                title={t(locale, 'recruiting.stageAgingTitle', { n: days })}
                              >
                                {t(locale, 'recruiting.stageAgingDays', { n: days })}
                              </span>
                            ) : null}
                          </div>
                          {r.email ? (
                            <div
                              className="mb-[5px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-2xs text-ink-faint"
                              title={r.email}
                            >
                              {r.email}
                            </div>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {r.pendingTest || r.topType == null ? null : (
                              <span className="font-mono text-2xs text-ink-muted">T{r.topType}</span>
                            )}
                            {r.vacancyFitScore010 != null && (
                              <span className={cn('font-mono text-2xs', fitTone(r.vacancyFitScore010))}>
                                {r.vacancyFitScore010}/10
                              </span>
                            )}
                          </div>
                          {r.rejectionReason ? (
                            <div className="mt-1 font-mono text-2xs text-danger">
                              {rejectionReasonLabel(locale, r.rejectionReason)}
                            </div>
                          ) : null}
                          {r.startDate && (r.pipelineStage === PIPELINE_STAGE.HIRED) ? (
                            <div className="mt-1 font-mono text-2xs text-success">
                              {t(locale, 'recruiting.startDateLabel')}: {r.startDate}
                            </div>
                          ) : null}
                          {r.candidateId ? (
                            <VacancyOfferBlock
                              vacancyId={vacancyId}
                              candidateId={r.candidateId}
                              assessmentId={r.assessmentId}
                              locale={locale}
                              compact
                              initialOffer={{
                                offerSalary: r.offerSalary,
                                offerStartDate: r.offerStartDate,
                                offerStatus: r.offerStatus || 'none',
                                offerNotes: r.offerNotes,
                              }}
                              onSaved={(next) => {
                                setRows((prev) =>
                                  prev.map((x) =>
                                    cardKey(x) === rid
                                      ? {
                                          ...x,
                                          offerSalary: next.offerSalary,
                                          offerStartDate: next.offerStartDate,
                                          offerStatus: next.offerStatus,
                                          offerNotes: next.offerNotes,
                                        }
                                      : x
                                  )
                                );
                              }}
                            />
                          ) : null}
                          {(inviteLabel || ago) ? (
                            <div className="mt-[5px] font-mono text-2xs leading-[1.35] text-ink-muted">
                              {inviteLabel ? t(locale, 'recruiting.inviteLine', { status: inviteLabel }) : null}
                              {inviteLabel && ago ? ' · ' : null}
                              {ago || null}
                            </div>
                          ) : r.pendingTest ? (
                            <div className="mt-[5px] font-mono text-2xs text-ink-faint">
                              {t(locale, 'recruiting.waitingTest')}
                            </div>
                          ) : null}
                          {r.hasNotes ? (
                            <div className="mt-1 font-mono text-2xs text-brand-600">
                              {t(locale, 'recruiting.withNotes')}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                    {cards.length === 0 && (
                      <div
                        className={cn(
                          'rounded-lg px-2.5 py-3.5 text-center font-mono text-2xs italic transition-all duration-100',
                          isDropTarget ? 'border-2 border-dashed' : 'border-2 border-dashed border-transparent text-ink-faint'
                        )}
                        style={
                          isDropTarget
                            ? { color: stage.color, borderColor: `${stage.color}55` }
                            : undefined
                        }
                      >
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
