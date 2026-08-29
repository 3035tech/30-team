'use client';

import { useEffect, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../dashboard-shared';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { CollapsibleBlock } from '../../_components/CollapsibleBlock';

/** 9Box grid — high performance top row; potential increases left → right. */
const CELL_ORDER = [7, 8, 9, 4, 5, 6, 1, 2, 3];

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
      bordered={false}
    >
      {loading ? (
        <AppLoading variant="panel" label={t(locale, 'nineBox.loading')} />
      ) : error ? (
        <p className={cn(S.muted, 'm-0 text-sm text-danger')}>{error}</p>
      ) : (
        <ContentEnter animKey={`nine-box-${companyId}-${placed}`}>
          <section className={cn(S.cardTight)}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="m-0 font-ui text-lg font-semibold text-ink">
                {t(locale, 'nineBox.title')}
              </h2>
              <span className={cn(S.faint, 'font-mono text-2xs')}>
                {t(locale, 'nineBox.placed', { placed, scanned })}
              </span>
            </div>
            <p className={cn(S.muted, 'm-0 mb-4 text-xs')}>{t(locale, 'nineBox.hint')}</p>

            {placed === 0 ? (
              <div className="space-y-2">
                <p className={cn(S.muted, 'm-0 text-sm')}>{t(locale, 'nineBox.empty')}</p>
                <p className={cn(S.faint, 'm-0 text-xs')}>{t(locale, 'nineBox.emptyHint')}</p>
                <a
                  href="/dashboard?tab=team"
                  className="inline-flex min-h-touch items-center font-mono text-2xs text-brand-600 hover:underline"
                >
                  {t(locale, 'nineBox.emptyCta')}
                </a>
              </div>
            ) : (
              <div
                className="grid grid-cols-3 gap-2 sm:gap-2.5"
                role="grid"
                aria-label={t(locale, 'nineBox.gridAria')}
              >
                {CELL_ORDER.map((cellId) => {
                  const people = Array.isArray(cells[String(cellId)]) ? cells[String(cellId)] : [];
                  const empty = people.length === 0;
                  return (
                    <div
                      key={cellId}
                      role="gridcell"
                      className="flex min-h-[88px] flex-col rounded-control border border-ink/10 bg-canvas/40 p-2"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-1">
                        <span className="font-mono text-2xs uppercase tracking-wide text-ink-faint">
                          {t(locale, `nineBox.cellLabel.${cellId}`)}
                        </span>
                        {!empty ? (
                          <span className="font-mono text-2xs text-ink-muted">{people.length}</span>
                        ) : null}
                      </div>
                      {empty ? (
                        <p className="m-0 mt-auto font-mono text-2xs text-ink-faint">
                          {t(locale, 'nineBox.cellEmpty')}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {people.slice(0, 8).map((p) => (
                            <a
                              key={p.candidateId}
                              href={`/dashboard?tab=team&candidateId=${p.candidateId}`}
                              className="max-w-full truncate rounded-full border border-brand-500/25 bg-brand-500/[0.08] px-2 py-0.5 text-2xs text-brand-800 hover:bg-brand-500/15"
                              title={t(locale, 'nineBox.openPerson', { name: p.name })}
                            >
                              {p.name}
                            </a>
                          ))}
                          {people.length > 8 ? (
                            <span className="self-center font-mono text-2xs text-ink-faint">
                              {t(locale, 'nineBox.more', { n: people.length - 8 })}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {(data?.unplaced?.length || 0) > 0 ? (
              <p className={cn(S.faint, 'm-0 mt-3 text-2xs')}>
                {t(locale, 'nineBox.unplaced', { n: data.unplaced.length })}
              </p>
            ) : null}
          </section>
        </ContentEnter>
      )}
    </CollapsibleBlock>
  );
}
