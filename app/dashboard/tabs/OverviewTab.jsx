'use client';

import { TYPE_DATA } from '../../../lib/data';
import { t } from '../../../lib/i18n';
import { typeFullName, typeShortLabel } from '../../../lib/type-en';
import { rejectionReasonLabel } from '../pipeline-prompts';
import { C } from '../../../lib/theme';
import { OVERVIEW_FUNNEL_STAGES } from '../../../lib/overview-constants';
import { S } from '../dashboard-shared';

const FUNNEL_LABEL_KEYS = {
  new: 'recruiting.pipelineNew',
  test_completed: 'recruiting.pipelineTestCompleted',
  screening: 'recruiting.pipelineScreening',
  interview: 'recruiting.pipelineInterview',
  approved: 'recruiting.pipelineApproved',
  hired: 'recruiting.pipelineHired',
  rejected: 'recruiting.pipelineRejected',
  archived: 'recruiting.pipelineArchived',
};

const FUNNEL_COLORS = {
  new: 'rgba(26,22,37,.5)',
  test_completed: '#7C3AED',
  screening: '#0284c7',
  interview: '#d97706',
  approved: '#15803d',
  hired: '#0f766e',
  rejected: '#dc2626',
  archived: 'rgba(26,22,37,.35)',
};

const PRIORITY_STYLE = {
  high: { color: C.tension, bg: 'rgba(220,38,38,.08)', border: 'rgba(220,38,38,.25)' },
  medium: { color: '#d97706', bg: 'rgba(217,119,6,.08)', border: 'rgba(217,119,6,.25)' },
  low: { color: C.muted, bg: 'rgba(26,22,37,.04)', border: C.border },
};

function filterChips(locale, filters = {}) {
  const chips = [];
  if (filters.companyLabel) chips.push(filters.companyLabel);
  if (filters.area && filters.area !== 'all') chips.push(filters.areaLabel || filters.area);
  if (filters.vacancy && filters.vacancy !== 'all') chips.push(filters.vacancyLabel || filters.vacancy);
  if (filters.dateFrom || filters.dateTo) {
    chips.push(
      t(locale, 'panel.overview.dateRangeChip', {
        from: filters.dateFrom || '…',
        to: filters.dateTo || '…',
      })
    );
  }
  if (filters.search) chips.push(`"${filters.search}"`);
  return chips;
}

function StatTile({ value, label, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        textAlign: 'left',
        background: C.card,
        border: `1px solid ${color ? `${color}35` : C.border}`,
        borderRadius: '14px',
        padding: '16px 18px',
        cursor: onClick ? 'pointer' : 'default',
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: '26px', color: color || C.text, fontFamily: "'Georgia',serif", lineHeight: 1.1 }}>
        {value}
      </div>
      <div
        style={{
          marginTop: '6px',
          fontSize: '11px',
          color: C.muted,
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
        }}
      >
        {label}
      </div>
    </button>
  );
}

