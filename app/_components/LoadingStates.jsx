'use client';

/**
 * Loading States com Feedback Visual Rico
 * UX/UX Melhoria #4 — Feedback claro durante operações longas
 */

import { useState, useEffect } from 'react';
import { cn } from '../../lib/cn';

/**
 * Skeleton Loader genérico
 */
export function Skeleton({ className, count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse bg-gray-200 rounded',
            className
          )}
        />
      ))}
    </>
  );
}

/**
 * Card Skeleton para listas
 */
export function CardSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-start gap-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Table Skeleton
 */
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="border-b border-gray-100 p-4 last:border-b-0">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton key={colIdx} className="h-3" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Progress Bar com estimativa de tempo
 */
export function ProgressBar({
  progress = 0,
  label = '',
  estimatedTime = null,
  showPercentage = true,
}) {
  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-600 transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {estimatedTime && (
        <div className="mt-2 text-xs text-gray-500">
          Tempo estimado: {estimatedTime}
        </div>
      )}
    </div>
  );
}

/**
 * Spinner com mensagem
 */
export function Spinner({ size = 'md', message = null, className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <svg
        className={cn('animate-spin text-purple-600', sizes[size])}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {message && (
        <p className="text-sm text-gray-600 text-center max-w-xs">{message}</p>
      )}
    </div>
  );
}

/**
 * Loading Overlay para operações em background
 */
export function LoadingOverlay({
  isVisible,
  message = 'Carregando...',
  progress = null,
  onCancel = null,
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-base font-medium text-gray-900 text-center">{message}</p>
          
          {progress !== null && (
            <ProgressBar progress={progress} className="w-full" />
          )}

          {onCancel && (
            <button
              onClick={onCancel}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook para gerenciar estado de loading com estimativa de tempo
 */
export function useLoadingWithEstimate(estimatedDuration = 5000) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      setStartTime(null);
      return;
    }

    setStartTime(Date.now());

    const interval = setInterval(() => {
      const elapsed = Date.now() - Date.now();
      const newProgress = Math.min(95, (elapsed / estimatedDuration) * 100);
      setProgress(newProgress);
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading, estimatedDuration]);

  const start = () => {
    setIsLoading(true);
    setProgress(0);
  };

  const complete = () => {
    setProgress(100);
    setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
    }, 500);
  };

  return {
    isLoading,
    progress,
    start,
    complete,
  };
}

/**
 * Inline loading indicator para botões
 */
export function ButtonLoading({ text = 'Carregando...' }) {
  return (
    <span className="flex items-center gap-2">
      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {text}
    </span>
  );
}
