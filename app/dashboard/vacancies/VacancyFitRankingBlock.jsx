'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../../lib/cn';
import { t, localeHtmlLang } from '../../../lib/i18n';
import { titleCasePersonName } from '../../../lib/person-name';
import { S, TypeBadge } from '../dashboard-shared';
import { fitBandLabel, pipelineStageLabel } from './vacancy-admin-shared';

export function VacancyFitRankingBlock({ vacancyId, locale, refreshKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [hasCompletedTests, setHasCompletedTests] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/ranking`);
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
      <p className="mb-3.5 mt-0 text-xs leading-[1.55] text-ink-muted">
        {t(locale, 'recruiting.rankingIntro')}
      </p>

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
