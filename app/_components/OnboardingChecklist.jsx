'use client';

/**
 * Onboarding checklist — persistent Overview card (first-week activation).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '../../lib/cn';
import { t } from '../../lib/i18n';
import { CollapsibleBlock } from './CollapsibleBlock';
import { S } from '../dashboard/dashboard-shared';

const TASK_TABS = Object.freeze({
  create_vacancy: 'vacancies',
  send_assessment: 'vacancies',
  view_result: 'team',
  move_pipeline: 'vacancies',
  create_climate: 'climate',
  view_analytics: 'analytics',
  invite_manager: 'users',
});

export function OnboardingChecklist({ locale = 'pt-BR', initialProgress, initialTasks }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('team30_onboarding_dismissed') === 'true';
  });
  const router = useRouter();

  const { progress, tasks } = initialProgress || { progress: 0, tasks: initialTasks || [] };

  if (progress >= 100 || dismissed) {
    return null;
  }

  const completedCount = tasks.filter((task) => task.completed).length;
  const totalCount = tasks.length;

  const handleTaskClick = (taskId) => {
    const tab = TASK_TABS[taskId];
    if (tab) router.push(`/dashboard?tab=${tab}`);
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('team30_onboarding_dismissed', 'true');
    }
  };

  const taskTitle = (task) => {
    const key = `panel.firstSteps.task.${task.id}.title`;
    const label = t(locale, key);
    return label === key ? task.title : label;
  };

  const taskDesc = (task) => {
    const key = `panel.firstSteps.task.${task.id}.desc`;
    const label = t(locale, key);
    return label === key ? task.description : label;
  };

  return (
    <div className={cn(S.card, 'overflow-hidden border-brand-500/20 bg-brand-500/[0.04]')}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 font-mono text-sm font-semibold text-white"
            aria-hidden
          >
            {progress}%
          </div>
          <div className="min-w-0">
            <h3 className={cn(S.cardTitle, 'm-0')}>{t(locale, 'panel.firstSteps.title')}</h3>
            <p className={cn(S.cardMuted, 'm-0')}>
              {t(locale, 'panel.firstSteps.progress', { done: completedCount, total: totalCount })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className={cn(S.btnGhost, 'min-h-touch shrink-0 px-2 text-xs')}
          aria-label={t(locale, 'panel.firstSteps.dismiss')}
        >
          {t(locale, 'panel.firstSteps.dismiss')}
        </button>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-ink/[0.08]" aria-hidden>
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <CollapsibleBlock
        locale={locale}
        title={t(locale, 'panel.firstSteps.tasksHeading')}
        defaultOpen
        variant="plain"
      >
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {tasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => !task.completed && handleTaskClick(task.id)}
                disabled={task.completed}
                className={cn(
                  'flex w-full min-h-touch items-start gap-3 rounded-control border px-3 py-2.5 text-left transition-colors',
                  task.completed
                    ? 'cursor-default border-success/25 bg-success/[0.06]'
                    : 'cursor-pointer border-ink/12 bg-surface hover:border-brand-500/35'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    task.completed
                      ? 'border-success bg-success text-white'
                      : 'border-ink/25 bg-transparent'
                  )}
                  aria-hidden
                >
                  {task.completed ? '✓' : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block font-ui text-sm',
                      task.completed ? 'text-ink-muted line-through' : 'font-medium text-ink'
                    )}
                  >
                    {taskTitle(task)}
                  </span>
                  <span className={cn(S.cardMuted, 'mt-0.5 block')}>{taskDesc(task)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {progress < 100 ? (
          <p className={cn(S.cardFaint, 'mb-0 mt-3 text-center')}>
            {t(locale, 'panel.firstSteps.footerHint')}
          </p>
        ) : null}
      </CollapsibleBlock>
    </div>
  );
}
