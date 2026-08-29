'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { t } from '../../lib/i18n';
import { S } from './dashboard-shared';
import { Icon } from '../_components/Icon';

const SUGGESTIONS = [
  'panel.helpAssist.suggestCreateVacancy',
  'panel.helpAssist.suggestHire',
  'panel.helpAssist.suggestEmployeeJourney',
  'panel.helpAssist.suggestColaborador',
  'panel.helpAssist.suggestMotivators',
  'panel.helpAssist.suggestGuide',
];

/**
 * Floating product-help assistant (B-801) — Guia / navigation only.
 */
export function HelpAssistantWidget({ locale = 'pt-BR', navigateDashboard }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, busy]);

  const send = async (raw) => {
    const q = String(raw || '').trim();
    if (!q || busy) return;
    setError('');
    setQuestion('');
    const nextHistory = [...messages, { role: 'user', content: q }].slice(-6);
    setMessages(nextHistory);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/help-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          locale,
          history: nextHistory.slice(0, -1),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || t(locale, 'panel.helpAssist.error'));
      }
      setMessages((cur) => [
        ...cur,
        {
          role: 'assistant',
          content: data.answer || '',
          tab: data.tab || null,
          citations: Array.isArray(data.citations) ? data.citations : [],
        },
      ]);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.helpAssist.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex flex-col items-end gap-2">
      {open ? (
        <div
          className="pointer-events-auto flex w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-card border border-ink/12 bg-surface shadow-dialog"
          role="dialog"
          aria-label={t(locale, 'panel.helpAssist.title')}
        >
          <div className="flex items-center justify-between gap-2 border-b border-ink/10 bg-canvas/80 px-3 py-2.5">
            <div className="min-w-0">
              <div className="font-ui text-sm font-semibold text-ink">{t(locale, 'panel.helpAssist.title')}</div>
              <p className="m-0 font-mono text-2xs text-ink-faint">{t(locale, 'panel.helpAssist.subtitle')}</p>
            </div>
            <button
              type="button"
              className={cn(S.btnGhost, 'min-h-touch min-w-touch px-2')}
              onClick={() => setOpen(false)}
              aria-label={t(locale, 'panel.helpAssist.close')}
            >
              <Icon name="clear" />
            </button>
          </div>

          <div ref={listRef} className="flex max-h-[min(420px,50vh)] flex-col gap-2 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-2">
                <p className={cn(S.muted, 'm-0 text-xs')}>{t(locale, 'panel.helpAssist.empty')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className="min-h-touch rounded-control border border-ink/12 bg-canvas px-2.5 py-1.5 text-left font-mono text-2xs text-ink-muted"
                      onClick={() => send(t(locale, key))}
                    >
                      {t(locale, key)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={cn(
                  'rounded-control px-2.5 py-2 text-prose leading-snug',
                  m.role === 'user' ? 'ml-6 bg-brand-500/10 text-ink' : 'mr-2 bg-canvas text-ink'
                )}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
                {m.role === 'assistant' && m.tab && typeof navigateDashboard === 'function' ? (
                  <button
                    type="button"
                    className="mt-2 inline-flex min-h-touch items-center gap-1 border-none bg-transparent p-0 font-mono text-2xs text-brand-600 underline"
                    onClick={() => navigateDashboard({ tab: m.tab })}
                  >
                    {t(locale, 'panel.helpAssist.openTab')}
                  </button>
                ) : null}
              </div>
            ))}
            {busy ? <p className="m-0 font-mono text-2xs text-ink-faint">{t(locale, 'panel.common.loading')}</p> : null}
            {error ? <p className="m-0 text-xs text-danger">{error}</p> : null}
          </div>

          <form
            className="flex gap-2 border-t border-ink/10 p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              send(question);
            }}
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t(locale, 'panel.helpAssist.placeholder')}
              aria-label={t(locale, 'panel.helpAssist.placeholder')}
              disabled={busy}
              className={cn(S.input, 'min-h-touch flex-1 bg-surface')}
            />
            <button
              type="submit"
              disabled={busy || !question.trim()}
              className={cn(S.btnPrimary, 'px-3')}
            >
              {t(locale, 'panel.helpAssist.send')}
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        className={cn(
          'pointer-events-auto inline-flex min-h-touch min-w-touch items-center gap-2 rounded-full border border-brand-500/35 bg-brand-500 px-4 py-2.5 font-ui text-prose font-semibold text-white shadow-toast',
          open && 'bg-brand-600'
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t(locale, 'panel.helpAssist.open')}
      >
        <Icon name="help" className="h-[18px] w-[18px] shrink-0 text-white" />
        <span className="hidden sm:inline">{t(locale, 'panel.helpAssist.fab')}</span>
      </button>
    </div>
  );
}
