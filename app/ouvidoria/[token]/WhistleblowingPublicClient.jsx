'use client';

import { useEffect, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { PublicNarrowShell } from '../../_components/PublicNarrowShell';
import { FormField } from '../../_components/FormField';
import { useAppFeedback } from '../../_components/AppFeedback';
import { WHISTLEBLOWING_CATEGORIES } from '../../../lib/domain-status';

const BODY_MIN = 20;
const BODY_MAX = 4000;

export default function WhistleblowingPublicClient({ token, locale = 'pt-BR' }) {
  const { toast } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [body, setBody] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/whistleblowing/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error('bad');
        if (cancelled) return;
        setTitle(data.title || '');
        const cats = Array.isArray(data.categories) ? data.categories : [...WHISTLEBLOWING_CATEGORIES];
        setCategories(cats);
        setCategory(cats[0] || '');
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

  const trimmed = body.trim();
  const canSubmit = !busy && trimmed.length >= BODY_MIN && category;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/public/whistleblowing/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, body: trimmed, anonymous: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'submit');
      setDone(true);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.whistleblowing.publicError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PublicNarrowShell variant="loading" locale={locale} />;
  if (error) {
    return (
      <PublicNarrowShell variant="error" locale={locale} title={t(locale, 'panel.whistleblowing.publicInvalid')}>
        <p className={cn(S.muted)}>{t(locale, 'panel.whistleblowing.publicInvalidHint')}</p>
      </PublicNarrowShell>
    );
  }
  if (done) {
    return (
      <PublicNarrowShell variant="done" locale={locale} title={t(locale, 'panel.whistleblowing.publicThanks')}>
        <p className={cn(S.muted)}>{t(locale, 'panel.whistleblowing.publicThanksHint')}</p>
      </PublicNarrowShell>
    );
  }

  return (
    <PublicNarrowShell locale={locale} title={title || t(locale, 'panel.whistleblowing.publicTitle')}>
      <p className={cn(S.muted, 'mb-4 text-prose')}>{t(locale, 'panel.whistleblowing.publicHint')}</p>
      <FormField label={t(locale, 'panel.whistleblowing.categoryLabel')}>
        <select
          className={cn(S.select)}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={busy}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {t(locale, `panel.whistleblowing.category.${c}`)}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        label={t(locale, 'panel.whistleblowing.bodyLabel')}
        className="mt-3"
        hint={
          trimmed.length > 0 && trimmed.length < BODY_MIN
            ? t(locale, 'panel.whistleblowing.bodyMinHint', { n: BODY_MIN })
            : t(locale, 'panel.whistleblowing.bodyCount', {
                n: body.length,
                max: BODY_MAX,
              })
        }
      >
        <textarea
          className={cn(S.input, 'min-h-[140px]')}
          maxLength={BODY_MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t(locale, 'panel.whistleblowing.bodyPh')}
          disabled={busy}
        />
      </FormField>
      <button
        type="button"
        className={cn(S.btnPrimary, 'mt-4 min-h-touch w-full')}
        disabled={!canSubmit}
        onClick={() => void submit()}
      >
        {busy
          ? t(locale, 'panel.whistleblowing.submitting')
          : t(locale, 'panel.whistleblowing.submitCta')}
      </button>
    </PublicNarrowShell>
  );
}
