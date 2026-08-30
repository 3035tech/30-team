'use client';

import { useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { PublicNarrowShell } from '../_components/PublicNarrowShell';
import { FormField } from '../_components/FormField';
import { useAppFeedback } from '../_components/AppFeedback';

const RESPONSE_MIN = 5;
const RESPONSE_MAX = 1000;

export default function FeedbackPublicClient({ token, locale = 'pt-BR' }) {
  const { toast } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [meta, setMeta] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/feedback/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error('bad');
        if (cancelled) return;
        setMeta(data);
        if (data.alreadyAnswered || data.status === 'answered') setDone(true);
        if (data.status === 'expired' || data.status === 'cancelled') setError(true);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const trimmed = responseText.trim();
  const canSubmit = !busy && trimmed.length >= RESPONSE_MIN;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/public/feedback/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseText: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'submit');
      setDone(true);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.feedback.publicError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PublicNarrowShell variant="loading" locale={locale} />;
  if (error) {
    return (
      <PublicNarrowShell variant="error" locale={locale} title={t(locale, 'panel.feedback.publicInvalid')}>
        <p className={cn(S.muted)}>{t(locale, 'panel.feedback.publicInvalidHint')}</p>
      </PublicNarrowShell>
    );
  }
  if (done) {
    return (
      <PublicNarrowShell variant="done" locale={locale} title={t(locale, 'panel.feedback.publicThanks')}>
        <p className={cn(S.muted)}>{t(locale, 'panel.feedback.publicThanksHint')}</p>
      </PublicNarrowShell>
    );
  }

  const subject =
    meta?.subjectName || t(locale, 'panel.common.notApplicable');

  return (
    <PublicNarrowShell locale={locale} title={t(locale, 'panel.feedback.publicTitle')}>
      <p className={cn(S.muted, 'mb-2 text-prose')}>
        {t(locale, 'panel.feedback.publicAbout', { name: subject })}
      </p>
      {meta?.prompt ? (
        <p className={cn(S.cardTitle, 'mb-4 whitespace-pre-wrap text-prose')}>{meta.prompt}</p>
      ) : null}
      <FormField
        label={t(locale, 'panel.feedback.responseLabel')}
        hint={
          trimmed.length > 0 && trimmed.length < RESPONSE_MIN
            ? t(locale, 'panel.feedback.responseShort')
            : t(locale, 'panel.feedback.responseCount', {
                n: responseText.length,
                max: RESPONSE_MAX,
              })
        }
      >
        <textarea
          className={cn(S.input, 'min-h-[120px]')}
          maxLength={RESPONSE_MAX}
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          disabled={busy}
        />
      </FormField>
      <button
        type="button"
        className={cn(S.btnPrimary, 'mt-4 min-h-touch w-full')}
        disabled={!canSubmit}
        onClick={() => void submit()}
      >
        {busy ? t(locale, 'panel.feedback.submitting') : t(locale, 'panel.feedback.answerCta')}
      </button>
    </PublicNarrowShell>
  );
}
