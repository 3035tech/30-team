'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../dashboard-shared';
import { EmptyState } from '../../_components/EmptyState';
import { useAppFeedback } from '../../_components/AppFeedback';
import { AppLoading } from '../../_components/AppLoading';
import { CopyableLink } from '../../_components/CopyableLink';

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

  const companyQs =
    isAdmin && companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/climate-surveys${companyQs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.errorCode || 'load');
      setItems(Array.isArray(data.items) ? data.items : []);
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
    } catch {
      toast(t(locale, 'panel.climate.saveError'), 'error');
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
      const data = await patch(selectedId, { addQuestion: { prompt: values.prompt } });
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

      {benchmark?.prompts?.length > 0 ? (
        <div className={cn(S.cardTight)}>
          <div className={cn(S.label, 'mb-1')}>{t(locale, 'panel.climate.benchmarkTitle')}</div>
          <p className={cn(S.muted, 'm-0 mb-2 text-xs')}>
            {t(locale, 'panel.climate.benchmarkHint', { n: benchmark.minResponses })}
          </p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {benchmark.prompts.slice(0, 6).map((row) => (
              <li key={row.key} className="rounded-md border border-ink/10 px-2 py-1.5 text-xs">
                <div className="text-ink-muted">{row.prompt}</div>
                <div className="mt-1 flex flex-wrap gap-2 font-mono text-ink">
                  {row.means.map((m) => (
                    <span key={m.surveyId}>
                      {m.title}: {m.mean != null ? m.mean : '—'}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {loading ? (
        <AppLoading variant="panel" />
      ) : items.length === 0 ? (
        <EmptyState
          title={t(locale, 'panel.climate.emptyTitle')}
          message={t(locale, 'panel.climate.emptyHint')}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {items.map((s) => (
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
                    {t(locale, 'panel.climate.rCount', { n: s.responseCount || 0 })}
                  </div>
                </button>
              </li>
            ))}
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
                    <button type="button" disabled={busy} className={S.btnBrandSoft} onClick={() => setStatus('open')}>
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
                      <button type="button" disabled={busy} className={S.btnPrimary} onClick={createInvite}>
                        {t(locale, 'panel.climate.inviteBtn')}
                      </button>
                      <button type="button" disabled={busy} className={S.btnBrandSoft} onClick={createInviteBatch}>
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
                {inviteUrls.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <div className={cn(S.label, 'mb-0')}>{t(locale, 'panel.climate.inviteLink')}</div>
                    {inviteUrls.slice(0, 20).map((url) => (
                      <CopyableLink key={url} url={url} locale={locale} />
                    ))}
                    {inviteUrls.length > 20 ? (
                      <p className={cn(S.faint, 'm-0 text-xs')}>
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
                    <ul className="m-0 flex list-none flex-col gap-1 p-0">
                      {aggregate.byQuestion.map((row) => (
                        <li key={row.questionId} className="rounded-md border border-ink/10 px-2 py-1.5 text-xs">
                          <span className="text-ink-muted">{row.prompt}</span>
                          <span className="ml-2 font-mono text-ink">
                            {row.mean != null
                              ? t(locale, 'panel.climate.mean', { n: row.mean, r: row.responses })
                              : t(locale, 'panel.climate.noResponses')}
                          </span>
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
