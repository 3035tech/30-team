'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { useAppFeedback } from '../_components/AppFeedback';
import { AppLoading, ContentEnter } from '../_components/AppLoading';
import { RichTextView } from '../_components/RichTextView';
import { DEVELOPMENT_PLAN_ITEM_STATUS } from '../../lib/domain-status';
import { EmployeeOnboardingJourneySection } from '../_components/EmployeeOnboardingJourneySection';
import { EmployeeSurveysSection } from '../_components/EmployeeSurveysSection';

const SECTION_KEYS = ['tasks', 'journey', 'pdi', 'lms', 'surveys', 'oneOnOne', 'company'];
const COLLAPSE_STORAGE = 'team30_employee_sections';

function taskLabel(locale, task) {
  return t(locale, task.titleKey, task.titleValues || {});
}

function itemStatusLabel(locale, status) {
  if (status === DEVELOPMENT_PLAN_ITEM_STATUS.DONE) return t(locale, 'employeeHome.pdiDone');
  if (status === DEVELOPMENT_PLAN_ITEM_STATUS.DOING) return t(locale, 'employeeHome.pdiDoing');
  return t(locale, 'employeeHome.pdiTodo');
}

function loadCollapsed() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(COLLAPSE_STORAGE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function CollapsibleSection({ id, title, count, open, onToggle, children }) {
  return (
    <section id={id} className="mt-6 scroll-mt-20">
      <button
        type="button"
        className="flex w-full min-h-touch items-center justify-between gap-2 rounded-control border border-ink/12 bg-canvas/60 px-3 py-2 text-left"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className={cn(S.label, 'm-0')}>
          {title}
          {count != null ? (
            <span className="ml-2 font-mono text-[11px] font-normal text-ink-faint">({count})</span>
          ) : null}
        </span>
        <span className="font-mono text-xs text-ink-muted">{open ? '▾' : '▸'}</span>
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

/**
 * Authenticated collaborator home — collapsible sections, PDI actions, LMS player.
 */
export function EmployeeHomeClient({ locale = 'pt-BR' }) {
  const router = useRouter();
  const { toast } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [openMap, setOpenMap] = useState(() => {
    const saved = loadCollapsed();
    const next = {};
    for (const k of SECTION_KEYS) next[k] = saved[k] !== false;
    return next;
  });
  const [watching, setWatching] = useState(null); // { lessonId, embedUrl, title }
  const [prepNote, setPrepNote] = useState('');

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
      setPrepNote(json?.oneOnOnePrep?.noteToManager || '');
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

  const toggleSection = (key) => {
    setOpenMap((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(COLLAPSE_STORAGE, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

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

  const pdiAction = async (itemId, status) => {
    setBusy(true);
    try {
      const res = await fetch('/api/employee/home', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updatePdiItem', itemId, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'pdi');
      await load();
      toast(t(locale, 'employeeHome.pdiStatusSaved'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.pdiStatusError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const prepAction = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/employee/home', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submitOneOnOnePrep', noteToManager: prepNote }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'prep');
      setData((prev) =>
        prev
          ? {
              ...prev,
              oneOnOnePrep: json.oneOnOnePrep || prev.oneOnOnePrep,
            }
          : prev
      );
      toast(t(locale, 'panel.employeePortal.prepDone'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.employeePortal.prepError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const refreshJourney = useCallback(
    (nextJourney) => {
      if (nextJourney) {
        setData((prev) => (prev ? { ...prev, journey: nextJourney } : prev));
      } else {
        void load();
      }
    },
    [load]
  );

  if (loading) return <AppLoading variant="panel" />;

  const person = data?.person;
  const tasks = data?.tasks || [];
  const journey = data?.journey;
  const courses = data?.courses || [];
  const plans = data?.plans || [];
  const agreements = data?.recentAgreements || [];
  const prompts = data?.oneOnOnePrompts || [];
  const company = data?.company;
  const hasJourney = Boolean(journey?.preItems?.length || journey?.checkins?.length);
  const hasCompany = company && (company.aboutHtml || (company.benefits || []).length > 0);

  return (
    <ContentEnter animKey="ready">
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-4">
        <h1 className="m-0 font-display text-2xl text-ink">
          {t(locale, 'employeeHome.hello', { name: person?.fullName || '' })}
        </h1>
        <p className={cn(S.muted, 'mt-2 text-sm')}>{t(locale, 'employeeHome.hint')}</p>
      </div>

      <nav className="mb-2 flex flex-wrap gap-1.5" aria-label={t(locale, 'employeeHome.sectionNavAria')}>
        {[
          { key: 'tasks', label: t(locale, 'employeeHome.tasksTitle'), href: '#tasks' },
          ...(hasJourney
            ? [{ key: 'journey', label: t(locale, 'employeeHome.journeyTitle'), href: '#journey' }]
            : []),
          { key: 'pdi', label: t(locale, 'panel.employeePortal.pdiTitle'), href: '#pdi' },
          { key: 'lms', label: t(locale, 'employeeHome.lmsTitle'), href: '#lms' },
          { key: 'surveys', label: t(locale, 'employeeHome.surveysTitle'), href: '#surveys' },
          { key: 'oneOnOne', label: t(locale, 'panel.employeePortal.agreementsTitle'), href: '#oneOnOne' },
          ...(hasCompany
            ? [{ key: 'company', label: t(locale, 'employeeHome.companyTitle'), href: '#company' }]
            : []),
        ].map((chip) => (
          <a
            key={chip.key}
            href={chip.href}
            className={cn(S.filterChip, 'no-underline')}
            onClick={() => {
              if (!openMap[chip.key]) toggleSection(chip.key);
            }}
          >
            {chip.label}
          </a>
        ))}
      </nav>

      <CollapsibleSection
        id="tasks"
        title={t(locale, 'employeeHome.tasksTitle')}
        count={tasks.length}
        open={openMap.tasks !== false}
        onToggle={() => toggleSection('tasks')}
      >
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
                ) : task.href?.startsWith('#') ? (
                  <a href={task.href} className="mt-2 inline-flex font-mono text-[12px] text-brand-600">
                    {task.href === '#lms'
                      ? t(locale, 'employeeHome.goToLms')
                      : task.href === '#pdi'
                        ? t(locale, 'employeeHome.goToPdi')
                        : task.href === '#journey'
                          ? t(locale, 'employeeHome.goToJourney')
                          : t(locale, 'employeeHome.openTask')}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      {hasJourney ? (
        <CollapsibleSection
          id="journey"
          title={t(locale, 'employeeHome.journeyTitle')}
          open={openMap.journey !== false}
          onToggle={() => toggleSection('journey')}
        >
          <EmployeeOnboardingJourneySection
            locale={locale}
            journey={journey}
            onChanged={refreshJourney}
          />
        </CollapsibleSection>
      ) : null}

      <CollapsibleSection
        id="pdi"
        title={t(locale, 'panel.employeePortal.pdiTitle')}
        count={plans.length}
        open={openMap.pdi !== false}
        onToggle={() => toggleSection('pdi')}
      >
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
                <ul className="mt-2 m-0 list-none space-y-2 p-0">
                  {(plan.items || []).map((it) => (
                    <li
                      key={it.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-ink/8 bg-surface px-2.5 py-2"
                    >
                      <div className="min-w-0 text-xs text-ink">
                        {it.status === DEVELOPMENT_PLAN_ITEM_STATUS.DONE ? '✓ ' : '○ '}
                        {it.title}
                        <div className="mt-0.5 font-mono text-[10px] text-ink-faint">
                          {itemStatusLabel(locale, it.status)}
                          {it.dueDate ? ` · ${it.dueDate}` : ''}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {it.status !== DEVELOPMENT_PLAN_ITEM_STATUS.DONE ? (
                          <button
                            type="button"
                            disabled={busy}
                            className={cn(S.btnBrandSoft, 'min-h-touch text-[11px]')}
                            onClick={() => pdiAction(it.id, DEVELOPMENT_PLAN_ITEM_STATUS.DONE)}
                          >
                            {t(locale, 'employeeHome.pdiMarkDone')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            className={cn(S.btnGhost, 'min-h-touch text-[11px]')}
                            onClick={() => pdiAction(it.id, DEVELOPMENT_PLAN_ITEM_STATUS.TODO)}
                          >
                            {t(locale, 'employeeHome.pdiMarkTodo')}
                          </button>
                        )}
                        {it.status === DEVELOPMENT_PLAN_ITEM_STATUS.TODO ? (
                          <button
                            type="button"
                            disabled={busy}
                            className={cn(S.btnGhost, 'min-h-touch text-[11px]')}
                            onClick={() => pdiAction(it.id, DEVELOPMENT_PLAN_ITEM_STATUS.DOING)}
                          >
                            {t(locale, 'employeeHome.pdiMarkDoing')}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="lms"
        title={t(locale, 'employeeHome.lmsTitle')}
        count={courses.length}
        open={openMap.lms !== false}
        onToggle={() => toggleSection('lms')}
      >
        {watching?.embedUrl ? (
          <div className="mb-4 overflow-hidden rounded-control border border-ink/12 bg-ink/5">
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="truncate text-xs text-ink">{watching.title}</span>
              <button
                type="button"
                className={cn(S.btnGhost, 'min-h-touch shrink-0 text-[11px]')}
                onClick={() => setWatching(null)}
              >
                {t(locale, 'employeeHome.closePlayer')}
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                title={watching.title}
                src={watching.embedUrl}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ) : null}

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
                          {lesson.contentKind && lesson.contentKind !== 'link' ? (
                            <span className="ml-1 font-mono text-[10px] uppercase text-ink-faint">
                              {lesson.contentKind}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {lesson.embedUrl ? (
                            <button
                              type="button"
                              className="border-none bg-transparent p-0 font-mono text-[11px] text-brand-600"
                              onClick={() =>
                                setWatching({
                                  lessonId: lesson.id,
                                  embedUrl: lesson.embedUrl,
                                  title: lesson.title,
                                })
                              }
                            >
                              {t(locale, 'employeeHome.watchInApp')}
                            </button>
                          ) : null}
                          <a
                            href={lesson.contentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-[11px] text-brand-600"
                          >
                            {t(locale, 'panel.employeePortal.openLesson')}
                          </a>
                        </div>
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
      </CollapsibleSection>

      <CollapsibleSection
        id="surveys"
        title={t(locale, 'employeeHome.surveysTitle')}
        open={openMap.surveys !== false}
        onToggle={() => toggleSection('surveys')}
      >
        <EmployeeSurveysSection locale={locale} />
      </CollapsibleSection>

      <CollapsibleSection
        id="oneOnOne"
        title={t(locale, 'panel.employeePortal.agreementsTitle')}
        count={agreements.length + (prompts.length ? 1 : 0)}
        open={openMap.oneOnOne !== false}
        onToggle={() => toggleSection('oneOnOne')}
      >
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
        {prompts.length > 0 ? (
          <div className="mt-4">
            <h3 className={cn(S.faint, 'mb-2 mt-0 text-[11px] uppercase tracking-wide')}>
              {t(locale, 'panel.employeePortal.prepTitle')}
            </h3>
            <p className={cn(S.muted, 'mb-2 mt-0 text-xs')}>{t(locale, 'panel.employeePortal.prepHint')}</p>
            <ul className="m-0 list-disc space-y-1 pl-5 text-xs text-ink">
              {prompts.map((p, i) => (
                <li key={i}>{typeof p === 'string' ? p : p.text || p.prompt || String(p)}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-4 rounded-control border border-ink/12 bg-canvas/40 p-3">
          <h3 className={cn(S.label, 'mb-2 mt-0')}>{t(locale, 'panel.employeePortal.prepActionTitle')}</h3>
          <p className={cn(S.muted, 'mb-2 mt-0 text-xs')}>{t(locale, 'panel.employeePortal.prepActionHint')}</p>
          <label className="block text-xs text-ink-muted">
            {t(locale, 'panel.employeePortal.noteLabel')}
            <textarea
              className={cn(S.input, 'mt-1 min-h-[80px] w-full')}
              value={prepNote}
              onChange={(e) => setPrepNote(e.target.value)}
              maxLength={2000}
              placeholder={t(locale, 'panel.employeePortal.notePh')}
              disabled={busy}
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={prepAction}
              className={cn(S.btnPrimary, 'min-h-touch')}
            >
              {data?.oneOnOnePrep?.preparedAt
                ? t(locale, 'panel.employeePortal.prepUpdate')
                : t(locale, 'panel.employeePortal.prepConfirm')}
            </button>
            {data?.oneOnOnePrep?.preparedAt ? (
              <span className="font-mono text-[11px] text-success">
                {t(locale, 'panel.employeePortal.prepDone')}
              </span>
            ) : null}
          </div>
        </div>
      </CollapsibleSection>

      {hasCompany ? (
        <CollapsibleSection
          id="company"
          title={t(locale, 'employeeHome.companyTitle')}
          open={openMap.company !== false}
          onToggle={() => toggleSection('company')}
        >
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
        </CollapsibleSection>
      ) : null}
    </div>
    </ContentEnter>
  );
}
