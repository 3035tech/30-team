'use client';

/**
 * Sistema de Undo Toast para ações destrutivas
 * UX/UX Melhoria #3 — Permitir desfazer ações em 5 segundos
 */

import { useState, useEffect, useRef } from 'react';
import { cn } from '../../lib/cn';

const UNDO_DURATION = 5000; // 5 segundos

export function UndoToast({
  isVisible,
  message,
  onUndo,
  onDismiss,
  duration = UNDO_DURATION,
}) {
  const [progress, setProgress] = useState(100);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!isVisible) {
      setProgress(100);
      return;
    }

    startTimeRef.current = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      
      setProgress(remaining);

      if (remaining > 0) {
        timerRef.current = requestAnimationFrame(updateProgress);
      } else {
        onDismiss();
      }
    };

    timerRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [isVisible, duration, onDismiss]);

  const handleUndo = () => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
    }
    onUndo();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl overflow-hidden min-w-[320px] max-w-md">
        {/* Progress bar */}
        <div className="h-1 bg-gray-700">
          <div
            className="h-full bg-yellow-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
            <span className="text-sm font-medium">{message}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleUndo}
              className="px-3 py-1.5 text-sm font-medium bg-yellow-500 text-gray-900 rounded hover:bg-yellow-400 transition-colors"
            >
              Desfazer
            </button>
            <button
              onClick={onDismiss}
              className="p-1.5 text-gray-400 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook para gerenciar Undo Toast
 */
export function useUndoToast() {
  const [state, setState] = useState({
    isVisible: false,
    message: '',
    onUndoCallback: null,
    pendingAction: null,
  });

  const timeoutRef = useRef(null);

  const showUndo = ({ message, onUndo, pendingAction, duration = UNDO_DURATION }) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setState({
      isVisible: true,
      message,
      onUndoCallback: onUndo,
      pendingAction,
    });

    // Auto-commit after duration
    timeoutRef.current = setTimeout(() => {
      if (pendingAction) {
        pendingAction();
      }
      setState(prev => ({ ...prev, isVisible: false }));
    }, duration);
  };

  const handleUndo = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (state.onUndoCallback) {
      state.onUndoCallback();
    }

    setState({
      isVisible: false,
      message: '',
      onUndoCallback: null,
      pendingAction: null,
    });
  };

  const handleDismiss = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (state.pendingAction) {
      state.pendingAction();
    }

    setState({
      isVisible: false,
      message: '',
      onUndoCallback: null,
      pendingAction: null,
    });
  };

  const UndoToastComponent = () => (
    <UndoToast
      isVisible={state.isVisible}
      message={state.message}
      onUndo={handleUndo}
      onDismiss={handleDismiss}
    />
  );

  return { showUndo, UndoToast: UndoToastComponent };
}
