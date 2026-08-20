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

function Icon({ children, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const ICONS = {
  user: (
    <Icon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
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

function metaForEvent(ev) {
  if (ev.type === 'pipeline.change') {
    const to = ev.toStage;
    if (to === 'hired') return { icon: ICONS.hire, color: PIPELINE_STAGE_COLORS.hired };
    if (to === 'rejected') return { icon: ICONS.reject, color: PIPELINE_STAGE_COLORS.rejected };
    if (to === 'interview') return { icon: ICONS.interview, color: PIPELINE_STAGE_COLORS.interview };
    if (to === 'screening') return { icon: ICONS.screening, color: PIPELINE_STAGE_COLORS.screening };
    if (to === 'approved') return { icon: ICONS.check, color: PIPELINE_STAGE_COLORS.approved };
    if (to === 'test_completed') {
      return { icon: ICONS.clipboard, color: PIPELINE_STAGE_COLORS.test_completed };
    }
    if (to === 'archived') return { icon: ICONS.archive, color: PIPELINE_STAGE_COLORS.archived };
    return { icon: ICONS.arrow, color: PIPELINE_STAGE_COLORS[to] || C.muted };
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
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function eventTags(ev, locale) {
  const tags = [];
  if (ev.vacancyTitle) tags.push({ label: ev.vacancyTitle, tone: 'default' });
  if (ev.reason) tags.push({ label: rejectionReasonLabel(locale, ev.reason), tone: 'danger' });
  if (ev.startDate) {
    tags.push({
      label: `${t(locale, 'recruiting.startDateLabel')}: ${ev.startDate}`,
      tone: 'default',
    });
  }
  if (ev.topType != null) tags.push({ label: `T${ev.topType}`, tone: 'accent' });
  if (ev.toStage) tags.push({ label: pipelineLabel(locale, ev.toStage), tone: 'stage' });
  return tags;
}

/**
 * Linha do tempo horizontal do candidato (cards + ícones por evento).
 * Inspirada em timelines com eixo e cards — adaptada ao painel (scroll horizontal).
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
    <div
      style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        paddingBottom: '6px',
        margin: '0 -4px',
      }}
    >
      <ol
        style={{
          listStyle: 'none',
          margin: 0,
          padding: '8px 4px 4px',
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
          minWidth: 'min-content',
        }}
      >
        {events.map((ev, i) => {
          const { icon, color } = metaForEvent(ev);
          const title = eventTitle(ev, locale);
          const tags = eventTags(ev, locale);
          const isLast = i === events.length - 1;

          return (
            <li
              key={`${ev.type}-${ev.at || i}-${i}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '200px',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              {/* eixo + nó */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '40px',
                  marginBottom: '10px',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: isLast ? '50%' : 0,
                    top: '50%',
                    height: '2px',
                    background: C.border,
                    transform: 'translateY(-50%)',
                  }}
                />
                {i > 0 ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      width: '50%',
                      top: '50%',
                      height: '2px',
                      background: C.border,
                      transform: 'translateY(-50%)',
                    }}
                  />
                ) : null}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: color,
                    color: '#fff',
                    boxShadow: `0 0 0 4px ${C.surface || '#fff'}, 0 2px 8px ${color}44`,
                    zIndex: 1,
                    position: 'relative',
                  }}
                >
                  {icon}
                </div>
              </div>

              {/* card */}
              <div
                style={{
                  margin: '0 8px',
                  borderRadius: '12px',
                  border: `1px solid ${C.border}`,
                  background: '#fff',
                  boxShadow: '0 4px 14px rgba(26,22,37,.06)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '140px',
                  flex: 1,
                }}
              >
                <div
                  style={{
                    padding: '8px 10px',
                    background: 'rgba(26,22,37,.04)',
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: '11px',
                    fontFamily: FONTS.mono,
                    color: C.muted,
                    textAlign: 'center',
                  }}
                >
                  {formatAt(ev.at, locale)}
                </div>
                <div style={{ padding: '12px 12px 10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: C.text,
                      lineHeight: 1.35,
                      textAlign: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    {title}
                  </div>
                  {tags.length ? (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        justifyContent: 'center',
                        marginTop: 'auto',
                      }}
                    >
                      {tags.map((tag) => (
                        <span
                          key={`${tag.label}-${tag.tone}`}
                          style={{
                            fontSize: '10px',
                            fontFamily: FONTS.mono,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            background: tag.tone === 'danger' ? `${C.tension}14` : `${color}14`,
                            color: tag.tone === 'danger' ? C.tension : color,
                            border: `1px solid ${tag.tone === 'danger' ? `${C.tension}33` : `${color}33`}`,
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
