'use client';

import { localeHtmlLang, t } from '../../lib/i18n';
import { C, FONTS, PIPELINE_STAGE_COLORS } from '../../lib/theme';
import { rejectionReasonLabel } from '../dashboard/pipeline-prompts';

/** Funil principal (ordem). Rejeitado/arquivado entram como desvio visual. */
const HAPPY_PATH = ['new', 'interview', 'test_completed', 'screening', 'approved', 'hired'];

const STAGE_LABEL_KEY = {
  new: 'recruiting.pipelineNew',
  interview: 'recruiting.pipelineInterview',
  test_completed: 'recruiting.pipelineTestCompleted',
  screening: 'recruiting.pipelineScreening',
  approved: 'recruiting.pipelineApproved',
  hired: 'recruiting.pipelineHired',
  rejected: 'recruiting.pipelineRejected',
  archived: 'recruiting.pipelineArchived',
};

function pipelineLabel(locale, code) {
  return t(locale, STAGE_LABEL_KEY[code] || 'recruiting.pipelineNew');
}

function Icon({ children, size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const STAGE_ICONS = {
  new: (
    <Icon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </Icon>
  ),
  interview: (
    <Icon>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </Icon>
  ),
  test_completed: (
    <Icon>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6M9 16h4" />
    </Icon>
  ),
  screening: (
    <Icon>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </Icon>
  ),
  approved: (
    <Icon>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  ),
  hired: (
    <Icon>
      <path d="M12 3v12" />
      <path d="m8 11 4 4 4-4" />
      <path d="M5 21h14" />
    </Icon>
  ),
  rejected: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6M9 9l6 6" />
    </Icon>
  ),
  archived: (
    <Icon>
      <rect x="2" y="4" width="20" height="5" rx="1" />
      <path d="M4 9v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M10 13h4" />
    </Icon>
  ),
};

function resolveCurrentStage(currentStage, events = []) {
  if (currentStage && STAGE_LABEL_KEY[currentStage]) return currentStage;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i];
    if (ev.type === 'pipeline.change' && ev.toStage && STAGE_LABEL_KEY[ev.toStage]) {
      return ev.toStage;
    }
    if (ev.type === 'candidate.hired') return 'hired';
    if (ev.type === 'assessment.completed') return 'test_completed';
  }
  return 'new';
}

function collectVisited(events = []) {
  const visited = new Set(['new']);
  for (const ev of events) {
    if (ev.type === 'pipeline.change') {
      if (ev.fromStage) visited.add(ev.fromStage);
      if (ev.toStage) visited.add(ev.toStage);
    }
    if (ev.type === 'assessment.completed' || ev.type === 'invite.completed') {
      visited.add('test_completed');
    }
    if (ev.type === 'candidate.hired') visited.add('hired');
  }
  return visited;
}

/**
 * @returns {{ id: string, status: 'done'|'current'|'todo'|'skipped' }[]}
 */
function buildSteps(currentStage, events = []) {
  const stage = resolveCurrentStage(currentStage, events);
  const visited = collectVisited(events);
  visited.add(stage);

  if (stage === 'rejected' || stage === 'archived') {
    let peak = 0;
    for (const id of HAPPY_PATH) {
      if (id === 'hired') continue;
      if (visited.has(id)) peak = Math.max(peak, HAPPY_PATH.indexOf(id));
    }
    const branchEv = [...events].reverse().find(
      (ev) => ev.type === 'pipeline.change' && ev.toStage === stage
    );
    if (branchEv?.fromStage && HAPPY_PATH.includes(branchEv.fromStage)) {
      peak = Math.max(peak, HAPPY_PATH.indexOf(branchEv.fromStage));
    }

    const steps = HAPPY_PATH.map((id, i) => {
      if (i <= peak) return { id, status: 'done' };
      return { id, status: 'skipped' };
    });
    steps.push({ id: stage, status: 'current' });
    return steps;
  }

  const idx = Math.max(0, HAPPY_PATH.indexOf(stage));
  return HAPPY_PATH.map((id, i) => {
    if (i < idx) return { id, status: 'done' };
    if (i === idx) return { id, status: 'current' };
    return { id, status: 'todo' };
  });
}

