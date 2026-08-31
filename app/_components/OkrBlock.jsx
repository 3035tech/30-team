'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import {
  S,
  AdminCreateButton,
  AdminDeleteButton,
  AdminEditButton,
  AdminIconButton,
} from '../dashboard/dashboard-shared';
import { EmptyState } from './EmptyState';
import { AppLoading, ContentEnter } from './AppLoading';
import { useAppFeedback } from './AppFeedback';
import { InlineCallout } from './InlineCallout';
import { StatusToneChip } from './StatusToneChip';
import { OKR_OBJECTIVE_LEVEL } from '../../lib/domain-status.js';
import { MeterBar } from './MeterBar';
import { CollapsibleBlock } from './CollapsibleBlock';
import { CategoryBars } from './CategoryBars';
import { ChartPanel } from './ChartPanel';
import { okrLevelRollup } from '../../lib/chart-aggregates';

/**
 * B-3004 — Light OKRs (company / team / person objectives + key results).
 */
export function OkrBlock({ locale = 'pt-BR', companyId }) {
  const { toast, promptForm, confirm } = useAppFeedback();
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(companyId));
  const [busy, setBusy] = useState(false);

  const companyQs = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';

  const load = useCallback(async () => {
    if (!companyId) {
      setObjectives([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/okr${companyQs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setObjectives(Array.isArray(data.objectives) ? data.objectives : []);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.loadError'), 'error');
      setObjectives([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, companyQs, locale, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const levelLabel = (level) => {
    const key = `panel.okr.level.${level}`;
    const label = t(locale, key);
    return label === key ? level : label;
  };

  const rollup = useMemo(() => okrLevelRollup(objectives), [objectives]);
  const rollupBars = useMemo(() => {
    const labelFor = (level) => {
      const key = `panel.okr.level.${level}`;
      const label = t(locale, key);
      return label === key ? level : label;
    };
    return rollup.map((r) => ({
      id: r.id,
      label: t(locale, 'panel.okr.rollupLevelLabel', {
        level: labelFor(r.level),
        n: r.krCount,
      }),
      value: r.avgPct ?? 0,
      toneClass:
        (r.avgPct ?? 0) >= 75
          ? 'bg-success'
          : (r.avgPct ?? 0) >= 40
            ? 'bg-info'
            : 'bg-warning',
    }));
  }, [rollup, locale]);
  const rollupKrTotal = useMemo(
    () => rollup.reduce((n, r) => n + (r.krCount || 0), 0),
    [rollup]
  );

  const periodLabel = (obj) => {
    const a = obj.periodStart ? String(obj.periodStart).slice(0, 10) : '';
    const b = obj.periodEnd ? String(obj.periodEnd).slice(0, 10) : '';
    if (a && b) return `${a}–${b}`;
    return a || b || '';
  };

  const createObjective = async () => {
    let teamGroups = [];
    try {
      const res = await fetch(`/api/admin/team-groups${companyQs}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.items)) teamGroups = data.items;
    } catch {
      /* optional */
    }
    const parentOptions = [
      { value: '', label: t(locale, 'panel.okr.parentNone') },
      ...objectives
        .filter((o) => o.level === OKR_OBJECTIVE_LEVEL.COMPANY || o.level === OKR_OBJECTIVE_LEVEL.TEAM)
        .map((o) => ({
          value: String(o.id),
          label: `${levelLabel(o.level)}: ${o.title}`.slice(0, 80),
        })),
    ];
    const groupOptions = [
      { value: '', label: t(locale, 'panel.okr.groupNone') },
      ...teamGroups.map((g) => ({
        value: String(g.id),
        label: g.name || `#${g.id}`,
      })),
    ];

    const values = await promptForm({
      title: t(locale, 'panel.okr.createObjTitle'),
      confirmLabel: t(locale, 'panel.okr.createObjConfirm'),
      fields: [
        {
          key: 'title',
          type: 'text',
          label: t(locale, 'panel.okr.titleLabel'),
          required: true,
        },
        {
          key: 'description',
          type: 'textarea',
          label: t(locale, 'panel.okr.descLabel'),
        },
        {
          key: 'level',
          type: 'select',
          label: t(locale, 'panel.okr.levelLabel'),
          defaultValue: OKR_OBJECTIVE_LEVEL.COMPANY,
          options: [
            { value: OKR_OBJECTIVE_LEVEL.COMPANY, label: levelLabel('company') },
            { value: OKR_OBJECTIVE_LEVEL.TEAM, label: levelLabel('team') },
            { value: OKR_OBJECTIVE_LEVEL.PERSON, label: levelLabel('person') },
          ],
        },
        {
          key: 'parentId',
          type: 'select',
          label: t(locale, 'panel.okr.parentLabel'),
          help: t(locale, 'panel.okr.parentHelp'),
          defaultValue: '',
          options: parentOptions,
        },
        {
          key: 'teamGroupId',
          type: 'select',
          label: t(locale, 'panel.okr.groupLabel'),
          help: t(locale, 'panel.okr.groupHelp'),
          defaultValue: '',
          options: groupOptions,
        },
        {
          key: 'candidateId',
          type: 'entitySearch',
          label: t(locale, 'panel.okr.personLabel'),
          help: t(locale, 'panel.okr.personHelp'),
          searchUrl: `/api/admin/employees/search?companyId=${encodeURIComponent(companyId)}`,
          minChars: 2,
        },
        {
          key: 'periodStart',
          type: 'date',
          label: t(locale, 'panel.okr.periodStart'),
        },
        {
          key: 'periodEnd',
          type: 'date',
          label: t(locale, 'panel.okr.periodEnd'),
        },
      ],
    });
    if (!values?.title) return;
    const level = values.level || OKR_OBJECTIVE_LEVEL.COMPANY;
    if (level === OKR_OBJECTIVE_LEVEL.TEAM && !values.teamGroupId) {
      toast(t(locale, 'panel.okr.teamGroupRequired'), 'error');
      return;
    }
    if (level === OKR_OBJECTIVE_LEVEL.PERSON && !values.candidateId) {
      toast(t(locale, 'panel.okr.personRequired'), 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/okr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          title: values.title,
          description: values.description || '',
          level,
          parentId: values.parentId ? Number(values.parentId) : null,
          teamGroupId:
            level === OKR_OBJECTIVE_LEVEL.TEAM && values.teamGroupId
              ? Number(values.teamGroupId)
              : null,
          candidateId:
            level === OKR_OBJECTIVE_LEVEL.PERSON && values.candidateId
              ? Number(values.candidateId)
              : null,
          periodStart: values.periodStart || null,
          periodEnd: values.periodEnd || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'create');
      toast(t(locale, 'panel.okr.created'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const addKeyResult = async (obj) => {
    const values = await promptForm({
      title: t(locale, 'panel.okr.addKrTitle'),
      confirmLabel: t(locale, 'panel.okr.addKrConfirm'),
      fields: [
        {
          key: 'title',
          type: 'text',
          label: t(locale, 'panel.okr.krTitleLabel'),
          required: true,
        },
        {
          key: 'unit',
          type: 'text',
          label: t(locale, 'panel.okr.unitLabel'),
          defaultValue: '%',
        },
        {
          key: 'targetValue',
          type: 'number',
          label: t(locale, 'panel.okr.targetLabel'),
          required: true,
          defaultValue: '100',
        },
        {
          key: 'currentValue',
          type: 'number',
          label: t(locale, 'panel.okr.currentLabel'),
          defaultValue: '0',
        },
      ],
    });
    if (!values?.title) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/okr/${encodeURIComponent(obj.id)}/key-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          title: values.title,
          unit: values.unit || '',
          targetValue: Number(values.targetValue) || 0,
          currentValue: Number(values.currentValue) || 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'kr');
      toast(t(locale, 'panel.okr.krCreated'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const updateProgress = async (kr) => {
    const values = await promptForm({
      title: t(locale, 'panel.okr.progressTitle'),
      confirmLabel: t(locale, 'panel.okr.progressConfirm'),
      fields: [
        {
          key: 'currentValue',
          type: 'number',
          label: t(locale, 'panel.okr.currentLabel'),
          required: true,
          defaultValue: String(kr.currentValue ?? 0),
        },
        {
          key: 'targetValue',
          type: 'number',
          label: t(locale, 'panel.okr.targetLabel'),
          defaultValue: String(kr.targetValue ?? 0),
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/okr/key-results/${encodeURIComponent(kr.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          currentValue: Number(values.currentValue),
          targetValue:
            values.targetValue !== '' && values.targetValue != null
              ? Number(values.targetValue)
              : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'patch');
      toast(t(locale, 'panel.okr.progressSaved'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeObjective = async (obj) => {
    const ok = await confirm({
      message: t(locale, 'panel.okr.deleteConfirm'),
      danger: true,
      confirmLabel: t(locale, 'panel.okr.deleteBtn'),
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/okr/${encodeURIComponent(obj.id)}${companyQs}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'delete');
      toast(t(locale, 'panel.okr.deleted'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.okr.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!companyId) return null;

  return (
    <CollapsibleBlock
      locale={locale}
      title={t(locale, 'panel.okr.title')}
      count={!loading ? objectives.length || null : null}
      defaultOpen={false}
      variant="card"
      className="mt-2"
      collapsedHint={t(locale, 'panel.okr.hint')}
    >
      {loading ? (
        <AppLoading variant="panel" />
      ) : (
      <ContentEnter animKey={`okr|${companyId}|${objectives.length}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <InlineCallout tone="info" className="mb-0 flex-1">
            {t(locale, 'panel.okr.hedgedNote')}
          </InlineCallout>
          <AdminCreateButton
            label={t(locale, 'panel.okr.createObjBtn')}
            onClick={() => void createObjective()}
            disabled={busy}
          />
        </div>

        {rollupBars.length > 0 ? (
          <ChartPanel
            className="mb-4"
            title={t(locale, 'panel.okr.rollupTitle')}
            hint={t(locale, 'panel.okr.rollupHint', { n: rollupKrTotal })}
          >
            <CategoryBars
              items={rollupBars}
              max={100}
              height={8}
              valueSuffix="%"
              labelClassName="w-[8.5rem] shrink-0 truncate text-prose text-ink sm:w-[11rem]"
            />
          </ChartPanel>
        ) : null}

        {objectives.length === 0 ? (
          <EmptyState
            title={t(locale, 'panel.okr.emptyTitle')}
            message={t(locale, 'panel.okr.emptyHint')}
            actionLabel={t(locale, 'panel.okr.createObjBtn')}
            onAction={() => void createObjective()}
          />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {objectives.map((obj) => {
              const period = periodLabel(obj);
              return (
                <li
                  key={obj.id}
                  className="rounded-control border border-ink/10 bg-surface px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-ui text-sm font-medium text-ink">{obj.title}</span>
                        <StatusToneChip tone="neutral">{levelLabel(obj.level)}</StatusToneChip>
                      </div>
                      {(obj.teamGroupName || obj.candidateName || obj.parentTitle) ? (
                        <div className="mt-0.5 font-mono text-2xs text-ink-faint">
                          {[
                            obj.parentTitle
                              ? t(locale, 'panel.okr.metaParent', { title: obj.parentTitle })
                              : null,
                            obj.teamGroupName
                              ? t(locale, 'panel.okr.metaGroup', { name: obj.teamGroupName })
                              : null,
                            obj.candidateName
                              ? t(locale, 'panel.okr.metaPerson', { name: obj.candidateName })
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      ) : null}
                      {period ? (
                        <div className="mt-0.5 font-mono text-2xs text-ink-faint">{period}</div>
                      ) : null}
                      {obj.description ? (
                        <p className={cn(S.muted, 'mb-0 mt-1 text-prose')}>{obj.description}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <AdminIconButton
                        icon="plus"
                        label={t(locale, 'panel.okr.addKrBtn')}
                        onClick={() => void addKeyResult(obj)}
                        disabled={busy}
                      />
                      <AdminDeleteButton
                        label={t(locale, 'panel.okr.deleteBtn')}
                        onClick={() => void removeObjective(obj)}
                        disabled={busy}
                      />
                    </div>
                  </div>
                  {(obj.keyResults || []).length === 0 ? (
                    <p className={cn(S.faint, 'mb-0 mt-2 text-2xs')}>
                      {t(locale, 'panel.okr.noKrs')}
                    </p>
                  ) : (
                    <ul className="mt-2 m-0 flex list-none flex-col gap-2 p-0">
                      {obj.keyResults.map((kr) => (
                        <li
                          key={kr.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-ink/8 bg-canvas/60 px-2.5 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-ui text-prose text-ink">{kr.title}</div>
                            <div className="mt-1 max-w-xs">
                              <MeterBar
                                value={Number(kr.currentValue) || 0}
                                max={Math.max(Number(kr.targetValue) || 1, 1)}
                                aria-label={kr.title}
                              />
                            </div>
                            <div className="mt-0.5 font-mono text-2xs text-ink-muted">
                              {kr.currentValue}
                              {kr.unit ? ` ${kr.unit}` : ''} / {kr.targetValue}
                              {kr.unit ? ` ${kr.unit}` : ''}
                            </div>
                          </div>
                          <AdminEditButton
                            label={t(locale, 'panel.okr.progressBtn')}
                            onClick={() => void updateProgress(kr)}
                            disabled={busy}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </ContentEnter>
      )}
    </CollapsibleBlock>
  );
}
