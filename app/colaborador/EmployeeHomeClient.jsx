'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../../dashboard/dashboard-shared';
import { useAppFeedback } from '../../_components/AppFeedback';
import { AppLoading } from '../../_components/AppLoading';
import { RichTextView } from '../../_components/RichTextView';
import { DEVELOPMENT_PLAN_ITEM_STATUS } from '../../../lib/domain-status';

function taskLabel(locale, task) {
  return t(locale, task.titleKey, task.titleValues || {});
}

function itemStatusLabel(locale, status) {
  if (status === DEVELOPMENT_PLAN_ITEM_STATUS.DONE) return t(locale, 'employeeHome.pdiDone');
  if (status === DEVELOPMENT_PLAN_ITEM_STATUS.DOING) return t(locale, 'employeeHome.pdiDoing');
  return t(locale, 'employeeHome.pdiTodo');
}

/**
 * Authenticated collaborator home — tasks, PDI, LMS, 1:1, company.
 */
export function EmployeeHomeClient({ locale = 'pt-BR' }) {
  const router = useRouter();
  const { toast } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employee/home?locale=${encodeURIComponent(locale)}`);
      if (res.status === 401) {
        router.replace('/colaborador/login');
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'load');
      setData(json);
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.loadError'), 'error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [locale, router, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const lessonAction = async (lessonId, action) => {
    setBusy(true);
    try {
      const res = await fetch('/api/employee/home', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, lessonId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'lesson');
      await load();
      toast(
        t(
          locale,
          action === 'uncompleteLesson'
            ? 'panel.employeePortal.lessonUnmarked'
            : 'panel.employeePortal.lessonMarked'
        ),
        'ok'
      );
    } catch (e) {
      toast(e?.message || t(locale, 'panel.employeePortal.lessonError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AppLoading variant="panel" />;

  const person = data?.person;
  const tasks = data?.tasks || [];
  const courses = data?.courses || [];
  const plans = data?.plans || [];
  const agreements = data?.recentAgreements || [];
  const prompts = data?.oneOnOnePrompts || [];
  const company = data?.company;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6">
        <h1 className="m-0 font-display text-2xl text-ink">
          {t(locale, 'employeeHome.hello', { name: person?.fullName || '' })}
        </h1>
        <p className={cn(S.muted, 'mt-2 text-sm')}>{t(locale, 'employeeHome.hint')}</p>
      </div>

      <section className="mt-8">
        <h2 className={cn(S.label, 'mb-2')}>{t(locale, 'employeeHome.tasksTitle')}</h2>
        {tasks.length === 0 ? (
          <p className={cn(S.faint, 'm-0 text-xs italic')}>{t(locale, 'employeeHome.tasksEmpty')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {tasks.map((task) => (
              <li key={task.id} className="rounded-control border border-ink/12 bg-canvas/50 px-3 py-2.5">
                <div className="text-sm text-ink">{taskLabel(locale, task)}</div>
                {task.dueDate ? (
                  <div
                    className={cn(
                      'mt-1 font-mono text-[11px]',
                      task.kind === 'lms_overdue' ? 'text-danger' : 'text-ink-faint'
                    )}
                  >
                    {t(locale, 'employeeHome.dueBy', { date: task.dueDate })}
                  </div>
                ) : null}
                {task.href && task.href.startsWith('http') ? (
                  <a
                    href={task.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex font-mono text-[12px] text-brand-600"
                  >
                    {t(locale, 'employeeHome.openTask')}
                  </a>
                ) : task.href === '#lms' ? (
                  <a href="#lms" className="mt-2 inline-flex font-mono text-[12px] text-brand-600">
                    {t(locale, 'employeeHome.goToLms')}
                  </a>
                ) : task.href === '#pdi' ? (
                  <a href="#pdi" className="mt-2 inline-flex font-mono text-[12px] text-brand-600">
                    {t(locale, 'employeeHome.goToPdi')}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="pdi" className="mt-10 scroll-mt-6">
        <h2 className={cn(S.label, 'mb-2')}>{t(locale, 'panel.employeePortal.pdiTitle')}</h2>
        {plans.length === 0 ? (
          <p className={cn(S.faint, 'm-0 text-xs italic')}>{t(locale, 'panel.employeePortal.pdiEmpty')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {plans.map((plan) => (
              <li key={plan.id} className="rounded-control border border-ink/12 bg-canvas/50 p-3">
                <div className="font-ui text-sm text-ink">{plan.title}</div>
                {plan.objective ? (
                  <p className={cn(S.muted, 'mt-1 m-0 text-xs')}>{plan.objective}</p>
                ) : null}
                <ul className="mt-2 m-0 list-none space-y-1.5 p-0">
                  {(plan.items || []).map((it) => (
                    <li key={it.id} className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-ink">
                      <span>
                        {it.status === DEVELOPMENT_PLAN_ITEM_STATUS.DONE ? '✓ ' : '○ '}
                        {it.title}
                      </span>
                      <span className="font-mono text-[10px] text-ink-faint">
                        {itemStatusLabel(locale, it.status)}
                        {it.dueDate ? ` · ${it.dueDate}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="lms" className="mt-10 scroll-mt-6">
        <h2 className={cn(S.label, 'mb-2')}>{t(locale, 'employeeHome.lmsTitle')}</h2>
        {courses.length === 0 ? (
          <p className={cn(S.faint, 'm-0 text-xs italic')}>{t(locale, 'panel.employeePortal.coursesEmpty')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {courses.map((course) => (
              <li key={course.enrollmentId} className="rounded-control border border-ink/12 bg-canvas/50 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-ui text-sm text-ink">{course.title}</div>
                  <span className="font-mono text-[11px] text-ink-muted">
                    {course.progressPct}%
                    {course.isComplete ? ` · ${t(locale, 'panel.employeePortal.courseDone')}` : ''}
                  </span>
                </div>
                {course.dueDate ? (
                  <p
                    className={cn(
                      'mt-1 m-0 font-mono text-[11px]',
                      course.overdue ? 'text-danger' : 'text-ink-faint'
                    )}
                  >
                    {course.overdue
                      ? t(locale, 'panel.employeePortal.courseOverdue')
                      : t(locale, 'panel.employeePortal.courseDue', { date: course.dueDate })}
                    {course.mandatory ? ` · ${t(locale, 'panel.employeePortal.courseMandatory')}` : ''}
                  </p>
                ) : null}
                <ul className="mt-2 m-0 list-none space-y-2 p-0">
                  {(course.lessons || []).map((lesson) => (
                    <li
                      key={lesson.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-ink/8 bg-surface px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-ink">
                          {lesson.completed ? '✓ ' : '○ '}
                          {lesson.title}
                        </div>
                        <a
                          href={lesson.contentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] text-brand-600"
                        >
                          {t(locale, 'panel.employeePortal.openLesson')}
                        </a>
                      </div>
                      {!lesson.completed ? (
                        <button
                          type="button"
                          disabled={busy}
                          className={cn(S.btnBrandSoft, 'min-h-touch shrink-0 text-[11px]')}
                          onClick={() => lessonAction(lesson.id, 'completeLesson')}
                        >
                          {t(locale, 'panel.employeePortal.markLessonDone')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          className={cn(S.btnGhost, 'min-h-touch shrink-0 text-[11px]')}
                          onClick={() => lessonAction(lesson.id, 'uncompleteLesson')}
                        >
                          {t(locale, 'panel.employeePortal.unmarkLesson')}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className={cn(S.label, 'mb-2')}>{t(locale, 'panel.employeePortal.agreementsTitle')}</h2>
        {agreements.length === 0 ? (
          <p className={cn(S.faint, 'm-0 text-xs italic')}>
            {t(locale, 'panel.employeePortal.agreementsEmpty')}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {agreements.map((a) => (
              <li key={a.id} className="rounded-control border border-ink/12 bg-canvas/50 px-3 py-2.5 text-sm text-ink">
                {a.meetingDate ? (
                  <div className="mb-1 font-mono text-[11px] text-ink-faint">{a.meetingDate}</div>
                ) : null}
                <div className="whitespace-pre-wrap text-xs">{a.nextSteps}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {prompts.length > 0 ? (
        <section className="mt-10">
          <h2 className={cn(S.label, 'mb-2')}>{t(locale, 'panel.employeePortal.prepTitle')}</h2>
          <p className={cn(S.muted, 'mb-2 mt-0 text-xs')}>{t(locale, 'panel.employeePortal.prepHint')}</p>
          <ul className="m-0 list-disc space-y-1 pl-5 text-xs text-ink">
            {prompts.map((p, i) => (
              <li key={i}>{typeof p === 'string' ? p : p.text || p.prompt || String(p)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {company && (company.aboutHtml || (company.benefits || []).length > 0) ? (
        <section className="mt-10">
          <h2 className={cn(S.label, 'mb-2')}>{t(locale, 'employeeHome.companyTitle')}</h2>
          {company.aboutHtml ? (
            <div className="mb-3 rounded-control border border-ink/12 bg-canvas/50 px-3 py-2 text-xs text-ink">
              <RichTextView html={company.aboutHtml} />
            </div>
          ) : null}
          {company.website ? (
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="mb-3 inline-flex font-mono text-[12px] text-brand-600"
            >
              {company.website}
            </a>
          ) : null}
          {(company.benefits || []).length > 0 ? (
            <>
              <h3 className={cn(S.faint, 'mb-2 mt-3 text-[11px] uppercase tracking-wide')}>
                {t(locale, 'employeeHome.benefitsTitle')}
              </h3>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {company.benefits.map((b) => (
                  <li key={b.id} className="rounded-control border border-ink/8 px-2.5 py-2 text-xs text-ink">
                    <span className="font-ui">{b.name}</span>
                    {b.categoryName ? (
                      <span className="ml-2 font-mono text-[10px] text-ink-faint">{b.categoryName}</span>
                    ) : null}
                    {b.summary ? <p className={cn(S.muted, 'mb-0 mt-1 text-[11px]')}>{b.summary}</p> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
