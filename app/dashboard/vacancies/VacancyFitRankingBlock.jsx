'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../../lib/cn';
import { t, localeHtmlLang } from '../../../lib/i18n';
import { titleCasePersonName } from '../../../lib/person-name';
import { S, TypeBadge } from '../dashboard-shared';
import { fitBandLabel, pipelineStageLabel } from './vacancy-admin-shared';

export function VacancyFitRankingBlock({ vacancyId, locale, refreshKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [nucleusSize, setNucleusSize] = useState(0);
  const [hasCompletedTests, setHasCompletedTests] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const qs = locale ? `?locale=${encodeURIComponent(locale)}` : '';
        const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/ranking${qs}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
        const all = Array.isArray(data.ranking) ? data.ranking : [];
        const completed = all.filter((r) => !r.pendingTest && r.assessmentId != null);
        const scored = completed
          .filter((r) => r.vacancyFitScore010 != null)
          .sort((a, b) => {
            const av = a.vacancyFitScore010;
            const bv = b.vacancyFitScore010;
            if (bv !== av) return bv - av;
            return String(a.name || '').localeCompare(String(b.name || ''), localeHtmlLang(locale));
          });
        if (!cancelled) {
          setHasCompletedTests(completed.length > 0);
          setRows(scored);
          setNucleusSize(Number(data.nucleusSize) || 0);
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || t(locale, 'panel.common.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [vacancyId, refreshKey, locale]);

  const scoreTone = (s) => (s >= 7 ? 'text-success' : s >= 4 ? 'text-warning' : 'text-danger');

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <span className={S.label}>{t(locale, 'recruiting.rankingTitle')}</span>
        {loading ? <span className="spinner text-ink-muted" /> : null}
        {!loading && rows.length > 0 ? (
          <span className="font-mono text-[11px] text-ink-faint">
            {t(locale, 'recruiting.rankingScoredCount', { n: rows.length })}
          </span>
        ) : null}
      </div>
      <p className="mb-2 mt-0 text-xs leading-[1.55] text-ink-muted">
        {t(locale, 'recruiting.rankingIntro')}
      </p>
      {!loading && nucleusSize > 0 ? (
        <p className="mb-3.5 mt-0 text-[11px] leading-snug text-ink-faint">
          {t(locale, 'recruiting.rankingNucleusHint', { n: nucleusSize })}
        </p>
      ) : !loading && rows.length > 0 ? (
        <p className="mb-3.5 mt-0 text-[11px] leading-snug text-ink-faint">
          {t(locale, 'recruiting.rankingNucleusEmpty')}
        </p>
      ) : (
        <div className="mb-3.5" />
      )}

      {err ? (
        <p className="mb-2.5 mt-0 font-mono text-xs text-danger">{err}</p>
      ) : null}

      {!loading && rows.length === 0 ? (
        <p className="m-0 text-xs italic text-ink-faint">
          {hasCompletedTests
            ? t(locale, 'recruiting.rankingNoWeights')
            : t(locale, 'recruiting.rankingEmpty')}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-ink/12 text-left">
                {[
                  'recruiting.rankingColRank',
                  'recruiting.rankingColCandidate',
                  'recruiting.rankingColType',
                  'recruiting.rankingColFit',
                  'recruiting.rankingColTeam',
                  'recruiting.rankingColStage',
                ].map((key) => (
                  <th
                    key={key}
                    className="px-2.5 py-2 font-mono text-[11px] font-semibold text-ink-faint"
                  >
                    {t(locale, key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const band = fitBandLabel(locale, r.vacancyFitLabel);
                const nf = r.nucleusFit;
                return (
                  <tr
                    key={r.assessmentId != null ? `a:${r.assessmentId}` : `c:${r.candidateId}`}
                    className={cn(
                      'border-b border-ink/12',
                      idx === 0 && 'bg-success/[0.04]',
                      idx > 0 && idx < 3 && 'bg-ink/[0.02]'
                    )}
                  >
                    <td
                      className={cn(
                        'p-2.5 font-mono',
                        idx < 3 ? 'font-bold text-brand-500' : 'font-normal text-ink-faint'
                      )}
                    >
                      {idx + 1}
                    </td>
                    <td className="p-2.5">
                      <div className="font-medium text-ink">{titleCasePersonName(r.name)}</div>
                      {r.email ? (
                        <div className="mt-0.5 font-mono text-[11px] text-ink-faint">{r.email}</div>
                      ) : null}
                    </td>
                    <td className="p-2.5">
                      {r.topType != null ? (
                        <TypeBadge type={r.topType} locale={locale} compact />
                      ) : (
                        t(locale, 'panel.common.notApplicable')
                      )}
                    </td>
                    <td className="p-2.5">
                      <span className={cn('font-mono font-bold', scoreTone(r.vacancyFitScore010))}>
                        {r.vacancyFitScore010}/10
                      </span>
                      {band ? (
                        <span className="ml-2 font-mono text-[11px] text-ink-muted">{band}</span>
                      ) : null}
                      {r.textMatchScore != null ? (
                        <div className="mt-1 font-mono text-[10px] text-ink-faint">
                          {t(locale, 'recruiting.textMatchShort', { score: r.textMatchScore })}
                        </div>
                      ) : null}
                      {r.fitBreakdown ? (
                        <details className="mt-1 max-w-[240px]">
                          <summary className="cursor-pointer font-mono text-[10px] text-brand-600">
                            {t(locale, 'recruiting.fitExplainToggle')}
                          </summary>
                          <div className="mt-1 rounded-md border border-ink/10 bg-canvas/60 px-2 py-1.5 text-[10px] leading-snug text-ink-muted">
                            <p className="m-0 mb-1">{t(locale, 'recruiting.fitExplainIntro')}</p>
                            <ul className="m-0 list-none space-y-0.5 p-0">
                              {(r.fitBreakdown.types || []).slice(0, 5).map((row) => (
                                <li key={row.type}>
                                  T{row.type}: w={row.weight} · n={row.normalized} → {row.contribution}
                                </li>
                              ))}
                            </ul>
                            <p className="mb-0 mt-1 text-ink-faint">
                              {t(locale, 'recruiting.fitExplainLimits')}
                            </p>
                          </div>
                        </details>
                      ) : null}
                    </td>
                    <td className="p-2.5">
                      {nf && (nf.synergy > 0 || nf.tension > 0) ? (
                        <div className="max-w-[220px]">
                          <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                            {nf.synergy > 0 ? (
                              <span className="rounded-full border border-success/30 bg-success/[0.08] px-1.5 py-0.5 text-success">
                                {t(locale, 'recruiting.rankingNucleusSynergy', { n: nf.synergy })}
                              </span>
                            ) : null}
                            {nf.tension > 0 ? (
                              <span className="rounded-full border border-warning/30 bg-warning/[0.08] px-1.5 py-0.5 text-warning">
                                {t(locale, 'recruiting.rankingNucleusTension', { n: nf.tension })}
                              </span>
                            ) : null}
                          </div>
                          {nf.summary ? (
                            <p className="mb-0 mt-1 text-[11px] leading-snug text-ink-faint">{nf.summary}</p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="font-mono text-[11px] text-ink-faint">
                          {t(locale, 'panel.common.notApplicable')}
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-xs text-ink-muted">
                      {pipelineStageLabel(locale, r.pipelineStage || 'new')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
