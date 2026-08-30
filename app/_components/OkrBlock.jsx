'use client';

import { useCallback, useEffect, useState } from 'react';
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

  if (!companyId) return null;

  const levelLabel = (level) => {
    const key = `panel.okr.level.${level}`;
    const label = t(locale, key);
    return label === key ? level : label;
  };

  const periodLabel = (obj) => {
    const a = obj.periodStart ? String(obj.periodStart).slice(0, 10) : '';
    const b = obj.periodEnd ? String(obj.periodEnd).slice(0, 10) : '';
    if (a && b) return `${a}–${b}`;
    return a || b || '';
  };

  const createObjective = async () => {
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
    setBusy(true);
    try {
      const res = await fetch('/api/admin/okr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          title: values.title,
          description: values.description || '',
          level: values.level || OKR_OBJECTIVE_LEVEL.COMPANY,
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
          <InlineCallout tone="info" className="mb-0 flex-1 text-xs">
            {t(locale, 'panel.okr.hedgedNote')}
          </InlineCallout>
          <AdminCreateButton
            label={t(locale, 'panel.okr.createObjBtn')}
            onClick={() => void createObjective()}
            disabled={busy}
          />
        </div>

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
                      {period ? (
                        <div className="mt-0.5 font-mono text-2xs text-ink-faint">{period}</div>
                      ) : null}
                      {obj.description ? (
                        <p className={cn(S.muted, 'mb-0 mt-1 text-xs')}>{obj.description}</p>
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