function statusStyles(status, color) {
  if (status === 'done') {
    return {
      nodeBg: color,
      nodeColor: '#fff',
      nodeBorder: color,
      labelColor: C.text,
      labelWeight: 600,
      opacity: 1,
      ring: 'none',
    };
  }
  if (status === 'current') {
    return {
      nodeBg: C.surface || '#fff',
      nodeColor: color,
      nodeBorder: color,
      labelColor: color,
      labelWeight: 700,
      opacity: 1,
      ring: `0 0 0 4px ${color}33`,
    };
  }
  if (status === 'skipped') {
    return {
      nodeBg: C.surface || '#fff',
      nodeColor: C.faint,
      nodeBorder: C.border,
      labelColor: C.faint,
      labelWeight: 500,
      opacity: 0.5,
      ring: 'none',
    };
  }
  return {
    nodeBg: C.surface || '#fff',
    nodeColor: C.muted,
    nodeBorder: C.border,
    labelColor: C.muted,
    labelWeight: 500,
    opacity: 0.8,
    ring: 'none',
  };
}

function LegendDot({ color, label, hollow }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        color: C.muted,
        fontFamily: FONTS.mono,
      }}
    >
      <span
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: hollow ? '#fff' : color,
          border: `2px solid ${color}`,
          boxSizing: 'border-box',
        }}
      />
      {label}
    </span>
  );
}

