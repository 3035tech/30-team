'use client';

import { useState } from 'react';
import { t } from '../../../lib/i18n';
import { cn } from '../../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { buildTeamTensionNarrative } from '../../../lib/people/team-tension-narrative';
import { useAppFeedback } from './AppFeedback';

/**
 * Bloco complementaridade / tensão (B-1902) + IA opcional (B-1904).
 */
export function TeamTensionNarrativeBlock({
  locale = 'pt-BR',
  intel = null,
  companyId = null,
  teamGroupId = null,
  navigateDashboard,
  dense = false,
}) {
  const { toast } = useAppFeedback();
  const narrative = buildTeamTensionNarrative(intel);
  const [aiLoading, setAiLoading] = useState(false);
  const [ai, setAi] = useState(null);

  const go = (tab) => {
    if (typeof navigateDashboard === 'function') navigateDashboard({ tab });
  };

  const lineText = (line) => {
    if (line.source === 'force') {
      return t(locale, `panel.overview.bci.force.${line.id}.body`);
    }
    if (line.source === 'attention') {
      return t(locale, `panel.overview.bci.attention.${line.id}.body`);
    }
    if (line.source === 'motivator') {
      return t(locale, 'panel.tension.motivatorLine', {
        label: line.label || line.id,
      });
    }
    if (line.id === 'sparse') return t(locale, 'panel.tension.summarySparse');
    return t(locale, 'panel.tension.summaryBalance');
  };

  const runAi = async () => {
    setAiLoading(true);
    setAi(null);
    try {
      const res = await fetch('/api/admin/people/interpret-ai', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'team',
          companyId: companyId || undefined,
          teamGroupId: teamGroupId || undefined,
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.tension.aiError'));
      setAi(data);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.tension.aiError'), 'error');
    } finally {
      setAiLoading(false);
    }
  };

  if (narrative.empty) {
    return (
      <div className={S.cardTight}>
        <span className={S.label}>{t(locale, 'panel.tension.title')}</span>
        <p className="mt-2 mb-0 text-[13px] text-ink-muted">{t(locale, 'panel.tension.empty')}</p>
        <button
          type="button"
          onClick={() => go('group')}
          className="mt-2 cursor-pointer border-none bg-transparent p-0 font-mono text-[11px] text-brand-500"
        >
          {t(locale, 'panel.tension.ctaGroup')}
        </button>
      </div>
    );
  }

  return (
    <div className={cn(S.cardTight, dense && 'px-3 py-2.5')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={S.label}>{t(locale, 'panel.tension.title')}</span>
          <p className="mt-1 mb-0 text-[13px] leading-snug text-ink-muted">
            {t(locale, 'panel.tension.intro')}
          </p>
        </div>
        <button
          type="button"
          disabled={aiLoading}
          onClick={runAi}
          className={cn(S.btnBrandSoft, 'min-h-touch shrink-0')}
        >
          {aiLoading ? t(locale, 'panel.tension.aiRunning') : t(locale, 'panel.tension.aiCta')}
        </button>
      </div>

      {narrative.smallSample ? (
        <p className="mt-2 mb-0 text-[12px] text-warning">{t(locale, 'panel.tension.smallSample')}</p>
      ) : null}

      <ul className="mt-3 mb-0 flex list-none flex-col gap-2 p-0">
        {narrative.lines.map((line) => (
          <li
            key={`${line.source}-${line.id}`}
            className={cn(
              'rounded-control border px-3 py-2 text-[13px] leading-snug text-ink',
              line.tone === 'force' && 'border-success/25 bg-success/[0.06]',
              line.tone === 'attention' && 'border-warning/25 bg-warning/[0.06]',
              line.tone === 'neutral' && 'border-ink/10 bg-ink/[0.02]'
            )}
          >
            {lineText(line)}
          </li>
        ))}
      </ul>

      {ai?.summary ? (
        <div className="mt-3 rounded-control border border-brand-500/20 bg-brand-500/[0.04] px-3 py-2.5">
          <p className="m-0 text-[13px] leading-snug text-ink">{ai.summary}</p>
          {Array.isArray(ai.recommendations) && ai.recommendations.length > 0 ? (
            <ul className="mt-2 mb-0 list-disc pl-4 text-[12px] text-ink">
              {ai.recommendations.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 mb-0 text-[11px] text-ink-faint">{t(locale, 'panel.tension.aiDisclaimer')}</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {narrative.ctas.includes('compat') ? (
          <button type="button" className={cn(S.btnGhost, 'min-h-touch text-[11px]')} onClick={() => go('compatibility')}>
            {t(locale, 'panel.tension.ctaCompat')}
          </button>
        ) : null}
        {narrative.ctas.includes('group') ? (
          <button type="button" className={cn(S.btnGhost, 'min-h-touch text-[11px]')} onClick={() => go('group')}>
            {t(locale, 'panel.tension.ctaGroup')}
          </button>
        ) : null}
        {narrative.ctas.includes('team') ? (
          <button type="button" className={cn(S.btnGhost, 'min-h-touch text-[11px]')} onClick={() => go('team')}>
            {t(locale, 'panel.tension.ctaTeam')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
