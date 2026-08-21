'use client';

import { useState } from 'react';
import { t } from '../../../lib/i18n';
import { getTypeData } from '../../../lib/i18n-data';
import { typeFullName, typeShortLabel } from '../../../lib/type-en';
import { C, FONTS } from '../../../lib/theme';
import { S } from '../dashboard-shared';

const SECTIONS = [
  'welcome',
  'navigation',
  'links',
  'flow',
  'enneagram',
  'vacancies',
  'candidates',
  'pipeline',
  'team',
  'people',
  'report',
  'motivators',
  'access',
  'tips',
];

function TypeCatalog({ locale }) {
  const typeData = getTypeData(locale);
  return (
    <div style={{ marginTop: '18px' }}>
      <p style={{ margin: '0 0 12px', fontSize: '13px', color: C.muted, lineHeight: 1.65 }}>
        {t(locale, 'panel.help.typesCatalogIntro')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const d = typeData[n];
          if (!d) return null;
          return (
            <article
              key={n}
              style={{
                border: `1px solid ${d.color}33`,
                borderLeft: `4px solid ${d.color}`,
                borderRadius: '12px',
                padding: '14px 16px',
                background: `${d.color}08`,
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'baseline', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px', lineHeight: 1 }}>{d.emoji}</span>
                <span style={{ fontSize: '15px', color: C.text, fontFamily: "'Georgia',serif" }}>
                  T{n} · {typeFullName(n, locale)}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontFamily: FONTS.mono,
                  color: d.color,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  border: `1px solid ${d.color}44`,
                  background: `${d.color}14`,
                }}
                >
                  {typeShortLabel(n, locale)}
                </span>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '13px', color: C.text, lineHeight: 1.6 }}>{d.desc}</p>
              <p style={{ margin: '0 0 10px', fontSize: '13px', color: C.muted, lineHeight: 1.65 }}>
                <strong style={{ color: C.text, fontWeight: 600 }}>{t(locale, 'panel.help.typesAtWork')}.</strong>
                {' '}
                {t(locale, `panel.help.typeAtWork${n}`)}
              </p>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: C.muted, lineHeight: 1.65 }}>
                <strong style={{ color: C.text, fontWeight: 600 }}>{t(locale, 'panel.help.typesWatch')}.</strong>
                {' '}
                {t(locale, `panel.help.typeWatch${n}`)}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                <span style={{
                  fontSize: '10px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontFamily: FONTS.mono,
                  color: C.faint,
                  width: '100%',
                }}
                >
                  {t(locale, 'panel.help.typesStrengths')}
                </span>
                {d.strengths.map((s) => (
                  <span
                    key={s}
                    style={{
                      padding: '3px 10px',
                      fontSize: '11px',
                      borderRadius: '20px',
                      background: `${d.color}18`,
                      border: `1px solid ${d.color}35`,
                      color: d.color,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: C.muted, lineHeight: 1.55, fontStyle: 'italic' }}>
                {t(locale, 'panel.help.typesChallenge')}: {d.challenge}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: C.muted, lineHeight: 1.55 }}>
                <strong style={{ color: C.text, fontWeight: 600 }}>{t(locale, 'panel.help.typesTeam')}.</strong>
                {' '}
                {d.team}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

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
    welcome: 4,
    navigation: 6,
    links: 8,
    flow: 0,
    enneagram: 7,
    vacancies: 6,
    candidates: 5,
    pipeline: 6,
    team: 6,
    people: 6,
    report: 5,
    motivators: 7,
    access: 6,
    tips: 8,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ ...S.card, padding: '22px 28px' }}>
        <span style={S.label}>{t(locale, 'panel.help.title')}</span>
        <p style={{ margin: '10px 0 0', fontSize: '14px', color: C.muted, lineHeight: 1.65 }}>
          {t(locale, 'panel.help.intro')}
        </p>
        <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <LinkBtn label={t(locale, 'panel.help.linkOverview')} onClick={() => go('overview')} />
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
                {key === 'enneagram' ? <TypeCatalog locale={locale} /> : null}
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
