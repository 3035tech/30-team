'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../dashboard-shared';
import { EmptyState } from '../../_components/EmptyState';
import { useAppFeedback } from '../../_components/AppFeedback';
import { AppLoading } from '../../_components/AppLoading';
import { CopyableLink } from '../../_components/CopyableLink';
import { climateMeanLevel, buildClimateTrendChart } from '../../../lib/people/climate-viz';
import { C } from '../../../lib/theme';

const TONE_BAR = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

const TONE_TEXT = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-ink-muted',
};

const TONE_STROKE = {
  success: C.success,
  warning: C.warning,
  danger: C.danger,
  info: C.info,
};

/** Compact satisfaction meter for climate Likert means (1–5 default). */
function ClimateMeanMeter({
  mean,
  scaleMin = 1,
  scaleMax = 5,
  locale,
  compact = false,
  showLabel = true,
}) {
  const level = climateMeanLevel(mean, scaleMin, scaleMax);
  if (mean == null || !level) return null;
  const barClass = TONE_BAR[level.tone] || TONE_BAR.info;
  const textClass = TONE_TEXT[level.tone] || TONE_TEXT.info;
  return (
    <div className={cn('w-full', compact ? 'mt-1' : 'mt-1.5')}>
      <div className="mb-0.5 flex flex-wrap items-center justify-between gap-1">
        {showLabel ? (
          <span className={cn('font-mono text-[10px]', textClass)}>
            {t(locale, `panel.climate.level.${level.level}`)}
          </span>
        ) : (
          <span />
        )}
        <span className="font-mono text-[10px] text-ink-faint">
          {scaleMin}–{scaleMax}
        </span>
      </div>
      <div
        className={cn(
          'overflow-hidden rounded-full bg-ink/10',
          compact ? 'h-1.5' : 'h-2'
        )}
        role="meter"
        aria-valuemin={scaleMin}
        aria-valuemax={scaleMax}
        aria-valuenow={mean}
        aria-label={t(locale, `panel.climate.level.${level.level}`)}
      >
        <div className={cn('h-full rounded-full transition-[width]', barClass)} style={{ width: `${level.pct}%` }} />
      </div>
    </div>
  );
}

/** SVG trend of overall means across campaigns (oldest → newest). */
function ClimateTrendChart({ surveys, locale }) {
  const chart = buildClimateTrendChart(surveys);
  if (!chart) {
    return (
      <p className={cn(S.faint, 'm-0 text-[11px]')}>{t(locale, 'panel.climate.trendNeedMore')}</p>
    );
  }
  const { points, path, areaPath, w, h, pad, guides, scaleMin, scaleMax } = chart;
  const last = points[points.length - 1];
  const first = points[0];
  const delta =
    last && first ? Math.round((last.mean - first.mean) * 10) / 10 : null;

  return (
    <div className="rounded-control border border-ink/10 bg-canvas/40 px-2.5 py-2">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span className={cn(S.label, 'mb-0 text-[10px]')}>{t(locale, 'panel.climate.trendTitle')}</span>
        {delta != null ? (
          <span
            className={cn(
              'font-mono text-[11px]',
              delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-ink-muted'
            )}
          >
            {t(locale, 'panel.climate.trendDelta', {
              n: delta > 0 ? `+${delta}` : String(delta),
            })}
          </span>
        ) : null}
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label={t(locale, 'panel.climate.trendAria')}
      >
        {guides.map((g) => (
          <g key={g.value}>
            <line
              x1={pad.left}
              x2={w - pad.right}
              y1={g.y}
              y2={g.y}
              stroke="currentColor"
              className="text-ink/10"
              strokeWidth="1"
            />
            <text
              x={pad.left - 6}
              y={g.y + 3}
              textAnchor="end"
              className="fill-ink-faint"
              style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace' }}
            >
              {g.value}
            </text>
          </g>
        ))}
        <path d={areaPath} fill="currentColor" className="text-brand-500/10" />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          className="text-brand-600"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p) => (
          <g key={p.surveyId}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill={TONE_STROKE[p.tone] || TONE_STROKE.info}
              stroke="#fff"
              strokeWidth="1.5"
            />
            <text
              x={p.x}
              y={h - 8}
              textAnchor="middle"
              className="fill-ink-muted"
              style={{ fontSize: 8, fontFamily: 'ui-monospace, monospace' }}
            >
              {(p.title || '—').slice(0, 10)}
            </text>
            <title>{`${p.title}: ${p.mean}`}</title>
          </g>
        ))}
        <text
          x={pad.left - 6}
          y={pad.top + 4}
          textAnchor="end"
          className="fill-ink-faint"
          style={{ fontSize: 8, fontFamily: 'ui-monospace, monospace' }}
        >
          {scaleMax}
        </text>
        <text
          x={pad.left - 6}
          y={pad.top + (h - pad.top - pad.bottom) + 3}
          textAnchor="end"
          className="fill-ink-faint"
          style={{ fontSize: 8, fontFamily: 'ui-monospace, monospace' }}
        >
          {scaleMin}
        </text>
      </svg>
      <p className={cn(S.faint, 'm-0 mt-1 text-[10px]')}>{t(locale, 'panel.climate.trendHint')}</p>
    </div>
  );
}

