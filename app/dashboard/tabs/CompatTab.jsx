'use client';

import { useState } from 'react';
import { TYPE_DATA } from '../../../lib/data';
import { PAGE_SIZE_OPTIONS } from '../../../lib/assessment-filters';
import { t } from '../../../lib/i18n';
import { personListName } from '../../../lib/person-name';
import { C } from '../../../lib/theme';
import { CompatBadge, S, TypeBadge } from '../dashboard-shared';

function PersonCard({ person, locale }) {
  const d = TYPE_DATA[person.topType] || {};
  return (
    <div
      style={{
        background: 'rgba(26,22,37,.03)',
        border: `1px solid ${C.border}`,
        borderRadius: '12px',
        padding: '14px',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{ fontSize: '22px', flexShrink: 0 }}>{d.emoji || '·'}</div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '13px',
              color: C.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={person.name}
          >
            {personListName(person.name)}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
            <TypeBadge type={person.topType} locale={locale} />
            {person.areaLabel ? (
              <span
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  borderRadius: '20px',
                  background: 'rgba(26,22,37,.04)',
                  border: `1px solid ${C.border}`,
                  color: C.muted,
                  fontFamily: 'monospace',
                }}
              >
                {person.areaLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {d.team ? (
        <p style={{ fontSize: '12px', color: C.faint, lineHeight: 1.55, margin: 0 }}>{d.team}</p>
      ) : null}
    </div>
  );
}

function Glossary({ locale }) {
  const items = [
    { level: 'tension', color: C.tension, titleKey: 'panel.compat.glossTensionTitle', bodyKey: 'panel.compat.glossTensionBody' },
    { level: 'synergy', color: C.synergy, titleKey: 'panel.compat.glossSynergyTitle', bodyKey: 'panel.compat.glossSynergyBody' },
    { level: 'neutral', color: C.neutral, titleKey: 'panel.compat.glossNeutralTitle', bodyKey: 'panel.compat.glossNeutralBody' },
  ];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10px',
        marginBottom: '16px',
      }}
    >
      {items.map((item) => (
        <div
          key={item.level}
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            border: `1px solid ${item.color}35`,
            background: `${item.color}0a`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <CompatBadge level={item.level} locale={locale} />
            <span style={{ fontSize: '12px', color: item.color, fontFamily: 'monospace' }}>
              {t(locale, item.titleKey)}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: C.muted, lineHeight: 1.55 }}>
            {t(locale, item.bodyKey)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function CompatTab({
  tensions,
  synergies,
  pairs,
  compatPage = 1,
  compatPageSize = 20,
  onCompatPagination,
  locale = 'pt-BR',
}) {
  const [section, setSection] = useState('tensions');
  const [adviceOpen, setAdviceOpen] = useState(false);

  const goSection = (id) => {
    setSection(id);
    if (onCompatPagination) onCompatPagination({ page: 1, pageSize: compatPageSize });
  };

  const SecBtn = ({ id, label, count, color }) => (
    <button
      type="button"
      onClick={() => goSection(id)}
      style={{
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: section === id ? `${color}20` : 'rgba(26,22,37,.04)',
        border: `1px solid ${section === id ? color : C.border}`,
        borderRadius: '10px',
        color: section === id ? color : C.muted,
        fontSize: '12px',
        cursor: 'pointer',
        fontFamily: 'monospace',
      }}
    >
      {label}{' '}
      <span style={{ background: `${color}30`, padding: '1px 7px', borderRadius: '10px', fontSize: '11px' }}>{count}</span>
    </button>
  );

  const summaryCards = [
    {
      id: 'tensions',
      l: t(locale, 'panel.compat.cardTensionPairs'),
      n: tensions.length,
      c: C.tension,
      d: t(locale, 'panel.compat.cardTensionHint'),
      action: t(locale, 'panel.compat.cardTensionAction'),
    },
    {
      id: 'synergies',
      l: t(locale, 'panel.compat.cardSynergyPairs'),
      n: synergies.length,
      c: C.synergy,
      d: t(locale, 'panel.compat.cardSynergyHint'),
      action: t(locale, 'panel.compat.cardSynergyAction'),
    },
    {
      id: 'all',
      l: t(locale, 'panel.compat.cardTotalPairs'),
      n: pairs.length,
      c: C.purpleLight,
      d: t(locale, 'panel.compat.cardTotalHint'),
      action: t(locale, 'panel.compat.cardTotalAction'),
    },
  ];

  const display = section === 'tensions' ? tensions : section === 'synergies' ? synergies : pairs;
  const listLen = display.length;
  const totalPg = Math.max(1, Math.ceil(listLen / compatPageSize));
  const pg = Math.min(Math.max(1, compatPage || 1), totalPg);
  const sliced = listLen === 0 ? [] : display.slice((pg - 1) * compatPageSize, pg * compatPageSize);
  const topRisks = tensions.slice(0, 3);
  const topWins = synergies.slice(0, 3);

  const playbook =
    section === 'tensions'
      ? { title: t(locale, 'panel.compat.decisionTitle'), body: t(locale, 'panel.compat.tensionAdvice'), color: C.tension }
      : section === 'synergies'
        ? { title: t(locale, 'panel.compat.opportunityTitle'), body: t(locale, 'panel.compat.synergyAdvice'), color: C.synergy }
        : null;

  return (
    <div>
      <div style={{ ...S.card, padding: '22px 28px', marginBottom: '14px' }}>
        <span style={S.label}>{t(locale, 'dashboard.compatibility')}</span>
        <h2
          style={{
            margin: '8px 0 0',
            fontSize: '22px',
            fontWeight: 'normal',
            fontFamily: "'Georgia',serif",
            color: C.text,
            lineHeight: 1.25,
          }}
        >
          {t(locale, 'panel.compat.headline')}
        </h2>
        <p style={{ fontSize: '14px', color: C.muted, margin: '10px 0 0', lineHeight: 1.65, maxWidth: '64ch' }}>
          {t(locale, 'panel.compat.intro')}
        </p>
        <p style={{ fontSize: '12px', color: C.faint, margin: '12px 0 0', lineHeight: 1.55 }}>
          {t(locale, 'panel.compat.methodologyBody')}
        </p>
      </div>

      <Glossary locale={locale} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {summaryCards.map((x) => {
          const active = section === x.id;
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => goSection(x.id)}
              style={{
                textAlign: 'left',
                background: C.card,
                border: `1px solid ${active ? x.c : `${x.c}25`}`,
                borderRadius: '14px',
                padding: '18px 20px',
                cursor: 'pointer',
                boxShadow: active ? `0 0 0 2px ${x.c}22` : 'none',
              }}
            >
              <div style={{ fontSize: '28px', color: x.c, marginBottom: '4px', fontFamily: "'Georgia',serif" }}>{x.n}</div>
              <div
                style={{
                  fontSize: '11px',
                  color: C.muted,
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '6px',
                }}
              >
                {x.l}
              </div>
              <div style={{ fontSize: '12px', color: C.faint, marginBottom: '10px' }}>{x.d}</div>
              <div style={{ fontSize: '11px', color: x.c, fontFamily: 'monospace' }}>{x.action}</div>
            </button>
          );
        })}
      </div>

      {section === 'tensions' && topRisks.length > 0 ? (
        <div
          style={{
            ...S.card,
            marginBottom: '14px',
            border: `1px solid ${C.tension}30`,
            background: 'rgba(232,71,71,.04)',
          }}
        >
          <span style={{ ...S.label, color: C.tension }}>{t(locale, 'panel.compat.topRisksTitle')}</span>
          <p style={{ fontSize: '13px', color: C.muted, margin: '8px 0 14px', lineHeight: 1.55 }}>
            {t(locale, 'panel.compat.topRisksIntro')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topRisks.map((pair, i) => (
              <div
                key={`risk-${pair.a?.assessmentId}-${pair.b?.assessmentId}-${i}`}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: C.card,
                  border: `1px solid ${C.border}`,
                }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: C.tension, minWidth: '18px' }}>
                  {i + 1}.
                </span>
                <span style={{ fontSize: '13px', color: C.text }}>
                  {personListName(pair.a.name)} × {personListName(pair.b.name)}
                </span>
                <TypeBadge type={pair.a.topType} locale={locale} />
                <TypeBadge type={pair.b.topType} locale={locale} />
                <span style={{ fontSize: '12px', color: C.muted, flex: '1 1 160px' }}>{pair.compat.title}</span>
                <span style={{ fontSize: '12px', color: C.tension, fontFamily: 'monospace' }}>
                  {t(locale, 'panel.compat.topRiskNext')}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {section === 'synergies' && topWins.length > 0 ? (
        <div
          style={{
            ...S.card,
            marginBottom: '14px',
            border: `1px solid ${C.synergy}30`,
            background: 'rgba(71,232,123,.04)',
          }}
        >
          <span style={{ ...S.label, color: C.synergy }}>{t(locale, 'panel.compat.topWinsTitle')}</span>
          <p style={{ fontSize: '13px', color: C.muted, margin: '8px 0 14px', lineHeight: 1.55 }}>
            {t(locale, 'panel.compat.topWinsIntro')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topWins.map((pair, i) => (
              <div
                key={`win-${pair.a?.assessmentId}-${pair.b?.assessmentId}-${i}`}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: C.card,
                  border: `1px solid ${C.border}`,
                }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: C.synergy, minWidth: '18px' }}>
                  {i + 1}.
                </span>
                <span style={{ fontSize: '13px', color: C.text }}>
                  {personListName(pair.a.name)} × {personListName(pair.b.name)}
                </span>
                <TypeBadge type={pair.a.topType} locale={locale} />
                <TypeBadge type={pair.b.topType} locale={locale} />
                <span style={{ fontSize: '12px', color: C.muted, flex: '1 1 160px' }}>{pair.compat.title}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <SecBtn id="tensions" label={t(locale, 'panel.compat.tabTensions')} count={tensions.length} color={C.tension} />
        <SecBtn id="synergies" label={t(locale, 'panel.compat.tabSynergies')} count={synergies.length} color={C.synergy} />
        <SecBtn id="all" label={t(locale, 'panel.compat.tabAll')} count={pairs.length} color={C.purpleLight} />
      </div>

      {playbook ? (
        <div
          style={{
            marginBottom: '14px',
            borderRadius: '12px',
            border: `1px solid ${playbook.color}30`,
            background: `${playbook.color}08`,
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => setAdviceOpen((v) => !v)}
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              padding: '12px 16px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '12px', color: playbook.color, fontFamily: 'monospace' }}>
              {playbook.title} — {t(locale, 'panel.compat.playbookToggle')}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: C.muted }}>{adviceOpen ? '▲' : '▼'}</span>
          </button>
          {adviceOpen ? (
            <p style={{ margin: '0 16px 14px', fontSize: '13px', color: C.muted, lineHeight: 1.65 }}>{playbook.body}</p>
          ) : null}
        </div>
      ) : null}

      {display.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '40px' }}>
          <p style={{ color: C.muted, fontStyle: 'italic', margin: 0 }}>{t(locale, 'panel.compat.emptyCategory')}</p>
          <p style={{ color: C.faint, fontSize: '13px', margin: '10px 0 0', lineHeight: 1.55 }}>
            {t(locale, 'panel.compat.emptyHint')}
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '12px', color: C.faint, margin: '0 0 12px', fontFamily: 'monospace' }}>
            {t(locale, 'panel.compat.listHint')}
          </p>
          {sliced.map((pair, i) => {
            const { a, b, compat } = pair;
            const pairKey = `${String(a?.assessmentId ?? 'a')}_${String(b?.assessmentId ?? 'b')}_${i}`;
            const lc = { synergy: C.synergy, tension: C.tension, neutral: C.neutral }[compat.level];

            return (
              <div
                key={pairKey}
                style={{
                  background: C.card,
                  border: `1px solid ${lc}30`,
                  borderRadius: '14px',
                  padding: '18px',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: lc,
                        fontFamily: 'monospace',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                      }}
                    >
                      {compat.title}
                    </div>
                    <div style={{ fontSize: '11px', color: C.faint }}>
                      {t(locale, 'panel.compat.whyLabel')}
                    </div>
                  </div>
                  <CompatBadge level={compat.level} locale={locale} />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 40px 1fr',
                    gap: '10px',
                    alignItems: 'stretch',
                  }}
                >
                  <PersonCard person={a} locale={locale} />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: C.faint,
                      fontFamily: 'monospace',
                      fontSize: '16px',
                    }}
                  >
                    ×
                  </div>
                  <PersonCard person={b} locale={locale} />
                </div>

                <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.65, margin: '14px 0 0' }}>{compat.desc}</p>
              </div>
            );
          })}
          {onCompatPagination && listLen > 0 ? (
            <div
              style={{
                ...S.card,
                padding: '12px 18px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '12px',
                justifyContent: 'space-between',
                marginTop: '8px',
              }}
            >
              <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
                {t(locale, 'panel.compat.pairsPage', { page: pg, total: totalPg })}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <select
                  value={String(compatPageSize)}
                  onChange={(e) => {
                    const ps = parseInt(e.target.value, 10);
                    onCompatPagination({ page: 1, pageSize: ps });
                  }}
                  style={{
                    background: 'rgba(26,22,37,.05)',
                    border: `1px solid ${C.border}`,
                    borderRadius: '10px',
                    padding: '6px 10px',
                    color: C.muted,
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={String(n)}>
                      {t(locale, 'panel.compat.perPageShort', { n })}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={pg <= 1}
                  onClick={() => onCompatPagination({ page: pg - 1, pageSize: compatPageSize })}
                  style={{
                    background: pg <= 1 ? 'transparent' : `${C.purple}18`,
                    border: `1px solid ${pg <= 1 ? C.border : `${C.purple}55`}`,
                    borderRadius: '10px',
                    padding: '6px 12px',
                    color: pg <= 1 ? C.faint : C.purple,
                    fontSize: '11px',
                    cursor: pg <= 1 ? 'default' : 'pointer',
                    fontFamily: 'monospace',
                  }}
                >
                  {t(locale, 'dashboard.previous')}
                </button>
                <button
                  type="button"
                  disabled={pg >= totalPg}
                  onClick={() => onCompatPagination({ page: pg + 1, pageSize: compatPageSize })}
                  style={{
                    background: pg >= totalPg ? 'transparent' : `${C.purple}18`,
                    border: `1px solid ${pg >= totalPg ? C.border : `${C.purple}55`}`,
                    borderRadius: '10px',
                    padding: '6px 12px',
                    color: pg >= totalPg ? C.faint : C.purple,
                    fontSize: '11px',
                    cursor: pg >= totalPg ? 'default' : 'pointer',
                    fontFamily: 'monospace',
                  }}
                >
                  {t(locale, 'dashboard.next')}
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
