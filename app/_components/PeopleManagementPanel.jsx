'use client';

import { useState } from 'react';
import { t, localeHtmlLang } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { isRichTextEmpty } from '../../lib/sanitize-html';
import { S } from '../dashboard/dashboard-shared';
import { RichTextEditor } from './RichTextEditor';
import { RichTextView } from './RichTextView';
import { useAppFeedback } from './AppFeedback';

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatMeetingDate(value, locale) {
  if (!value) return '—';
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split('-').map(Number);
  if (!y || !m || !d) return raw;
  return new Date(y, m - 1, d).toLocaleDateString(localeHtmlLang(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Hipóteses de gestão + registro de 1:1 (mesma pessoa = candidate_id).
 */
export function PeopleManagementPanel({
  locale,
  candidateId,
  people,
  onRefresh,
}) {
  const management = people?.management;
  const oneOnOnes = people?.oneOnOnes || [];
  const [meetingDate, setMeetingDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgError, setMsgError] = useState(false);
  const { confirm, notice } = useAppFeedback();

  if (!management && !people) {
    return null;
  }

  const completeness = management?.completeness || {};
  const hypotheses = management?.hypotheses || [];
  const prompts = management?.oneOnOnePrompts || [];
  const signals = management?.retentionSignals || [];
  const topMot = management?.motivators?.top || [];

  const save = async () => {
    if (!candidateId || isRichTextEmpty(notes)) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/candidates/${encodeURIComponent(candidateId)}/one-on-ones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingDate, notes, nextSteps }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.team.oneOnOneSaveError'));
      setNotes('');
      setNextSteps('');
      setMeetingDate(todayIso());
      setMsgError(false);
      setMsg(t(locale, 'panel.team.oneOnOneSaved'));
      if (onRefresh) await onRefresh();
    } catch (e) {
      setMsgError(true);
      setMsg(e?.message || t(locale, 'panel.team.oneOnOneSaveError'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (ooId) => {
    if (!candidateId || !ooId) return;
    const ok = await confirm({
      message: t(locale, 'panel.team.oneOnOneDeleteConfirm'),
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}/one-on-ones/${encodeURIComponent(ooId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      if (onRefresh) await onRefresh();
    } catch (e) {
      await notice({ message: e?.message || t(locale, 'panel.common.error'), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-control border border-ink/12 bg-ink/[0.02] p-3.5">
      <span className={cn(S.label, 'mb-1.5')}>
        {t(locale, 'panel.team.peopleTitle')}
      </span>
      <p className="mb-3 mt-0 text-xs leading-normal text-ink-faint">
        {t(locale, 'panel.team.peopleHint')}
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 font-mono text-[11px]',
            completeness.enneagram ? 'bg-success/10 text-success' : 'bg-ink/[0.06] text-ink-muted'
          )}
        >
          {completeness.enneagram ? t(locale, 'panel.team.peopleHasEnneagram') : t(locale, 'panel.team.peopleMissingEnneagram')}
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 font-mono text-[11px]',
            completeness.motivators ? 'bg-success/10 text-success' : 'bg-ink/[0.06] text-ink-muted'
          )}
        >
          {completeness.motivators ? t(locale, 'panel.team.peopleHasMotivators') : t(locale, 'panel.team.peopleMissingMotivators')}
        </span>
      </div>

      {topMot.length > 0 ? (
        <div className="mb-3">
          <span className="font-mono text-[11px] text-ink-muted">
            {t(locale, 'panel.team.peopleTopMotivators')}
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {topMot.map((d) => (
              <span
                key={d.key}
                className={cn(
                  'rounded-lg border bg-white/50 px-2 py-1 text-xs text-ink',
                  !d.color && 'border-ink/12'
                )}
                style={d.color ? { borderColor: d.color } : undefined}
              >
                {d.label} · {Math.round(d.score)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {signals.length > 0 ? (
        <div className="mb-3">
          <span className={cn(S.label, 'mb-1.5')}>
            {t(locale, 'panel.team.peopleRetention')}
          </span>
          <ul className="m-0 pl-[18px]">
            {signals.map((s) => (
              <li key={s.key} className="mb-1 text-[13px] leading-[1.55] text-ink-muted">
                {s.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hypotheses.length > 0 ? (
        <div className="mb-3.5">
          <span className={cn(S.label, 'mb-2')}>
            {t(locale, 'panel.team.peopleHypotheses')}
          </span>
          <div className="flex flex-col gap-2">
            {[...hypotheses].sort((a, b) => Number(b.source === 'cross') - Number(a.source === 'cross')).map((h) => (
              <div
                key={h.id}
                className={cn(
                  'rounded-lg px-3 py-2.5',
                  h.source === 'cross'
                    ? 'border border-brand-500/30 bg-brand-500/[0.04]'
                    : 'border border-ink/12 bg-white/45'
                )}
              >
                {h.source === 'cross' ? (
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-brand-500">
                    {t(locale, 'panel.team.peopleCrossBadge')}
                  </div>
                ) : null}
                <div className="mb-1 text-xs font-semibold text-ink">
                  {h.title}
                </div>
                <div className="text-[13px] leading-[1.55] text-ink-muted">{h.body}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mb-3 mt-0 text-xs italic text-ink-faint">
          {t(locale, 'panel.team.peopleHypothesesEmpty')}
        </p>
      )}

      {prompts.length > 0 ? (
        <div className="mb-3.5">
          <span className={cn(S.label, 'mb-1.5')}>
            {t(locale, 'panel.team.peoplePrompts')}
          </span>
          <ol className="m-0 pl-[18px]">
            {prompts.map((q) => (
              <li key={q} className="mb-1 text-[13px] leading-[1.55] text-ink">
                {q}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="mt-1 border-t border-ink/12 pt-3">
        <span className={cn(S.label, 'mb-2')}>
          {t(locale, 'panel.team.oneOnOneTitle')}
        </span>

        <div className="mb-2.5 flex flex-col gap-2">
          <label className="text-xs text-ink-muted">
            {t(locale, 'panel.team.oneOnOneDate')}
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="mt-1 block w-full max-w-[220px] rounded-lg border border-ink/12 bg-white px-2.5 py-2 font-inherit text-ink"
            />
          </label>
          <label className="block text-xs text-ink-muted">
            {t(locale, 'panel.team.oneOnOneNotes')}
            <div className="mt-1">
              <RichTextEditor
                value={notes}
                onChange={setNotes}
                placeholder={t(locale, 'panel.team.oneOnOneNotesPlaceholder')}
                minHeight={100}
                locale={locale}
              />
            </div>
          </label>
          <label className="block text-xs text-ink-muted">
            {t(locale, 'panel.team.oneOnOneNextSteps')}
            <div className="mt-1">
              <RichTextEditor
                value={nextSteps}
                onChange={setNextSteps}
                placeholder={t(locale, 'panel.team.oneOnOneNextStepsPlaceholder')}
                minHeight={80}
                locale={locale}
              />
            </div>
          </label>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={busy || isRichTextEmpty(notes)}
              onClick={save}
              className={cn(
                'rounded-lg border-none bg-brand-500 px-3.5 py-2 font-inherit text-[13px] text-white',
                busy || isRichTextEmpty(notes) ? 'cursor-default opacity-50' : 'cursor-pointer'
              )}
            >
              {busy ? t(locale, 'panel.admin.save') : t(locale, 'panel.team.oneOnOneSave')}
            </button>
            {msg ? (
              <span className={cn('text-xs', msgError ? 'text-danger' : 'text-success')}>{msg}</span>
            ) : null}
          </div>
        </div>

        {oneOnOnes.length === 0 ? (
          <p className="m-0 text-xs italic text-ink-faint">
            {t(locale, 'panel.team.oneOnOneEmpty')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {oneOnOnes.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-ink/12 bg-white/40 px-3 py-2.5"
              >
                <div className="mb-1.5 flex justify-between gap-2">
                  <span className="font-mono text-xs text-ink-muted">
                    {formatMeetingDate(item.meetingDate, locale)}
                    {item.createdByName ? ` · ${item.createdByName}` : ''}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(item.id)}
                    className="cursor-pointer border-none bg-transparent font-mono text-[11px] text-danger"
                  >
                    {t(locale, 'panel.team.oneOnOneDelete')}
                  </button>
                </div>
                <RichTextView html={item.notes} />
                {!isRichTextEmpty(item.nextSteps) ? (
                  <div className="mt-1.5">
                    <div className="mb-0.5 text-xs font-semibold text-ink">
                      {t(locale, 'panel.team.oneOnOneNextSteps')}
                    </div>
                    <RichTextView html={item.nextSteps} className="text-xs text-ink-muted" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
