'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { t, errorMessage } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { formatDisplayDate } from '../../../lib/format-display-date';
import { S } from '../../dashboard/dashboard-shared';
import { useAppFeedback } from '../../_components/AppFeedback';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { EmptyState } from '../../_components/EmptyState';
import { MeterBar } from '../../_components/MeterBar';
import { InlineCallout } from '../../_components/InlineCallout';
import { StatusToneChip } from '../../_components/StatusToneChip';
import { FormField } from '../../_components/FormField';
import { LmsMediaPlayer } from '../../_components/LmsMediaPlayer';
import { redirectEmployeeIfUnauthorized } from '../../../lib/employee-client-session';

function dueLabel(locale, course) {
  if (!course?.dueDate || course.isComplete) return null;
  if (course.overdue) return t(locale, 'panel.employeePortal.courseOverdue');
  if (course.daysLeft === 0) return t(locale, 'employeeHome.lmsDueToday');
  if (course.daysLeft === 1) return t(locale, 'employeeHome.lmsDueTomorrow');
  if (course.daysLeft != null && course.daysLeft > 1) {
    return t(locale, 'employeeHome.lmsDueInDays', { n: course.daysLeft });
  }
  return t(locale, 'panel.employeePortal.courseDue', {
    date: formatDisplayDate(course.dueDate, locale),
  });
}

function continueDueSuffix(locale, info) {
  if (!info) return '';
  if (info.overdue) return t(locale, 'panel.employeePortal.courseOverdue');
  if (info.daysLeft === 0) return t(locale, 'employeeHome.lmsDueToday');
  if (info.daysLeft === 1) return t(locale, 'employeeHome.lmsDueTomorrow');
  if (info.daysLeft != null && info.daysLeft > 1) {
    return t(locale, 'employeeHome.lmsDueInDays', { n: info.daysLeft });
  }
  return '';
}

function formatWatchHint(locale, lesson) {
  const pos = Number(lesson?.watchPositionSec) || 0;
  if (pos < 15) return null;
  const m = Math.floor(pos / 60);
  const s = pos % 60;
  return t(locale, 'employeeHome.lmsResumeAt', {
    time: `${m}:${String(s).padStart(2, '0')}`,
  });
}

/**
 * Dedicated collaborator LMS: course list + Udemy-like player (B-2717).
 */
