'use client';

import { useState } from 'react';
import { t } from '../../../lib/i18n';
import { C } from '../../../lib/theme';
import { S } from '../dashboard-shared';

const SECTIONS = [
  'welcome',
  'links',
  'flow',
  'enneagram',
  'vacancies',
  'candidates',
  'pipeline',
  'team',
  'report',
  'motivators',
  'tips',
];

function StepList({ locale, sectionKey, count }) {
  const items = [];
  for (let i = 1; i <= count; i += 1) {
    items.push(t(locale, `panel.help.${sectionKey}Step${i}`));
  }
  return (
    <ol style={{ margin: '12px 0 0', paddingLeft: '20px', color: C.muted, fontSize: '13px', lineHeight: 1.7 }}>
      {items.map((text) => (
        <li key={text} style={{ marginBottom: '6px' }}>{text}</li>
      ))}
    </ol>
  );
}

function FlowStrip({ locale }) {
  const steps = [
    t(locale, 'panel.help.flowChip1'),
    t(locale, 'panel.help.flowChip2'),
    t(locale, 'panel.help.flowChip3'),
    t(locale, 'panel.help.flowChip4'),
    t(locale, 'panel.help.flowChip5'),
    t(locale, 'panel.help.flowChip6'),
    t(locale, 'panel.help.flowChip7'),
  ];
  return (
    <div style={{
      marginTop: '14px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      alignItems: 'center',
    }}
    >
      {steps.map((label, i) => (
        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '11px',
            fontFamily: 'monospace',
            padding: '6px 10px',
            borderRadius: '999px',
            border: `1px solid ${C.border}`,
            background: 'rgba(26,22,37,.03)',
            color: C.text,
          }}
          >
            {label}
          </span>
          {i < steps.length - 1 ? (
            <span style={{ color: C.faint, fontFamily: 'monospace', fontSize: '12px' }}>→</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function LinkBtn({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: `${C.purple}12`,
        border: `1px solid ${C.purple}44`,
        borderRadius: '10px',
        padding: '8px 12px',
        color: C.purple,
        fontSize: '12px',
        cursor: 'pointer',
        fontFamily: 'monospace',
      }}
    >
      {label}
    </button>
  );
}

export function HelpTab({ locale = 'pt-BR', navigateDashboard }) {
  const [open, setOpen] = useState('welcome');

  const go = (tab) => {
    if (typeof navigateDashboard === 'function') navigateDashboard({ tab });
  };

  const stepCounts = {
    welcome: 3,
    links: 8,
    flow: 0,
    enneagram: 6,
    vacancies: 5,
    candidates: 5,
    pipeline: 5,
    team: 5,
    report: 5,
    motivators: 7,
    tips: 6,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ ...S.card, padding: '22px 28px' }}>
        <span style={S.label}>{t(locale, 'panel.help.title')}</span>
        <p style={{ margin: '10px 0 0', fontSize: '14px', color: C.muted, lineHeight: 1.65 }}>
          {t(locale, 'panel.help.intro')}
        </p>
        <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <LinkBtn label={t(locale, 'panel.help.linkVacancies')} onClick={() => go('vacancies')} />
          <LinkBtn label={t(locale, 'panel.help.linkTeam')} onClick={() => go('team')} />
          <LinkBtn label={t(locale, 'panel.help.linkMotivators')} onClick={() => go('motivators')} />
        </div>
      </div>

      {SECTIONS.map((key) => {
        const isOpen = open === key;
        return (
          <div key={key} style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? '' : key)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: isOpen ? `${C.purple}0a` : 'transparent',
                border: 'none',
                padding: '16px 20px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '15px', color: C.text, fontFamily: "'Georgia',serif" }}>
                {t(locale, `panel.help.${key}Title`)}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '12px', color: C.muted }}>
                {isOpen ? '▲' : '▼'}
              </span>
            </button>
            {isOpen ? (
              <div style={{ padding: '0 20px 18px', borderTop: `1px solid ${C.border}` }}>
                <p style={{ margin: '14px 0 0', fontSize: '13px', color: C.muted, lineHeight: 1.65 }}>
                  {t(locale, `panel.help.${key}Body`)}
                </p>
                {key === 'flow' ? <FlowStrip locale={locale} /> : null}
                {stepCounts[key] > 0 ? (
                  <StepList locale={locale} sectionKey={key} count={stepCounts[key]} />
                ) : null}
                {key === 'flow' ? (
                  <p style={{ margin: '12px 0 0', fontSize: '12px', color: C.faint, fontFamily: 'monospace', lineHeight: 1.6 }}>
                    {t(locale, 'panel.help.flowAlt')}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
