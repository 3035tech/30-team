'use client';

import { useState } from 'react';
import { getTypeData } from '../../lib/i18n-data';
import { rankEnneagramScores } from '../../lib/enneagram-cross';
import { t } from '../../lib/i18n';
import { typeShortLabel } from '../../lib/type-en';
import { C, FONTS } from '../../lib/theme';

function MiniBar({ value, max, color, h = 6 }) {
  return (
    <div style={{ width: '100%', height: h, background: 'rgba(26,22,37,.08)', borderRadius: h / 2, overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${(value / Math.max(max, 1)) * 100}%`,
          background: color,
          borderRadius: h / 2,
        }}
      />
    </div>
  );
}

/**
 * T1–T9 score chart with type names and expandable characteristics.
 */
export function TypeScoreChart({ scores, locale, highlightTypes }) {
  const typeData = getTypeData(locale);
  const ranked = rankEnneagramScores(scores);
  const maxS = ranked[0]?.score || 1;
  const [openType, setOpenType] = useState(null);
  const cluster = highlightTypes instanceof Set ? highlightTypes : null;

  return (
    <div>
      <p style={{ margin: '0 0 10px', fontSize: '12px', color: C.faint, lineHeight: 1.5 }}>
        {t(locale, 'candidate.scoreChartHint')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {ranked.map(({ type, score }) => {
          const d = typeData[type];
          if (!d) return null;
          const highlight = cluster && cluster.size > 1 ? cluster.has(type) : ranked[0]?.type === type;
          const expanded = openType === type;
          const short = typeShortLabel(type, locale);
          return (
            <button
              key={type}
              type="button"
              onClick={() => setOpenType(expanded ? null : type)}
              aria-expanded={expanded}
              title={t(locale, 'candidate.scoreChartToggle')}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                border: expanded ? `1px solid ${d.color}55` : `1px solid ${C.border}`,
                background: expanded ? `${d.color}0c` : highlight ? `${d.color}08` : 'transparent',
                borderRadius: '10px',
                padding: '10px 12px',
                opacity: highlight ? 1 : 0.78,
                fontFamily: FONTS.serif,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: d.color, fontWeight: 600, minWidth: 0 }}>
                  {d.emoji}{' '}
                  <span style={{ fontFamily: FONTS.mono, fontSize: '11px', letterSpacing: '0.04em' }}>T{type}</span>
                  {' · '}
                  {short}
                </span>
                <span style={{ fontSize: '12px', color: C.text, fontFamily: FONTS.mono, flexShrink: 0 }}>{score}</span>
              </div>
              <p style={{ margin: '4px 0 8px', fontSize: '12px', color: C.muted, lineHeight: 1.45 }}>
                {d.team}
              </p>
              <MiniBar value={score} max={maxS} color={d.color} h={highlight ? 7 : 5} />
              {expanded ? (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${d.color}33` }}>
                  <p style={{ margin: '0 0 8px', fontSize: '13px', color: C.text, lineHeight: 1.6 }}>{d.desc}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {d.strengths.map((s) => (
                      <span
                        key={s}
                        style={{
                          padding: '2px 8px',
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
                  <p style={{ margin: 0, fontSize: '12px', color: C.muted, fontStyle: 'italic', lineHeight: 1.5 }}>
                    {t(locale, 'candidate.challenge')}: {d.challenge}
                  </p>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
