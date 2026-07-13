'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TYPE_DATA } from '../../../lib/data';
import { errorMessage, t } from '../../../lib/i18n';
import { useLocale } from '../../../lib/useLocale';
import { C, FONTS, RADIAL_GLOW_SINGLE } from '../../../lib/theme';
import { typeFullName, typeShortLabel } from '../../../lib/type-en';

function ScoreBars({ scores }) {
  const entries = [];
  for (let i = 1; i <= 9; i += 1) {
    const v = Number(scores?.[i] ?? scores?.[String(i)] ?? 0) || 0;
    entries.push({ t: i, v });
  }
  const max = Math.max(...entries.map((e) => e.v), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {entries.map((e) => (
        <div key={e.t} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '28px', fontSize: '10px', fontFamily: FONTS.mono, color: C.muted }}>
            T{e.t}
          </span>
          <div style={{ flex: 1, height: '6px', background: 'rgba(26,22,37,.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(e.v / max) * 100}%`,
                background: TYPE_DATA[e.t]?.color || C.purple,
                borderRadius: '3px',
              }}
            />
          </div>
          <span style={{ width: '28px', textAlign: 'right', fontSize: '10px', fontFamily: FONTS.mono, color: C.faint }}>
            {e.v}
          </span>
        </div>
      ))}
    </div>
  );
}

function stageLabel(locale, stage) {
  const map = {
    new: 'recruiting.pipelineNew',
    test_completed: 'recruiting.pipelineTestCompleted',
    screening: 'recruiting.pipelineScreening',
    interview: 'recruiting.pipelineInterview',
    approved: 'recruiting.pipelineApproved',
    hired: 'recruiting.pipelineHired',
    rejected: 'recruiting.pipelineRejected',
    archived: 'recruiting.pipelineArchived',
  };
  return map[stage] ? t(locale, map[stage]) : stage || '—';
}

