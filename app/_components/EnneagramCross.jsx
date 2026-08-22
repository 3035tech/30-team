'use client';

import { buildEnneagramCross } from '../../lib/enneagram-cross';
import { t } from '../../lib/i18n';
import { typeHintTooltip, typeShortLabel } from '../../lib/type-en';
import { C, FONTS } from '../../lib/theme';

function levelColor(level) {
  if (level === 'synergy') return C.synergy;
  if (level === 'tension') return C.warning;
  return C.info;
}

function levelKey(level) {
  if (level === 'synergy') return 'candidate.crossLevelSynergy';
  if (level === 'tension') return 'candidate.crossLevelTension';
  return 'candidate.crossLevelNeutral';
}

const labelStyle = {
  fontSize: '11px',
  letterSpacing: '2.5px',
  textTransform: 'uppercase',
  color: `${C.purple}8C`,
  fontFamily: FONTS.mono,
  marginBottom: '8px',
  display: 'block',
};

function TypeChip({ type, locale, typeData }) {
  const d = typeData[type];
  if (!d) return null;
  const tip = typeHintTooltip(type, locale);
  return (
    <span
      title={tip}
      aria-label={tip}
      style={{
        padding: '3px 10px',
        fontSize: '12px',
        borderRadius: '20px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: `${d.color}18`,
        border: `1px solid ${d.color}44`,
        color: d.color,
        fontFamily: 'monospace',
        cursor: 'help',
      }}
    >
      {d.emoji} {typeShortLabel(type, locale)}
    </span>
  );
}

function BlendCard({ pair, locale }) {
  const { blend, a, b } = pair;
  const color = levelColor(blend.level);
  return (
    <div
      style={{
        background: `${color}0c`,
        border: `1px solid ${color}28`,
        borderRadius: '10px',
        padding: '12px 14px',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', color: C.text, fontWeight: 500 }}>
          {t(locale, 'candidate.crossPairLabel', { a: a.type, b: b.type })}
          {' · '}
          {blend.title}
        </span>
        <span
          style={{
            fontSize: '10px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontFamily: FONTS.mono,
            padding: '2px 8px',
            borderRadius: '20px',
            background: `${color}18`,
            color,
          }}
        >
          {t(locale, levelKey(blend.level))}
        </span>
      </div>
      <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.65, margin: 0 }}>{blend.reading}</p>
    </div>
  );
}

/**
 * Combinations among T1–T9 types that sit close together in this result.
 */
export function EnneagramCross({ scores, locale, showChallenge = true }) {
  const cross = buildEnneagramCross(scores, locale);
  if (!cross) return null;

  const { primary, secondary, cluster, close, typeData, strengths, challenge, pairs, teamCross } = cross;
  const primaryData = typeData[primary.type];
  const clusterLabels = cluster.map((item) => typeShortLabel(item.type, locale)).join(', ');

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div>
          <span style={labelStyle}>{t(locale, 'candidate.strengths')}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {strengths.map((s) => {
              const d = typeData[s.type];
              return (
                <span
                  key={`${s.role}-${s.type}-${s.text}`}
                  title={s.role !== 'primary' ? t(locale, 'candidate.strengthFromType', { type: s.type }) : undefined}
                  style={{
                    padding: '3px 10px',
                    background: `${d.color}15`,
                    border: `1px solid ${d.color}35`,
                    borderRadius: '20px',
                    fontSize: '11px',
                    color: d.color,
                    opacity: s.role === 'primary' ? 1 : 0.92,
                  }}
                >
                  {s.text}
                </span>
              );
            })}
          </div>
        </div>
        <div>
          <span style={labelStyle}>
            {close ? t(locale, 'candidate.combinedProfile') : t(locale, 'candidate.wing')}
          </span>
          {close ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              {cluster.map((item) => (
                <TypeChip key={item.type} type={item.type} locale={locale} typeData={typeData} />
              ))}
            </div>
          ) : secondary ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <TypeChip type={secondary.type} locale={locale} typeData={typeData} />
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '12px', color: C.faint, fontStyle: 'italic' }}>
              {t(locale, 'candidate.crossNoSecondary')}
            </p>
          )}
        </div>
      </div>

      {pairs.length > 0 ? (
        <div style={{ marginBottom: '16px' }}>
          <span style={labelStyle}>{t(locale, 'candidate.crossTitle')}</span>
          <p style={{ fontSize: '12px', color: C.faint, lineHeight: 1.55, margin: '0 0 10px' }}>
            {cluster.length > 2
              ? t(locale, 'candidate.crossNoteCluster', { list: clusterLabels })
              : t(locale, 'candidate.crossNoteClose', {
                  a: typeShortLabel(cluster[0].type, locale),
                  b: typeShortLabel(cluster[1].type, locale),
                })}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pairs.map((pair) => (
              <BlendCard
                key={`${pair.a.type}-${pair.b.type}`}
                pair={pair}
                locale={locale}
              />
            ))}
          </div>
        </div>
      ) : secondary ? (
        <p style={{ fontSize: '12px', color: C.faint, lineHeight: 1.55, margin: '0 0 16px' }}>
          {t(locale, 'candidate.crossNoteWing', {
            main: typeShortLabel(primary.type, locale),
            wing: typeShortLabel(secondary.type, locale),
          })}
        </p>
      ) : null}

      {showChallenge && challenge ? (
        <div style={{ marginBottom: '16px' }}>
          <span style={labelStyle}>{t(locale, 'candidate.challenge')}</span>
          <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.65, fontStyle: 'italic', margin: 0 }}>
            “{challenge}”
          </p>
        </div>
      ) : null}

      <div
        style={{
          background: `${primaryData.color}0a`,
          border: `1px solid ${primaryData.color}20`,
          borderRadius: '10px',
          padding: '14px 16px',
          marginBottom: '16px',
        }}
      >
        <span style={{ ...labelStyle, marginBottom: '6px', color: `${primaryData.color}70` }}>
          {t(locale, 'candidate.teamContribution')}
        </span>
        <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.65, margin: 0 }}>{teamCross}</p>
      </div>
    </div>
  );
}
