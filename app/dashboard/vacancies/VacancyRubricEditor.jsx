'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { RichTextEditor } from '../../_components/RichTextEditor';
import { FormField } from '../../_components/FormField';
import { htmlToPlainText } from '../../../lib/sanitize-html';
import { useAppFeedback } from '../../_components/AppFeedback';
import { AppLoading } from '../../_components/AppLoading';
import { buildRubricContextDraft, isRubricContextFilledEnough } from '../../../lib/rubric-prompt';

const BTN_SM =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-lg border border-brand-500/35 bg-brand-500/[0.09] px-3 py-2 font-mono text-2xs text-brand-500 disabled:cursor-default disabled:opacity-60';
const BTN_PRIMARY =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-lg border border-brand-500 bg-brand-500 px-3 py-2 font-mono text-2xs text-white disabled:cursor-default disabled:opacity-60';

export function VacancyRubricEditor({ vacancyId, locale, vacancyTitle = '', vacancyDescription = '', onSaved }) {
  const { notice, toast } = useAppFeedback();
  const [weights, setWeights] = useState(() => Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, ''])));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiOpen, setAiOpen] = useState(true);
  const [jobDesc, setJobDesc] = useState(() =>
    buildRubricContextDraft({
      locale,
      title: vacancyTitle,
      descriptionPlain: htmlToPlainText(vacancyDescription),
    })
  );
  const [aiBusy, setAiBusy] = useState('');

  const showError = async (message) => {
    await notice({
      title: t(locale, 'panel.common.errorTitle'),
      message: String(message || t(locale, 'panel.common.error')),
      tone: 'error',
    });
  };

  useEffect(() => {
    setJobDesc(
      buildRubricContextDraft({
        locale,
        title: vacancyTitle,
        descriptionPlain: htmlToPlainText(vacancyDescription),
      })
    );
  }, [vacancyId]); // eslint-disable-line react-hooks/exhaustive-deps -- reset draft only when switching vacancy

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
        if (cancelled) return;
        const w = data.vacancyFitWeights || {};
        const next = {};
        for (let typeNum = 1; typeNum <= 9; typeNum++) {
          const v = w[String(typeNum)] ?? w[typeNum];
          next[typeNum] = v != null && v !== '' ? String(v) : '';
        }
        setWeights(next);
        setNotes(data.vacancyRubricNotes != null ? String(data.vacancyRubricNotes) : '');
        if (!vacancyTitle && !htmlToPlainText(vacancyDescription)) {
          setJobDesc(
            buildRubricContextDraft({
              locale,
              title: data.title || '',
              descriptionPlain: htmlToPlainText(data.description || ''),
            })
          );
        }
      } catch (e) {
        if (!cancelled) {
          void notice({
            title: t(locale, 'panel.common.errorTitle'),
            message: e?.message || t(locale, 'panel.common.error'),
            tone: 'error',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [vacancyId, locale, notice]);

  const applyParsedWeights = (parsed) => {
    const next = {};
    for (let n = 1; n <= 9; n++) {
      const v = parsed.weights[String(n)];
      next[n] = v != null && Number(v) > 0 ? String(v) : '';
    }
    let nextNotes = notes;
    if (parsed.notes) {
      const cur = String(notes || '').trim();
      if (!cur) nextNotes = parsed.notes;
      else if (!cur.includes(parsed.notes.slice(0, 40))) nextNotes = `${cur}\n\n${parsed.notes}`;
    }
    setWeights(next);
    setNotes(nextNotes);
    return { nextWeights: next, nextNotes };
  };

  const persistRubric = async (weightsState, notesHtml, { toastKey = 'recruiting.rubricSaved' } = {}) => {
    const wObj = {};
    for (let typeNum = 1; typeNum <= 9; typeNum++) {
      const raw = String(weightsState[typeNum] ?? '').trim();
      if (!raw) continue;
      const n = parseFloat(raw);
      if (Number.isFinite(n) && n > 0) wObj[String(typeNum)] = n;
    }
    const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vacancyFitWeights: wObj, vacancyRubricNotes: notesHtml }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
    toast(t(locale, toastKey), 'ok');
    onSaved?.();
  };

  const save = async () => {
    try {
      await persistRubric(weights, notes);
    } catch (e) {
      await showError(e?.message || t(locale, 'panel.common.error'));
    }
  };

  const suggestContext = async () => {
    setAiBusy('context');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/rubric-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggestContext', locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.error ||
            (data?.errorCode ? t(locale, `errors.${data.errorCode}`) : null) ||
            t(locale, 'recruiting.rubricAiSuggestFailed')
        );
      }
      if (data.context) setJobDesc(String(data.context));
      toast(t(locale, 'recruiting.rubricAiContextDone'), 'ok');
    } catch (e) {
      await showError(e?.message || t(locale, 'recruiting.rubricAiSuggestFailed'));
    } finally {
      setAiBusy('');
    }
  };

  const suggestWeights = async () => {
    if (!isRubricContextFilledEnough(jobDesc)) {
      await showError(t(locale, 'recruiting.rubricAiNeedContext'));
      return;
    }
    setAiBusy('weights');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/rubric-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggestWeights', context: jobDesc, locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.error ||
            (data?.errorCode ? t(locale, `errors.${data.errorCode}`) : null) ||
            t(locale, 'recruiting.rubricAiSuggestFailed')
        );
      }
      if (!data.weights) {
        throw new Error(t(locale, 'recruiting.rubricAiParseError'));
      }
      const { nextWeights, nextNotes } = applyParsedWeights({
        weights: data.weights,
        notes: data.notes || '',
      });
      await persistRubric(nextWeights, nextNotes, {
        toastKey: data.notes
          ? 'recruiting.rubricAiSavedWithNotes'
          : 'recruiting.rubricAiSaved',
      });
    } catch (e) {
      await showError(e?.message || t(locale, 'recruiting.rubricAiSuggestFailed'));
    } finally {
      setAiBusy('');
    }
  };

  return (
    <div className="mt-3 border-t border-ink/12 pt-3">
      <span className="mb-2 block font-mono text-2xs text-ink-muted">
        {t(locale, 'recruiting.rubricTitle')}
      </span>
      <p className="mb-2.5 mt-0 text-2xs leading-normal text-ink-faint">
        {t(locale, 'recruiting.rubricWeightHint')}
      </p>
      {loading ? <p className="text-2xs text-ink-faint">…</p> : null}
      <div className="mb-2.5 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((typeNum) => (
          <label key={typeNum} className="flex items-center gap-1 text-xs text-ink-muted">
            T{typeNum}
            <input
              value={weights[typeNum] ?? ''}
              onChange={(e) => setWeights((prev) => ({ ...prev, [typeNum]: e.target.value }))}
              placeholder="0"
              className="w-11 rounded-md border border-ink/12 bg-ink/[0.03] px-1.5 py-1 font-mono text-2xs text-ink"
            />
          </label>
        ))}
      </div>

      <div className="mb-3 rounded-control border border-ink/12 bg-ink/[0.02] p-3">
        <button
          type="button"
          onClick={() => setAiOpen((o) => !o)}
          className={cn(
            'cursor-pointer border-none bg-transparent p-0 font-mono text-2xs text-brand-500',
            aiOpen && 'mb-2'
          )}
        >
          {aiOpen ? '▾ ' : '▸ '}
          {t(locale, 'recruiting.rubricAiTitle')}
        </button>
        {aiOpen ? (
          <>
            <p className="mb-2.5 mt-0 text-xs leading-[1.55] text-ink-muted">
              {t(locale, 'recruiting.rubricAiIntro')}
            </p>
            <FormField label={t(locale, 'recruiting.rubricAiJobLabel')} className="mb-2">
              <textarea
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
                placeholder={t(locale, 'recruiting.rubricAiJobPh')}
                rows={10}
                className="box-border w-full resize-y rounded-lg border border-ink/12 bg-surface px-3 py-2.5 font-ui text-xs text-ink"
              />
            </FormField>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={suggestContext}
                disabled={Boolean(aiBusy)}
                aria-busy={aiBusy === 'context' || undefined}
                className={cn(BTN_SM, aiBusy && 'opacity-60')}
              >
                {aiBusy === 'context' ? (
                  <AppLoading locale={locale} variant="button" label={t(locale, 'recruiting.rubricAiWorking')} />
                ) : (
                  t(locale, 'recruiting.rubricAiSuggestContext')
                )}
              </button>
              <button
                type="button"
                onClick={suggestWeights}
                disabled={Boolean(aiBusy)}
                aria-busy={aiBusy === 'weights' || undefined}
                className={cn(BTN_PRIMARY, aiBusy && 'opacity-60')}
              >
                {aiBusy === 'weights' ? (
                  <AppLoading locale={locale} variant="button" label={t(locale, 'recruiting.rubricAiWorking')} />
                ) : (
                  t(locale, 'recruiting.rubricAiSuggestWeights')
                )}
              </button>
            </div>
            <p className="mb-0 mt-2.5 text-2xs leading-normal text-ink-faint">
              {t(locale, 'recruiting.rubricAiFillSteps')}
            </p>
          </>
        ) : null}
      </div>

      <FormField as="div" label={t(locale, 'recruiting.rubricNotes')} className="mb-2">
        <RichTextEditor
          value={notes}
          onChange={setNotes}
          placeholder={t(locale, 'recruiting.rubricNotes')}
          minHeight={120}
          locale={locale}
        />
      </FormField>
      <button
        type="button"
        onClick={save}
        disabled={loading}
        className={cn(BTN_SM, loading && 'opacity-60')}
      >
        {t(locale, 'recruiting.rubricSave')}
      </button>
    </div>
  );
}
