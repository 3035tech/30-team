'use client';

import { localeHtmlLang, t } from '../../lib/i18n';
import { C, FONTS, PIPELINE_STAGE_COLORS } from '../../lib/theme';
import { rejectionReasonLabel } from '../dashboard/pipeline-prompts';

function pipelineLabel(locale, code) {
  const map = {
    new: 'recruiting.pipelineNew',
    interview: 'recruiting.pipelineInterview',
    test_completed: 'recruiting.pipelineTestCompleted',
    screening: 'recruiting.pipelineScreening',
    approved: 'recruiting.pipelineApproved',
    hired: 'recruiting.pipelineHired',
    rejected: 'recruiting.pipelineRejected',
    archived: 'recruiting.pipelineArchived',
  };
  return t(locale, map[code] || 'recruiting.pipelineNew');
}

function Icon({ children }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const ICONS = {
  user: (
    <Icon>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  ),
  briefcase: (
    <Icon>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </Icon>
  ),
  mail: (
    <Icon>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </Icon>
  ),
  eye: (
    <Icon>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  ),
  check: (
    <Icon>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  ),
  clipboard: (
    <Icon>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6M9 16h4" />
    </Icon>
  ),
  hire: (
    <Icon>
      <path d="M12 3v12" />
      <path d="m8 11 4 4 4-4" />
      <path d="M5 21h14" />
    </Icon>
  ),
  reject: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6M9 9l6 6" />
    </Icon>
  ),
  interview: (
    <Icon>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </Icon>
  ),
  screening: (
    <Icon>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </Icon>
  ),
  archive: (
    <Icon>
      <rect x="2" y="4" width="20" height="5" rx="1" />
      <path d="M4 9v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M10 13h4" />
    </Icon>
  ),
  arrow: (
    <Icon>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  ),
};

function metaForEvent(ev, locale) {
  if (ev.type === 'pipeline.change') {
    const to = ev.toStage;
    if (to === 'hired') {
      return { icon: ICONS.hire, color: PIPELINE_STAGE_COLORS.hired };
    }
    if (to === 'rejected') {
      return { icon: ICONS.reject, color: PIPELINE_STAGE_COLORS.rejected };
    }
    if (to === 'interview') {
      return { icon: ICONS.interview, color: PIPELINE_STAGE_COLORS.interview };
    }
    if (to === 'screening') {
      return { icon: ICONS.screening, color: PIPELINE_STAGE_COLORS.screening };
    }
    if (to === 'approved') {
      return { icon: ICONS.check, color: PIPELINE_STAGE_COLORS.approved };
    }
    if (to === 'test_completed') {
      return { icon: ICONS.clipboard, color: PIPELINE_STAGE_COLORS.test_completed };
    }
    if (to === 'archived') {
      return { icon: ICONS.archive, color: PIPELINE_STAGE_COLORS.archived };
    }
    return {
      icon: ICONS.arrow,
      color: PIPELINE_STAGE_COLORS[to] || C.muted,
    };
  }

  switch (ev.type) {
    case 'candidate.created':
      return { icon: ICONS.user, color: C.info };
    case 'candidate.hired':
      return { icon: ICONS.hire, color: PIPELINE_STAGE_COLORS.hired };
    case 'vacancy.registered':
      return { icon: ICONS.briefcase, color: C.purple };
    case 'invite.sent':
      return { icon: ICONS.mail, color: C.warning };
    case 'invite.opened':
      return { icon: ICONS.eye, color: C.info };
    case 'invite.completed':
      return { icon: ICONS.check, color: C.success };
    case 'assessment.completed':
      return { icon: ICONS.clipboard, color: PIPELINE_STAGE_COLORS.test_completed };
    default:
      return { icon: ICONS.arrow, color: C.muted };
  }
}

function eventTitle(ev, locale) {
  if (ev.type === 'pipeline.change') {
    return t(locale, 'recruiting.timelinePipelineChange', {
      from: pipelineLabel(locale, ev.fromStage || '—'),
      to: pipelineLabel(locale, ev.toStage || '—'),
    });
  }
  return t(locale, ev.labelKey || 'recruiting.timelinePipelineChange');
}

function formatAt(at, locale) {
  if (!at) return '—';
  return new Date(at).toLocaleString(localeHtmlLang(locale), {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Linha do tempo visual do candidato (ícones por tipo de evento).
 */
export function CandidateTimeline({ locale = 'pt-BR', events = [], loading = false }) {
  if (loading) {
    return <p style={{ margin: 0, fontSize: '12px', color: C.muted }}>…</p>;
  }
  if (!events.length) {
    return (
      <p style={{ margin: 0, fontSize: '12px', color: C.faint, fontStyle: 'italic' }}>
        {t(locale, 'recruiting.timelineEmpty')}
      </p>
    );
  }

  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {events.map((ev, i) => {
        const { icon, color } = metaForEvent(ev, locale);
        const title = eventTitle(ev, locale);
        const details = [];
        if (ev.vacancyTitle) details.push(ev.vacancyTitle);
        if (ev.reason) details.push(rejectionReasonLabel(locale, ev.reason));
        if (ev.startDate) details.push(`${t(locale, 'recruiting.startDateLabel')}: ${ev.startDate}`);
        if (ev.topType != null) details.push(`T${ev.topType}`);
        const isLast = i === events.length - 1;

        return (
          <li
            key={`${ev.type}-${ev.at || i}-${i}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr',
              gap: '10px',
              position: 'relative',
              paddingBottom: isLast ? 0 : '14px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${color}18`,
                  border: `1.5px solid ${color}55`,
                  color,
                  flexShrink: 0,
                  zIndex: 1,
                }}
              >
                {icon}
              </div>
              {!isLast ? (
                <div
                  style={{
                    width: '2px',
                    flex: 1,
                    minHeight: '12px',
                    marginTop: '4px',
                    background: `linear-gradient(180deg, ${color}44, ${C.border})`,
                    borderRadius: '1px',
                  }}
                />
              ) : null}
            </div>
            <div style={{ paddingTop: '4px', minWidth: 0 }}>
              <div
                style={{
                  fontSize: '11px',
                  fontFamily: FONTS.mono,
                  color: C.faint,
                  marginBottom: '2px',
                }}
              >
                {formatAt(ev.at, locale)}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: C.text,
                  lineHeight: 1.45,
                  fontWeight: 500,
                }}
              >
                {title}
              </div>
              {details.length ? (
                <div
                  style={{
                    marginTop: '3px',
                    fontSize: '12px',
                    color: C.muted,
                    lineHeight: 1.45,
                  }}
                >
                  {details.join(' · ')}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