/**
 * Column comparison of overall means (same campaigns as trend).
 */
function ClimateCompareBars({ surveys, locale }) {
  const rows = [...(surveys || [])]
    .filter((s) => s?.overallMean != null)
    .reverse();
  if (rows.length < 1) return null;
  return (
    <div className="mt-2">
      <div className={cn(S.label, 'mb-1.5 text-[10px]')}>{t(locale, 'panel.climate.compareBarsTitle')}</div>
      <ul className="m-0 flex list-none items-end gap-2 p-0" style={{ minHeight: 72 }}>
        {rows.map((s) => {
          const level = climateMeanLevel(s.overallMean, 1, 5);
          const pct = level?.pct ?? 0;
          return (
            <li key={s.surveyId} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="font-mono text-[10px] text-ink">{s.overallMean}</span>
              <div className="flex h-14 w-full max-w-[48px] items-end justify-center rounded-sm bg-ink/[0.06] px-1 pb-0.5 pt-1">
                <div
                  className={cn('w-full max-w-[28px] rounded-sm', TONE_BAR[level?.tone] || TONE_BAR.info)}
                  style={{ height: `${Math.max(8, pct)}%` }}
                  title={`${s.title}: ${s.overallMean}`}
                />
              </div>
              <span className="w-full truncate text-center font-mono text-[9px] text-ink-faint" title={s.title}>
                {(s.title || '—').slice(0, 12)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Climate surveys — B-503 questions, B-504 batch/email, B-505 benchmark, B-506 k-min.
 */
export function ClimateTab({ locale, isAdmin, companies = [] }) {
  const { toast, promptForm, confirm } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [aggregate, setAggregate] = useState(null);
  const [benchmark, setBenchmark] = useState(null);
  const [inviteUrls, setInviteUrls] = useState([]);
  const [companyId, setCompanyId] = useState(companies[0]?.id || '');
  const [minResponses, setMinResponses] = useState(5);

  const companyQs =
    isAdmin && companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/climate-surveys${companyQs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.errorCode || 'load');
      setItems(Array.isArray(data.items) ? data.items : []);
      if (data.minResponses != null) setMinResponses(Number(data.minResponses) || 5);
      const bq = companyQs ? `${companyQs}&benchmark=1` : '?benchmark=1';
      const br = await fetch(`/api/admin/climate-surveys${bq}`);
      const bd = await br.json().catch(() => ({}));
      if (br.ok) setBenchmark(bd);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.climate.loadError'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [companyQs, locale, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const loadDetail = async (id) => {
    setBusy(true);
    setInviteUrls([]);
    setAggregate(null);
    try {
      const res = await fetch(`/api/admin/climate-surveys/${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setSelectedId(id);
      setDetail(data.survey);
      const ag = await fetch(
        `/api/admin/climate-surveys/${encodeURIComponent(id)}?aggregate=1`
      );
      const agData = await ag.json().catch(() => ({}));
      if (ag.ok) setAggregate(agData);
    } catch {
      toast(t(locale, 'panel.climate.loadError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id, body) => {
    const res = await fetch(`/api/admin/climate-surveys/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'patch');
    return data;
  };

  const createSurvey = async () => {
    const fields = [
      {
        key: 'title',
        label: t(locale, 'panel.climate.titleLabel'),
        placeholder: t(locale, 'panel.climate.titlePh'),
        required: true,
      },
      {
        key: 'description',
        label: t(locale, 'panel.climate.descLabel'),
        placeholder: t(locale, 'panel.climate.descPh'),
      },
    ];
    if (isAdmin && companies.length) {
      fields.unshift({
        key: 'companyId',
        type: 'select',
        label: t(locale, 'panel.climate.companyLabel'),
        options: companies.map((c) => ({ value: String(c.id), label: c.name || c.id })),
        defaultValue: String(companyId || companies[0]?.id || ''),
        required: true,
      });
    }
    const values = await promptForm({
      title: t(locale, 'panel.climate.createTitle'),
      confirmLabel: t(locale, 'panel.climate.createConfirm'),
      fields,
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/climate-surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          description: values.description,
          companyId: values.companyId || companyId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.errorCode || 'create');
      toast(t(locale, 'panel.climate.created'), 'ok');
      if (values.companyId) setCompanyId(values.companyId);
      await load();
      if (data.survey?.id) await loadDetail(data.survey.id);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.climate.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status) => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const data = await patch(selectedId, { status });
      setDetail(data.survey);
      toast(t(locale, 'panel.climate.statusUpdated'), 'ok');
      await load();
      if (status === 'open') {
        try {
          const inv = await patch(selectedId, { createInvite: true });
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          if (inv?.invite?.token) {
            setInviteUrls([`${origin}/clima/${inv.invite.token}`]);
            toast(t(locale, 'panel.climate.inviteOk'), 'ok');
          }
        } catch {
          /* open succeeded; invite is optional follow-up */
        }
      }
    } catch (e) {
      toast(e?.message || t(locale, 'panel.climate.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const createInvite = async () => {
    if (!selectedId) return;
    if (detail?.status !== 'open') {
      toast(t(locale, 'panel.climate.needOpen'), 'info');
      return;
    }
    setBusy(true);
    try {
      const data = await patch(selectedId, { createInvite: true });
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setInviteUrls([`${origin}/clima/${data.invite.token}`]);
      toast(t(locale, 'panel.climate.inviteOk'), 'ok');
    } catch {
      toast(t(locale, 'panel.climate.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const createInviteBatch = async () => {
    if (!selectedId || detail?.status !== 'open') {
      toast(t(locale, 'panel.climate.needOpen'), 'info');
      return;
    }
    const values = await promptForm({
      title: t(locale, 'panel.climate.batchTitle'),
      confirmLabel: t(locale, 'panel.climate.batchConfirm'),
      fields: [
        {
          key: 'count',
          label: t(locale, 'panel.climate.batchCount'),
          placeholder: '10',
          defaultValue: '5',
          required: true,
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const data = await patch(selectedId, {
        createInviteBatch: true,
        count: Number(values.count) || 5,
      });
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setInviteUrls((data.invites || []).map((i) => `${origin}/clima/${i.token}`));
      toast(t(locale, 'panel.climate.batchOk', { n: data.invites?.length || 0 }), 'ok');
    } catch {
      toast(t(locale, 'panel.climate.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const emailInvites = async () => {
    if (!selectedId || detail?.status !== 'open') {
      toast(t(locale, 'panel.climate.needOpen'), 'info');
      return;
    }
    const values = await promptForm({
      title: t(locale, 'panel.climate.emailTitle'),
      confirmLabel: t(locale, 'panel.climate.emailConfirm'),
      fields: [
        {
          key: 'emails',
          label: t(locale, 'panel.climate.emailList'),
          placeholder: t(locale, 'panel.climate.emailPh'),
          required: true,
        },
      ],
    });
    if (!values) return;
    const emails = String(values.emails || '')
      .split(/[\s,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    setBusy(true);
    try {
      const data = await patch(selectedId, {
        emailInvites: true,
        emails,
        locale,
        appOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
      });
      toast(t(locale, 'panel.climate.emailOk', { n: data.sent || 0 }), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.climate.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const addQuestion = async () => {
    if (!selectedId) return;
    const values = await promptForm({
      title: t(locale, 'panel.climate.addQuestionTitle'),
      confirmLabel: t(locale, 'panel.climate.addQuestionConfirm'),
      fields: [
        {
          key: 'kind',
          type: 'select',
          label: t(locale, 'panel.climate.questionKindLabel'),
          defaultValue: 'likert',
          options: [
            { value: 'likert', label: t(locale, 'panel.climate.questionKind.likert') },
            { value: 'text', label: t(locale, 'panel.climate.questionKind.text') },
          ],
        },
        {
          key: 'prompt',
          label: t(locale, 'panel.climate.questionLabel'),
          placeholder: t(locale, 'panel.climate.questionPh'),
          required: true,
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const data = await patch(selectedId, {
        addQuestion: { prompt: values.prompt, questionKind: values.kind || 'likert' },
      });
      setDetail(data.survey);
      toast(t(locale, 'panel.climate.questionSaved'), 'ok');
      await load();
    } catch {
      toast(t(locale, 'panel.climate.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const editQuestion = async (q) => {
    if (!selectedId) return;
    const values = await promptForm({
      title: t(locale, 'panel.climate.editQuestionTitle'),
      confirmLabel: t(locale, 'panel.climate.saveQuestion'),
      fields: [
        {
          key: 'prompt',
          label: t(locale, 'panel.climate.questionLabel'),
          defaultValue: q.prompt,
          required: true,
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const data = await patch(selectedId, {
        updateQuestion: { id: q.id, prompt: values.prompt },
      });
      setDetail(data.survey);
      toast(t(locale, 'panel.climate.questionSaved'), 'ok');
    } catch {
      toast(t(locale, 'panel.climate.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const deactivateQuestion = async (q) => {
    if (!selectedId) return;
    const ok = await confirm({
      message: t(locale, 'panel.climate.deactivateQuestionConfirm'),
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const data = await patch(selectedId, {
        updateQuestion: { id: q.id, active: false },
      });
      setDetail(data.survey);
      toast(t(locale, 'panel.climate.questionSaved'), 'ok');
      await load();
    } catch {
      toast(t(locale, 'panel.climate.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeSurvey = async () => {
    if (!selectedId) return;
    const ok = await confirm({
      message: t(locale, 'panel.climate.deleteConfirm'),
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/climate-surveys/${encodeURIComponent(selectedId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'delete');
      }
      setSelectedId(null);
      setDetail(null);
      toast(t(locale, 'panel.climate.deleted'), 'ok');
      await load();
    } catch {
      toast(t(locale, 'panel.climate.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={S.stack}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 font-display text-xl text-ink">{t(locale, 'panel.climate.pageTitle')}</h2>
          <p className={cn(S.muted, 'm-0 mt-1 max-w-xl text-sm')}>{t(locale, 'panel.climate.pageHint')}</p>
        </div>
        <button type="button" disabled={busy} onClick={createSurvey} className={cn(S.btnPrimary, 'min-h-touch')}>
          {t(locale, 'panel.climate.createBtn')}
        </button>
      </div>

      {isAdmin && companies.length > 0 ? (
        <label className={cn(S.label, 'flex max-w-xs flex-col gap-1')}>
          {t(locale, 'panel.climate.companyLabel')}
          <select
            className={S.select}
            value={String(companyId || '')}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setSelectedId(null);
              setDetail(null);
            }}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.id}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {benchmark?.surveys?.length > 0 ? (
        <div className={cn(S.cardTight)}>
          <div className={cn(S.label, 'mb-1')}>{t(locale, 'panel.climate.benchmarkTitle')}</div>
          <p className={cn(S.muted, 'm-0 mb-2 text-xs')}>
            {t(locale, 'panel.climate.benchmarkHint', { n: benchmark.minResponses })}
          </p>
          <div className="mb-3">
            <ClimateTrendChart surveys={benchmark.surveys} locale={locale} />
            <ClimateCompareBars surveys={benchmark.surveys} locale={locale} />
          </div>
          <ul className="m-0 mb-3 flex list-none flex-col gap-2 p-0">
            {(benchmark.surveys || []).map((s) => {
              return (
              <li
                key={s.surveyId}
                className="rounded-md border border-ink/10 px-2.5 py-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-ink">{s.title}</span>
                  <span className="font-mono text-ink-muted">
                    {s.overallMean != null
                      ? t(locale, 'panel.climate.overallMeanShort', { n: s.overallMean })
                      : '—'}
                    {s.deltaVsPrevious != null ? (
                      <span
                        className={cn(
                          'ml-2',
                          s.deltaVsPrevious > 0 ? 'text-success' : s.deltaVsPrevious < 0 ? 'text-danger' : ''
                        )}
                      >
                        {t(locale, 'panel.climate.deltaVsPrev', {
                          n: s.deltaVsPrevious > 0 ? `+${s.deltaVsPrevious}` : String(s.deltaVsPrevious),
                        })}
                      </span>
                    ) : null}
                    <span className="ml-2 text-ink-faint">
                      {t(locale, 'panel.climate.rCount', { n: s.responseCount || 0 })}
                    </span>
                  </span>
                </div>
                {s.overallMean != null ? (
                  <ClimateMeanMeter mean={s.overallMean} locale={locale} compact />
                ) : null}
              </li>
              );
            })}
          </ul>
          {(benchmark.prompts || []).length > 0 ? (
            <>
              <div className={cn(S.label, 'mb-1')}>{t(locale, 'panel.climate.benchmarkByQuestion')}</div>
              <p className={cn(S.faint, 'm-0 mb-2 text-[10px]')}>{t(locale, 'panel.climate.levelHint')}</p>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {benchmark.prompts.slice(0, 6).map((row) => (
                  <li key={row.key} className="rounded-md border border-ink/10 px-2.5 py-2 text-xs">
                    <div className="mb-1.5 text-ink-muted">{row.prompt}</div>
                    <div className="flex flex-col gap-2">
                      {row.means.map((m) => (
                        <div key={m.surveyId}>
                          <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-ink">
                            <span className="text-ink-muted">{m.title}</span>
                            <span>{m.mean != null ? m.mean : '—'}</span>
                          </div>
                          {m.mean != null ? (
                            <ClimateMeanMeter
                              mean={m.mean}
                              locale={locale}
                              compact
                              showLabel={false}
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <AppLoading variant="panel" />
      ) : items.length === 0 ? (
        <EmptyState
          title={t(locale, 'panel.climate.emptyTitle')}
          message={t(locale, 'panel.climate.emptyHint')}
          actionLabel={t(locale, 'panel.climate.createBtn')}
          onAction={createSurvey}
          actionDisabled={busy}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {items.map((s) => {
              const min = minResponses || 5;
              const resp = Number(s.responseCount) || 0;
              const unlockPct = Math.min(100, Math.round((resp / min) * 100));
              return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => loadDetail(s.id)}
                  className={cn(
                    'w-full cursor-pointer rounded-card border px-3 py-3 text-left',
                    selectedId === s.id
                      ? 'border-brand-500/40 bg-brand-500/[0.06]'
                      : 'border-ink/12 bg-canvas/50'
                  )}
                >
                  <div className="font-ui text-sm text-ink">{s.title}</div>
                  <div className={cn(S.faint, 'mt-1 font-mono text-[11px]')}>
                    {t(locale, `panel.climate.status.${s.status}`)} ·{' '}
                    {t(locale, 'panel.climate.qCount', { n: s.questionCount || 0 })} ·{' '}
                    {t(locale, 'panel.climate.rCount', { n: resp })}
                  </div>
                  {s.status === 'open' || s.status === 'closed' ? (
                    <div className="mt-2">
                      <div className="mb-0.5 flex justify-between font-mono text-[10px] text-ink-faint">
                        <span>{t(locale, 'panel.climate.responseProgress', { n: resp, min })}</span>
                        <span>{unlockPct}%</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-ink/10">
                        <div
                          className={cn('h-full rounded-full', resp >= min ? 'bg-success' : 'bg-info')}
                          style={{ width: `${unlockPct}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </button>
              </li>
              );
            })}
          </ul>

          <div className={cn(S.card, 'min-h-[200px]')}>
            {!detail ? (
              <p className={cn(S.muted, 'm-0 text-sm')}>{t(locale, 'panel.climate.pickHint')}</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="m-0 font-display text-lg text-ink">{detail.title}</h3>
                  {detail.description ? (
                    <p className={cn(S.muted, 'm-0 mt-1 text-sm')}>{detail.description}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {detail.status === 'draft' ? (
                    <button type="button" disabled={busy} className={S.btnPrimary} onClick={() => setStatus('open')}>
                      {t(locale, 'panel.climate.openBtn')}
                    </button>
                  ) : null}
                  {detail.status === 'open' ? (
                    <button type="button" disabled={busy} className={S.btnGhost} onClick={() => setStatus('closed')}>
                      {t(locale, 'panel.climate.closeBtn')}
                    </button>
                  ) : null}
                  {detail.status === 'open' ? (
                    <>
                      <button type="button" disabled={busy} className={S.btnBrandSoft} onClick={createInvite}>
                        {t(locale, 'panel.climate.inviteBtn')}
                      </button>
                      <button type="button" disabled={busy} className={S.btnGhost} onClick={createInviteBatch}>
                        {t(locale, 'panel.climate.batchBtn')}
                      </button>
                      <button type="button" disabled={busy} className={S.btnGhost} onClick={emailInvites}>
                        {t(locale, 'panel.climate.emailBtn')}
                      </button>
                    </>
                  ) : null}
                  {detail.status !== 'closed' ? (
                    <button type="button" disabled={busy} className={S.btnGhost} onClick={addQuestion}>
                      {t(locale, 'panel.climate.addQuestionBtn')}
                    </button>
                  ) : null}
                  <button type="button" disabled={busy} className={cn(S.btnGhost, 'text-danger')} onClick={removeSurvey}>
                    {t(locale, 'panel.climate.deleteBtn')}
                  </button>
                </div>
                {detail.status === 'open' || detail.status === 'closed' ? (
                  <div className="rounded-control border border-ink/10 bg-canvas/50 px-3 py-2">
                    {(() => {
                      const min = aggregate?.minResponses || minResponses || 5;
                      const resp = aggregate?.responseCount ?? detail.responseCount ?? 0;
                      const pct = Math.min(100, Math.round((resp / min) * 100));
                      return (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-[11px] text-ink-muted">
                              {t(locale, 'panel.climate.responseProgress', { n: resp, min })}
                            </span>
                            {aggregate?.overallMean != null ? (
                              <span className="font-mono text-[12px] text-ink">
                                {t(locale, 'panel.climate.overallMeanShort', { n: aggregate.overallMean })}
                              </span>
                            ) : null}
                          </div>
                          {aggregate?.overallMean != null ? (
                            <ClimateMeanMeter mean={aggregate.overallMean} locale={locale} />
                          ) : (
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10">
                              <div
                                className={cn('h-full rounded-full', resp >= min ? 'bg-success' : 'bg-info')}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                          {aggregate?.overallMean == null ? null : (
                            <div className="mt-1.5 flex justify-between font-mono text-[10px] text-ink-faint">
                              <span>{t(locale, 'panel.climate.responseProgress', { n: resp, min })}</span>
                              <span>{pct}%</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : null}
                {detail.status === 'open' && inviteUrls.length === 0 ? (
                  <div className="rounded-card border border-brand-500/25 bg-brand-500/[0.06] px-3 py-3">
                    <p className={cn(S.muted, 'm-0 mb-2 text-sm')}>{t(locale, 'panel.climate.invitePrimaryHint')}</p>
                    <button type="button" disabled={busy} className={S.btnPrimary} onClick={createInvite}>
                      {t(locale, 'panel.climate.inviteBtn')}
                    </button>
                  </div>
                ) : null}
                {inviteUrls.length > 0 ? (
                  <div className="rounded-card border border-brand-500/30 bg-brand-500/[0.07] px-3 py-3">
                    <div className={cn(S.label, 'mb-2')}>{t(locale, 'panel.climate.inviteLink')}</div>
                    {inviteUrls.slice(0, 20).map((url) => (
                      <CopyableLink key={url} url={url} locale={locale} />
                    ))}
                    {inviteUrls.length > 20 ? (
                      <p className={cn(S.faint, 'm-0 mt-2 text-xs')}>
                        {t(locale, 'panel.climate.batchMore', { n: inviteUrls.length - 20 })}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div>
                  <div className={cn(S.label, 'mb-1')}>{t(locale, 'panel.climate.questions')}</div>
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {(detail.questions || []).map((q, idx) => (
                      <li
                        key={q.id}
                        className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-ink/10 px-2 py-1.5 text-xs"
                      >
                        <span className="min-w-0 flex-1 text-ink-muted">
                          <span className="font-mono text-ink-faint">{idx + 1}. </span>
                          <span className="mr-1.5 rounded border border-ink/10 px-1 py-0.5 font-mono text-[10px] text-ink-faint">
                            {t(
                              locale,
                              `panel.climate.questionKind.${
                                String(q.questionKind || '').toLowerCase() === 'text' ? 'text' : 'likert'
                              }`
                            )}
                          </span>
                          {q.prompt}
                        </span>
                        {detail.status !== 'closed' ? (
                          <span className="flex gap-1">
                            <button type="button" className={S.btnGhost} disabled={busy} onClick={() => editQuestion(q)}>
                              {t(locale, 'panel.climate.editQuestionBtn')}
                            </button>
                            <button
                              type="button"
                              className={cn(S.btnGhost, 'text-danger')}
                              disabled={busy}
                              onClick={() => deactivateQuestion(q)}
                            >
                              {t(locale, 'panel.climate.deactivateQuestionBtn')}
                            </button>
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
                {aggregate?.suppressed ? (
                  <p className={cn(S.muted, 'm-0 text-sm')}>
                    {t(locale, 'panel.climate.aggregateSuppressed', {
                      n: aggregate.responseCount || 0,
                      min: aggregate.minResponses || 5,
                    })}
                  </p>
                ) : null}
                {aggregate?.byQuestion?.length ? (
                  <div>
                    <div className={cn(S.label, 'mb-1')}>{t(locale, 'panel.climate.aggregate')}</div>
                    {aggregate.overallMean != null ? (
                      <div className="mb-3 rounded-control border border-ink/10 bg-canvas/60 px-3 py-2.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-xs text-ink-muted">
                            {t(locale, 'panel.climate.satisfactionTitle')}
                          </span>
                          <span className="font-display text-xl text-ink">{aggregate.overallMean}</span>
                        </div>
                        <ClimateMeanMeter mean={aggregate.overallMean} locale={locale} />
                        <p className={cn(S.faint, 'm-0 mt-1.5 text-[10px]')}>
                          {t(locale, 'panel.climate.levelHint')}
                        </p>
                      </div>
                    ) : null}
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                      {aggregate.byQuestion.map((row) => {
                        const scaleMax = Number(row.scaleMax) || 5;
                        const scaleMin = Number(row.scaleMin) || 1;
                        return (
                          <li key={row.questionId} className="rounded-md border border-ink/10 px-2 py-1.5 text-xs">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="min-w-0 flex-1 text-ink-muted">{row.prompt}</span>
                              <span className="shrink-0 font-mono text-ink">
                                {row.mean != null
                                  ? t(locale, 'panel.climate.mean', { n: row.mean, r: row.responses })
                                  : t(locale, 'panel.climate.noResponses')}
                              </span>
                            </div>
                            {row.mean != null ? (
                              <ClimateMeanMeter
                                mean={row.mean}
                                scaleMin={scaleMin}
                                scaleMax={scaleMax}
                                locale={locale}
                                compact
                              />
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
                {aggregate?.textByQuestion?.length && !aggregate.suppressed ? (
                  <div>
                    <div className={cn(S.label, 'mb-1')}>{t(locale, 'panel.climate.textAnswersTitle')}</div>
                    <p className={cn(S.faint, 'm-0 mb-2 text-[10px]')}>
                      {t(locale, 'panel.climate.textAnswersHint')}
                    </p>
                    <ul className="m-0 flex list-none flex-col gap-3 p-0">
                      {aggregate.textByQuestion.map((block) => (
                        <li key={block.questionId} className="rounded-md border border-ink/10 px-2.5 py-2">
                          <div className="mb-1.5 text-xs text-ink">
                            {block.prompt}
                            <span className="ml-2 font-mono text-[10px] text-ink-faint">
                              {t(locale, 'panel.climate.textAnswersCount', { n: block.responses || 0 })}
                            </span>
                          </div>
                          {(block.answers || []).length ? (
                            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                              {block.answers.map((ans, i) => (
                                <li
                                  key={`${block.questionId}-${i}`}
                                  className="rounded border border-ink/8 bg-canvas/50 px-2 py-1.5 text-[12px] leading-relaxed text-ink-muted"
                                >
                                  {ans}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className={cn(S.muted, 'm-0 text-xs')}>{t(locale, 'panel.climate.noResponses')}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