export function OverviewTab({
  overview = null,
  typeCount = {},
  distributionTotal = 0,
  locale = 'pt-BR',
  filters = {},
  navigateDashboard,
}) {
  const data = overview || {
    funnel: Object.fromEntries(OVERVIEW_FUNNEL_STAGES.map((s) => [s, 0])),
    funnelTotal: 0,
    hiredLast7d: 0,
    rejectedLast7d: 0,
    rejectionReasons: [],
    attention: [],
    vacancies: { openCount: 0, positionsOpen: 0, staleCount: 0, items: [] },
    typeMix: { typeCount, total: distributionTotal, dominantType: null },
  };

  const go = (opts) => {
    if (typeof navigateDashboard === 'function') navigateDashboard(opts);
  };

  const chips = filterChips(locale, filters);
  const funnelActive = OVERVIEW_FUNNEL_STAGES.filter((s) => (data.funnel[s] || 0) > 0);
  const funnelSum = Math.max(data.funnelTotal || 1, 1);
  const mixCount = data.typeMix?.typeCount || typeCount || {};
  const mixTotal = Math.max(
    data.typeMix?.total || 0,
    Object.values(mixCount).reduce((a, b) => a + (Number(b) || 0), 0),
    1
  );
  const mixEntries = Object.entries(mixCount)
    .map(([k, v]) => ({ type: parseInt(k, 10), n: Number(v) || 0 }))
    .filter((x) => x.n > 0 && x.type >= 1 && x.type <= 9)
    .sort((a, b) => b.n - a.n);
  const dominant = data.typeMix?.dominantType || mixEntries[0]?.type || null;
  const reasons = data.rejectionReasons || [];
  const maxReason = Math.max(...reasons.map((r) => r.n), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {data.error ? (
        <p style={{ ...S.muted, color: '#b91c1c', margin: 0 }}>{t(locale, 'panel.overview.loadError')}</p>
      ) : null}
      <div style={{ ...S.card, padding: '20px 24px' }}>
        <span style={S.label}>{t(locale, 'dashboard.overview')}</span>
        <h2
          style={{
            margin: '8px 0 0',
            fontSize: '22px',
            fontWeight: 'normal',
            fontFamily: "'Georgia',serif",
            color: C.text,
          }}
        >
          {t(locale, 'panel.overview.headline')}
        </h2>
        <p style={{ margin: '8px 0 0', fontSize: '13px', color: C.muted, lineHeight: 1.55, maxWidth: '62ch' }}>
          {t(locale, 'panel.overview.intro')}
        </p>
        {chips.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
            {chips.map((c) => (
              <span
                key={c}
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  border: `1px solid ${C.border}`,
                  color: C.muted,
                  background: 'rgba(26,22,37,.03)',
                }}
              >
                {c}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ margin: '10px 0 0', fontSize: '12px', color: C.faint, fontFamily: 'monospace' }}>
            {t(locale, 'panel.overview.noFilterChip')}
          </p>
        )}
      </div>

      <div>
        <span style={{ ...S.label, marginBottom: '10px', display: 'block' }}>
          {t(locale, 'panel.overview.funnelTitle')}
        </span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
          }}
        >
          {OVERVIEW_FUNNEL_STAGES.filter((s) => s !== 'archived' || (data.funnel.archived || 0) > 0).map((stage) => (
            <StatTile
              key={stage}
              value={data.funnel[stage] || 0}
              label={t(locale, FUNNEL_LABEL_KEYS[stage])}
              color={FUNNEL_COLORS[stage]}
              onClick={() => go({ tab: 'team', pipeline: stage })}
            />
          ))}
        </div>
        {funnelActive.length > 0 ? (
          <div style={{ marginTop: '12px' }}>
            <div
              style={{
                display: 'flex',
                height: '10px',
                borderRadius: '999px',
                overflow: 'hidden',
                border: `1px solid ${C.border}`,
                background: 'rgba(26,22,37,.04)',
              }}
              title={t(locale, 'panel.overview.funnelBarHint', { n: data.funnelTotal })}
            >
              {funnelActive.map((stage) => (
                <div
                  key={stage}
                  style={{
                    width: `${Math.max(2, ((data.funnel[stage] || 0) / funnelSum) * 100)}%`,
                    background: FUNNEL_COLORS[stage],
                  }}
                  title={`${t(locale, FUNNEL_LABEL_KEYS[stage])}: ${data.funnel[stage]}`}
                />
              ))}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
              {t(locale, 'panel.overview.funnelBarHint', { n: data.funnelTotal })}
            </p>
          </div>
        ) : null}
      </div>

      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span style={S.label}>{t(locale, 'panel.overview.attentionTitle')}</span>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: C.muted }}>
            {t(locale, 'panel.overview.attentionCount', { n: (data.attention || []).length })}
          </span>
        </div>
        {(data.attention || []).length === 0 ? (
          <p style={{ margin: 0, fontSize: '13px', color: C.muted, fontStyle: 'italic' }}>
            {t(locale, 'panel.overview.attentionEmpty')}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(data.attention || []).map((item) => {
              const pr = PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.low;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.nav && go(item.nav)}
                  style={{
                    textAlign: 'left',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: `1px solid ${pr.border}`,
                    background: pr.bg,
                    cursor: item.nav ? 'pointer' : 'default',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      color: pr.color,
                      minWidth: '52px',
                    }}
                  >
                    {t(locale, `panel.overview.priority.${item.priority}`)}
                  </span>
                  <span style={{ fontSize: '13px', color: C.text, flex: '1 1 180px' }}>
                    {t(locale, item.titleKey)}
                  </span>
                  <span style={{ fontSize: '12px', color: C.muted, flex: '1 1 160px' }}>{item.context}</span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: C.faint }}>
                    {t(locale, 'panel.overview.daysAgo', { n: item.days ?? 0 })}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={S.label}>{t(locale, 'panel.overview.vacanciesTitle')}</span>
            <button
              type="button"
              onClick={() => go({ tab: 'vacancies' })}
              style={{
                background: 'transparent',
                border: 'none',
                color: C.purple,
                fontSize: '11px',
                fontFamily: 'monospace',
                cursor: 'pointer',
              }}
            >
              {t(locale, 'panel.overview.openVacancies')}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '22px', color: C.text }}>{data.vacancies?.openCount ?? 0}</div>
              <div style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                {t(locale, 'panel.overview.vacanciesOpen')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', color: '#d97706' }}>{data.vacancies?.positionsOpen ?? 0}</div>
              <div style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                {t(locale, 'panel.overview.positionsLeft')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', color: C.tension }}>{data.vacancies?.staleCount ?? 0}</div>
              <div style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                {t(locale, 'panel.overview.staleVacancies')}
              </div>
            </div>
          </div>
          {(data.vacancies?.items || []).length === 0 ? (
            <p style={{ margin: 0, fontSize: '13px', color: C.faint, fontStyle: 'italic' }}>
              {t(locale, 'panel.overview.vacanciesEmpty')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(data.vacancies.items || []).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => go({ tab: 'vacancies', vacancyDetail: String(v.id) })}
                  style={{
                    textAlign: 'left',
                    background: 'rgba(26,22,37,.03)',
                    border: `1px solid ${C.border}`,
                    borderRadius: '10px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: C.text }}>{v.title}</span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: C.muted }}>
                      {v.hired}/{v.positionsCount} · {t(locale, 'panel.overview.inFunnel', { n: v.inFunnel })}
                    </span>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '11px', color: v.stale ? C.tension : C.faint, fontFamily: 'monospace' }}>
                    {v.targetDate
                      ? t(locale, 'panel.overview.targetDate', { date: v.targetDate })
                      : t(locale, 'panel.overview.noTarget')}
                    {v.stale ? ` · ${t(locale, 'panel.overview.staleTag')}` : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={S.card}>
          <span style={{ ...S.label, marginBottom: '12px', display: 'block' }}>
            {t(locale, 'panel.overview.decisionsTitle')}
          </span>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '22px', color: C.synergy }}>{data.hiredLast7d}</div>
              <div style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                {t(locale, 'panel.overview.hired7d')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', color: C.tension }}>{data.rejectedLast7d}</div>
              <div style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                {t(locale, 'panel.overview.rejected7d')}
              </div>
            </div>
          </div>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: C.muted, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            {t(locale, 'panel.overview.topRejectReasons')}
          </span>
          {reasons.length === 0 ? (
            <p style={{ margin: '10px 0 0', fontSize: '13px', color: C.faint, fontStyle: 'italic' }}>
              {t(locale, 'panel.overview.noRejectReasons')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              {reasons.map((r) => (
                <div key={r.reason} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '120px', fontSize: '12px', color: C.muted, flexShrink: 0 }}>
                    {rejectionReasonLabel(locale, r.reason)}
                  </span>
                  <div style={{ flex: 1, height: '8px', borderRadius: '999px', background: 'rgba(26,22,37,.06)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.round((r.n / maxReason) * 100)}%`,
                        height: '100%',
                        background: C.tension,
                        borderRadius: '999px',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', color: C.faint, width: '24px', textAlign: 'right' }}>
                    {r.n}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ ...S.card, background: 'rgba(124,58,237,.04)', border: `1px solid ${C.purple}22` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span style={S.label}>{t(locale, 'panel.overview.typeMixTitle')}</span>
          <button
            type="button"
            onClick={() => go({ tab: 'compatibility' })}
            style={{
              background: 'transparent',
              border: 'none',
              color: C.purple,
              fontSize: '11px',
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}
          >
            {t(locale, 'panel.overview.openCompat')}
          </button>
        </div>
        {mixEntries.length === 0 ? (
          <p style={{ margin: 0, fontSize: '13px', color: C.faint, fontStyle: 'italic' }}>
            {t(locale, 'panel.overview.typeMixEmpty')}
          </p>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                height: '12px',
                borderRadius: '999px',
                overflow: 'hidden',
                border: `1px solid ${C.border}`,
                marginBottom: '12px',
              }}
            >
              {mixEntries.map((e) => (
                <div
                  key={e.type}
                  style={{
                    width: `${Math.max(3, (e.n / mixTotal) * 100)}%`,
                    background: TYPE_DATA[e.type]?.color || C.purple,
                  }}
                  title={`T${e.type}: ${e.n}`}
                />
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', alignItems: 'center' }}>
              {mixEntries.slice(0, 5).map((e) => (
                <span key={e.type} style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
                  <span style={{ color: TYPE_DATA[e.type]?.color }}>T{e.type}</span>
                  {' · '}
                  {typeShortLabel(e.type, locale)} ({e.n})
                </span>
              ))}
            </div>
            {dominant ? (
              <p style={{ margin: '12px 0 0', fontSize: '12px', color: C.muted, lineHeight: 1.5 }}>
                {t(locale, 'panel.overview.dominantHint', {
                  type: typeFullName(dominant, locale),
                  n: mixCount[dominant] || mixCount[String(dominant)] || 0,
                  pct: Math.round(((mixCount[dominant] || mixCount[String(dominant)] || 0) / mixTotal) * 100),
                })}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
