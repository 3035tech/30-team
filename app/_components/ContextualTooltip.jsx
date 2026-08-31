'use client';

/**
 * Onboarding contextual — Tooltips dismissíveis com tracking
 * Melhoria #1 (Sprint Quick Wins)
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'team30_tooltips_seen';

/**
 * Marca um tooltip como visto
 */
function markTooltipSeen(tooltipId) {
  if (typeof window === 'undefined') return;
  try {
    const seen = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    seen[tooltipId] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  } catch (err) {
    console.warn('[ContextualTooltip] localStorage error:', err);
  }
}

/**
 * Verifica se tooltip já foi visto
 */
function hasSeenTooltip(tooltipId) {
  if (typeof window === 'undefined') return true;
  try {
    const seen = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return !!seen[tooltipId];
  } catch (err) {
    return false;
  }
}

/**
 * Tooltip contextual para onboarding
 * 
 * @param {string} id - ID único do tooltip (ex: 'first-vacancy')
 * @param {string} title - Título do tooltip
 * @param {string} message - Mensagem do tooltip
 * @param {string} position - 'top' | 'bottom' | 'left' | 'right'
 * @param {boolean} persistent - Se true, não some após dismiss (precisa botão "Não mostrar")
 * @param {ReactNode} children - Elemento que receberá o tooltip
 */
export function ContextualTooltip({
  id,
  title,
  message,
  position = 'bottom',
  persistent = false,
  children,
}) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const seen = hasSeenTooltip(id);
    if (!seen) {
      // Delay de 500ms para não aparecer imediatamente
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [id]);

  const handleDismiss = () => {
    setVisible(false);
    markTooltipSeen(id);
  };

  const handleDontShowAgain = () => {
    handleDismiss();
  };

  if (!mounted || !visible) {
    return <>{children}</>;
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-brand-500',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-brand-500',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-brand-500',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-brand-500',
  };

  return (
    <div className="relative inline-block">
      {children}
      
      {/* Tooltip */}
      <div
        className={`absolute z-50 ${positionClasses[position]} w-72 animate-in fade-in slide-in-from-top-2 duration-200`}
        role="tooltip"
      >
        {/* Arrow */}
        <div
          className={`absolute w-0 h-0 border-8 ${arrowClasses[position]}`}
          style={{ borderWidth: '6px' }}
        />
        
        {/* Content */}
        <div className="rounded-control bg-brand-500 p-4 text-white shadow-toast">
          {title && (
            <div className="font-semibold text-sm mb-2 flex items-start justify-between">
              <span>{title}</span>
              <button
                onClick={handleDismiss}
                className="ml-2 text-white/80 hover:text-white transition-colors"
                aria-label="Fechar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          <p className="text-sm text-white/90 mb-3">
            {message}
          </p>
          
          <div className="flex items-center justify-between">
            {!persistent && (
              <button
                onClick={handleDismiss}
                className="text-xs text-white/70 hover:text-white transition-colors"
              >
                Entendi
              </button>
            )}
            
            {persistent && (
              <>
                <button
                  onClick={handleDismiss}
                  className="text-xs text-white/70 hover:text-white transition-colors"
                >
                  Entendi
                </button>
                <button
                  onClick={handleDontShowAgain}
                  className="text-xs text-white/70 hover:text-white transition-colors"
                >
                  Não mostrar novamente
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook para gerenciar estado de tooltips
 */
export function useTooltipManager() {
  const [seenTooltips, setSeenTooltips] = useState({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const seen = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        setSeenTooltips(seen);
      } catch (err) {
        console.warn('[useTooltipManager] localStorage error:', err);
      }
    }
  }, []);

  const markSeen = (tooltipId) => {
    markTooltipSeen(tooltipId);
    setSeenTooltips(prev => ({ ...prev, [tooltipId]: Date.now() }));
  };

  const hasSeen = (tooltipId) => {
    return !!seenTooltips[tooltipId];
  };

  const resetAll = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      setSeenTooltips({});
    }
  };

  return { markSeen, hasSeen, resetAll, seenTooltips };
}
