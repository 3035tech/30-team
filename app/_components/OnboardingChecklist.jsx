'use client';

/**
 * Onboarding Checklist — Card persistente no Overview
 * Melhoria #1 (Sprint Quick Wins)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function OnboardingChecklist({ initialProgress, initialTasks }) {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  const { progress, tasks } = initialProgress || { progress: 0, tasks: initialTasks || [] };

  // Se já completou tudo, não mostrar
  if (progress >= 100 || dismissed) {
    return null;
  }

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;

  const taskActions = {
    create_vacancy: () => router.push('/dashboard?tab=vagas'),
    send_assessment: () => router.push('/dashboard?tab=vagas'),
    view_result: () => router.push('/dashboard?tab=team'),
    move_pipeline: () => router.push('/dashboard?tab=vagas'),
    create_climate: () => router.push('/dashboard?tab=clima'),
    view_analytics: () => router.push('/dashboard?tab=analytics'),
    invite_manager: () => router.push('/dashboard?tab=users'),
  };

  const handleTaskClick = (taskId) => {
    const action = taskActions[taskId];
    if (action) action();
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Poderia salvar em localStorage ou backend
    if (typeof window !== 'undefined') {
      localStorage.setItem('team30_onboarding_dismissed', 'true');
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between bg-white/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
            {progress}%
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              Primeiros Passos no 30Team
            </h3>
            <p className="text-xs text-gray-600">
              {completedCount} de {totalCount} tarefas completas
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1"
            aria-label={collapsed ? 'Expandir' : 'Recolher'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Dispensar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {!collapsed && (
        <div className="px-4 pb-3">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Tasks */}
      {!collapsed && (
        <div className="px-4 pb-4 space-y-2">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => !task.completed && handleTaskClick(task.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                task.completed
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-sm cursor-pointer'
              }`}
              disabled={task.completed}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {task.completed ? (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className={`font-medium text-sm ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {task.title}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {task.description}
                  </div>
                </div>

                {!task.completed && (
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Footer hint */}
      {!collapsed && progress < 100 && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-500 text-center">
            💡 Complete as tarefas para aproveitar todo o potencial do 30Team
          </p>
        </div>
      )}
    </div>
  );
}
