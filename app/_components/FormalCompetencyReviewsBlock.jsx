'use client';

/**
 * B-RH2-15 — Formal competency reviews (90 / 180 / 360 + optional self).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorMessage, t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import {
  FORMAL_LIKERT_MAX,
  FORMAL_LIKERT_MIN,
  FORMAL_RATER_ROLE,
  FORMAL_RATER_STATUS,
  FORMAL_REVIEW_CYCLE_STATUS,
  FORMAL_REVIEW_MODEL,
  FORMAL_REVIEW_STATUS,
} from '../../../lib/domain-status.js';
import { useAppFeedback } from '../AppFeedback';
import { EmptyState } from '../EmptyState';
import { AppLoading, ContentEnter } from '../AppLoading';
import { CollapsibleBlock } from '../CollapsibleBlock';
import { CopyableLink } from '../CopyableLink';
import { FormField } from '../FormField';
import { InlineCallout } from '../InlineCallout';
import { ScaleRatingButtons } from '../ScaleRatingButtons';
import { StatusToneChip } from '../StatusToneChip';
import {
  AdminActionsCell,
  AdminActionsTh,
  AdminCreateButton,
  AdminPageHeader,
  AdminTableShell,
  AdminTh,
  AdminViewButton,
  S,
} from '../../dashboard/dashboard-shared';

function tf(locale, key, vars) {
  return t(locale, `performanceReviews.formal.${key}`, vars || {});
}

function apiToastError(locale, json, fallbackKey) {
  if (json?.errorCode) return errorMessage(locale, json.errorCode, json.error);
  return json?.error || tf(locale, fallbackKey);
}

function modelLabel(locale, model) {
  if (model === FORMAL_REVIEW_MODEL.ONE_EIGHTY) return tf(locale, 'model180');
  if (model === FORMAL_REVIEW_MODEL.THREE_SIXTY) return tf(locale, 'model360');
  return tf(locale, 'model90');
}

function modelShort(locale, model) {
  if (model === FORMAL_REVIEW_MODEL.ONE_EIGHTY) return tf(locale, 'modelShort180');
  if (model === FORMAL_REVIEW_MODEL.THREE_SIXTY) return tf(locale, 'modelShort360');
  return tf(locale, 'modelShort90');
}

function cycleStatusTone(status) {
  if (status === FORMAL_REVIEW_CYCLE_STATUS.OPEN) return 'success';
  if (status === FORMAL_REVIEW_CYCLE_STATUS.CLOSED) return 'neutral';
  return 'info';
}

function cycleStatusLabel(locale, status) {
  if (status === FORMAL_REVIEW_CYCLE_STATUS.OPEN) return tf(locale, 'statusOpen');
  if (status === FORMAL_REVIEW_CYCLE_STATUS.CLOSED) return tf(locale, 'statusClosed');
  return tf(locale, 'statusDraft');
}

function reviewStatusTone(status) {
  if (status === FORMAL_REVIEW_STATUS.SENT) return 'success';
  if (status === FORMAL_REVIEW_STATUS.FINALIZED) return 'info';
  if (status === FORMAL_REVIEW_STATUS.COLLECTING) return 'warning';
  if (status === FORMAL_REVIEW_STATUS.ARCHIVED) return 'neutral';
  return 'info';
}

function reviewStatusLabel(locale, status) {
  const map = {
    [FORMAL_REVIEW_STATUS.DRAFT]: 'reviewStatusDraft',
    [FORMAL_REVIEW_STATUS.COLLECTING]: 'reviewStatusCollecting',
    [FORMAL_REVIEW_STATUS.FINALIZED]: 'reviewStatusFinalized',
    [FORMAL_REVIEW_STATUS.SENT]: 'reviewStatusSent',
    [FORMAL_REVIEW_STATUS.ARCHIVED]: 'reviewStatusArchived',
  };
  return tf(locale, map[status] || 'reviewStatusDraft');
}

function raterRoleLabel(locale, role) {
  const map = {
    [FORMAL_RATER_ROLE.MANAGER]: 'roleManager',
    [FORMAL_RATER_ROLE.SELF]: 'roleSelf',
    [FORMAL_RATER_ROLE.UPWARD]: 'roleUpward',
    [FORMAL_RATER_ROLE.EXTERNAL]: 'roleExternal',
  };
  return tf(locale, map[role] || 'roleManager');
}

function ScoresMatrix({ locale, review }) {
  const items = review?.items || [];
  const raters = review?.raters || [];
  const scores = review?.scores || [];
  if (!items.length || !raters.length || !scores.length) return null;

  const byKey = new Map();
  for (const s of scores) byKey.set(`${s.raterId}:${s.itemId}`, s.score);

  return (
    <section className={cn(S.card, S.stack)}>
      <h3 className={S.label}>{tf(locale, 'resultsTitle')}</h3>
      <ul className="m-0 list-none space-y-3 p-0">
        {items.map((item) => (
          <li key={item.id} className="rounded-control border border-ink/10 px-3 py-2">
            <div className="text-sm text-ink">{item.label}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {raters.map((r) => {
                const score = byKey.get(`${r.id}:${item.id}`);
                return (
                  <StatusToneChip
                    key={r.id}
                    tone={score != null ? 'info' : 'neutral'}
                    title={raterRoleLabel(locale, r.role)}
                  >
                    {raterRoleLabel(locale, r.role)}: {score != null ? score : '—'}
                  </StatusToneChip>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FormalCompetencyReviewsBlock({ locale = 'pt-BR', companyId }) {
  const { promptForm, toast, confirm } = useAppFeedback();
  const [loading, setLoading] = useState(() => Boolean(companyId));
  const [competencies, setCompetencies] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [managerScores, setManagerScores] = useState({});
  const [managerNotes, setManagerNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const companyQs = useCallback(
    (prefix = '?') => (companyId ? `${prefix}companyId=${companyId}` : ''),
    [companyId]
  );
  const withCompany = useCallback((payload) => (companyId ? { ...payload, companyId } : payload), [companyId]);

  const loadCatalogAndCycles = useCallback(async () => {
    if (!companyId) {
      setCompetencies([]);
      setCycles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [cRes, yRes] = await Promise.all([
        fetch(`/api/admin/formal-competencies${companyQs()}`),
        fetch(`/api/admin/formal-review-cycles${companyQs()}`),
      ]);
      const cJson = await cRes.json().catch(() => ({}));
      const yJson = await yRes.json().catch(() => ({}));
      if (!cRes.ok || !yRes.ok) throw new Error('load');
      setCompetencies(cJson.competencies || []);
      setCycles(yJson.cycles || []);
    } catch {
      toast(tf(locale, 'loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [companyId, companyQs, locale, toast]);

  useEffect(() => {
    loadCatalogAndCycles();
  }, [loadCatalogAndCycles]);

  const loadReviews = useCallback(
    async (cycleId) => {
      if (!companyId || !cycleId) return;
      try {
        const res = await fetch(`/api/admin/formal-review-cycles/${cycleId}/reviews${companyQs()}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error('load');
        setReviews(json.reviews || []);
      } catch {
        toast(tf(locale, 'loadError'), 'error');
      }
    },
    [companyId, companyQs, locale, toast]
  );

  const loadReviewDetail = useCallback(
    async (reviewId) => {
      if (!companyId || !reviewId) return;
      try {
        const res = await fetch(`/api/admin/formal-reviews/${reviewId}${companyQs()}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error('load');
        setSelectedReview(json.review);
        const mgr = (json.review?.raters || []).find((r) => r.role === FORMAL_RATER_ROLE.MANAGER);
        const init = {};
        for (const item of json.review?.items || []) {
          const hit = (json.review?.scores || []).find(
            (s) => Number(s.raterId) === Number(mgr?.id) && Number(s.itemId) === Number(item.id)
          );
          init[item.id] = hit?.score ?? '';
        }
        setManagerScores(init);
        setManagerNotes(mgr?.overallNotes || '');
      } catch {
        toast(tf(locale, 'loadError'), 'error');
      }
    },
    [companyId, companyQs, locale, toast]
  );

  const openCycle = async (cycle) => {
    setSelectedCycle(cycle);
    setSelectedReview(null);
    await loadReviews(cycle.id);
  };

  const openReview = async (review) => {
    await loadReviewDetail(review.id);
  };

  const createCompetency = async () => {
    const values = await promptForm({
      title: tf(locale, 'addCompetency'),
      fields: [
        { name: 'name', label: tf(locale, 'competencyName'), type: 'text', required: true },
        { name: 'description', label: tf(locale, 'competencyDesc'), type: 'textarea' },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/formal-competencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withCompany(values)),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiToastError(locale, json, 'saveError'));
      toast(tf(locale, 'competencyCreated'), 'ok');
      await loadCatalogAndCycles();
    } catch (err) {
      toast(err?.message || tf(locale, 'saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const createCycle = async () => {
    const values = await promptForm({
      title: tf(locale, 'createCycle'),
      fields: [
        { name: 'title', label: t(locale, 'performanceReviews.cycleTitle'), type: 'text', required: true },
        { name: 'description', label: t(locale, 'performanceReviews.cycleDescription'), type: 'textarea' },
        {
          name: 'model',
          label: tf(locale, 'model'),
          type: 'select',
          required: true,
          options: [
            { value: FORMAL_REVIEW_MODEL.NINETY, label: tf(locale, 'model90') },
            { value: FORMAL_REVIEW_MODEL.ONE_EIGHTY, label: tf(locale, 'model180') },
            { value: FORMAL_REVIEW_MODEL.THREE_SIXTY, label: tf(locale, 'model360') },
          ],
          defaultValue: FORMAL_REVIEW_MODEL.NINETY,
        },
        {
          name: 'includeSelf',
          label: tf(locale, 'includeSelf'),
          type: 'boolean',
          defaultValue: false,
        },
        { name: 'periodStart', label: t(locale, 'performanceReviews.periodStart'), type: 'date' },
        { name: 'periodEnd', label: t(locale, 'performanceReviews.periodEnd'), type: 'date' },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/formal-review-cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withCompany(values)),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiToastError(locale, json, 'saveError'));
      toast(tf(locale, 'cycleCreated'), 'ok');
      await loadCatalogAndCycles();
    } catch (err) {
      toast(err?.message || tf(locale, 'saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const closeCycle = async () => {
    if (!selectedCycle) return;
    const ok = await confirm({
      title: tf(locale, 'closeCycle'),
      message: selectedCycle.title,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/formal-review-cycles/${selectedCycle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withCompany({ status: FORMAL_REVIEW_CYCLE_STATUS.CLOSED })),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiToastError(locale, json, 'saveError'));
      toast(tf(locale, 'cycleClosed'), 'ok');
      setSelectedCycle(null);
      await loadCatalogAndCycles();
    } catch (err) {
      toast(err?.message || tf(locale, 'saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const addPerson = async () => {
    if (!selectedCycle) return;
    const is360 = selectedCycle.model === FORMAL_REVIEW_MODEL.THREE_SIXTY;
    const fields = [
      {
        name: 'subjectCandidateId',
        label: tf(locale, 'subject'),
        type: 'entitySearch',
        required: true,
        searchUrl: companyId
          ? `/api/admin/employees/search?companyId=${encodeURIComponent(companyId)}`
          : '/api/admin/employees/search',
        minChars: 2,
      },
    ];
    if (is360) {
      fields.push(
        { name: 'externalName', label: tf(locale, 'externalName'), type: 'text', required: true },
        { name: 'externalEmail', label: tf(locale, 'externalEmail'), type: 'text', required: true },
        { name: 'externalTitle', label: tf(locale, 'externalTitle'), type: 'text' }
      );
    }
    const values = await promptForm({ title: tf(locale, 'addPerson'), fields });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/formal-review-cycles/${selectedCycle.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withCompany(values)),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiToastError(locale, json, 'saveError'));
      toast(tf(locale, 'personAdded'), 'ok');
      await loadReviews(selectedCycle.id);
      if (json.review?.id) await loadReviewDetail(json.review.id);
    } catch (err) {
      toast(err?.message || tf(locale, 'saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const addItem = async () => {
    if (!selectedReview) return;
    const catalogOpts = competencies.map((c) => ({ value: String(c.id), label: c.name }));
    const values = await promptForm({
      title: tf(locale, 'addItem'),
      fields: [
        ...(catalogOpts.length
          ? [
              {
                name: 'competencyId',
                label: tf(locale, 'competenciesTitle'),
                type: 'select',
                options: [{ value: '', label: t(locale, 'panel.common.notApplicable') }, ...catalogOpts],
              },
            ]
          : []),
        { name: 'label', label: tf(locale, 'itemLabel'), type: 'text', required: catalogOpts.length === 0 },
      ],
    });
    if (!values) return;
    const fromCatalog = competencies.find((c) => String(c.id) === String(values.competencyId || ''));
    const label = String(values.label || '').trim() || fromCatalog?.name;
    if (!label) {
      toast(tf(locale, 'saveError'), 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/formal-reviews/${selectedReview.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          withCompany({
            label,
            competencyId: values.competencyId || null,
          })
        ),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiToastError(locale, json, 'saveError'));
      toast(tf(locale, 'itemAdded'), 'ok');
      await loadReviewDetail(selectedReview.id);
    } catch (err) {
      toast(err?.message || tf(locale, 'saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const postAction = async (path, successKey, body = {}) => {
    if (!selectedReview) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/formal-reviews/${selectedReview.id}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withCompany(body)),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiToastError(locale, json, 'saveError'));
      toast(tf(locale, successKey), 'ok');
      if (json.review) setSelectedReview(json.review);
      else await loadReviewDetail(selectedReview.id);
      if (selectedCycle) await loadReviews(selectedCycle.id);
      await loadCatalogAndCycles();
    } catch (err) {
      toast(err?.message || tf(locale, 'saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitManager = async () => {
    if (!selectedReview?.items?.length) return;
    const scores = selectedReview.items.map((item) => ({
      itemId: item.id,
      score: Number(managerScores[item.id]),
    }));
    if (scores.some((s) => !Number.isFinite(s.score))) {
      toast(tf(locale, 'incompleteScores'), 'error');
      return;
    }
    await postAction('manager-scores', 'managerSaved', {
      scores,
      overallNotes: managerNotes,
    });
  };

  const inviteRaters = useMemo(() => {
    return (selectedReview?.raters || []).filter(
      (r) => r.role !== FORMAL_RATER_ROLE.MANAGER && (r.inviteUrl || r.token)
    );
  }, [selectedReview]);

  const pendingRaters = useMemo(() => {
    return (selectedReview?.raters || []).filter((r) => r.status !== FORMAL_RATER_STATUS.SUBMITTED);
  }, [selectedReview]);

  if (!companyId) {
    return <EmptyState message={tf(locale, 'needCompany')} />;
  }

  if (loading) {
    return <AppLoading variant="panel" locale={locale} />;
  }

  if (selectedReview) {
    const collecting = selectedReview.status === FORMAL_REVIEW_STATUS.COLLECTING;
    const mgrDone = (selectedReview.raters || []).some(
      (r) => r.role === FORMAL_RATER_ROLE.MANAGER && r.status === FORMAL_RATER_STATUS.SUBMITTED
    );
    const showResults =
      (selectedReview.scores || []).length > 0 &&
      selectedReview.status !== FORMAL_REVIEW_STATUS.DRAFT;
    const canFinalize = collecting && pendingRaters.length === 0;

    return (
      <ContentEnter>
        <div className={S.stack}>
          <button type="button" className={S.btnGhost} onClick={() => setSelectedReview(null)}>
            {tf(locale, 'backToReviews')}
          </button>
          <AdminPageHeader
            title={selectedReview.subjectName || tf(locale, 'subject')}
            subtitle={`${selectedReview.cycleTitle || ''} · ${modelLabel(locale, selectedReview.model)}`}
            actions={
              <StatusToneChip tone={reviewStatusTone(selectedReview.status)}>
                {reviewStatusLabel(locale, selectedReview.status)}
              </StatusToneChip>
            }
          />

          <section className={cn(S.card, S.stack)}>
            <h3 className={S.label}>{tf(locale, 'itemsTitle')}</h3>
            {(selectedReview.items || []).length === 0 ? (
              <EmptyState message={tf(locale, 'itemsEmpty')} />
            ) : (
              <ul className="m-0 list-none space-y-2 p-0">
                {selectedReview.items.map((item) => (
                  <li key={item.id} className="rounded-control border border-ink/10 px-3 py-2 text-sm text-ink">
                    {item.label}
                  </li>
                ))}
              </ul>
            )}
            {selectedReview.status === FORMAL_REVIEW_STATUS.DRAFT ? (
              <AdminCreateButton label={tf(locale, 'addItem')} onClick={addItem} disabled={busy} />
            ) : null}
          </section>

          {selectedReview.status === FORMAL_REVIEW_STATUS.DRAFT ? (
            <button
              type="button"
              className={S.btnPrimary}
              disabled={busy || !(selectedReview.items || []).length}
              onClick={() => postAction('open', 'opened')}
            >
              {tf(locale, 'openCollect')}
            </button>
          ) : null}

          {collecting && !mgrDone ? (
            <section className={cn(S.card, S.stack)}>
              <h3 className={S.label}>{tf(locale, 'managerScores')}</h3>
              {(selectedReview.items || []).map((item) => (
                <div key={item.id} className={S.stack}>
                  <div className="text-sm text-ink">{item.label}</div>
                  <ScaleRatingButtons
                    min={FORMAL_LIKERT_MIN}
                    max={FORMAL_LIKERT_MAX}
                    value={managerScores[item.id]}
                    onChange={(n) => setManagerScores((prev) => ({ ...prev, [item.id]: n }))}
                    ariaLabel={item.label}
                  />
                </div>
              ))}
              <FormField label={tf(locale, 'overallNotes')}>
                <textarea
                  className={S.input}
                  rows={3}
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                />
              </FormField>
              <button type="button" className={S.btnPrimary} disabled={busy} onClick={submitManager}>
                {tf(locale, 'submitManager')}
              </button>
            </section>
          ) : null}

          {collecting && mgrDone ? (
            <InlineCallout tone="success">{tf(locale, 'managerDone')}</InlineCallout>
          ) : null}

          {inviteRaters.length ? (
            <section className={cn(S.card, S.stack)}>
              <h3 className={S.label}>{tf(locale, 'inviteLinks')}</h3>
              {inviteRaters.map((r) => (
                <div key={r.id} className="flex min-h-touch flex-wrap items-center gap-2">
                  <span className="text-prose text-ink-muted">{raterRoleLabel(locale, r.role)}</span>
                  <StatusToneChip tone={r.status === FORMAL_RATER_STATUS.SUBMITTED ? 'success' : 'warning'}>
                    {r.status === FORMAL_RATER_STATUS.SUBMITTED
                      ? tf(locale, 'raterSubmitted')
                      : tf(locale, 'raterPending')}
                  </StatusToneChip>
                  {r.inviteUrl && r.status !== FORMAL_RATER_STATUS.SUBMITTED ? (
                    <CopyableLink
                      url={r.inviteUrl}
                      locale={locale}
                      iconOnly
                      label={raterRoleLabel(locale, r.role)}
                    />
                  ) : null}
                </div>
              ))}
            </section>
          ) : null}

          {showResults ? <ScoresMatrix locale={locale} review={selectedReview} /> : null}

          {collecting && pendingRaters.length > 0 ? (
            <InlineCallout tone="warning">
              {tf(locale, 'pendingRaters', {
                names: pendingRaters.map((r) => raterRoleLabel(locale, r.role)).join(', '),
              })}
            </InlineCallout>
          ) : null}

          {collecting ? (
            <div className={S.stack}>
              {!canFinalize ? (
                <p className={cn(S.faint, 'm-0')}>{tf(locale, 'finalizeBlocked')}</p>
              ) : null}
              <button
                type="button"
                className={S.btnBrandSoft}
                disabled={busy || !canFinalize}
                onClick={() => postAction('finalize', 'finalized')}
              >
                {tf(locale, 'finalize')}
              </button>
            </div>
          ) : null}

          {selectedReview.status === FORMAL_REVIEW_STATUS.FINALIZED ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={S.btnPrimary}
                disabled={busy}
                onClick={() => postAction('send', 'sent')}
              >
                {tf(locale, 'sendToSubject')}
              </button>
              <button
                type="button"
                className={S.btnGhost}
                disabled={busy}
                onClick={() => postAction('archive', 'archived')}
              >
                {tf(locale, 'archive')}
              </button>
            </div>
          ) : null}

          {selectedReview.status === FORMAL_REVIEW_STATUS.SENT ? (
            <button
              type="button"
              className={S.btnGhost}
              disabled={busy}
              onClick={() => postAction('archive', 'archived')}
            >
              {tf(locale, 'archive')}
            </button>
          ) : null}
        </div>
      </ContentEnter>
    );
  }

  if (selectedCycle) {
    return (
      <ContentEnter>
        <div className={S.stack}>
          <button type="button" className={S.btnGhost} onClick={() => setSelectedCycle(null)}>
            {tf(locale, 'backToCycles')}
          </button>
          <AdminPageHeader
            title={selectedCycle.title}
            subtitle={modelLabel(locale, selectedCycle.model)}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <StatusToneChip tone={cycleStatusTone(selectedCycle.status)}>
                  {cycleStatusLabel(locale, selectedCycle.status)}
                </StatusToneChip>
                {selectedCycle.status !== FORMAL_REVIEW_CYCLE_STATUS.CLOSED ? (
                  <AdminCreateButton label={tf(locale, 'addPerson')} onClick={addPerson} disabled={busy} />
                ) : null}
              </div>
            }
          />
          {selectedCycle.includeSelf ? (
            <InlineCallout tone="info">{tf(locale, 'includeSelfHint')}</InlineCallout>
          ) : null}
          {reviews.length === 0 ? (
            <EmptyState message={tf(locale, 'reviewsEmpty')} />
          ) : (
            <AdminTableShell animKey={`formal-reviews-${selectedCycle.id}-${reviews.length}`}>
              <thead>
                <tr>
                  <AdminTh>{tf(locale, 'subject')}</AdminTh>
                  <AdminTh>{t(locale, 'performanceReviews.cycleStatus')}</AdminTh>
                  <AdminActionsTh>{t(locale, 'panel.common.view')}</AdminActionsTh>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-sm text-ink">{r.subjectName || r.subjectEmail}</td>
                    <td className="px-3 py-2">
                      <StatusToneChip tone={reviewStatusTone(r.status)}>
                        {reviewStatusLabel(locale, r.status)}
                      </StatusToneChip>
                    </td>
                    <td className="px-3 py-2">
                      <AdminActionsCell>
                        <AdminViewButton onClick={() => openReview(r)} label={t(locale, 'panel.common.view')} />
                      </AdminActionsCell>
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminTableShell>
          )}
          {selectedCycle.status !== FORMAL_REVIEW_CYCLE_STATUS.CLOSED ? (
            <button type="button" className={S.btnGhost} disabled={busy} onClick={closeCycle}>
              {tf(locale, 'closeCycle')}
            </button>
          ) : null}
        </div>
      </ContentEnter>
    );
  }

  return (
    <ContentEnter>
      <div className={S.stack}>
        <AdminPageHeader
          title={tf(locale, 'title')}
          subtitle={tf(locale, 'subtitle')}
          actions={<AdminCreateButton label={tf(locale, 'createCycle')} onClick={createCycle} disabled={busy} />}
        />

        <CollapsibleBlock title={tf(locale, 'competenciesTitle')} defaultOpen={false} locale={locale}>
          <div className={S.stack}>
            <p className={cn(S.muted, 'm-0')}>{tf(locale, 'catalogHint')}</p>
            <AdminCreateButton label={tf(locale, 'addCompetency')} onClick={createCompetency} disabled={busy} />
            {competencies.length === 0 ? (
              <EmptyState message={tf(locale, 'competenciesEmpty')} />
            ) : (
              <ul className="m-0 list-none space-y-1 p-0">
                {competencies.map((c) => (
                  <li key={c.id} className="rounded-control border border-ink/10 px-3 py-2 text-sm text-ink">
                    {c.name}
                    {c.description ? (
                      <div className="mt-0.5 font-mono text-2xs text-ink-faint">{c.description}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CollapsibleBlock>

        <h3 className={S.label}>{tf(locale, 'cyclesTitle')}</h3>
        {cycles.length === 0 ? (
          <EmptyState message={tf(locale, 'cyclesEmpty')} />
        ) : (
          <AdminTableShell animKey={`formal-cycles-${cycles.length}`}>
            <thead>
              <tr>
                <AdminTh>{t(locale, 'performanceReviews.cycleTitle')}</AdminTh>
                <AdminTh>{tf(locale, 'model')}</AdminTh>
                <AdminTh>{tf(locale, 'reviewsCountCol')}</AdminTh>
                <AdminTh>{t(locale, 'performanceReviews.cycleStatus')}</AdminTh>
                <AdminActionsTh>{t(locale, 'panel.common.view')}</AdminActionsTh>
              </tr>
            </thead>
            <tbody>
              {cycles.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 text-sm text-ink">{c.title}</td>
                  <td className="px-3 py-2">
                    <StatusToneChip tone="neutral" title={modelLabel(locale, c.model)}>
                      {modelShort(locale, c.model)}
                    </StatusToneChip>
                    {c.includeSelf ? (
                      <span className="ml-1 font-mono text-2xs text-ink-faint">
                        · {tf(locale, 'roleSelf')}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-mono text-prose text-ink-muted">
                    {c.reviewCount != null ? c.reviewCount : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <StatusToneChip tone={cycleStatusTone(c.status)}>
                      {cycleStatusLabel(locale, c.status)}
                    </StatusToneChip>
                  </td>
                  <td className="px-3 py-2">
                    <AdminActionsCell>
                      <AdminViewButton onClick={() => openCycle(c)} label={t(locale, 'panel.common.view')} />
                    </AdminActionsCell>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTableShell>
        )}
      </div>
    </ContentEnter>
  );
}
