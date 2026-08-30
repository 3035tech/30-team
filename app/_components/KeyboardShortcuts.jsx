'use client';

/**
 * Keyboard shortcuts help + g-mode navigation for the dashboard.
 */

import { useState, useEffect } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import {
  dialogBtnPrimaryClass,
  dialogCardClass,
  dialogOverlayClass,
} from './app-dialog-styles';

const SHORTCUTS = {
  navigation: [
    { key: 'j', descriptionKey: 'panel.shortcuts.nextItem', mac: 'j', windows: 'j' },
    { key: 'k', descriptionKey: 'panel.shortcuts.prevItem', mac: 'k', windows: 'k' },
    { key: 'g h', descriptionKey: 'panel.shortcuts.goOverview', mac: 'g h', windows: 'g h' },
    { key: 'g t', descriptionKey: 'panel.shortcuts.goTeam', mac: 'g t', windows: 'g t' },
    { key: 'g v', descriptionKey: 'panel.shortcuts.goVacancies', mac: 'g v', windows: 'g v' },
    { key: 'g a', descriptionKey: 'panel.shortcuts.goAnalytics', mac: 'g a', windows: 'g a' },
  ],
  actions: [
    { key: '⌘K', descriptionKey: 'panel.shortcuts.globalSearch', mac: '⌘K', windows: 'Ctrl+K' },
    { key: 'c', descriptionKey: 'panel.shortcuts.create', mac: 'c', windows: 'c' },
    { key: 'e', descriptionKey: 'panel.shortcuts.edit', mac: 'e', windows: 'e' },
    { key: 'Esc', descriptionKey: 'panel.shortcuts.escape', mac: 'Esc', windows: 'Esc' },
  ],
  help: [
    { key: '?', descriptionKey: 'panel.shortcuts.showHelp', mac: '?', windows: '?' },
    { key: '⌘/', descriptionKey: 'panel.shortcuts.helpSearch', mac: '⌘/', windows: 'Ctrl+/' },
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
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (isInputActive && e.key !== 'Escape') return;

      if (e.key === 'Escape') {
        const closeButtons = document.querySelectorAll('[data-close-modal], [aria-label="Fechar"], [aria-label="Close"]');
        closeButtons[closeButtons.length - 1]?.click();
        return;
      }

      if (e.key === '?' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

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

      if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onCreate?.();
        return;
      }

      if (e.key === 'e' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onEdit?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gPressed, onNavigateNext, onNavigatePrev, onNavigateToTab, onCreate, onEdit]);

  return { showHelp, setShowHelp, gPressed };
}

/**
 * Modal de ajuda de atalhos
 */
export function KeyboardShortcutsHelp({ isOpen, onClose, locale = 'pt-BR' }) {
  const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = [
    { id: 'navigation', title: t(locale, 'panel.shortcuts.navTitle') },
    { id: 'actions', title: t(locale, 'panel.shortcuts.actionsTitle') },
    { id: 'help', title: t(locale, 'panel.shortcuts.helpTitle') },
  ];

  return (
    <div
      className={cn('app-dialog-overlay', dialogOverlayClass)}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={cn(dialogCardClass, 'max-h-[80vh] !max-w-xl overflow-y-auto')}
        role="dialog"
        aria-modal="true"
        aria-label={t(locale, 'panel.shortcuts.title')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/10 bg-surface px-5 py-4">
          <h2 className="font-display text-lg text-ink">{t(locale, 'panel.shortcuts.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-touch px-2 font-mono text-prose text-ink-muted hover:text-ink"
            aria-label={t(locale, 'panel.shortcuts.close')}
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-6 px-5 py-4">
          {categories.map(({ id, title }) => (
            <div key={id}>
              <h3 className={S.label}>{title}</h3>
              <div className="mt-2 flex flex-col gap-1">
                {SHORTCUTS[id].map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="font-ui text-prose text-ink-muted">
                      {t(locale, shortcut.descriptionKey)}
                    </span>
                    <kbd className="rounded-control border border-ink/12 bg-canvas px-2.5 py-1 font-mono text-2xs text-ink">
                      {isMac ? shortcut.mac : shortcut.windows}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 flex justify-end border-t border-ink/10 bg-surface px-5 py-3">
          <button type="button" onClick={onClose} className={cn(dialogBtnPrimaryClass, 'min-h-touch')}>
            {t(locale, 'panel.shortcuts.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Indicador visual quando "g" está pressionado
 */
export function GModePending({ isActive, locale = 'pt-BR' }) {
  if (!isActive) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 rounded-control bg-brand-500 px-4 py-2 text-white shadow-md">
        <kbd className="rounded-control bg-brand-700 px-2 py-1 font-mono text-xs">g</kbd>
        <span className="font-ui text-prose">{t(locale, 'panel.shortcuts.waitingKey')}</span>
      </div>
    </div>
  );
}
