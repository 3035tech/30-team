'use client';

/**
 * Onboarding Tour — Tour guiado opcional com spotlight
 * Melhoria #1 (Sprint Quick Wins)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TOUR_STORAGE_KEY = 'team30_tour_completed';

const TOUR_STEPS = [
  {
    id: 'overview',
    target: '#overview-tab',
    tab: 'overview',
    title: 'Visão Geral',
    message: 'Aqui você vê o resumo do que precisa atenção: vagas urgentes, radar de rotatividade, HR Score e mais.',
    position: 'bottom',
  },
  {
    id: 'vagas',
    target: '#vagas-tab',
    tab: 'vagas',
    title: 'Vagas',
    message: 'Crie vagas, configure rubricas T1-T9, convide candidatos e acompanhe o pipeline kanban até a contratação.',
    position: 'bottom',
  },
  {
    id: 'team',
    target: '#team-tab',
    tab: 'team',
    title: 'Equipe',
    message: 'Veja todos os perfis (candidatos + colaboradores), compatibilidade, hipóteses de gestão e PDI em um só lugar.',
    position: 'bottom',
  },
  {
    id: 'analytics',
    target: '#analytics-tab',
    tab: 'analytics',
    title: 'Analytics',
    message: 'Métricas de efetividade, tendências temporais, comparativos e alertas proativos para decisões data-driven.',
    position: 'bottom',
  },
  {
    id: 'help',
    target: '#help-tab',
    tab: 'help',
    title: 'Ajuda',
    message: 'Guia completo do 30Team com passo a passo de cada funcionalidade. Sempre disponível quando precisar!',
    position: 'bottom',
  },
];

export function OnboardingTour({ onComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    
    // Check if tour already completed
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!completed) {
        // Show welcome modal after 1s
        setTimeout(() => setIsOpen(true), 1000);
      }
    }
  }, []);

  const handleStart = () => {
    setCurrentStep(0);
    // Navigate to first step's tab if needed
    const step = TOUR_STEPS[0];
    if (step.tab) {
      router.push(`/dashboard?tab=${step.tab}`);
    }
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      // Navigate to next step's tab
      const step = TOUR_STEPS[nextStep];
      if (step.tab) {
        router.push(`/dashboard?tab=${step.tab}`);
      }
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      
      // Navigate to previous step's tab
      const step = TOUR_STEPS[prevStep];
      if (step.tab) {
        router.push(`/dashboard?tab=${step.tab}`);
      }
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    }
    if (onComplete) {
      onComplete();
    }
  };

  if (!mounted) {
    return null;
  }

  // Welcome Modal (before tour starts)
  if (isOpen && currentStep === -1) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Bem-vindo ao 30Team!
            </h2>
            
            <p className="text-gray-600 mb-6">
              Quer fazer um tour rápido de 2 minutos para conhecer o painel?
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setCurrentStep(0);
                  handleStart();
                }}
                className="flex-1 px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                Fazer tour
              </button>
              
              <button
                onClick={handleSkip}
                className="flex-1 px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Pular
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-4">
              Você pode refazer o tour a qualquer momento na aba Ajuda
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tour Steps
  if (isOpen && currentStep >= 0 && currentStep < TOUR_STEPS.length) {
    const step = TOUR_STEPS[currentStep];
    
    return (
      <>
        {/* Overlay */}
        <div className="fixed inset-0 bg-black/40 z-40" onClick={handleSkip} />
        
        {/* Tooltip */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
            {/* Progress */}
            <div className="h-1 bg-gray-100">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300"
                style={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
              />
            </div>
            
            {/* Content */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">
                    Passo {currentStep + 1} de {TOUR_STEPS.length}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {step.title}
                  </h3>
                </div>
                
                <button
                  onClick={handleSkip}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Fechar tour"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                {step.message}
              </p>
              
              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentStep === 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Anterior
                </button>
                
                <div className="flex gap-1">
                  {TOUR_STEPS.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentStep ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {currentStep === TOUR_STEPS.length - 1 ? 'Concluir' : 'Próximo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return null;
}

/**
 * Reset tour (para admin/testing)
 */
export function resetTour() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  }
}
