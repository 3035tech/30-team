'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { formatDisplayDate } from '../../lib/format-display-date';
import { S } from '../dashboard/dashboard-shared';
import { useAppFeedback } from '../_components/AppFeedback';
import { AppLoading, ContentEnter } from '../_components/AppLoading';
import { FormField } from '../_components/FormField';
import { RichTextView } from '../_components/RichTextView';
import { DEVELOPMENT_PLAN_ITEM_STATUS } from '../../lib/domain-status';
import { EmployeeOnboardingJourneySection } from '../_components/EmployeeOnboardingJourneySection';
import { EmployeeSurveysSection } from '../_components/EmployeeSurveysSection';
import { CollapsibleBlock } from '../_components/CollapsibleBlock';
import { EmptyState } from '../_components/EmptyState';
import { MeterBar } from '../_components/MeterBar';
import { useEmployeeNav } from '../_components/EmployeeNavContext';
import { InlineCallout } from '../_components/InlineCallout';
import { EmployeeDpSection } from '../_components/EmployeeDpSection';
import { EmployeeVariablePaySection } from '../_components/EmployeeVariablePaySection';
import { EmployeeFeedPanel, EmployeeKudosPanel } from '../_components/EmployeeFeedKudosSections';
import { redirectEmployeeIfUnauthorized } from '../../lib/employee-client-session';

const SECTION_KEYS = [
  'tasks',
  'journey',
  'pdi',
  'lms',
  'surveys',
  'oneOnOne',
  'dp',
  'variablePay',
  'feed',
  'kudos',
  'company',
];
const COLLAPSE_STORAGE = 'team30_employee_sections';
const LAST_LESSON_KEY = 'team30_employee_last_lesson';

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

