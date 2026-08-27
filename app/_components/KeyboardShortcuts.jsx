'use client';

/**
 * Sistema de Atalhos de Teclado
 * UX/UX Melhoria #8 — Navegação rápida para power users
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '../../lib/cn';

const SHORTCUTS = {
  navigation: [
    { key: 'j', description: 'Próximo item na lista', mac: 'j', windows: 'j' },
    { key: 'k', description: 'Item anterior na lista', mac: 'k', windows: 'k' },
    { key: 'g h', description: 'Ir para Overview', mac: 'g h', windows: 'g h' },
    { key: 'g t', description: 'Ir para Equipe', mac: 'g t', windows: 'g t' },
    { key: 'g v', description: 'Ir para Vagas', mac: 'g v', windows: 'g v' },
    { key: 'g a', description: 'Ir para Analytics', mac: 'g a', windows: 'g a' },
  ],
  actions: [
    { key: '⌘K', description: 'Busca global', mac: '⌘K', windows: 'Ctrl+K' },
    { key: 'c', description: 'Criar nova vaga/item', mac: 'c', windows: 'c' },
    { key: 'e', description: 'Editar item selecionado', mac: 'e', windows: 'e' },
    { key: 'Esc', description: 'Fechar modal/cancelar', mac: 'Esc', windows: 'Esc' },
  ],
  help: [
    { key: '?', description: 'Mostrar atalhos', mac: '?', windows: '?' },
    { key: '⌘/', description: 'Buscar na ajuda', mac: '⌘/', windows: 'Ctrl+/' },
  ],
};

/**
 * Hook para gerenciar atalhos de teclado
 */
export function useKeyboardShortcuts({
  onNavigateNext,
  onNavigatePrev,
  onNavigateToTab,
  onCreate,
  onEdit,
}) {
  const [gPressed, setGPressed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorar se estiver em input/textarea
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (isInputActive && e.key !== 'Escape') return;

      // Esc — fechar modais
      if (e.key === 'Escape') {
        // Fechar qualquer modal aberto
        const closeButtons = document.querySelectorAll('[data-close-modal], [aria-label="Fechar"]');
        closeButtons[closeButtons.length - 1]?.click();
        return;
      }

      // ? — mostrar ajuda
      if (e.key === '?' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // Navegação com j/k
      if (e.key === 'j' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onNavigateNext?.();
        return;
      }

      if (e.key === 'k' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onNavigatePrev?.();
        return;
      }

      // g + tecla para navegação
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setGPressed(true);
        setTimeout(() => setGPressed(false), 1000);
        return;
      }

      if (gPressed) {
        e.preventDefault();
        if (e.key === 'h') onNavigateToTab?.('overview');
        else if (e.key === 't') onNavigateToTab?.('team');
        else if (e.key === 'v') onNavigateToTab?.('vagas');
        else if (e.key === 'a') onNavigateToTab?.('analytics');
        setGPressed(false);
        return;
      }

      // c — criar
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onCreate?.();
        return;
      }

      // e — editar
      if (e.key === 'e' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onEdit?.();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gPressed, onNavigateNext, onNavigatePrev, onNavigateToTab, onCreate, onEdit]);

  return { showHelp, setShowHelp };
}

/**
 * Modal de ajuda de atalhos
 */
export function KeyboardShortcutsHelp({ isOpen, onClose, locale = 'pt-BR' }) {
  const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  const labels = locale === 'en' ? {
    title: 'Keyboard Shortcuts',
    navigation: 'Navigation',
    actions: 'Actions',
    help: 'Help',
    close: 'Close',
  } : {
    title: 'Atalhos de Teclado',
    navigation: 'Navegação',
    actions: 'Ações',
    help: 'Ajuda',
    close: 'Fechar',
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{labels.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={labels.close}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {Object.entries({
            navigation: labels.navigation,
            actions: labels.actions,
            help: labels.help,
          }).map(([category, title]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                {title}
              </h3>
              <div className="space-y-2">
                {SHORTCUTS[category].map((shortcut, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-700">{shortcut.description}</span>
                    <kbd className="px-3 py-1.5 text-sm font-mono bg-gray-100 border border-gray-300 rounded">
                      {isMac ? shortcut.mac : shortcut.windows}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            {labels.close}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Indicador visual quando "g" está pressionado
 */
export function GModePending({ isActive }) {
  if (!isActive) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <kbd className="px-2 py-1 bg-purple-700 rounded font-mono text-sm">g</kbd>
        <span className="text-sm">Aguardando tecla...</span>
      </div>
    </div>
  );
}
