'use client';

import { TYPE_DATA } from '../../../lib/data';
import { t } from '../../../lib/i18n';
import { typeShortLabel, typeTitleTooltip } from '../../../lib/type-en';
import { C } from '../../../lib/theme';
import { Bar, S, TypeBadge } from '../dashboard-shared';

const BAND_KEYS = {
  standout: 'bandStandout',
  strong: 'bandStrong',
  moderate: 'bandModerate',
  explore: 'bandExplore',
};

function bandLabel(locale, band) {
  const k = BAND_KEYS[band];
  return k ? t(locale, `panel.leadership.${k}`) : band || t(locale, 'panel.common.notApplicable');
}

export function LeadershipTab({ analytics, locale = 'pt-BR' }) {
  const hasData = analytics && analytics.kpis && analytics.kpis.assessments > 0;
  if (!hasData) {
    return (
      <div style={{ ...S.card, textAlign: 'center', padding: '48px' }}>
        <span style={S.label}>{t(locale, 'panel.leadership.emptyTitle')}</span>
        <p style={{ color: C.muted, fontSize: '14px', marginTop: '12px', lineHeight: 1.6 }}>
          {t(locale, 'panel.leadership.emptyBody')}
        </p>
      </div>
    );
  }

  const { kpis, monthlyTrend, globalTopTypeCounts: gCounts, globalTotal, areaSummaries, leadershipPotentials = [] } = analytics;
  const maxMonthly = Math.max(...monthlyTrend.map((m) => m.cnt), 1);
  const maxG = Math.max(...Object.values(gCounts), 1);
  const gTot = globalTotal || 1;

  const Kpi = ({ icon, value, label, hint }) => (
    <div style={{ ...S.card, padding: '22px' }}>
      <div style={{ fontSize: '22px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '28px', color: C.purpleLight, fontFamily: 'monospace', marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
      {hint && <div style={{ fontSize: '11px', color: C.faint, marginTop: '8px', lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );

  const tableHeaders = [
    t(locale, 'panel.leadership.tablePerson'),
    t(locale, 'panel.leadership.tableDominant'),
    t(locale, 'panel.leadership.tableIndicator'),
    t(locale, 'panel.leadership.tableBand'),
  ];

  const execHeaders = [
    t(locale, 'panel.leadership.execColArea'),
    t(locale, 'panel.leadership.execColN'),
    t(locale, 'panel.leadership.execColDominant'),
    t(locale, 'panel.leadership.execColDiversity'),
    t(locale, 'panel.leadership.execColFit'),
    t(locale, 'panel.leadership.execColRubricTop'),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...S.card, padding: '22px 28px' }}>
        <span style={S.label}>{t(locale, 'panel.leadership.title')}</span>
        <p style={{ fontSize: '13px', color: C.muted, marginTop: '10px', lineHeight: 1.65, marginBottom: 0 }}>
          {t(locale, 'panel.leadership.intro')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <Kpi icon="📊" value={kpis.assessments} label={t(locale, 'panel.leadership.kpiAssessments')} hint={t(locale, 'panel.leadership.kpiAssessmentsHint')} />
        <Kpi icon="👤" value={kpis.candidates} label={t(locale, 'panel.leadership.kpiCandidates')} hint={t(locale, 'panel.leadership.kpiCandidatesHint')} />
        <Kpi icon="🏢" value={kpis.areasActive} label={t(locale, 'panel.leadership.kpiAreas')} hint={t(locale, 'panel.leadership.kpiAreasHint')} />
      </div>

      {leadershipPotentials.length > 0 ? (
        <div style={{ ...S.card }}>
          <span style={S.label}>{t(locale, 'panel.leadership.potentialsTitle')}</span>
          <p style={{ fontSize: '12px', color: C.faint, marginTop: '8px', marginBottom: '18px', lineHeight: 1.65 }}>
            {t(locale, 'panel.leadership.potentialsIntro')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {leadershipPotentials.map((co) => (
              <div
                key={String(co.companyId)}
                style={{
                  background: 'rgba(26,22,37,.03)',
                  border: `1px solid ${C.border}`,
                  borderRadius: '12px',
                  padding: '16px 18px',
                }}
              >
                <div style={{ fontSize: '13px', color: C.text, marginBottom: '12px', fontFamily: 'monospace' }}>
                  {co.companyName}
                  <span style={{ color: C.faint, marginLeft: '8px' }}>#{co.companyId}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '420px' }}>
                    <thead>
                      <tr>
                        {tableHeaders.map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: 'left',
                              padding: '8px 10px',
                              color: C.muted,
                              fontWeight: 'normal',
                              fontFamily: 'monospace',
                              borderBottom: `1px solid ${C.border}`,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {co.people.map((p) => (
                        <tr key={`${co.companyId}-${p.candidateId}`} style={{ borderBottom: '1px solid rgba(26,22,37,.07)' }}>
                          <td style={{ padding: '10px', color: C.text, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.name}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <TypeBadge type={p.topType} locale={locale} />
                          </td>
                          <td
                            style={{ padding: '10px', color: C.purpleLight, fontFamily: 'monospace' }}
                            title={t(locale, 'panel.leadership.scoreTitleHint')}
                          >
                            {p.leadership010}/10
                          </td>
                          <td style={{ padding: '10px', color: C.muted, fontFamily: 'monospace' }}>
                            {bandLabel(locale, p.leadershipBand)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ ...S.card }}>
        <span style={S.label}>{t(locale, 'panel.leadership.monthlyTitle')}</span>
        <p style={{ fontSize: '11px', color: C.faint, marginTop: '6px', marginBottom: '16px' }}>
          {t(locale, 'panel.leadership.monthlyHint')}
        </p>
        {monthlyTrend.length === 0 ? (
          <p style={{ color: C.muted, fontStyle: 'italic', fontSize: '13px' }}>{t(locale, 'panel.leadership.noTimeSeries')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {monthlyTrend.map((m) => (
              <div key={m.period} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '72px', fontSize: '12px', color: C.muted, fontFamily: 'monospace', flexShrink: 0 }}>{m.period}</span>
                <div style={{ flex: 1 }}>
                  <Bar value={m.cnt} max={maxMonthly} color={C.purple} h={8} />
                </div>
                <span style={{ width: '36px', textAlign: 'right', fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>{m.cnt}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div style={{ ...S.card }}>
          <span style={S.label}>{t(locale, 'panel.leadership.globalDistTitle')}</span>
          <p style={{ fontSize: '11px', color: C.faint, marginTop: '6px', marginBottom: '14px' }}>
            {t(locale, 'panel.leadership.globalDistHint')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9]
              .filter((ty) => (gCounts[ty] || 0) > 0)
              .sort((a, b) => (gCounts[b] || 0) - (gCounts[a] || 0))
              .map((ty) => {
                const d = TYPE_DATA[ty];
                const c = gCounts[ty] || 0;
                const label = typeShortLabel(ty, locale);
                return (
                  <div key={ty} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      title={typeTitleTooltip(ty, locale)}
                      style={{
                        width: '160px',
                        fontSize: '12px',
                        color: d.color,
                        flexShrink: 0,
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span style={{ width: '22px', textAlign: 'center', flexShrink: 0 }}>{d.emoji}</span>
                      <span style={{ minWidth: 0 }}>{label}</span>
                    </span>
                    <div style={{ flex: 1 }}>
                      <Bar value={c} max={maxG} color={d.color} h={8} />
                    </div>
                    <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace', width: '28px', textAlign: 'right' }}>{c}</span>
                    <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace', width: '40px', textAlign: 'right' }}>
                      {Math.round((c / gTot) * 100)}%
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        <div style={{ ...S.card }}>
          <span style={S.label}>{t(locale, 'panel.leadership.diversityTitle')}</span>
          <p style={{ fontSize: '11px', color: C.faint, marginTop: '6px', marginBottom: '14px', lineHeight: 1.55 }}>
            {t(locale, 'panel.leadership.diversityHint')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {areaSummaries.map((row) => (
              <div key={row.areaKey} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ flex: '0 0 38%', fontSize: '12px', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.areaLabel}
                </span>
                <div style={{ flex: 1 }}>
                  <Bar value={row.diversity01} max={1} color={C.synergy} h={8} />
                </div>
                <span style={{ width: '44px', textAlign: 'right', fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
                  {Math.round(row.diversity01 * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...S.card, overflow: 'hidden' }}>
        <span style={S.label}>{t(locale, 'panel.leadership.execTableTitle')}</span>
        <div style={{ overflowX: 'auto', marginTop: '14px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '640px' }}>
            <thead>
              <tr>
                {execHeaders.map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      color: C.muted,
                      fontWeight: 'normal',
                      fontFamily: 'monospace',
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {areaSummaries.map((row) => (
                <tr key={row.areaKey} style={{ borderBottom: '1px solid rgba(26,22,37,.07)' }}>
                  <td style={{ padding: '10px 12px', color: C.text }}>{row.areaLabel}</td>
                  <td style={{ padding: '10px 12px', color: C.muted, fontFamily: 'monospace' }}>{row.n}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {row.dominantType ? <TypeBadge type={row.dominantType} locale={locale} /> : <span style={{ color: C.faint }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', color: C.muted, fontFamily: 'monospace' }}>
                    {Math.round(row.diversity01 * 100)}%
                  </td>
                  <td style={{ padding: '10px 12px', color: C.muted, fontFamily: 'monospace' }}>
                    {row.avgFit010 != null ? `${row.avgFit010}/10` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', color: C.muted, fontFamily: 'monospace' }}>
                    {row.rubricAlignPct != null ? `${row.rubricAlignPct}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '11px', color: C.faint, marginTop: '14px', lineHeight: 1.65, fontStyle: 'italic', marginBottom: 0 }}>
          {t(locale, 'panel.leadership.execFootnote')}
        </p>
      </div>
    </div>
  );
}
