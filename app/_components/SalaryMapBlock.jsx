'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { formatSalaryDisplay } from '../../lib/br-masks';
import {
  S,
  AdminTableShell,
  AdminTh,
} from '../dashboard/dashboard-shared';
import { EmptyState } from './EmptyState';
import { AppLoading, ContentEnter } from './AppLoading';
import { useAppFeedback } from './AppFeedback';
import { FormField } from './FormField';
import { InlineCallout } from './InlineCallout';
import { fieldInputClass } from './form-control-styles';
import { CollapsibleBlock } from './CollapsibleBlock';
import { SegmentedControl } from './SegmentedControl';

/**
 * B-3002 — Analytic salary map by job role + simple % raise simulation.
 */
export function SalaryMapBlock({ locale = 'pt-BR', companyId }) {
  const { toast } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(companyId));
  const [pct, setPct] = useState('5');
  const [simulation, setSimulation] = useState(null);
  const [simBusy, setSimBusy] = useState(false);
  const [scope, setScope] = useState('active'); // active | all

  const money = (n) => formatSalaryDisplay(n, locale);

  const load = useCallback(async () => {
    if (!companyId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/compensation/salary-map?companyId=${encodeURIComponent(companyId)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setItems(Array.isArray(data.items) ? data.items : []);
      setSimulation(null);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.salaryMap.loadError'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, locale, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const rows = [...items].sort((a, b) => {
      const hb = (Number(b.headcount) || 0) - (Number(a.headcount) || 0);
      if (hb !== 0) return hb;
      return String(a.name || '').localeCompare(String(b.name || ''), locale === 'en' ? 'en' : 'pt');
    });
    if (scope === 'all') return rows;
    return rows.filter((r) => (Number(r.headcount) || 0) > 0);
  }, [items, locale, scope]);

  const belowTotal = useMemo(
    () => visible.reduce((n, r) => n + (Number(r.below) || 0), 0),
    [visible]
  );

  const runSimulate = async () => {
    if (!companyId) return;
    const value = Number(pct);
    if (!Number.isFinite(value) || value < 0) {
      toast(t(locale, 'panel.salaryMap.pctInvalid'), 'error');
      return;
    }
    setSimBusy(true);
    try {
      const params = new URLSearchParams({
        companyId: String(companyId),
        simulate: '1',
        mode: 'pct',
        value: String(value),
      });
      const res = await fetch(`/api/admin/compensation/salary-map?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'sim');
      setItems(Array.isArray(data.items) ? data.items : items);
      setSimulation(data.simulation || null);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.salaryMap.simError'), 'error');
    } finally {
      setSimBusy(false);
    }
  };

  if (!companyId) return null;

  return (
    <CollapsibleBlock
      locale={locale}
      title={t(locale, 'panel.salaryMap.title')}
      count={!loading ? visible.length || null : null}
      defaultOpen={false}
      variant="card"
      collapsedHint={
        !loading && belowTotal > 0
          ? t(locale, 'panel.salaryMap.belowHint', { n: belowTotal })
          : t(locale, 'panel.salaryMap.hint')
      }
    >
      {loading ? (
        <AppLoading variant="panel" />
      ) : (
      <ContentEnter animKey={`smap|${companyId}|${items.length}|${scope}`}>
        <p className={cn(S.muted, 'mb-3 text-xs')}>{t(locale, 'panel.salaryMap.hint')}</p>

        <div className="mb-3">
          <SegmentedControl
            aria-label={t(locale, 'panel.salaryMap.scopeAria')}
            value={scope}
            onChange={setScope}
            size="sm"
            options={[
              { id: 'active', label: t(locale, 'panel.salaryMap.scopeActive') },
              { id: 'all', label: t(locale, 'panel.salaryMap.scopeAll') },
            ]}
          />
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <FormField label={t(locale, 'panel.salaryMap.pctLabel')} className="w-28">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className={cn(fieldInputClass, 'w-full')}
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              aria-label={t(locale, 'panel.salaryMap.pctLabel')}
            />
          </FormField>
          <button
            type="button"
            className={cn(S.btnBrandSoft, 'min-h-touch text-prose')}
            disabled={simBusy || visible.length === 0}
            onClick={() => void runSimulate()}
          >
            {t(locale, 'panel.salaryMap.simulateBtn')}
          </button>
        </div>

        {simulation ? (
          <InlineCallout tone="info" className="mb-4 text-xs">
            {t(locale, 'panel.salaryMap.simResult', {
              delta: money(simulation.delta),
              next: money(simulation.nextPayroll),
              people: simulation.people,
            })}
          </InlineCallout>
        ) : null}

        {visible.length === 0 ? (
          <EmptyState
            title={t(locale, 'panel.salaryMap.emptyTitle')}
            message={t(locale, 'panel.salaryMap.emptyHint')}
          />
        ) : (
          <AdminTableShell minWidth="560px" animKey={`roles|${scope}|${visible.length}`}>
            <thead className="border-b border-ink/10 bg-canvas-alt">
              <tr>
                <AdminTh>{t(locale, 'panel.salaryMap.colRole')}</AdminTh>
                <AdminTh>{t(locale, 'panel.salaryMap.colHeadcount')}</AdminTh>
                <AdminTh>{t(locale, 'panel.salaryMap.colBelow')}</AdminTh>
                <AdminTh>{t(locale, 'panel.salaryMap.colInBand')}</AdminTh>
                <AdminTh>{t(locale, 'panel.salaryMap.colAbove')}</AdminTh>
                <AdminTh>{t(locale, 'panel.salaryMap.colPayroll')}</AdminTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {visible.map((row) => (
                <tr
                  key={row.jobRoleId}
                  className={cn(
                    'hover:bg-canvas-alt/50',
                    row.below > 0 && 'bg-warning/[0.04]'
                  )}
                >
                  <td className="px-4 py-2.5 text-sm text-ink">{row.name}</td>
                  <td className="px-4 py-2.5 font-mono text-prose text-ink-muted">
                    {row.headcount}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-2.5 font-mono text-prose',
                      row.below > 0 ? 'font-medium text-warning' : 'text-ink-muted'
                    )}
                  >
                    {row.below}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-prose text-success">
                    {row.inBand}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-prose text-info">
                    {row.above}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-prose tabular-nums text-ink">
                    {money(row.payrollSum)}
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTableShell>
        )}
      </ContentEnter>
      )}
    </CollapsibleBlock>
  );
}
