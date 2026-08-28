'use client';

import { useEffect, useRef, useState } from 'react';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadTurnstileScript() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.turnstile) return Promise.resolve(true);
  if (window.__turnstileScriptPromise) return window.__turnstileScriptPromise;

  window.__turnstileScriptPromise = new Promise((resolve) => {
    const existing = document.querySelector(`script[src^="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.turnstile)));
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(Boolean(window.turnstile));
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });

  return window.__turnstileScriptPromise;
}

/**
 * Cloudflare Turnstile — só renderiza se NEXT_PUBLIC_TURNSTILE_SITE_KEY estiver setado.
 */
export default function TurnstileField({ siteKey, onToken, onError, errorMessage = '' }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return undefined;

    let cancelled = false;

    (async () => {
      const ok = await loadTurnstileScript();
      if (cancelled || !ok || !window.turnstile || !containerRef.current) {
        if (!cancelled) {
          setFailed(true);
          onError?.();
        }
        return;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => {
          setFailed(false);
          onToken(token);
        },
        'expired-callback': () => onToken(''),
        'error-callback': () => {
          setFailed(true);
          onToken('');
          onError?.();
        },
      });
    })();

    return () => {
      cancelled = true;
      if (widgetIdRef.current != null && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
      }
    };
  }, [siteKey, onToken, onError]);

  if (!siteKey) return null;

  return (
    <div className="my-2">
      <div ref={containerRef} />
      {failed || errorMessage ? (
        <p className="mt-2 text-xs text-danger" role="alert">
          {errorMessage || 'Turnstile'}
        </p>
      ) : null}
    </div>
  );
}
