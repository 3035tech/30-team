'use client';

import { useCallback, useEffect, useState } from 'react';
import { PublicNarrowShell } from '../../_components/PublicNarrowShell';
import { InlineCallout } from '../../_components/InlineCallout';
import { FormField } from '../../_components/FormField';
import { useAppFeedback } from '../../_components/AppFeedback';
import { S } from '../../dashboard/dashboard-shared';
import { t, errorMessage } from '../../../lib/i18n';
import { useLocale } from '../../../lib/useLocale';
import { cn } from '../../../lib/cn';

function notesStorageKey(token) {
  return `team30_interview_prep_notes_${String(token || '').slice(0, 48)}`;
}

function readStoredNotes(token) {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(notesStorageKey(token));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredNotes(token, notes) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(notesStorageKey(token), JSON.stringify(notes || {}));
  } catch {
    /* quota / private mode */
  }
}

/**
 * B-2709 — public candidate interview prep (answers stay local / not posted).
 */
export default function InterviewPrepClient({ token }) {
  const [locale] = useLocale();
  const { toast } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState(null);
  const [prep, setPrep] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState({});

  useEffect(() => {
    setNotes(readStoredNotes(token));
  }, [token]);

  useEffect(() => {
    writeStoredNotes(token, notes);
  }, [token, notes]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const res = await fetch(
        `/api/public/interview-prep/${encodeURIComponent(token)}?locale=${encodeURIComponent(locale)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErrorCode(data.errorCode || 'INVALID_TOKEN');
        setPrep(null);
        return;
      }
      setPrep(data.prep);
    } catch {
      setErrorCode('INTERNAL');
    } finally {
      setLoading(false);
    }
  }, [token, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markPrepared() {
    setBusy(true);
    try {
      const res = await fetch(`/api/public/interview-prep/${encodeURIComponent(token)}`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setPrep((p) => (p ? { ...p, prepared: true, preparedAt: data.preparedAt } : p));
        toast(t(locale, 'interviewPrep.markPreparedOk'), 'ok');
      } else {
        toast(t(locale, 'interviewPrep.markPreparedError'), 'error');
      }
    } catch {
      toast(t(locale, 'interviewPrep.markPreparedError'), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <PublicNarrowShell variant="loading" locale={locale} maxWidthClass="max-w-xl" />;
  }

  if (errorCode || !prep) {
    return (
      <PublicNarrowShell variant="error" locale={locale} maxWidthClass="max-w-xl" className="text-center">
        <p className="font-ui text-prose text-ink-muted">
          {errorMessage(locale, errorCode || 'INVALID_TOKEN', t(locale, 'interviewPrep.invalidLink'))}
        </p>
      </PublicNarrowShell>
    );
  }

  return (
    <PublicNarrowShell
      locale={locale}
      maxWidthClass="max-w-xl"
      title={t(locale, 'interviewPrep.title')}
    >
      <p className={cn(S.muted, 'mt-0')}>
        {prep.candidateFirstName
          ? t(locale, 'interviewPrep.helloName', { name: prep.candidateFirstName })
          : t(locale, 'interviewPrep.hello')}
        {prep.vacancyTitle
          ? ` ${t(locale, 'interviewPrep.forRole', { title: prep.vacancyTitle })}`
          : ''}
      </p>

      <InlineCallout tone="info" className="mb-4">
        {t(locale, 'interviewPrep.privacyHint')}
      </InlineCallout>

      <ol className="m-0 flex list-decimal flex-col gap-4 p-0 pl-5">
        {(prep.questions || []).map((q) => {
          const fieldId = `prep-note-${q.id}`;
          return (
            <li key={q.id} className="font-ui text-sm text-ink">
              <p className="m-0 mb-2 font-medium">{q.text}</p>
              <FormField label={t(locale, 'interviewPrep.notesLabel')} htmlFor={fieldId}>
                <textarea
                  id={fieldId}
                  className={cn(S.input, 'min-h-[4.5rem] w-full resize-y')}
                  rows={3}
                  value={notes[q.id] || ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [q.id]: e.target.value }))}
                  placeholder={t(locale, 'interviewPrep.notesPh')}
                />
              </FormField>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-col gap-2">
        {prep.prepared ? (
          <p className="m-0 font-mono text-prose text-success">{t(locale, 'interviewPrep.preparedOk')}</p>
        ) : (
          <button
            type="button"
            className={cn(S.btnPrimary, 'min-h-touch w-full sm:w-auto')}
            disabled={busy}
            onClick={markPrepared}
          >
            {busy ? t(locale, 'panel.common.loading') : t(locale, 'interviewPrep.markPrepared')}
          </button>
        )}
        <p className={S.faint}>{t(locale, 'interviewPrep.preparedHint')}</p>
      </div>
    </PublicNarrowShell>
  );
}
