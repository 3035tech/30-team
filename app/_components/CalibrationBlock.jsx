'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S, AdminEditButton } from '../dashboard/dashboard-shared';
import { EmptyState } from './EmptyState';
import { AppLoading, ContentEnter } from './AppLoading';
import { useAppFeedback } from './AppFeedback';
import { InlineCallout } from './InlineCallout';
import { StatusToneChip } from './StatusToneChip';
import { CollapsibleBlock } from './CollapsibleBlock';

/**
 * B-3001 — Calibration queue for submitted reviews in a cycle.
 * Hedged: scores / 9Box are conversation aids, not promotion labels.
 */
export function CalibrationBlock({ locale = 'pt-BR', companyId, cycleId, cycleTitle = '' }) {
  const { toast, promptForm } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(companyId && cycleId));
  const [busy, setBusy] = useState(false);

  const companyQs = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';

  const load = useCallback(async () => {
    if (!companyId || !cycleId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/performance-cycles/${encodeURIComponent(cycleId)}/calibration${companyQs}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.calibration.loadError'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, cycleId, companyQs, locale, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!companyId || !cycleId) return null;

  const calibrate = async (row) => {
    const values = await promptForm({
      title: t(locale, 'panel.calibration.formTitle', {
        name: row.candidateName || row.candidateEmail || `#${row.candidateId}`,
      }),
      confirmLabel: t(locale, 'panel.calibration.save'),
      fields: [
        {
          key: 'overallScore',
          type: 'number',
          label: t(locale, 'panel.calibration.scoreLabel'),
          help: t(locale, 'panel.calibration.scoreHelp'),
          required: true,
          defaultValue: row.overallScore != null ? String(row.overallScore) : '',
          min: 0,
          max: 100,
        },
        {
          key: 'nineBoxCell',
          type: 'number',
          label: t(locale, 'panel.calibration.nineBoxLabel'),
          help: t(locale, 'panel.calibration.nineBoxHelp'),
          defaultValue: row.nineBoxCell != null ? String(row.nineBoxCell) : '',
          min: 1,
          max: 9,
        },
        {
          key: 'calibrationNotes',
          type: 'textarea',
          label: t(locale, 'panel.calibration.notesLabel'),
          defaultValue: row.calibrationNotes || '',
        },
      ],
    });
    if (!values) return;

    const score = Number(values.overallScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      toast(t(locale, 'panel.calibration.scoreInvalid'), 'error');
      return;
    }

    let nineBoxCell;
    if (values.nineBoxCell === '' || values.nineBoxCell == null) {
      nineBoxCell = null;
    } else {
      const cell = Number(values.nineBoxCell);
      if (!Number.isFinite(cell) || cell < 1 || cell > 9) {
        toast(t(locale, 'panel.calibration.nineBoxInvalid'), 'error');
        return;
      }
      nineBoxCell = Math.round(cell);
    }

    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/performance-cycles/${encodeURIComponent(cycleId)}/calibration`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            reviewId: row.id,
            overallScore: score,
            nineBoxCell,
            calibrationNotes: values.calibrationNotes || '',
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'save');
      toast(t(locale, 'panel.calibration.saved'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.calibration.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <CollapsibleBlock
        locale={locale}
        title={t(locale, 'panel.calibration.title')}
        defaultOpen={false}
        variant="card"
        className="mt-2"
        collapsedHint={t(locale, 'panel.calibration.hint')}
      >
        <AppLoading variant="panel" />
      </CollapsibleBlock>
    );
  }

  const pending = items.filter((r) => !r.calibratedAt).length;
  const ordered = [...items].sort((a, b) => {
    const pa = a.calibratedAt ? 1 : 0;
    const pb = b.calibratedAt ? 1 : 0;
    if (pa !== pb) return pa - pb;
    return String(b.submittedAt || '').localeCompare(String(a.submittedAt || ''));
  });

  const cycleBit = cycleTitle
    ? t(locale, 'panel.calibration.cycleLabel', { title: cycleTitle })
    : '';

  return (
    <CollapsibleBlock
      locale={locale}
      title={t(locale, 'panel.calibration.title')}
      count={items.length || null}
      defaultOpen={pending > 0}
      variant="card"
      className="mt-2"
      collapsedHint={
        pending > 0
          ? [cycleBit, t(locale, 'panel.calibration.pendingHint', { n: pending })]
              .filter(Boolean)
              .join(' · ')
          : cycleBit || t(locale, 'panel.calibration.hint')
      }
    >
      <ContentEnter animKey={`cal|${cycleId}|${items.length}`}>
        {cycleTitle ? (
          <p className="mb-2 font-mono text-2xs text-ink-faint">{cycleBit}</p>
        ) : null}
        <InlineCallout tone="info" className="mb-3 text-xs">
          {t(locale, 'panel.calibration.hedgedNote')}
        </InlineCallout>

        {ordered.length === 0 ? (
          <EmptyState
            title={t(locale, 'panel.calibration.emptyTitle')}
            message={t(locale, 'panel.calibration.emptyHint')}
          />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {ordered.map((row) => (
              <li
                key={row.id}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-2 rounded-control border bg-surface px-3 py-2.5',
                  row.calibratedAt ? 'border-ink/10' : 'border-warning/30'
                )}
              >
                <div className="min-w-0">
                  <div className="font-ui text-sm font-medium text-ink">
                    {row.candidateName || row.candidateEmail || `#${row.candidateId}`}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-2xs text-ink-muted">
                    <span>
                      {t(locale, 'panel.calibration.scoreShort')}:{' '}
                      {row.overallScore != null
                        ? row.overallScore
                        : t(locale, 'panel.common.notApplicable')}
                    </span>
                    {row.nineBoxCell != null ? (
                      <StatusToneChip tone="info">9Box {row.nineBoxCell}</StatusToneChip>
                    ) : null}
                    {row.calibratedAt ? (
                      <StatusToneChip tone="success">
                        {t(locale, 'panel.calibration.calibrated')}
                      </StatusToneChip>
                    ) : (
                      <StatusToneChip tone="warning">
                        {t(locale, 'panel.calibration.needsReview')}
                      </StatusToneChip>
                    )}
                  </div>
                </div>
                <AdminEditButton
                  label={t(locale, 'panel.calibration.calibrateBtn')}
                  onClick={() => void calibrate(row)}
                  disabled={busy}
                />
              </li>
            ))}
          </ul>
        )}
      </ContentEnter>
    </CollapsibleBlock>
  );
}
