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
import { motivatorDimensionLabel } from '../../../lib/ae/motivators-dimensions';
import { recommendationFromStage } from '../../../lib/vacancy-report-shared';
import { formatSalaryBr } from '../../../lib/br-masks';
import { BrandPulseLoading, PublicFunnyError } from '../../_components/PublicStatusScreens';

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

function availabilityLabel(locale, value) {
  const map = {
    immediate: 'recruiting.availabilityImmediate',
    '15_days': 'recruiting.availability15',
    '30_days': 'recruiting.availability30',
    '60_days': 'recruiting.availability60',
    other: 'recruiting.availabilityOther',
  };
  return map[value] ? t(locale, map[value]) : value || '';
}

function profileBits(c, locale) {
  const bits = [];
  const loc = [c.city, c.state].filter(Boolean).join(' / ');
  if (loc) bits.push(loc);
  if (c.availability) bits.push(availabilityLabel(locale, c.availability));
  if (c.salaryExpectation) {
    bits.push(formatSalaryBr(c.salaryExpectation) || String(c.salaryExpectation));
  }
  return bits;
}

function CandidateCard({ c, locale, vacancyTitle, hasRubric }) {
  const [openBars, setOpenBars] = useState(false);
  const typeData = getTypeData(locale);
  const d = c.topType != null ? typeData[c.topType] : null;
  const aligned = hasRubric ? formatTypeList(c.fitAlignedTypes, locale) : '';
  const gaps = hasRubric ? formatTypeList(c.fitGapTypes, locale) : '';
  const rec = c.recommendation || recommendationFromStage(c.pipelineStage);
  const meta = profileBits(c, locale);
  const why = c.why || c.consultantNote;
  const motivators = Array.isArray(c.motivatorsTop) ? c.motivatorsTop : [];
  const roleReading =
    c.topType != null && vacancyTitle
      ? hasRubric && aligned
        ? t(locale, 'panel.report.roleReadingAligned', {
            vacancy: vacancyTitle,
            type: c.topType,
            typeName: typeShortLabel(c.topType, locale),
            types: aligned,
            score: c.vacancyFitScore010 != null ? Number(c.vacancyFitScore010).toFixed(1) : '—',
          })
        : hasRubric
          ? t(locale, 'panel.report.roleReading', {
              vacancy: vacancyTitle,
              type: c.topType,
              typeName: typeShortLabel(c.topType, locale),
              score: c.vacancyFitScore010 != null ? Number(c.vacancyFitScore010).toFixed(1) : '—',
            })
          : t(locale, 'panel.report.roleReadingNoFit', {
              vacancy: vacancyTitle,
              type: c.topType,
              typeName: typeShortLabel(c.topType, locale),
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
        {hasRubric && c.vacancyFitScore010 != null
          ? ` · ${t(locale, 'panel.report.fitLabel', { score: Number(c.vacancyFitScore010).toFixed(1) })}`
          : ''}
      </p>
      {meta.length ? (
        <p style={{ margin: '6px 0 0', fontSize: '12px', color: C.muted, lineHeight: 1.45 }}>{meta.join(' · ')}</p>
      ) : null}

      {(why || c.watchOut || c.interviewProbe) ? (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {why ? (
            <div>
              <div style={miniLabel()}>{t(locale, 'panel.report.fieldWhy')}</div>
              <p style={{ margin: 0, fontSize: '13px', color: C.text, lineHeight: 1.5 }}>{why}</p>
            </div>
          ) : null}
          {c.watchOut ? (
            <div>
              <div style={miniLabel()}>{t(locale, 'panel.report.fieldWatch')}</div>
              <p style={{ margin: 0, fontSize: '13px', color: C.text, lineHeight: 1.5 }}>{c.watchOut}</p>
            </div>
          ) : null}
          {c.interviewProbe ? (
            <div>
              <div style={miniLabel()}>{t(locale, 'panel.report.fieldProbe')}</div>
              <p style={{ margin: 0, fontSize: '13px', color: C.text, lineHeight: 1.5 }}>{c.interviewProbe}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {motivators.length ? (
        <div style={{ marginTop: '12px' }}>
          <div style={miniLabel()}>{t(locale, 'panel.report.motivatorsTitle')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
            {motivators.map((m) => (
              <span
                key={m.key}
                style={{
                  fontSize: '11px',
                  fontFamily: FONTS.mono,
                  padding: '4px 8px',
                  borderRadius: '999px',
                  border: `1px solid ${C.border}`,
                  color: C.muted,
                }}
              >
                {motivatorDimensionLabel(m.key, locale)}
                {m.score != null ? ` ${m.score}` : ''}
              </span>
            ))}
          </div>
        </div>
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

function miniLabel() {
  return {
    margin: '0 0 2px',
    fontSize: '10px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontFamily: FONTS.mono,
    color: C.faint,
  };
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
    if (!rubricSummary?.hasRubric) return '';
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
  }, [candidates, locale, rubricSummary?.hasRubric]);

  if (state.loading) {
    return (
      <Shell>
        <BrandPulseLoading locale={locale} label={t(locale, 'panel.report.publicLoading')} fullPage />
      </Shell>
    );
  }

  if (state.error || !state.data) {
    return (
      <Shell>
        <PublicFunnyError
          locale={locale}
          title={t(locale, 'panel.report.publicUnavailable')}
          message={state.error || t(locale, 'panel.report.funnyErrorBody')}
          onRetry={() => {
            if (typeof window !== 'undefined') window.location.reload();
          }}
        />
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
        <button
          type="button"
          className="r-no-print"
          onClick={() => window.print()}
          style={{
            marginTop: '14px',
            background: 'transparent',
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            padding: '8px 12px',
            color: C.muted,
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: FONTS.mono,
            minHeight: '40px',
          }}
        >
          {t(locale, 'panel.report.printPdf')}
        </button>
      </header>

      {!(rubricSummary?.hasRubric) ? (
        <section
          style={{
            marginBottom: '20px',
            padding: '14px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(220,38,38,.28)',
            background: 'rgba(220,38,38,.05)',
          }}
        >
          <p style={{ margin: 0, fontSize: '13px', color: '#b91c1c', lineHeight: 1.55 }}>
            {t(locale, 'panel.report.noRubricBanner')}
          </p>
        </section>
      ) : null}

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
        <p style={{ margin: '0 0 12px', fontSize: '13px', color: C.muted, lineHeight: 1.55 }}>{compareLine}</p>
      ) : null}

      {rubricSummary?.hasRubric ? <FitCompareChart candidates={candidates} locale={locale} /> : null}

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
                {rubricSummary?.hasRubric ? (
                  <th style={{ padding: '10px 14px' }}>{t(locale, 'panel.report.colFit')}</th>
                ) : null}
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
                    {rubricSummary?.hasRubric ? (
                      <td style={{ padding: '10px 14px', fontFamily: FONTS.mono, fontWeight: 600 }}>
                        {c.vacancyFitScore010 != null ? `${Number(c.vacancyFitScore010).toFixed(1)}/10` : '—'}
                      </td>
                    ) : null}
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
              hasRubric={Boolean(rubricSummary?.hasRubric)}
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

function FitCompareChart({ candidates, locale }) {
  const ranked = (Array.isArray(candidates) ? candidates : [])
    .filter((c) => c.vacancyFitScore010 != null)
    .slice()
    .sort((a, b) => Number(b.vacancyFitScore010) - Number(a.vacancyFitScore010))
    .slice(0, 6);
  if (ranked.length < 2) return null;
  const max = Math.max(...ranked.map((c) => Number(c.vacancyFitScore010) || 0), 1);
  return (
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
          margin: '0 0 12px',
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: C.sectionLabel,
          fontFamily: FONTS.mono,
        }}
      >
        {t(locale, 'panel.report.fitCompareTitle')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {ranked.map((c, i) => {
          const score = Number(c.vacancyFitScore010) || 0;
          const pct = Math.round((score / 10) * 100);
          return (
            <div key={`${c.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  width: '120px',
                  flexShrink: 0,
                  fontSize: '12px',
                  color: C.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={c.name}
              >
                {c.name}
              </span>
              <div
                style={{
                  flex: 1,
                  height: '10px',
                  background: 'rgba(26,22,37,.08)',
                  borderRadius: '5px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.round((score / max) * 100))}%`,
                    height: '100%',
                    background: i === 0 ? C.synergy || '#16a34a' : C.purple,
                    borderRadius: '5px',
                    minWidth: score > 0 ? '4px' : 0,
                  }}
                />
              </div>
              <span style={{ width: '52px', textAlign: 'right', fontFamily: FONTS.mono, fontSize: '12px', color: C.muted }}>
                {score.toFixed(1)}
                <span style={{ color: C.faint, fontSize: '10px' }}> ({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
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
      <style>{`
        @media print {
          .r-no-print { display: none !important; }
          body { background: #fff !important; }
          [style*="position: fixed"] { display: none !important; }
        }
      `}</style>
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
          <BrandPulseLoading locale="pt-BR" label="…" fullPage />
        </Shell>
      }
    >
      <ReportInner />
    </Suspense>
  );
}
