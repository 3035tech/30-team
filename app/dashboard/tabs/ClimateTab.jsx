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
 * Climate surveys — list / create / open / invite link / aggregate (estrutura B-500).
 */
export function ClimateTab({ locale, isAdmin, companies = [] }) {
  const { toast, promptForm, confirm } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [aggregate, setAggregate] = useState(null);
  const [inviteUrl, setInviteUrl] = useState('');
  const [companyId, setCompanyId] = useState(companies[0]?.id || '');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q =
        isAdmin && companyId
          ? `?companyId=${encodeURIComponent(companyId)}`
          : '';
      const res = await fetch(`/api/admin/climate-surveys${q}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      toast(t(locale, 'panel.climate.loadError'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, isAdmin, locale, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const loadDetail = async (id) => {
    setBusy(true);
    setInviteUrl('');
    setAggregate(null);
    try {
      const res = await fetch(`/api/admin/climate-surveys/${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setSelectedId(id);
      setDetail(data.survey);
      if (data.survey?.responseCount > 0) {
        const ag = await fetch(
          `/api/admin/climate-surveys/${encodeURIComponent(id)}?aggregate=1`
        );
        const agData = await ag.json().catch(() => ({}));
        if (ag.ok) setAggregate(agData);
      }
    } catch {
      toast(t(locale, 'panel.climate.loadError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const createSurvey = async () => {
    const fields = [
      {
        name: 'title',
        label: t(locale, 'panel.climate.titleLabel'),
        placeholder: t(locale, 'panel.climate.titlePh'),
        required: true,
      },
      {
        name: 'description',
        label: t(locale, 'panel.climate.descLabel'),
        placeholder: t(locale, 'panel.climate.descPh'),
      },
    ];
    if (isAdmin && companies.length) {
      fields.unshift({
        name: 'companyId',
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
      if (!res.ok) throw new Error(data?.error || 'create');
      toast(t(locale, 'panel.climate.created'), 'ok');
      if (values.companyId) setCompanyId(values.companyId);
      await load();
      if (data.survey?.id) await loadDetail(data.survey.id);
    } catch {
      toast(t(locale, 'panel.climate.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status) => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/climate-surveys/${encodeURIComponent(selectedId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'patch');
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
      const res = await fetch(`/api/admin/climate-surveys/${encodeURIComponent(selectedId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createInvite: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'invite');
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${origin}/clima/${data.invite.token}`;
      setInviteUrl(url);
      toast(t(locale, 'panel.climate.inviteOk'), 'ok');
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
                    <button type="button" disabled={busy} className={S.btnPrimary} onClick={createInvite}>
                      {t(locale, 'panel.climate.inviteBtn')}
                    </button>
                  ) : null}
                  <button type="button" disabled={busy} className={cn(S.btnGhost, 'text-danger')} onClick={removeSurvey}>
                    {t(locale, 'panel.climate.deleteBtn')}
                  </button>
                </div>
                {inviteUrl ? (
                  <div>
                    <div className={cn(S.label, 'mb-1')}>{t(locale, 'panel.climate.inviteLink')}</div>
                    <CopyableLink url={inviteUrl} locale={locale} />
                  </div>
                ) : null}
                <div>
                  <div className={cn(S.label, 'mb-1')}>{t(locale, 'panel.climate.questions')}</div>
                  <ol className="m-0 list-decimal space-y-1 pl-4 text-xs text-ink-muted">
                    {(detail.questions || []).map((q) => (
                      <li key={q.id}>{q.prompt}</li>
                    ))}
                  </ol>
                </div>
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