export function EmployeeLmsClient({ locale = 'pt-BR' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useAppFeedback();
  const quizRef = useRef(null);
  const [courses, setCourses] = useState([]);
  const [continueInfo, setContinueInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [watching, setWatching] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [activeEnrollmentId, setActiveEnrollmentId] = useState(null);

  const focusCourseId = Number(searchParams?.get('course') || 0) || null;
  const focusLessonId = Number(searchParams?.get('lesson') || 0) || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employee/lms');
      if (redirectEmployeeIfUnauthorized(router, res.status)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setCourses(Array.isArray(data.courses) ? data.courses : []);
      setContinueInfo(data.continue || null);
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.lmsLoadError'), 'error');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [locale, router, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const prev = document.title;
    document.title = t(locale, 'employeeHome.lmsDocumentTitle');
    return () => {
      document.title = prev;
    };
  }, [locale]);

  useEffect(() => {
    if (!courses.length) return;
    if (focusLessonId) {
      for (const c of courses) {
        const lesson = (c.lessons || []).find((l) => Number(l.id) === focusLessonId);
        if (lesson) {
          setActiveEnrollmentId(c.enrollmentId);
          if (lesson.embedUrl || lesson.videoId) setWatching(lesson);
          break;
        }
      }
      return;
    }
    if (focusCourseId) {
      const c = courses.find((x) => Number(x.courseId) === focusCourseId);
      if (c) {
        setActiveEnrollmentId(c.enrollmentId);
        const next =
          (c.lessons || []).find((l) => Number(l.id) === c.continueLessonId) ||
          (c.lessons || []).find((l) => !l.completed) ||
          (c.lessons || [])[0];
        if (next && (next.embedUrl || next.videoId)) setWatching(next);
      }
    }
  }, [courses, focusLessonId, focusCourseId]);

  useEffect(() => {
    if (!watching && !quiz) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (quiz) setQuiz(null);
      else setWatching(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [watching, quiz]);

  useEffect(() => {
    if (!quiz || !quizRef.current) return;
    quizRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [quiz]);

  const sortedCourses = useMemo(() => {
    const list = [...courses];
    list.sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
      return 0;
    });
    if (focusCourseId) {
      list.sort((a, b) =>
        Number(a.courseId) === focusCourseId ? -1 : Number(b.courseId) === focusCourseId ? 1 : 0
      );
    }
    return list;
  }, [courses, focusCourseId]);

  const activeCourse = useMemo(
    () => courses.find((c) => c.enrollmentId === activeEnrollmentId) || null,
    [courses, activeEnrollmentId]
  );

  const quizReady =
    quiz &&
    quiz.questions.every((q) => {
      const v = quizAnswers[String(q.id)];
      return v != null && String(v).trim() !== '';
    });

  const patchLessonWatch = useCallback((lessonId, positionSec, durationSec) => {
    setCourses((prev) =>
      prev.map((c) => ({
        ...c,
        lessons: (c.lessons || []).map((l) =>
          Number(l.id) === Number(lessonId)
            ? {
                ...l,
                watchPositionSec: positionSec,
                watchDurationSec: Math.max(Number(l.watchDurationSec) || 0, durationSec || 0),
              }
            : l
        ),
      }))
    );
    setWatching((w) =>
      w && Number(w.id) === Number(lessonId)
        ? { ...w, watchPositionSec: positionSec, watchDurationSec: durationSec }
        : w
    );
  }, []);

  const saveWatchProgress = useCallback(
    async ({ lessonId, positionSec, durationSec }) => {
      try {
        const res = await fetch('/api/employee/lms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'saveWatchProgress',
            lessonId,
            positionSec,
            durationSec,
          }),
        });
        if (redirectEmployeeIfUnauthorized(router, res.status)) return;
        if (!res.ok) return;
        patchLessonWatch(lessonId, positionSec, durationSec);
      } catch {
        /* silent: progress is best-effort */
      }
    },
    [patchLessonWatch, router]
  );

  const post = async (body) => {
    setBusy(true);
    try {
      const res = await fetch('/api/employee/lms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (redirectEmployeeIfUnauthorized(router, res.status)) return null;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data.errorCode === 'LMS_QUIZ_REQUIRED'
            ? t(locale, 'employeeHome.lmsQuizRequired')
            : data.errorCode
              ? errorMessage(locale, data.errorCode)
              : data.error || 'error';
        throw Object.assign(new Error(msg), { data });
      }
      if (Array.isArray(data.courses)) setCourses(data.courses);
      else await load();
      return data;
    } finally {
      setBusy(false);
    }
  };

  const openQuiz = async (lesson) => {
    setBusy(true);
    try {
      const res = await fetch('/api/employee/lms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getQuiz', lessonId: lesson.id }),
      });
      if (redirectEmployeeIfUnauthorized(router, res.status)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'quiz');
      if (!data?.questions?.length) {
        toast(t(locale, 'employeeHome.lmsQuizEmpty'), 'info');
        return;
      }
      setWatching(null);
      setQuiz({ lessonId: lesson.id, title: lesson.title, questions: data.questions });
      setQuizAnswers({});
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.lmsQuizError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitQuiz = async () => {
    if (!quiz || !quizReady) {
      toast(t(locale, 'employeeHome.lmsQuizNeedAnswers'), 'warning');
      return;
    }
    try {
      const data = await post({
        action: 'submitQuiz',
        lessonId: quiz.lessonId,
        answers: quizAnswers,
      });
      if (data?.passed) {
        toast(t(locale, 'employeeHome.lmsQuizPassed'), 'ok');
        const lessonId = quiz.lessonId;
        setQuiz(null);
        await post({ action: 'completeLesson', lessonId });
        toast(t(locale, 'panel.employeePortal.markLessonDone'), 'ok');
      }
    } catch (e) {
      const d = e?.data;
      if (d?.errorCode === 'LMS_QUIZ_FAILED') {
        toast(
          t(locale, 'employeeHome.lmsQuizFailed', {
            correct: d.correctCount ?? 0,
            total: d.totalCount ?? 0,
          }),
          'error'
        );
        return;
      }
      toast(e?.message || t(locale, 'employeeHome.lmsQuizError'), 'error');
    }
  };

  const markLesson = async (lesson) => {
    if (lesson.quizRequired && !lesson.quizPassed && !lesson.completed) {
      await openQuiz(lesson);
      return;
    }
    try {
      await post({
        action: lesson.completed ? 'uncompleteLesson' : 'completeLesson',
        lessonId: lesson.id,
      });
      toast(
        lesson.completed
          ? t(locale, 'panel.employeePortal.unmarkLesson')
          : t(locale, 'panel.employeePortal.markLessonDone'),
        'ok'
      );
    } catch (e) {
      if (e?.data?.errorCode === 'LMS_QUIZ_REQUIRED') {
        await openQuiz(lesson);
        return;
      }
      toast(e?.message || t(locale, 'employeeHome.lmsActionError'), 'error');
    }
  };

  const openLesson = (course, lesson) => {
    setActiveEnrollmentId(course.enrollmentId);
    setQuiz(null);
    router.replace(`/employee/lms?course=${course.courseId}&lesson=${lesson.id}`, { scroll: false });
    if (lesson.embedUrl || lesson.videoId) setWatching(lesson);
    else if (lesson.quizRequired && !lesson.quizPassed) void openQuiz(lesson);
  };

  const startContinue = () => {
    if (!continueInfo) return;
    const course = courses.find((c) => c.enrollmentId === continueInfo.enrollmentId);
    const lesson = course?.lessons?.find((l) => l.id === continueInfo.lessonId);
    if (course && lesson) openLesson(course, lesson);
  };

  if (loading) return <AppLoading variant="panel" />;

  const dueSuffix = continueDueSuffix(locale, continueInfo);
  const inCourseView = Boolean(activeCourse);

  return (
    <ContentEnter animKey={`emp-lms|${courses.length}|${activeEnrollmentId || 0}`}>
      <div
        className={cn(
          'mx-auto w-full px-4 py-6 sm:px-6 sm:py-8',
          inCourseView ? 'max-w-6xl' : 'max-w-3xl lg:max-w-4xl'
        )}
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {inCourseView ? (
              <button
                type="button"
                className={cn(S.cardLink, 'inline-flex border-0 bg-transparent p-0')}
                onClick={() => {
                  setActiveEnrollmentId(null);
                  setWatching(null);
                  setQuiz(null);
                  router.replace('/employee/lms', { scroll: false });
                }}
              >
                ← {t(locale, 'employeeHome.lmsBackToCourses')}
              </button>
            ) : (
              <Link href="/employee" className={cn(S.cardLink, 'inline-flex')}>
                ← {t(locale, 'employeeHome.backHome')}
              </Link>
            )}
            <h1 className={cn(S.pageTitle, 'mt-3 mb-1')}>
              {inCourseView ? activeCourse.title : t(locale, 'employeeHome.lmsPageTitle')}
            </h1>
            <p className={cn(S.muted, 'mb-0 text-prose')}>
              {inCourseView
                ? t(locale, 'employeeHome.lmsCourseHint')
                : t(locale, 'employeeHome.lmsPageHint')}
            </p>
          </div>
        </div>

        {!inCourseView && continueInfo ? (
          <InlineCallout tone={continueInfo.overdue ? 'warning' : 'info'} className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-ui text-prose text-ink">
                {t(locale, 'employeeHome.lmsContinue', { title: continueInfo.courseTitle })}
                {dueSuffix ? ` · ${dueSuffix}` : ''}
                {continueInfo.watchPositionSec >= 15
                  ? ` · ${t(locale, 'employeeHome.lmsResumeAt', {
                      time: `${Math.floor(continueInfo.watchPositionSec / 60)}:${String(
                        continueInfo.watchPositionSec % 60
                      ).padStart(2, '0')}`,
                    })}`
                  : ''}
              </span>
              <button
                type="button"
                className={cn(S.btnPrimary, 'min-h-touch shrink-0')}
                onClick={() => startContinue()}
              >
                {t(locale, 'employeeHome.lmsContinueBtn')}
              </button>
            </div>
          </InlineCallout>
        ) : null}

        {inCourseView ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
            <div className="min-w-0">
              {watching ? (
                <LmsMediaPlayer
                  className="sticky top-14 z-10 mb-4"
                  lesson={watching}
                  startAtSec={watching.watchPositionSec || 0}
                  onProgress={saveWatchProgress}
                  onClose={() => setWatching(null)}
                  closeLabel={
                    watching.contentKind === 'pdf'
                      ? t(locale, 'employeeHome.closePdf')
                      : t(locale, 'employeeHome.closePlayer')
                  }
                />
              ) : (
                <InlineCallout tone="info" className="mb-4">
                  {t(locale, 'employeeHome.lmsPickLesson')}
                </InlineCallout>
              )}

              {quiz ? (
                <div
                  ref={quizRef}
                  className="mb-4 rounded-card border border-info/30 bg-info/[0.06] p-4"
                >
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className={cn(S.cardSection, 'm-0')}>{t(locale, 'employeeHome.lmsQuizTitle')}</h2>
                    {quiz.title ? (
                      <span className="font-mono text-2xs text-ink-faint">{quiz.title}</span>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-4">
                    {quiz.questions.map((q, idx) => (
                      <FormField key={q.id} label={`${idx + 1}. ${q.prompt}`}>
                        <div className="flex flex-col gap-2" role="radiogroup" aria-label={q.prompt}>
                          {(q.choices || []).map((ch) => {
                            const selected = quizAnswers[String(q.id)] === ch.id;
                            return (
                              <label
                                key={ch.id}
                                className={cn(
                                  'flex min-h-touch cursor-pointer items-center gap-2 rounded-control border px-3 py-2 font-ui text-prose text-ink',
                                  selected
                                    ? 'border-brand-500/40 bg-brand-500/[0.08]'
                                    : 'border-ink/10 bg-surface'
                                )}
                              >
                                <input
                                  type="radio"
                                  className={S.checkbox}
                                  name={`q-${q.id}`}
                                  checked={selected}
                                  onChange={() =>
                                    setQuizAnswers((prev) => ({ ...prev, [String(q.id)]: ch.id }))
                                  }
                                />
                                {ch.text}
                              </label>
                            );
                          })}
                        </div>
                      </FormField>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={cn(S.btnPrimary, 'min-h-touch')}
                      disabled={busy || !quizReady}
                      onClick={() => void submitQuiz()}
                    >
                      {t(locale, 'employeeHome.lmsQuizSubmit')}
                    </button>
                    <button
                      type="button"
                      className={cn(S.btnGhost, 'min-h-touch')}
                      disabled={busy}
                      onClick={() => setQuiz(null)}
                    >
                      {t(locale, 'panel.common.cancel')}
                    </button>
                  </div>
                </div>
              ) : null}

              {watching ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    className={cn(
                      watching.completed ? S.btnGhost : S.btnBrandSoft,
                      'min-h-touch text-2xs'
                    )}
                    onClick={() => void markLesson(watching)}
                  >
                    {watching.completed
                      ? t(locale, 'panel.employeePortal.unmarkLesson')
                      : watching.quizRequired && !watching.quizPassed
                        ? t(locale, 'employeeHome.lmsTakeQuiz')
                        : t(locale, 'panel.employeePortal.markLessonDone')}
                  </button>
                  {watching.contentUrl ? (
                    <a
                      href={watching.contentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(S.btnGhost, 'min-h-touch text-2xs no-underline')}
                    >
                      {t(locale, 'panel.employeePortal.openLesson')}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>

            <aside className="rounded-card border border-ink/12 bg-surface p-3 lg:sticky lg:top-14">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className={S.label}>{t(locale, 'employeeHome.lmsLessonsNav')}</span>
                <span className="font-mono text-2xs text-ink-muted">{activeCourse.progressPct}%</span>
              </div>
              <MeterBar
                percent={activeCourse.progressPct}
                height={6}
                className="mb-3"
                toneClass={
                  activeCourse.isComplete
                    ? 'bg-success'
                    : activeCourse.overdue
                      ? 'bg-danger'
                      : 'bg-brand-500'
                }
              />
              <ul className="m-0 flex max-h-[min(70vh,560px)] list-none flex-col gap-1.5 overflow-y-auto p-0">
                {(activeCourse.lessons || []).map((lesson, idx) => {
                  const active = watching?.id === lesson.id;
                  const resume = formatWatchHint(locale, lesson);
                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        className={cn(
                          'flex w-full flex-col items-start gap-0.5 rounded-control border px-2.5 py-2 text-left transition-colors',
                          active
                            ? 'border-brand-500/40 bg-brand-500/[0.08]'
                            : 'border-ink/8 bg-canvas/40 hover:border-ink/20'
                        )}
                        onClick={() => openLesson(activeCourse, lesson)}
                      >
                        <span className="font-ui text-prose text-ink">
                          {idx + 1}. {lesson.completed ? '✓ ' : ''}
                          {lesson.title}
                        </span>
                        <span className="flex flex-wrap items-center gap-1">
                          {lesson.quizRequired ? (
                            <StatusToneChip tone={lesson.quizPassed ? 'success' : 'neutral'}>
                              {lesson.quizPassed
                                ? t(locale, 'employeeHome.lmsQuizDoneBadge')
                                : t(locale, 'employeeHome.lmsQuizBadge')}
                            </StatusToneChip>
                          ) : null}
                          {resume ? (
                            <span className="font-mono text-2xs text-ink-faint">{resume}</span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {activeCourse.certificateAvailable ? (
                <Link
                  href={`/employee/lms/certificate?enrollmentId=${activeCourse.enrollmentId}`}
                  className={cn(S.btnGhost, 'mt-3 flex min-h-touch w-full justify-center text-2xs no-underline')}
                >
                  {t(locale, 'employeeHome.lmsCertificate')}
                </Link>
              ) : null}
            </aside>
          </div>
        ) : sortedCourses.length === 0 ? (
          <EmptyState
            title={t(locale, 'employeeHome.lmsTitle')}
            message={t(locale, 'employeeHome.lmsEmptyHint')}
          />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {sortedCourses.map((course) => {
              const due = dueLabel(locale, course);
              return (
                <li
                  key={course.enrollmentId}
                  className={cn(
                    'rounded-card border bg-surface p-3',
                    course.overdue ? 'border-danger/30' : 'border-ink/12'
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-ui text-sm font-medium text-ink">{course.title}</span>
                        {course.isComplete ? (
                          <StatusToneChip tone="success">
                            {t(locale, 'panel.employeePortal.courseDone')}
                          </StatusToneChip>
                        ) : null}
                        {course.mandatory ? (
                          <StatusToneChip tone="info">
                            {t(locale, 'panel.employeePortal.courseMandatory')}
                          </StatusToneChip>
                        ) : null}
                        {course.overdue ? (
                          <StatusToneChip tone="danger">
                            {t(locale, 'panel.employeePortal.courseOverdue')}
                          </StatusToneChip>
                        ) : null}
                      </div>
                      {due ? (
                        <p
                          className={cn(
                            'mb-0 mt-1 font-mono text-2xs',
                            course.overdue ? 'text-danger' : 'text-ink-faint'
                          )}
                        >
                          {due}
                        </p>
                      ) : null}
                    </div>
                    <span className="font-mono text-2xs text-ink-muted">{course.progressPct}%</span>
                  </div>
                  <MeterBar
                    percent={course.progressPct}
                    height={6}
                    className="mt-2"
                    toneClass={
                      course.isComplete
                        ? 'bg-success'
                        : course.overdue
                          ? 'bg-danger'
                          : 'bg-brand-500'
                    }
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={cn(S.btnPrimary, 'min-h-touch text-2xs')}
                      onClick={() => {
                        const next =
                          (course.lessons || []).find((l) => Number(l.id) === course.continueLessonId) ||
                          (course.lessons || []).find((l) => !l.completed) ||
                          (course.lessons || [])[0];
                        if (next) openLesson(course, next);
                        else {
                          setActiveEnrollmentId(course.enrollmentId);
                          router.replace(`/employee/lms?course=${course.courseId}`, { scroll: false });
                        }
                      }}
                    >
                      {course.isComplete
                        ? t(locale, 'employeeHome.lmsOpenCourse')
                        : t(locale, 'employeeHome.lmsContinueBtn')}
                    </button>
                    {course.certificateAvailable ? (
                      <Link
                        href={`/employee/lms/certificate?enrollmentId=${course.enrollmentId}`}
                        className={cn(S.btnGhost, 'min-h-touch text-2xs no-underline')}
                      >
                        {t(locale, 'employeeHome.lmsCertificate')}
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ContentEnter>
  );
}