function ReportInner() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';
  const [locale] = useLocale();
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      try {
        document.head.removeChild(meta);
      } catch {
        /* ignore */
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const tokenValue = String(token || '').trim();
      if (!tokenValue) {
        if (!cancelled) setState({ loading: false, error: t(locale, 'panel.report.publicInvalid'), data: null });
        return;
      }
      try {
        const res = await fetch(`/api/public/vacancy-report?token=${encodeURIComponent(tokenValue)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            data?.errorCode === 'EXPIRED_LINK'
              ? t(locale, 'panel.report.publicExpired')
              : data?.errorCode
                ? errorMessage(locale, data.errorCode, data.error)
                : data?.error || t(locale, 'panel.report.publicInvalid')
          );
        }
        if (!cancelled) setState({ loading: false, error: '', data });
      } catch (e) {
        if (!cancelled) setState({ loading: false, error: e?.message || t(locale, 'errors.INTERNAL'), data: null });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token, locale]);

  if (state.loading) {
    return (
      <Shell>
        <p style={{ color: C.muted }}>{t(locale, 'panel.report.publicLoading')}</p>
      </Shell>
    );
  }

  if (state.error || !state.data) {
    return (
      <Shell>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: '22px', color: C.text, margin: '0 0 8px' }}>
          {t(locale, 'panel.report.publicUnavailable')}
        </h1>
        <p style={{ color: C.muted, margin: 0 }}>{state.error}</p>
      </Shell>
    );
  }

  const snap = state.data.snapshot || {};
  const vacancy = snap.vacancy || {};
  const candidates = Array.isArray(snap.candidates) ? snap.candidates : [];
  const note = state.data.executiveNote || snap.executiveNote;
  const expiresAt = state.data.expiresAt ? new Date(state.data.expiresAt) : null;
  const generatedAt = snap.generatedAt ? new Date(snap.generatedAt) : state.data.createdAt ? new Date(state.data.createdAt) : null;

  return (
    <Shell>
      <header style={{ marginBottom: '28px' }}>
        <p
          style={{
            margin: '0 0 8px',
            fontSize: '11px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: C.purple,
            fontFamily: FONTS.mono,
            fontWeight: 600,
          }}
        >
          30Team
        </p>
        <h1 style={{ margin: '0 0 6px', fontFamily: FONTS.serif, fontSize: '28px', color: C.text, fontWeight: 600 }}>
          {state.data.title || vacancy.title || t(locale, 'panel.report.publicTitle')}
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: C.muted }}>
          {vacancy.companyName}
          {vacancy.positionsCount ? ` · ${t(locale, 'panel.report.positions', { n: vacancy.positionsCount })}` : ''}
        </p>
        <p style={{ margin: '10px 0 0', fontSize: '12px', color: C.faint, fontFamily: FONTS.mono }}>
          {generatedAt ? t(locale, 'panel.report.generatedAt', { date: generatedAt.toLocaleString(locale) }) : ''}
          {expiresAt
            ? ` · ${t(locale, 'panel.report.expiresAt', { date: expiresAt.toLocaleString(locale) })}`
            : ''}
        </p>
      </header>

      {note ? (
        <section
          style={{
            marginBottom: '24px',
            padding: '16px 18px',
            borderRadius: '12px',
            border: `1px solid ${C.border}`,
            background: C.surface || '#fff',
          }}
        >
          <p style={{ margin: '0 0 6px', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: C.sectionLabel, fontFamily: FONTS.mono }}>
            {t(locale, 'panel.report.executiveNote')}
          </p>
          <p style={{ margin: 0, fontSize: '14px', color: C.text, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{note}</p>
        </section>
      ) : null}

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontFamily: FONTS.serif, fontSize: '18px', color: C.text, margin: '0 0 12px' }}>
          {t(locale, 'panel.report.shortlistTitle', { n: candidates.length })}
        </h2>
        <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: '12px', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: C.muted, fontFamily: FONTS.mono, fontSize: '11px' }}>
                <th style={{ padding: '10px 14px' }}>{t(locale, 'panel.report.colName')}</th>
                <th style={{ padding: '10px 14px' }}>{t(locale, 'panel.report.colStage')}</th>
                <th style={{ padding: '10px 14px' }}>{t(locale, 'panel.report.colFit')}</th>
                <th style={{ padding: '10px 14px' }}>{t(locale, 'panel.report.colType')}</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c, i) => (
                <tr key={`${c.name}-${i}`} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '10px 14px', color: C.text }}>{c.name}</td>
                  <td style={{ padding: '10px 14px', color: C.muted, fontFamily: FONTS.mono }}>
                    {stageLabel(locale, c.pipelineStage)}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: FONTS.mono, fontWeight: 600 }}>
                    {c.vacancyFitScore010 != null ? `${Number(c.vacancyFitScore010).toFixed(1)}/10` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: FONTS.mono }}>
                    {c.topType != null
                      ? `T${c.topType} · ${typeShortLabel(c.topType, locale)}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 style={{ fontFamily: FONTS.serif, fontSize: '18px', color: C.text, margin: '0 0 14px' }}>
          {t(locale, 'panel.report.profilesTitle')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
          {candidates.map((c, i) => (
            <article
              key={`card-${c.name}-${i}`}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: `1px solid ${C.border}`,
                background: '#fff',
              }}
            >
              <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontFamily: FONTS.serif, color: C.text }}>{c.name}</h3>
              <p style={{ margin: '0 0 10px', fontSize: '12px', color: C.muted, fontFamily: FONTS.mono }}>
                {c.topType != null ? typeFullName(c.topType, locale) : '—'}
                {c.areaLabel ? ` · ${c.areaLabel}` : ''}
                {c.vacancyFitScore010 != null
                  ? ` · ${t(locale, 'panel.report.fitLabel', { score: Number(c.vacancyFitScore010).toFixed(1) })}`
                  : ''}
              </p>
              <ScoreBars scores={c.scores} />
            </article>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: '36px', paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
        <p style={{ margin: 0, fontSize: '11px', color: C.faint, lineHeight: 1.55 }}>
          {t(locale, 'panel.report.disclaimer')}
        </p>
      </footer>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        fontFamily: FONTS.serif,
      }}
    >
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: RADIAL_GLOW_SINGLE }} />
      <main style={{ position: 'relative', maxWidth: '880px', margin: '0 auto', padding: '40px 20px 64px' }}>
        {children}
      </main>
    </div>
  );
}

export default function VacancyReportPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <p style={{ color: C.muted }}>…</p>
        </Shell>
      }
    >
      <ReportInner />
    </Suspense>
  );
}