function formatAt(at, locale) {
  if (!at) return null;
  return new Date(at).toLocaleString(localeHtmlLang(locale), {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Timeline horizontal do funil: etapas passadas / atual / faltando.
 */
export function CandidateTimeline({
  locale = 'pt-BR',
  events = [],
  currentStage = null,
  loading = false,
}) {
  if (loading) {
    return <p style={{ margin: 0, fontSize: '12px', color: C.muted }}>…</p>;
  }

  const stage = resolveCurrentStage(currentStage, events);
  const steps = buildSteps(stage, events);
  const rejectionEv = [...events].reverse().find(
    (ev) => ev.type === 'pipeline.change' && ev.toStage === 'rejected' && ev.reason
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px 16px',
          marginBottom: '14px',
          justifyContent: 'center',
        }}
      >
        <LegendDot color={C.success} label={t(locale, 'recruiting.timelineLegendDone')} />
        <LegendDot
          color={PIPELINE_STAGE_COLORS[stage] || C.purple}
          label={t(locale, 'recruiting.timelineLegendCurrent')}
          hollow
        />
        <LegendDot color={C.border} label={t(locale, 'recruiting.timelineLegendTodo')} />
        {(stage === 'rejected' || stage === 'archived') && (
          <LegendDot color={C.faint} label={t(locale, 'recruiting.timelineLegendSkipped')} />
        )}
      </div>

      <div
        style={{
          overflowX: 'auto',
          padding: '10px 4px 4px',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <ol
          style={{
            listStyle: 'none',
            margin: 0,
            padding: '4px 0 0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            minWidth: 'min-content',
            maxWidth: '920px',
            width: '100%',
          }}
        >
          {steps.map((step, i) => {
            const color = PIPELINE_STAGE_COLORS[step.id] || C.muted;
            const styles = statusStyles(step.status, color);
            const isFirst = i === 0;
            const isLast = i === steps.length - 1;
            const prev = steps[i - 1];
            const next = steps[i + 1];

            const segmentDone = (from, to) =>
              from
              && (from.status === 'done' || from.status === 'current')
              && to
              && (to.status === 'done' || to.status === 'current');

            // Cor da meia-linha à esquerda (vem do passo anterior → este)
            const leftLineColor = segmentDone(prev, step)
              ? (PIPELINE_STAGE_COLORS[prev.id] || C.border)
              : C.border;
            // Cor da meia-linha à direita (este → próximo)
            const rightLineColor = segmentDone(step, next)
              ? color
              : C.border;

            return (
              <li
                key={`${step.id}-${i}`}
                style={{
                  flex: '1 1 0',
                  minWidth: '96px',
                  maxWidth: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  opacity: styles.opacity,
                }}
              >
                {/*
                  Linha | bolinha | linha — a linha NUNCA fica atrás do círculo.
                */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    height: '40px',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      flex: 1,
                      height: '3px',
                      background: isFirst ? 'transparent' : leftLineColor,
                      borderRadius: '2px',
                    }}
                  />
                  <div
                    title={
                      step.status === 'current'
                        ? t(locale, 'recruiting.timelineLegendCurrent')
                        : step.status === 'done'
                          ? t(locale, 'recruiting.timelineLegendDone')
                          : step.status === 'skipped'
                            ? t(locale, 'recruiting.timelineLegendSkipped')
                            : t(locale, 'recruiting.timelineLegendTodo')
                    }
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: styles.nodeBg,
                      color: styles.nodeColor,
                      border: `2.5px solid ${styles.nodeBorder}`,
                      boxShadow: styles.ring,
                    }}
                  >
                    {step.status === 'done' ? (
                      <Icon size={15}>
                        <path d="M20 6 9 17l-5-5" />
                      </Icon>
                    ) : (
                      STAGE_ICONS[step.id]
                    )}
                  </div>
                  <div
                    aria-hidden
                    style={{
                      flex: 1,
                      height: '3px',
                      background: isLast ? 'transparent' : rightLineColor,
                      borderRadius: '2px',
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: styles.labelWeight,
                    color: styles.labelColor,
                    textAlign: 'center',
                    lineHeight: 1.3,
                    padding: '0 4px',
                    fontFamily: FONTS.mono,
                  }}
                >
                  {pipelineLabel(locale, step.id)}
                </div>
                {step.status === 'current' ? (
                  <div
                    style={{
                      marginTop: '6px',
                      fontSize: '9px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color,
                      fontFamily: FONTS.mono,
                      fontWeight: 700,
                      textAlign: 'center',
                    }}
                  >
                    {t(locale, 'recruiting.timelineNow')}
                  </div>
                ) : (
                  <div style={{ height: '18px' }} aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {stage === 'rejected' && rejectionEv?.reason ? (
        <p style={{ margin: '12px 0 0', fontSize: '12px', color: C.tension, textAlign: 'center', width: '100%' }}>
          {t(locale, 'recruiting.rejectionReasonLabel')}: {rejectionReasonLabel(locale, rejectionEv.reason)}
        </p>
      ) : null}

      {events.length > 0 ? (
        <details style={{ marginTop: '14px', width: '100%', maxWidth: '520px' }}>
          <summary
            style={{
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: FONTS.mono,
              color: C.muted,
              letterSpacing: '0.04em',
              userSelect: 'none',
              textAlign: 'center',
              listStylePosition: 'inside',
            }}
          >
            {t(locale, 'recruiting.timelineHistory', { n: events.length })}
          </summary>
          <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, textAlign: 'left' }}>
            {[...events]
              .reverse()
              .slice(0, 12)
              .map((ev, i) => {
                let text = t(locale, ev.labelKey || 'recruiting.timelinePipelineChange');
                if (ev.type === 'pipeline.change') {
                  text = t(locale, 'recruiting.timelinePipelineChange', {
                    from: pipelineLabel(locale, ev.fromStage || '—'),
                    to: pipelineLabel(locale, ev.toStage || '—'),
                  });
                }
                const bits = [text];
                if (ev.vacancyTitle) bits.push(ev.vacancyTitle);
                if (ev.topType != null) bits.push(`T${ev.topType}`);
                return (
                  <li
                    key={`${ev.type}-${ev.at}-${i}`}
                    style={{
                      fontSize: '12px',
                      color: C.muted,
                      padding: '4px 0',
                      borderBottom:
                        i < Math.min(events.length, 12) - 1 ? `1px solid ${C.border}` : 'none',
                      lineHeight: 1.45,
                    }}
                  >
                    <span style={{ fontFamily: FONTS.mono, color: C.faint }}>
                      {formatAt(ev.at, locale) || '—'}
                    </span>
                    {' · '}
                    <span style={{ color: C.text }}>{bits.join(' · ')}</span>
                  </li>
                );
              })}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
