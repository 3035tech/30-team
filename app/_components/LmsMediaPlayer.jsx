'use client';

import { useEffect, useRef } from 'react';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';

function loadScript(src, globalKey) {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (globalKey && window[globalKey]) return Promise.resolve(window[globalKey]);
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) {
    return new Promise((resolve) => {
      if (globalKey && window[globalKey]) resolve(window[globalKey]);
      else existing.addEventListener('load', () => resolve(globalKey ? window[globalKey] : null));
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve(globalKey ? window[globalKey] : null);
    s.onerror = () => reject(new Error(`script ${src}`));
    document.body.appendChild(s);
  });
}

/**
 * YouTube / Vimeo / PDF in-app viewer with optional resume + progress callback.
 * Does not auto-complete lessons.
 */
export function LmsMediaPlayer({
  lesson,
  startAtSec = 0,
  onProgress,
  onClose,
  closeLabel = 'Close',
  className,
}) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const lastSentRef = useRef(0);
  const startAt = Math.max(0, Math.floor(Number(startAtSec) || 0));

  const kind = lesson?.contentKind;
  const videoId = lesson?.videoId;
  const embedUrl = lesson?.embedUrl;
  const title = lesson?.title || 'Lesson';

  useEffect(() => {
    if (!lesson || !onProgress) return undefined;
    const flush = (positionSec, durationSec) => {
      const pos = Math.floor(Number(positionSec) || 0);
      if (pos < 0) return;
      const now = Date.now();
      if (now - lastSentRef.current < 12000 && pos > 0) return;
      lastSentRef.current = now;
      onProgress({
        lessonId: lesson.id,
        positionSec: pos,
        durationSec: Math.floor(Number(durationSec) || 0),
      });
    };

    let cancelled = false;
    let pollId = null;

    const setupYoutube = async () => {
      if (!videoId || !hostRef.current) return;
      await loadScript('https://www.youtube.com/iframe_api', null);
      await new Promise((resolve) => {
        if (window.YT?.Player) resolve();
        else {
          const prev = window.onYouTubeIframeAPIReady;
          window.onYouTubeIframeAPIReady = () => {
            if (typeof prev === 'function') prev();
            resolve();
          };
        }
      });
      if (cancelled || !hostRef.current) return;
      hostRef.current.innerHTML = '';
      const el = document.createElement('div');
      hostRef.current.appendChild(el);
      const player = new window.YT.Player(el, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, enablejsapi: 1, origin: window.location.origin },
        events: {
          onReady: (e) => {
            if (startAt > 0) {
              try {
                e.target.seekTo(startAt, true);
              } catch {
                /* ignore */
              }
            }
          },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PAUSED || e.data === window.YT.PlayerState.ENDED) {
              try {
                flush(e.target.getCurrentTime(), e.target.getDuration());
              } catch {
                /* ignore */
              }
            }
          },
        },
      });
      playerRef.current = player;
      pollId = window.setInterval(() => {
        try {
          if (player.getPlayerState?.() === window.YT.PlayerState.PLAYING) {
            flush(player.getCurrentTime(), player.getDuration());
          }
        } catch {
          /* ignore */
        }
      }, 15000);
    };

    const setupVimeo = async () => {
      if (!videoId || !hostRef.current) return;
      await loadScript('https://player.vimeo.com/api/player.js', 'Vimeo');
      if (cancelled || !hostRef.current || !window.Vimeo?.Player) return;
      hostRef.current.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.src = `https://player.vimeo.com/video/${encodeURIComponent(videoId)}`;
      iframe.className = 'h-full w-full border-0';
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      hostRef.current.appendChild(iframe);
      const player = new window.Vimeo.Player(iframe);
      playerRef.current = player;
      if (startAt > 0) {
        try {
          await player.setCurrentTime(startAt);
        } catch {
          /* ignore */
        }
      }
      const tick = async () => {
        try {
          const [pos, dur] = await Promise.all([player.getCurrentTime(), player.getDuration()]);
          flush(pos, dur);
        } catch {
          /* ignore */
        }
      };
      player.on('pause', tick);
      player.on('ended', tick);
      pollId = window.setInterval(tick, 15000);
    };

    if (kind === 'youtube' && videoId) void setupYoutube();
    else if (kind === 'vimeo' && videoId) void setupVimeo();

    const onUnload = () => {
      try {
        const p = playerRef.current;
        if (kind === 'youtube' && p?.getCurrentTime) {
          flush(p.getCurrentTime(), p.getDuration?.());
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('pagehide', onUnload);

    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', onUnload);
      if (pollId) window.clearInterval(pollId);
      try {
        const p = playerRef.current;
        if (kind === 'youtube' && p?.getCurrentTime) {
          flush(p.getCurrentTime(), p.getDuration?.());
          p.destroy?.();
        } else if (kind === 'vimeo' && p?.getCurrentTime) {
          void p.getCurrentTime().then((pos) =>
            p.getDuration().then((dur) => flush(pos, dur))
          );
          p.unload?.();
        }
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [lesson?.id, kind, videoId, startAt, onProgress]);

  if (!lesson) return null;

  if (kind === 'pdf' && embedUrl) {
    return (
      <div
        className={cn(
          'overflow-hidden rounded-card border border-brand-500/25 bg-surface shadow-card',
          className
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 bg-brand-500/[0.06] px-3 py-2.5">
          <span className={cn(S.cardRowTitle, 'min-w-0 truncate')}>{title}</span>
          {onClose ? (
            <button type="button" className={cn(S.btnGhost, 'min-h-touch shrink-0 text-2xs')} onClick={onClose}>
              {closeLabel}
            </button>
          ) : null}
        </div>
        <div className="h-[min(75vh,720px)] w-full bg-canvas">
          <iframe title={title} src={embedUrl} className="h-full w-full border-0" />
        </div>
      </div>
    );
  }

  if ((kind === 'youtube' || kind === 'vimeo') && videoId) {
    return (
      <div
        className={cn(
          'overflow-hidden rounded-card border border-brand-500/25 bg-surface shadow-card',
          className
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 bg-brand-500/[0.06] px-3 py-2.5">
          <span className={cn(S.cardRowTitle, 'min-w-0 truncate')}>{title}</span>
          {onClose ? (
            <button type="button" className={cn(S.btnGhost, 'min-h-touch shrink-0 text-2xs')} onClick={onClose}>
              {closeLabel}
            </button>
          ) : null}
        </div>
        <div className="aspect-video w-full bg-ink/90" ref={hostRef} />
      </div>
    );
  }

  if (embedUrl) {
    return (
      <div className={cn('overflow-hidden rounded-card border border-ink/12', className)}>
        <div className="aspect-video w-full bg-ink/90">
          <iframe title={title} src={embedUrl} className="h-full w-full border-0" allowFullScreen />
        </div>
      </div>
    );
  }

  return null;
}