function readLastLesson() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_LESSON_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLastLesson(payload) {
  if (typeof window === 'undefined') return;
  try {
    if (!payload) localStorage.removeItem(LAST_LESSON_KEY);
    else localStorage.setItem(LAST_LESSON_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function patchLessonInCourses(courses, lessonId, completed) {
  return (courses || []).map((course) => {
    const lessons = (course.lessons || []).map((l) =>
      l.id === lessonId ? { ...l, completed } : l
    );
    const done = lessons.filter((l) => l.completed).length;
    const total = lessons.length;
    const progressPct = total ? Math.round((done / total) * 100) : 0;
    return {
      ...course,
      lessons,
      progressPct,
      isComplete: progressPct >= 100,
    };
  });
}

function patchPdiItem(plans, itemId, status) {
  return (plans || []).map((plan) => ({
    ...plan,
    items: (plan.items || []).map((it) => (it.id === itemId ? { ...it, status } : it)),
  }));
}

function CollapsibleSection({ id, title, count, open, onToggle, children, locale = 'pt-BR' }) {
  return (
    <section id={id} className="mt-6 scroll-mt-24">
      <CollapsibleBlock
        locale={locale}
        title={title}
        count={count}
        open={open}
        onOpenChange={(next) => {
          if (next !== open) onToggle();
        }}
        variant="card"
        bordered={false}
      >
        {children}
      </CollapsibleBlock>
    </section>
  );
}

function EmpEmpty({ children }) {
  return (
    <div data-emp-empty tabIndex={-1} className="outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40">
      {children}
    </div>
  );
}

/**
 * Authenticated collaborator home — collapsible sections, PDI actions, LMS player.
 */
export function EmployeeHomeClient({ locale = 'pt-BR' }) {
  const router = useRouter();
  const { toast } = useAppFeedback();
  const { setNavMeta, setActiveSection, sectionFocus } = useEmployeeNav();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [surveyMeta, setSurveyMeta] = useState({ openCount: 0, hasAny: true });
  const [dpBadge, setDpBadge] = useState(0);
  const [variablePayBadge, setVariablePayBadge] = useState(0);
  const [feedTotal, setFeedTotal] = useState(0);
  const [kudosTotal, setKudosTotal] = useState(0);
  const [openMap, setOpenMap] = useState(() => {
    const saved = loadCollapsed();
    const next = {};
    for (const k of SECTION_KEYS) next[k] = saved[k] !== false;
    return next;
  });
  const [watching, setWatching] = useState(null); // { lessonId, embedUrl, title, contentKind, completed }
  const [prepNote, setPrepNote] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const lastLessonRestored = useRef(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/employee/home?locale=${encodeURIComponent(locale)}`);
      if (redirectEmployeeIfUnauthorized(router, res.status)) return;
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'load');
      setData(json);
      setFeedTotal(json?.feed?.total || 0);
      setKudosTotal(json?.kudos?.total || 0);
      setPrepNote(json?.oneOnOnePrep?.noteToManager || '');
      setLoadFailed(false);
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.loadError'), 'error');
      if (!silent) {
        setData(null);
        setLoadFailed(true);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [locale, router, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Soft refresh when the tab becomes visible again (keeps session UX fresh)
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVis = () => {
      if (document.visibilityState === 'visible') void load({ silent: true });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const prev = document.title;
    document.title = t(locale, 'employeeHome.documentTitle');
    return () => {
      document.title = prev;
    };
  }, [locale]);

  // Restore last in-app lesson after first successful load (once per session)
  useEffect(() => {
    if (lastLessonRestored.current || loading || !data?.courses?.length) return;
    lastLessonRestored.current = true;
    const last = readLastLesson();
    if (!last?.lessonId) return;
    for (const course of data.courses) {
      const lesson = (course.lessons || []).find((l) => l.id === last.lessonId && l.embedUrl);
      if (lesson) {
        setWatching({
          lessonId: lesson.id,
          embedUrl: lesson.embedUrl,
          title: lesson.title,
          contentKind: lesson.contentKind || 'link',
          completed: Boolean(lesson.completed),
        });
        break;
      }
    }
  }, [loading, data]);

  // Escape closes sticky player
  useEffect(() => {
    if (!watching) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setWatching(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [watching]);

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
    const completed = action === 'completeLesson';
    setData((prev) =>
      prev ? { ...prev, courses: patchLessonInCourses(prev.courses, lessonId, completed) } : prev
    );
    if (watching?.lessonId === lessonId) {
      setWatching((prev) => (prev ? { ...prev, completed } : prev));
    }
    setBusy(true);
    try {
      const res = await fetch('/api/employee/home', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, lessonId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'lesson');
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
      await load({ silent: true });
    } finally {
      setBusy(false);
    }
  };

  const pdiAction = async (itemId, status) => {
    setData((prev) =>
      prev ? { ...prev, plans: patchPdiItem(prev.plans, itemId, status) } : prev
    );
    setBusy(true);
    try {
      const res = await fetch('/api/employee/home', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updatePdiItem', itemId, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'pdi');
      toast(t(locale, 'employeeHome.pdiStatusSaved'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.pdiStatusError'), 'error');
      await load({ silent: true });
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

  const openWatch = useCallback((lesson) => {
    if (!lesson?.embedUrl) return;
    setOpenMap((prev) => {
      if (prev.lms !== false) return prev;
      const next = { ...prev, lms: true };
      try {
        localStorage.setItem(COLLAPSE_STORAGE, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    setWatching({
      lessonId: lesson.id,
      embedUrl: lesson.embedUrl,
      title: lesson.title,
      contentKind: lesson.contentKind || 'link',
      completed: Boolean(lesson.completed),
    });
    writeLastLesson({ lessonId: lesson.id });
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const el =
          document.getElementById('emp-video-player') || document.getElementById('lms');
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  const onSurveyMeta = useCallback((meta) => {
    setSurveyMeta(meta || { openCount: 0, hasAny: false });
  }, []);

  const openSection = useCallback((key) => {
    if (!SECTION_KEYS.includes(key)) return;
    setOpenMap((prev) => {
      if (prev[key] !== false) return prev;
      const next = { ...prev, [key]: true };
      try {
        localStorage.setItem(COLLAPSE_STORAGE, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const scrollToSection = useCallback((id) => {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  // Menu / deep-link focus: always expand + scroll (even if same section re-clicked)
  useEffect(() => {
    if (!sectionFocus?.id || loading) return;
    const id = sectionFocus.id;
    setActiveSection(id);
    openSection(id);
    scrollToSection(id);
    window.setTimeout(() => {
      const empty = document.querySelector(`#${id} [data-emp-empty]`);
      if (empty && typeof empty.focus === 'function') empty.focus();
    }, 280);
  }, [sectionFocus, loading, openSection, scrollToSection, setActiveSection]);

  // Nav badges only (menu always lists all functionalities)
  useEffect(() => {
    if (!data) return;
    const tasks = data.tasks || [];
    const courses = data.courses || [];
    const lmsOverdue = courses.filter((c) => c.overdue).length;
    setNavMeta({
      badges: {
        tasks: tasks.length,
        surveys: surveyMeta.openCount || 0,
        lms: lmsOverdue,
        dp: dpBadge,
        feed: feedTotal,
        kudos: kudosTotal,
      },
    });
  }, [data, surveyMeta, dpBadge, feedTotal, kudosTotal, setNavMeta]);

  // Scroll-spy
  useEffect(() => {
    if (loading || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const ids = SECTION_KEYS.filter((id) => document.getElementById(id));
    if (!ids.length) return undefined;
    const ratios = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let best = null;
        let bestR = 0;
        for (const id of ids) {
          const r = ratios.get(id) || 0;
          if (r > bestR) {
            bestR = r;
            best = id;
          }
        }
        if (best) setActiveSection(best);
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [loading, data, setActiveSection]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onHash = () => {
      const id = (window.location.hash || '').replace(/^#/, '');
      if (!id || !SECTION_KEYS.includes(id)) return;
      setActiveSection(id);
      openSection(id);
      scrollToSection(id);
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [loading, openSection, scrollToSection, setActiveSection]);

  if (loading) return <AppLoading variant="panel" />;

  if (loadFailed || !data) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <EmptyState
          message={t(locale, 'employeeHome.loadError')}
          actionLabel={t(locale, 'employeeHome.loadRetry')}
          onAction={() => void load()}
        />
      </div>
    );
  }

  const tasks = data.tasks || [];
  const journey = data.journey;
  const courses = data.courses || [];
  const plans = data.plans || [];
  const agreements = data.recentAgreements || [];
  const prompts = data.oneOnOnePrompts || [];
  const company = data.company;
  const hasJourney = Boolean(journey?.preItems?.length || journey?.checkins?.length);
  const hasCompany = company && (company.aboutHtml || (company.benefits || []).length > 0);
  const isPdf = watching?.contentKind === 'pdf';
  const startHere =
    tasks.length > 0
      ? { href: '#tasks', labelKey: 'employeeHome.startHereTasks', count: tasks.length }
      : surveyMeta.openCount > 0
        ? { href: '#surveys', labelKey: 'employeeHome.startHereSurveys', count: surveyMeta.openCount }
        : null;

  return (
    <ContentEnter animKey="ready">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-4xl">
        <div className="mb-6">
          <p className={cn(S.muted, 'm-0')}>{t(locale, 'employeeHome.hint')}</p>
          {startHere ? (
            <InlineCallout tone="info" className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span>
                {t(locale, startHere.labelKey, { count: startHere.count })}
              </span>
              <a href={startHere.href} className={cn(S.btnBrandSoft, 'min-h-touch no-underline')}>
                {t(locale, 'employeeHome.startHereCta')}
              </a>
            </InlineCallout>
          ) : null}
        </div>

        {watching?.embedUrl ? (
          <div
            id="emp-video-player"
            className="emp-player sticky top-14 z-20 mb-6 overflow-hidden rounded-card border border-brand-500/25 bg-surface shadow-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 bg-brand-500/[0.06] px-3 py-2.5">
              <span className={cn(S.cardRowTitle, 'min-w-0 truncate')}>{watching.title}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {!watching.completed ? (
                  <button
                    type="button"
                    disabled={busy}
                    className={cn(S.btnBrandSoft, 'min-h-touch shrink-0 text-2xs')}
                    onClick={() => lessonAction(watching.lessonId, 'completeLesson')}
                  >
                    {t(locale, 'panel.employeePortal.markLessonDone')}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    className={cn(S.btnGhost, 'min-h-touch shrink-0 text-2xs')}
                    onClick={() => lessonAction(watching.lessonId, 'uncompleteLesson')}
                  >
                    {t(locale, 'panel.employeePortal.unmarkLesson')}
                  </button>
                )}
                <button
                  type="button"
                  className={cn(S.btnGhost, 'min-h-touch shrink-0')}
                  onClick={() => {
                    setWatching(null);
                  }}
                >
                  {isPdf ? t(locale, 'employeeHome.closePdf') : t(locale, 'employeeHome.closePlayer')}
                </button>
              </div>
            </div>
            {isPdf ? (
              <div className="h-[min(70vh,560px)] w-full bg-canvas">
                <iframe
                  title={watching.title}
                  src={watching.embedUrl}
                  className="h-full w-full border-0"
                />
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
            <p className={cn(S.faint, 'm-0 px-3 py-2')}>
              {isPdf
                ? t(locale, 'employeeHome.viewPdfHint')
                : t(locale, 'employeeHome.watchInAppHint')}
            </p>
          </div>
        ) : null}

        <CollapsibleSection
          id="tasks"
          title={t(locale, 'employeeHome.tasksTitle')}
          count={tasks.length}
          open={openMap.tasks !== false}
          onToggle={() => toggleSection('tasks')}
          locale={locale}
        >
          {tasks.length === 0 ? (
            <EmpEmpty>
              <EmptyState
                message={t(locale, 'employeeHome.tasksEmpty')}
                actionLabel={
                  courses.length
                    ? t(locale, 'employeeHome.emptyGoLms')
                    : plans.length
                      ? t(locale, 'employeeHome.emptyGoPdi')
                      : undefined
                }
                actionHref={courses.length ? '#lms' : plans.length ? '#pdi' : undefined}
              />
            </EmpEmpty>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {tasks.map((task) => (
                <li key={task.id} className="rounded-control border border-ink/12 bg-canvas/50 px-3 py-2.5">
                  <div className={S.cardBody}>{taskLabel(locale, task)}</div>
                  {task.dueDate ? (
                    <div
                      className={cn(
                        'mt-1 font-mono text-2xs',
                        task.kind === 'lms_overdue' ? 'text-danger' : 'text-ink-faint'
                      )}
                    >
                      {t(locale, 'employeeHome.dueBy', {
                        date: formatDisplayDate(task.dueDate, locale),
                      })}
                    </div>
                  ) : null}
                  {task.href && task.href.startsWith('http') ? (
                    <a
                      href={task.href}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(S.cardLink, 'mt-2')}
                    >
                      {t(locale, 'employeeHome.openTask')}
                    </a>
                  ) : task.href?.startsWith('#') ? (
                    <a href={task.href} className={cn(S.cardLink, 'mt-2')}>
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

        <CollapsibleSection
          id="journey"
          title={t(locale, 'employeeHome.journeyTitle')}
          open={openMap.journey !== false}
          onToggle={() => toggleSection('journey')}
          locale={locale}
        >
          {hasJourney ? (
            <EmployeeOnboardingJourneySection
              locale={locale}
              journey={journey}
              onChanged={refreshJourney}
            />
          ) : (
            <EmpEmpty>
              <EmptyState message={t(locale, 'employeeHome.journeyEmptyHint')} />
            </EmpEmpty>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          id="pdi"
          title={t(locale, 'panel.employeePortal.pdiTitle')}
          count={plans.length}
          open={openMap.pdi !== false}
          onToggle={() => toggleSection('pdi')}
          locale={locale}
        >
          {plans.length === 0 ? (
            <EmpEmpty>
              <EmptyState message={t(locale, 'employeeHome.pdiEmptyHint')} />
            </EmpEmpty>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {plans.map((plan) => {
                const items = plan.items || [];
                const doneN = items.filter((it) => it.status === DEVELOPMENT_PLAN_ITEM_STATUS.DONE).length;
                const pct = items.length ? Math.round((doneN / items.length) * 100) : 0;
                return (
                <li key={plan.id} className="rounded-control border border-ink/12 bg-canvas/50 p-3">
                  <div className={S.cardBody}>{plan.title}</div>
                  {plan.objective ? (
                    <p className={cn(S.muted, 'mt-1 m-0')}>{plan.objective}</p>
                  ) : null}
                  {items.length > 0 ? (
                    <MeterBar
                      percent={pct}
                      height={6}
                      className="mt-2"
                      toneClass={pct >= 100 ? 'bg-success' : 'bg-brand-500'}
                      aria-label={`${plan.title}: ${pct}%`}
                    />
                  ) : null}
                  <ul className="mt-2 m-0 list-none space-y-2 p-0">
                    {items.map((it) => (
                      <li
                        key={it.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-ink/8 bg-canvas/40 px-2.5 py-2"
                      >
                        <div className={cn(S.cardMuted, 'min-w-0')}>
                          {it.status === DEVELOPMENT_PLAN_ITEM_STATUS.DONE ? '✓ ' : '○ '}
                          {it.title}
                          <div className="mt-0.5 font-mono text-2xs text-ink-faint">
                            {itemStatusLabel(locale, it.status)}
                            {it.dueDate ? ` · ${formatDisplayDate(it.dueDate, locale)}` : ''}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {it.status !== DEVELOPMENT_PLAN_ITEM_STATUS.DONE ? (
                            <button
                              type="button"
                              disabled={busy}
                              className={cn(S.btnBrandSoft, 'min-h-touch text-2xs')}
                              onClick={() => pdiAction(it.id, DEVELOPMENT_PLAN_ITEM_STATUS.DONE)}
                            >
                              {t(locale, 'employeeHome.pdiMarkDone')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              className={cn(S.btnGhost, 'min-h-touch text-2xs')}
                              onClick={() => pdiAction(it.id, DEVELOPMENT_PLAN_ITEM_STATUS.TODO)}
                            >
                              {t(locale, 'employeeHome.pdiMarkTodo')}
                            </button>
                          )}
                          {it.status === DEVELOPMENT_PLAN_ITEM_STATUS.TODO ? (
                            <button
                              type="button"
                              disabled={busy}
                              className={cn(S.btnGhost, 'min-h-touch text-2xs')}
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
                );
              })}
            </ul>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          id="lms"
          title={t(locale, 'employeeHome.lmsTitle')}
          count={courses.length}
          open={openMap.lms !== false}
          onToggle={() => toggleSection('lms')}
          locale={locale}
        >
          {courses.length === 0 ? (
            <EmpEmpty>
              <EmptyState message={t(locale, 'employeeHome.lmsEmptyHint')} />
            </EmpEmpty>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {courses.map((course) => (
                <li key={course.enrollmentId} className="rounded-control border border-ink/12 bg-canvas/50 p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className={S.cardBody}>{course.title}</div>
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
                  {course.dueDate ? (
                    <p
                      className={cn(
                        'mt-1 m-0 font-mono text-2xs',
                        course.overdue ? 'text-danger' : 'text-ink-faint'
                      )}
                    >
                      {course.overdue
                        ? t(locale, 'panel.employeePortal.courseOverdue')
                        : t(locale, 'panel.employeePortal.courseDue', {
                            date: formatDisplayDate(course.dueDate, locale),
                          })}
                      {course.mandatory ? ` · ${t(locale, 'panel.employeePortal.courseMandatory')}` : ''}
                    </p>
                  ) : null}
                  <ul className="mt-2 m-0 list-none space-y-2 p-0">
                    {(course.lessons || []).map((lesson) => (
                      <li
                        key={lesson.id}
                        className={cn(
                          'flex flex-wrap items-center justify-between gap-2 rounded-control border px-2.5 py-2',
                          watching?.lessonId === lesson.id
                            ? 'border-brand-500/40 bg-brand-500/[0.06]'
                            : 'border-ink/8 bg-canvas/40'
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className={S.cardMuted}>
                            {lesson.completed ? '✓ ' : '○ '}
                            {lesson.title}
                            {lesson.contentKind && lesson.contentKind !== 'link' ? (
                              <span className="ml-1 font-mono text-2xs uppercase text-ink-faint">
                                {lesson.contentKind}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
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
                              className={cn(S.btnGhost, 'min-h-touch text-2xs no-underline')}
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
                            onClick={() => lessonAction(lesson.id, 'completeLesson')}
                          >
                            {t(locale, 'panel.employeePortal.markLessonDone')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            className={cn(S.btnGhost, 'min-h-touch shrink-0 text-2xs')}
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
          count={surveyMeta.openCount || undefined}
          open={openMap.surveys !== false}
          onToggle={() => toggleSection('surveys')}
          locale={locale}
        >
          <EmployeeSurveysSection locale={locale} onMeta={onSurveyMeta} />
        </CollapsibleSection>

        <CollapsibleSection
          id="oneOnOne"
          title={t(locale, 'panel.employeePortal.agreementsTitle')}
          count={agreements.length + (prompts.length ? 1 : 0)}
          open={openMap.oneOnOne !== false}
          onToggle={() => toggleSection('oneOnOne')}
          locale={locale}
        >
          {agreements.length === 0 ? (
            <EmpEmpty>
              <EmptyState message={t(locale, 'panel.employeePortal.agreementsEmpty')} />
            </EmpEmpty>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {agreements.map((a) => (
                <li key={a.id} className="rounded-control border border-ink/12 bg-canvas/50 px-3 py-2.5">
                  {a.meetingDate ? (
                    <div className="mb-1 font-mono text-2xs text-ink-faint">
                      {formatDisplayDate(a.meetingDate, locale)}
                    </div>
                  ) : null}
                  <div className={cn(S.cardMuted, 'whitespace-pre-wrap')}>{a.nextSteps}</div>
                </li>
              ))}
            </ul>
          )}
          {agreements.length === 0 && !prompts.length ? (
            <InlineCallout tone="info" className="mt-3">
              {t(locale, 'employeeHome.oneOnOneEmptyHint')}
            </InlineCallout>
          ) : null}
          {prompts.length > 0 ? (
            <div className="mt-4">
              <h3 className={cn(S.cardSection, 'mb-2 mt-0')}>
                {t(locale, 'panel.employeePortal.prepTitle')}
              </h3>
              <p className={cn(S.muted, 'mb-2 mt-0')}>{t(locale, 'panel.employeePortal.prepHint')}</p>
              <ul className="m-0 list-disc space-y-1 pl-5 text-prose text-ink">
                {prompts.map((p, i) => (
                  <li key={i}>{typeof p === 'string' ? p : p.text || p.prompt || String(p)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-4 rounded-control border border-ink/12 bg-canvas/40 p-3">
            <h3 className={cn(S.label, 'mb-2 mt-0')}>{t(locale, 'panel.employeePortal.prepActionTitle')}</h3>
            <p className={cn(S.muted, 'mb-2 mt-0 text-xs')}>{t(locale, 'panel.employeePortal.prepActionHint')}</p>
            <FormField label={t(locale, 'panel.employeePortal.noteLabel')}>
              <textarea
                className={cn(S.input, 'min-h-[80px] w-full')}
                value={prepNote}
                onChange={(e) => setPrepNote(e.target.value)}
                maxLength={2000}
                placeholder={t(locale, 'panel.employeePortal.notePh')}
                disabled={busy}
              />
            </FormField>
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
                <span className="font-mono text-2xs text-success">
                  {t(locale, 'panel.employeePortal.prepDone')}
                </span>
              ) : null}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="dp"
          title={t(locale, 'employeeHome.dpTitle')}
          count={dpBadge || null}
          open={openMap.dp !== false}
          onToggle={() => toggleSection('dp')}
          locale={locale}
        >
          <EmployeeDpSection locale={locale} onBadge={setDpBadge} />
        </CollapsibleSection>

        <CollapsibleSection
          id="variablePay"
          title={t(locale, 'employeeHome.variablePayTitle')}
          count={variablePayBadge || null}
          open={openMap.variablePay !== false}
          onToggle={() => toggleSection('variablePay')}
          locale={locale}
        >
          <EmployeeVariablePaySection locale={locale} onBadge={setVariablePayBadge} />
        </CollapsibleSection>

        <CollapsibleSection
          id="feed"
          title={t(locale, 'employeeHome.feedTitle')}
          count={feedTotal || null}
          open={openMap.feed !== false}
          onToggle={() => toggleSection('feed')}
          locale={locale}
        >
          <EmployeeFeedPanel
            locale={locale}
            items={data?.feed?.items || []}
            total={data?.feed?.total || 0}
            onTotalChange={setFeedTotal}
          />
        </CollapsibleSection>

        <CollapsibleSection
          id="kudos"
          title={t(locale, 'employeeHome.kudosTitle')}
          count={kudosTotal || null}
          open={openMap.kudos !== false}
          onToggle={() => toggleSection('kudos')}
          locale={locale}
        >
          <EmployeeKudosPanel
            locale={locale}
            items={data?.kudos?.items || []}
            total={data?.kudos?.total || 0}
            onChanged={setKudosTotal}
          />
        </CollapsibleSection>

        <CollapsibleSection
          id="company"
          title={t(locale, 'employeeHome.companyTitle')}
          open={openMap.company !== false}
          onToggle={() => toggleSection('company')}
          locale={locale}
        >
          {!hasCompany ? (
            <EmpEmpty>
              <EmptyState message={t(locale, 'employeeHome.companyEmptyHint')} />
            </EmpEmpty>
          ) : (
            <>
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
                  className="mb-3 inline-flex font-mono text-xs text-brand-600"
                >
                  {company.website}
                </a>
              ) : null}
              {(company.benefits || []).length > 0 ? (
                <>
                  <h3 className={cn(S.faint, 'mb-2 mt-3 text-2xs uppercase tracking-wide')}>
                    {t(locale, 'employeeHome.benefitsTitle')}
                  </h3>
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {company.benefits.map((b) => (
                      <li key={b.id} className="rounded-control border border-ink/8 px-2.5 py-2 text-xs text-ink">
                        <span className="font-ui">{b.name}</span>
                        {b.categoryName ? (
                          <span className="ml-2 font-mono text-2xs text-ink-faint">{b.categoryName}</span>
                        ) : null}
                        {b.summary ? <p className={cn(S.muted, 'mb-0 mt-1 text-2xs')}>{b.summary}</p> : null}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          )}
        </CollapsibleSection>
      </div>
    </ContentEnter>
  );
}
