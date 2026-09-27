'use client';

import { useEffect, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../dashboard-shared';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { CollapsibleBlock } from '../../_components/CollapsibleBlock';
import { NINE_BOX_DISPLAY_ROWS, nineBoxCellDescription } from '../../../lib/people/nine-box-presentation';

/** Horizontal performance, vertical potential; existing cell IDs preserved. */

export function NineBoxBlock({ locale = 'pt-BR', companyId = null }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      setData(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams({ companyId: String(companyId) });
        const res = await fetch(`/api/admin/nine-box?${qs}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || 'load');
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) {
          setError(t(locale, 'nineBox.loadError'));
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, locale]);

  if (!companyId) {
    return (
      <p className={cn(S.muted, 'm-0 mt-6 text-sm')}>{t(locale, 'nineBox.needCompany')}</p>
    );
  }

  const placed = Number(data?.placed) || 0;
  const scanned = Number(data?.scanned) || 0;
  const cells = data?.cells || {};

  return (
    <CollapsibleBlock
      locale={locale}
      title={t(locale, 'nineBox.title')}
      defaultOpen
      count={placed > 0 ? placed : null}
      className="mt-6"
      variant="card"
    >
      {loading ? (
        <AppLoading variant="panel" label={t(locale, 'nineBox.loading')} />
      ) : error ? (
        <p className={cn(S.muted, 'm-0 text-sm text-red-800 dark:text-danger')}>{error}</p>
      ) : (
        <ContentEnter animKey={`nine-box-${companyId}-${placed}`}>
          <div>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <span className={cn(S.faint, 'font-ui text-prose')}>
                {t(locale, 'nineBox.placed', { placed, scanned })}
              </span>
            </div>
            <p className={cn(S.muted, 'm-0 mb-4 text-prose')}>{t(locale, 'nineBox.hint')}</p>

            {placed === 0 ? (
              <div className="space-y-2">
                <p className={cn(S.muted, 'm-0 text-sm')}>{t(locale, 'nineBox.empty')}</p>
                <p className={cn(S.faint, 'm-0 text-prose')}>{t(locale, 'nineBox.emptyHint')}</p>
                <a
                  href="/dashboard?tab=team"
                  className="inline-flex min-h-touch items-center font-ui text-prose text-brand-600 hover:underline"
                >
                  {t(locale, 'nineBox.emptyCta')}
                </a>
              </div>
            ) : null}
            <div className="mt-4">
              <p className="mb-2 font-ui text-sm font-semibold text-ink">{locale.startsWith('en') ? 'Potential ↑ Low to high, bottom to top' : 'Potencial ↑ Do baixo ao alto, de baixo para cima'}</p>
              <div
                className="space-y-2"
                role="grid"
                aria-label={t(locale, 'nineBox.gridAria')}
              >
                {NINE_BOX_DISPLAY_ROWS.map((row, index) => <div key={index} role="row" className="grid grid-cols-3 gap-2 sm:gap-2.5">{row.map((cellId) => {
                  const people = Array.isArray(cells[String(cellId)]) ? cells[String(cellId)] : [];
                  const empty = people.length === 0;
                  return (
                    <div
                      key={cellId}
                      role="gridcell"
                      data-cell={cellId}
                      aria-label={nineBoxCellDescription(cellId, locale)}
                      className="flex min-h-[88px] flex-col rounded-control border border-ink/10 bg-canvas/40 p-2"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-1">
                        <span className="break-words font-ui text-prose font-semibold leading-relaxed text-ink sm:text-sm">
                          {nineBoxCellDescription(cellId, locale)}
                        </span>
                        {!empty ? (
                          <span className="font-ui text-prose text-ink-muted">{people.length}</span>
                        ) : null}
                      </div>
                      {empty ? (
                        <p className="m-0 mt-auto font-ui text-prose text-ink/75">
                          {t(locale, 'nineBox.cellEmpty')}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {people.slice(0, 8).map((p) => (
                            <a
                              key={p.candidateId}
                              href={`/dashboard?tab=team&candidate=${p.candidateId}`}
                              className="max-w-full truncate rounded-full border border-brand-500/25 bg-brand-500/[0.08] px-2 py-0.5 text-prose text-brand-800 hover:bg-brand-500/15"
                              title={t(locale, 'nineBox.openPerson', { name: p.name })}
                            >
                              {p.name}
                            </a>
                          ))}
                          {people.length > 8 ? (
                            <span className="self-center font-ui text-prose text-ink/75">
                              {t(locale, 'nineBox.more', { n: people.length - 8 })}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}</div>)}
              </div>
              <p className="mb-0 mt-2 text-center font-ui text-sm font-semibold text-ink">{locale.startsWith('en') ? 'Performance → Low · Medium · High' : 'Desempenho → Baixo · Médio · Alto'}</p>
              <details className="mt-3 text-sm text-ink-muted">
                <summary className="min-h-touch cursor-pointer rounded-control py-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40">{locale.startsWith('en') ? 'How to read the matrix' : 'Como interpretar a matriz'}</summary>
                <p className="mt-1">{locale.startsWith('en') ? 'Performance refers to observed results and delivery. Potential is an estimate of capacity to take on greater complexity in the future. This view supports discussion, not automatic promotion or dismissal decisions.' : 'Desempenho representa resultados e entregas observadas. Potencial é uma estimativa da capacidade de assumir maior complexidade no futuro. A matriz apoia conversas, não decisões automáticas de promoção ou desligamento.'}</p>
              </details>
            </div>

            {(data?.unplaced?.length || 0) > 0 ? (
              <p className={cn(S.faint, 'm-0 mt-3 text-prose')}>
                {t(locale, 'nineBox.unplaced', { n: data.unplaced.length })}
              </p>
            ) : null}
          </div>
        </ContentEnter>
      )}
    </CollapsibleBlock>
  );
}
