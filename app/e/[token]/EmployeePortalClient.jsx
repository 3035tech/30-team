'use client';

import { useEffect, useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { formatDisplayDate } from '../../../lib/format-display-date';
import { S } from '../../dashboard/dashboard-shared';
import { FormField } from '../../_components/FormField';
import { RichTextView } from '../../_components/RichTextView';
import { useAppFeedback } from '../../_components/AppFeedback';
import { PublicNarrowShell } from '../../_components/PublicNarrowShell';
import { EmptyState } from '../../_components/EmptyState';
import { MeterBar } from '../../_components/MeterBar';
import { StatusToneChip } from '../../_components/StatusToneChip';
import { BrandMark } from '../../_components/BrandMark';
import { InlineCallout } from '../../_components/InlineCallout';
import Link from 'next/link';

export default function EmployeePortalClient({ token, locale = 'pt-BR' }) {
  const { toast } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [watching, setWatching] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/public/employee-portal/${encodeURIComponent(token)}?locale=${encodeURIComponent(locale)}`
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(json?.error || t(locale, 'panel.employeePortal.unavailable'));
          return;
        }
        if (!cancelled) {
          setData(json);
          setNote(json.noteToManager || '');
        }
      } catch {
        if (!cancelled) setError(t(locale, 'panel.employeePortal.unavailable'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, locale]);

  const markPrepared = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/public/employee-portal/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prepared: true, noteToManager: note }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'save');
      setData((prev) => ({
        ...prev,
        preparedAt: json.preparedAt,
        noteToManager: json.noteToManager || note,
      }));
      toast(t(locale, 'panel.employeePortal.prepSaved'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.employeePortal.prepError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const refreshPortal = async () => {
    const refresh = await fetch(
      `/api/public/employee-portal/${encodeURIComponent(token)}?locale=${encodeURIComponent(locale)}`
    );
    const next = await refresh.json().catch(() => ({}));
    if (refresh.ok) setData(next);
  };

  const completeLesson = async (lessonId) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/public/employee-portal/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'completeLesson', lessonId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'lesson');
      if (watching?.lessonId === lessonId) {
        setWatching((prev) => (prev ? { ...prev, completed: true } : prev));
      }
      await refreshPortal();
      toast(t(locale, 'panel.employeePortal.lessonMarked'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.employeePortal.lessonError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const uncompleteLesson = async (lessonId) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/public/employee-portal/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'uncompleteLesson', lessonId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'lesson');
      if (watching?.lessonId === lessonId) {
        setWatching((prev) => (prev ? { ...prev, completed: false } : prev));
      }
      await refreshPortal();
      toast(t(locale, 'panel.employeePortal.lessonUnmarked'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.employeePortal.lessonError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const openWatch = (lesson) => {
    if (!lesson?.embedUrl) return;
    setWatching({
      lessonId: lesson.id,
      embedUrl: lesson.embedUrl,
      title: lesson.title,
      contentKind: lesson.contentKind || 'link',
      completed: Boolean(lesson.completed),
    });
  };

  if (loading) {
    return <PublicNarrowShell variant="loading" locale={locale} maxWidthClass="max-w-3xl" />;
  }
  if (error) {
    return (
      <PublicNarrowShell variant="error" locale={locale} className="text-center" maxWidthClass="max-w-3xl">
        <p className="m-0 text-sm text-ink-muted">{error}</p>
      </PublicNarrowShell>
    );
  }

  const isPdf = watching?.contentKind === 'pdf';

  return (
    <PublicNarrowShell variant="form" locale={locale} maxWidthClass="max-w-3xl">
      <div className="mb-4">
        <BrandMark size={28} withWordmark title={t(locale, 'panel.employeePortal.eyebrow')} />
      </div>
      <p className={cn(S.faint, 'm-0 text-2xs uppercase tracking-wide')}>
        {t(locale, 'panel.employeePortal.eyebrow')}
      </p>
      <h1 className="m-0 mt-1 font-display text-2xl text-ink">
        {t(locale, 'panel.employeePortal.hello', { name: data?.personName || '' })}
      </h1>
      <p className={cn(S.muted, 'mt-2 text-sm')}>{t(locale, 'panel.employeePortal.hint')}</p>
      <InlineCallout tone="info" className="mt-3">
        <span className="block">{t(locale, 'panel.employeePortal.tokenChromeHint')}</span>
        <Link
          href="/employee/login"
          className={cn(S.btnBrandSoft, 'mt-2 inline-flex min-h-touch no-underline')}
        >
          {t(locale, 'panel.employeePortal.goToSessionLogin')}
        </Link>
      </InlineCallout>

      {watching?.embedUrl ? (
        <div className="mt-6 overflow-hidden rounded-card border border-brand-500/25 bg-surface shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 bg-brand-500/[0.06] px-3 py-2.5">
            <span className={cn(S.cardRowTitle, 'min-w-0 truncate')}>{watching.title}</span>
            <div className="flex flex-wrap gap-1.5">
              {!watching.completed ? (
                <button
                  type="button"
                  disabled={busy}
                  className={cn(S.btnBrandSoft, 'min-h-touch text-2xs')}
                  onClick={() => completeLesson(watching.lessonId)}
                >
                  {t(locale, 'panel.employeePortal.markLessonDone')}
                </button>
              ) : null}
              <button
                type="button"
                className={cn(S.btnGhost, 'min-h-touch')}
                onClick={() => setWatching(null)}
              >
                {isPdf ? t(locale, 'employeeHome.closePdf') : t(locale, 'employeeHome.closePlayer')}
              </button>
            </div>
          </div>
          {isPdf ? (
            <div className="h-[min(60vh,480px)] w-full bg-canvas">
              <iframe title={watching.title} src={watching.embedUrl} className="h-full w-full border-0" />
            </div>
          ) : (
            <div className="aspect-video w-full bg-black">
              <iframe
                title={watching.title}
                src={`${watching.embedUrl}${watching.embedUrl.includes('?') ? '&' : '?'}rel=0`}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          )}
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className={cn(S.label, 'mb-2')}>{t(locale, 'panel.employeePortal.pdiTitle')}</h2>
        {(data?.plans || []).length === 0 ? (
          <EmptyState message={t(locale, 'panel.employeePortal.pdiEmpty')} />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {data.plans.map((p) => (
              <li key={p.id} className="rounded-control border border-ink/12 bg-canvas/50 p-3">
                <div className="font-ui text-sm text-ink">{p.title}</div>
                {p.objective ? <p className={cn(S.muted, 'mt-1 text-xs')}>{p.objective}</p> : null}
                <ul className="mt-2 m-0 list-none space-y-1 p-0">
                  {(p.items || []).map((it) => (
                    <li key={it.id} className="text-xs text-ink-muted">
                      {it.status === 'done' ? '✓ ' : '○ '}
                      {it.title}
                      {it.dueDate ? ` · ${formatDisplayDate(it.dueDate, locale)}` : ''}
                      {it.ownerLabel ? ` · ${it.ownerLabel}` : ''}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className={cn(S.label, 'mb-2')}>{t(locale, 'panel.employeePortal.agreementsTitle')}</h2>
        {(data?.recentAgreements || []).length === 0 ? (
          <EmptyState message={t(locale, 'panel.employeePortal.agreementsEmpty')} />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {data.recentAgreements.map((a) => (
              <li key={a.id} className="rounded-control border border-ink/12 bg-canvas/50 px-3 py-2">
                <div className="font-mono text-2xs text-ink-faint">
                  {a.meetingDate ? formatDisplayDate(a.meetingDate, locale) : '—'}
                </div>
                <RichTextView html={a.nextSteps} className="mt-1 text-xs text-ink-muted" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className={cn(S.label, 'mb-2')}>{t(locale, 'panel.employeePortal.coursesTitle')}</h2>
        {(data?.courses || []).length === 0 ? (
          <EmptyState message={t(locale, 'panel.employeePortal.coursesEmpty')} />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {data.courses.map((course) => (
              <li key={course.enrollmentId} className="rounded-control border border-ink/12 bg-canvas/50 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-ui text-sm text-ink">{course.title}</div>
                  <span className="font-mono text-2xs text-ink-muted">
                    {course.progressPct}%
                    {course.isComplete ? ` · ${t(locale, 'panel.employeePortal.courseDone')}` : ''}
                  </span>
                </div>
                <MeterBar
                  percent={course.progressPct}
                  height={6}
                  className="mt-2"
                  toneClass={course.isComplete ? 'bg-success' : 'bg-brand-500'}
                  aria-label={`${course.title}: ${course.progressPct}%`}
                />
                {course.description ? (
                  <RichTextView html={course.description} className={cn(S.muted, 'mt-1 text-xs')} />
                ) : null}
                {course.dueDate || course.mandatory || course.overdue ? (
                  <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-2xs">
                    {course.dueDate ? (
                      <StatusToneChip tone="neutral" bordered={false}>
                        {t(locale, 'panel.employeePortal.courseDue', {
                          date: formatDisplayDate(course.dueDate, locale),
                        })}
                      </StatusToneChip>
                    ) : null}
                    {course.mandatory ? (
                      <StatusToneChip tone="warning" bordered={false}>
                        {t(locale, 'panel.employeePortal.courseMandatory')}
                      </StatusToneChip>
                    ) : null}
                    {course.overdue ? (
                      <StatusToneChip tone="danger" bordered={false}>
                        {t(locale, 'panel.employeePortal.courseOverdue')}
                      </StatusToneChip>
                    ) : null}
                  </div>
                ) : null}
                <ul className="mt-2 m-0 list-none space-y-2 p-0">
                  {(course.lessons || []).map((lesson) => (
                    <li
                      key={lesson.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-ink/8 bg-canvas/40 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-ink">
                          {lesson.completed ? '✓ ' : '○ '}
                          {lesson.title}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {lesson.embedUrl ? (
                            <button
                              type="button"
                              className={cn(S.btnBrandSoft, 'min-h-touch text-2xs')}
                              onClick={() => openWatch(lesson)}
                            >
                              {lesson.contentKind === 'pdf'
                                ? t(locale, 'employeeHome.viewPdfInApp')
                                : t(locale, 'employeeHome.watchInApp')}
                            </button>
                          ) : null}
                          <a
                            href={lesson.contentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-touch items-center font-mono text-2xs text-brand-600"
                          >
                            {t(locale, 'panel.employeePortal.openLesson')}
                          </a>
                        </div>
                      </div>
                      {!lesson.completed ? (
                        <button
                          type="button"
                          disabled={busy}
                          className={cn(S.btnBrandSoft, 'min-h-touch shrink-0 text-2xs')}
                          onClick={() => completeLesson(lesson.id)}
                        >
                          {t(locale, 'panel.employeePortal.markLessonDone')}
                        </button>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-2xs text-success">
                            {t(locale, 'panel.employeePortal.lessonDone')}
                          </span>
                          <button
                            type="button"
                            disabled={busy}
                            className={cn(S.btnGhost, 'min-h-touch shrink-0 text-2xs')}
                            onClick={() => uncompleteLesson(lesson.id)}
                          >
                            {t(locale, 'panel.employeePortal.unmarkLesson')}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(data?.oneOnOnePrompts || []).length > 0 ? (
        <section className="mt-8">
          <h2 className={cn(S.label, 'mb-2')}>{t(locale, 'panel.employeePortal.prepTitle')}</h2>
          <p className={cn(S.muted, 'mb-2 text-xs')}>{t(locale, 'panel.employeePortal.prepHint')}</p>
          <ol className="m-0 pl-[18px]">
            {data.oneOnOnePrompts.map((q) => (
              <li key={q} className="mb-1 text-prose leading-[1.55] text-ink">
                {q}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="mt-8 rounded-control border border-ink/12 bg-canvas/50 p-3">
        <h2 className={cn(S.label, 'mb-2')}>{t(locale, 'panel.employeePortal.prepActionTitle')}</h2>
        <p className={cn(S.muted, 'mb-2 text-xs')}>{t(locale, 'panel.employeePortal.prepActionHint')}</p>
        <FormField label={t(locale, 'panel.employeePortal.noteLabel')}>
          <textarea
            className={cn(S.input, 'min-h-[80px] w-full')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            placeholder={t(locale, 'panel.employeePortal.notePh')}
            disabled={busy}
          />
        </FormField>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={markPrepared}
            className={cn(S.btnPrimary, 'min-h-touch')}
          >
            {data?.preparedAt
              ? t(locale, 'panel.employeePortal.prepUpdate')
              : t(locale, 'panel.employeePortal.prepConfirm')}
          </button>
          {data?.preparedAt ? (
            <span className="font-mono text-2xs text-success">
              {t(locale, 'panel.employeePortal.prepDone')}
            </span>
          ) : null}
        </div>
      </section>
    </PublicNarrowShell>
  );
}
