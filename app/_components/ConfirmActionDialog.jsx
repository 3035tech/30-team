'use client';

/**
 * Sistema de Confirmação + Undo para Ações Destrutivas
 * UX/UX Melhoria #3 — Prevenir perda acidental de dados
 */

import { useState, useEffect } from 'react';
import { cn } from '../../lib/cn';

const SEVERITY = {
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    icon: 'text-yellow-600',
    button: 'bg-yellow-600 hover:bg-yellow-700',
  },
  danger: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    icon: 'text-red-600',
    button: 'bg-red-600 hover:bg-red-700',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    icon: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
};

/**
 * Dialog de confirmação com input de verificação para ações críticas
 */
export function ConfirmActionDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  severity = 'warning',
  requiresTyping = false,
  confirmationPhrase = '',
  details = null,
  loading = false,
}) {
  const [inputValue, setInputValue] = useState('');
  const [isConfirmEnabled, setIsConfirmEnabled] = useState(!requiresTyping);

  useEffect(() => {
    if (requiresTyping && confirmationPhrase) {
      setIsConfirmEnabled(inputValue.trim().toLowerCase() === confirmationPhrase.toLowerCase());
    } else {
      setIsConfirmEnabled(true);
    }
  }, [inputValue, requiresTyping, confirmationPhrase]);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const theme = SEVERITY[severity] || SEVERITY.warning;

  const handleConfirm = () => {
    if (isConfirmEnabled && !loading) {
      onConfirm();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && isConfirmEnabled && !loading) {
      handleConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-white rounded-lg shadow-2xl max-w-md w-full border-2',
          theme.border
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        {/* Header */}
        <div className={cn('px-6 py-4 border-b-2', theme.border, theme.bg)}>
          <div className="flex items-start gap-3">
            <div className={cn('flex-shrink-0 mt-0.5', theme.icon)}>
              {severity === 'danger' && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              )}
              {severity === 'warning' && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              )}
              {severity === 'info' && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>
            <h3 id="confirm-title" className="font-semibold text-gray-900 text-lg flex-1">
              {title}
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-700 mb-4">{message}</p>

          {details && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
              <div className="text-xs text-gray-600">{details}</div>
            </div>
          )}

          {requiresTyping && confirmationPhrase && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Digite <code className="bg-gray-100 px-2 py-0.5 rounded text-red-600 font-mono text-xs">{confirmationPhrase}</code> para confirmar:
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder={confirmationPhrase}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || loading}
            className={cn(
              'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              theme.button
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processando...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook para gerenciar confirmações
 */
export function useConfirmAction() {
  const [state, setState] = useState({
    isOpen: false,
    config: {},
    resolve: null,
  });

  const confirm = (config) => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        config,
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    state.resolve?.(true);
    setState({ isOpen: false, config: {}, resolve: null });
  };

  const handleCancel = () => {
    state.resolve?.(false);
    setState({ isOpen: false, config: {}, resolve: null });
  };

  const ConfirmDialog = () => (
    <ConfirmActionDialog
      isOpen={state.isOpen}
      onClose={handleCancel}
      onConfirm={handleConfirm}
      {...state.config}
    />
  );

  return { confirm, ConfirmDialog };
}
