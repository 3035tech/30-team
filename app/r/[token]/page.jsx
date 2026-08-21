'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { TYPE_DATA } from '../../../lib/data';
import { getTypeData } from '../../../lib/i18n-data';
import { errorMessage, t } from '../../../lib/i18n';
import { useLocale } from '../../../lib/useLocale';
import { C, FONTS, RADIAL_GLOW_SINGLE } from '../../../lib/theme';
import { typeFullName, typeHintTooltip, typeShortLabel } from '../../../lib/type-en';
import { RichTextView } from '../../_components/RichTextView';
import { isRichTextEmpty } from '../../../lib/sanitize-html';
import { recommendationFromStage } from '../../../lib/vacancy-report-shared';

function ScoreBars({ scores, locale }) {
  const entries = [];
  for (let i = 1; i <= 9; i += 1) {
    const v = Number(scores?.[i] ?? scores?.[String(i)] ?? 0) || 0;
    entries.push({ t: i, v });
  }
  const max = Math.max(...entries.map((e) => e.v), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {entries.map((e) => (
        <div key={e.t} style={{ display: 'flex', alignItems: 'center', gap: '8px' }} title={typeHintTooltip(e.t, locale)}>
          <span style={{ width: '28px', fontSize: '10px', fontFamily: FONTS.mono, color: C.muted, cursor: 'help' }}>
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

function formatTypeList(types, locale) {
  return (types || [])
    .map((n) => {
      const num = Number(n);
      if (!Number.isFinite(num)) return null;
      return `T${num} · ${typeShortLabel(num, locale)}`;
    })
    .filter(Boolean)
    .join(', ');
}

function recommendationLabel(locale, rec) {
  if (rec === 'advance') return t(locale, 'panel.report.recAdvance');
  if (rec === 'discuss') return t(locale, 'panel.report.recDiscuss');
  if (rec === 'exclude') return t(locale, 'panel.report.recExclude');
  return t(locale, 'panel.report.recBank');
}

function CandidateCard({ c, locale, vacancyTitle }) {
  const [openBars, setOpenBars] = useState(false);
  const typeData = getTypeData(locale);
  const d = c.topType != null ? typeData[c.topType] : null;
  const aligned = formatTypeList(c.fitAlignedTypes, locale);
  const gaps = formatTypeList(c.fitGapTypes, locale);
  const rec = c.recommendation || recommendationFromStage(c.pipelineStage);
  const roleReading =
    c.topType != null && vacancyTitle
      ? aligned
        ? t(locale, 'panel.report.roleReadingAligned', {
            vacancy: vacancyTitle,
            type: c.topType,
            typeName: typeShortLabel(c.topType, locale),
            types: aligned,
            score:
              c.vacancyFitScore010 != null ? Number(c.vacancyFitScore010).toFixed(1) : '—',
          })
        : t(locale, 'panel.report.roleReading', {
            vacancy: vacancyTitle,
            type: c.topType,
            typeName: typeShortLabel(c.topType, locale),
            score:
              c.vacancyFitScore010 != null ? Number(c.vacancyFitScore010).toFixed(1) : '—',
          })
      : null;

  return (
    <article
      style={{
        padding: '16px',
        borderRadius: '12px',
        border: `1px solid ${C.border}`,
        background: '#fff',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontFamily: FONTS.serif, color: C.text }}>{c.name}</h3>
        <span style={{ fontSize: '11px', fontFamily: FONTS.mono, color: C.purple }}>{recommendationLabel(locale, rec)}</span>
      </div>
      <p
        style={{
          margin: '8px 0 0',
          fontSize: '12px',
          color: C.muted,
          fontFamily: FONTS.mono,
          cursor: c.topType != null ? 'help' : undefined,
        }}
        title={c.topType != null ? typeHintTooltip(c.topType, locale) : undefined}
      >
        {c.topType != null ? typeFullName(c.topType, locale) : '—'}
        {c.vacancyFitScore010 != null
          ? ` · ${t(locale, 'panel.report.fitLabel', { score: Number(c.vacancyFitScore010).toFixed(1) })}`
          : ''}
      </p>
      {c.consultantNote ? (
        <p
          style={{
            margin: '10px 0 0',
            padding: '10px 12px',
            borderRadius: '8px',
            background: `${C.purple}0a`,
            border: `1px solid ${C.purple}22`,
            fontSize: '13px',
            color: C.text,
            lineHeight: 1.5,
          }}
        >
          {c.consultantNote}
        </p>
      ) : null}
      {roleReading ? (
        <p style={{ margin: '10px 0 0', fontSize: '13px', color: C.text, lineHeight: 1.55 }}>{roleReading}</p>
      ) : null}
      {d?.desc ? (
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: C.muted, lineHeight: 1.55 }}>{d.desc}</p>
      ) : null}
      {aligned ? (
        <p style={{ margin: '10px 0 0', fontSize: '12px', color: C.muted, lineHeight: 1.5 }}>
          {t(locale, 'panel.report.fitAligned', { types: aligned })}
        </p>
      ) : null}
      {gaps ? (
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.muted, lineHeight: 1.5 }}>
          {t(locale, 'panel.report.fitGaps', { types: gaps })}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setOpenBars((v) => !v)}
        style={{
          marginTop: '12px',
          background: 'transparent',
          border: 'none',
          padding: 0,
          color: C.purple,
          fontSize: '12px',
          fontFamily: FONTS.mono,
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        {openBars ? t(locale, 'panel.report.hideScoreMap') : t(locale, 'panel.report.showScoreMap')}
      </button>
      {openBars ? (
        <div style={{ marginTop: '10px' }}>
          <ScoreBars scores={c.scores} locale={locale} />
        </div>
      ) : null}
    </article>
  );
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

  const snap = state.data?.snapshot || {};
  const candidates = useMemo(() => (Array.isArray(snap.candidates) ? snap.candidates : []), [snap.candidates]);
  const rubricSummary = snap.rubricSummary || null;

  const compareLine = useMemo(() => {
    const ranked = candidates
      .filter((c) => c.vacancyFitScore010 != null)
      .slice()
      .sort((a, b) => Number(b.vacancyFitScore010) - Number(a.vacancyFitScore010));
    if (ranked.length < 2) return '';
    const lead = ranked[0];
    const second = ranked[1];
    const last = ranked[ranked.length - 1];
    if (ranked.length === 2) {
      return t(locale, 'panel.report.compareTwo', {
        a: lead.name,
        aFit: Number(lead.vacancyFitScore010).toFixed(1),
        b: second.name,
        bFit: Number(second.vacancyFitScore010).toFixed(1),
      });
    }
    return t(locale, 'panel.report.compareMany', {
      a: lead.name,
      aFit: Number(lead.vacancyFitScore010).toFixed(1),
      b: second.name,
      bFit: Number(second.vacancyFitScore010).toFixed(1),
      c: last.name,
      cFit: Number(last.vacancyFitScore010).toFixed(1),
    });
  }, [candidates, locale]);

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

  const vacancy = snap.vacancy || {};
  const note = state.data.executiveNote || snap.executiveNote;
  const expiresAt = state.data.expiresAt ? new Date(state.data.expiresAt) : null;
  const generatedAt = snap.generatedAt
    ? new Date(snap.generatedAt)
    : state.data.createdAt
      ? new Date(state.data.createdAt)
      : null;
  const weightedTypes = Array.isArray(rubricSummary?.weightedTypes) ? rubricSummary.weightedTypes : [];
  const rubricTypesLabel = formatTypeList(
    weightedTypes.map((w) => w.type),
    locale
  );

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
          {expiresAt ? ` · ${t(locale, 'panel.report.expiresAt', { date: expiresAt.toLocaleString(locale) })}` : ''}
        </p>
      </header>

      {(rubricSummary?.hasRubric && rubricTypesLabel) ||
      vacancy.description ||
      rubricSummary?.notes ? (
        <section
          style={{
            marginBottom: '20px',
            padding: '14px 16px',
            borderRadius: '12px',
            border: `1px solid ${C.border}`,
            background: 'rgba(26,22,37,.02)',
          }}
        >
          <p
            style={{
              margin: '0 0 6px',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: C.sectionLabel,
              fontFamily: FONTS.mono,
            }}
          >
            {t(locale, 'panel.report.vacancySeeksTitle')}
          </p>
          {rubricSummary?.hasRubric && rubricTypesLabel ? (
            <p style={{ margin: '0 0 8px', fontSize: '14px', color: C.text, lineHeight: 1.55 }}>
              {t(locale, 'panel.report.vacancySeeksBody', { types: rubricTypesLabel })}
            </p>
          ) : null}
          {rubricSummary?.notes ? (
            <p style={{ margin: '0 0 8px', fontSize: '13px', color: C.muted, lineHeight: 1.55 }}>{rubricSummary.notes}</p>
          ) : null}
          {!isRichTextEmpty(vacancy.description) ? (
            <div style={{ marginTop: '4px' }}>
              <p
                style={{
                  margin: '0 0 4px',
                  fontSize: '11px',
                  fontFamily: FONTS.mono,
                  color: C.faint,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {t(locale, 'panel.report.vacancyDescLabel')}
              </p>
              <RichTextView html={vacancy.description} style={{ fontSize: '13px', margin: 0, color: C.muted }} />
            </div>
          ) : null}
          {rubricSummary?.hasRubric ? (
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: C.muted, lineHeight: 1.45 }}>
              {t(locale, 'panel.report.fitExplain')}
            </p>
          ) : null}
        </section>
      ) : null}

      {!isRichTextEmpty(note) ? (
        <section
          style={{
            marginBottom: '24px',
            padding: '16px 18px',
            borderRadius: '12px',
            border: `1px solid ${C.border}`,
            background: C.surface || '#fff',
          }}
        >
          <p
            style={{
              margin: '0 0 6px',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: C.sectionLabel,
              fontFamily: FONTS.mono,
            }}
          >
            {t(locale, 'panel.report.executiveNote')}
          </p>
          <RichTextView html={note} style={{ fontSize: '14px', margin: 0 }} />
        </section>
      ) : null}

      {compareLine ? (
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: C.muted, lineHeight: 1.55 }}>{compareLine}</p>
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
                <th style={{ padding: '10px 14px' }}>{t(locale, 'panel.report.colRec')}</th>
                <th style={{ padding: '10px 14px' }}>{t(locale, 'panel.report.colFit')}</th>
                <th style={{ padding: '10px 14px' }}>{t(locale, 'panel.report.colType')}</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c, i) => {
                const rec = c.recommendation || recommendationFromStage(c.pipelineStage);
                return (
                  <tr key={`${c.name}-${i}`} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '10px 14px', color: C.text }}>{c.name}</td>
                    <td style={{ padding: '10px 14px', color: C.muted, fontFamily: FONTS.mono }}>
                      {recommendationLabel(locale, rec)}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: FONTS.mono, fontWeight: 600 }}>
                      {c.vacancyFitScore010 != null ? `${Number(c.vacancyFitScore010).toFixed(1)}/10` : '—'}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontFamily: FONTS.mono,
                        cursor: c.topType != null ? 'help' : undefined,
                      }}
                      title={c.topType != null ? typeHintTooltip(c.topType, locale) : undefined}
                    >
                      {c.topType != null ? `T${c.topType} · ${typeShortLabel(c.topType, locale)}` : '—'}
                    </td>
                  </tr>
                );
              })}
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
            <CandidateCard
              key={`card-${c.name}-${i}`}
              c={c}
              locale={locale}
              vacancyTitle={vacancy.title || state.data.title || ''}
            />
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
