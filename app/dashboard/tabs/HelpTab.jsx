'use client';

import { useState } from 'react';
import { t } from '../../../lib/i18n';
import { getTypeData } from '../../../lib/i18n-data';
import { typeFullName, typeShortLabel } from '../../../lib/type-en';
import { cn } from '../../../lib/cn';
import { S } from '../dashboard-shared';

const SECTIONS = [
  'welcome',
  'navigation',
  'links',
  'flow',
  'enneagram',
  'vacancies',
  'publicVacancy',
  'candidates',
  'pipeline',
  'team',
  'people',
  'report',
  'motivators',
  'access',
  'tips',
];

function TypeCatalog({ locale }) {
  const typeData = getTypeData(locale);
  return (
    <div className="mt-[18px]">
      <p className="mb-3 mt-0 text-[13px] leading-relaxed text-ink-muted">
        {t(locale, 'panel.help.typesCatalogIntro')}
      </p>
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const d = typeData[n];
          if (!d) return null;
          return (
            <article
              key={n}
              className="rounded-xl px-4 py-3.5"
              style={{
                border: `1px solid ${d.color}33`,
                borderLeft: `4px solid ${d.color}`,
                background: `${d.color}08`,
              }}
            >
              <div className="mb-2 flex flex-wrap items-baseline gap-2">
                <span className="text-lg leading-none">{d.emoji}</span>
                <span className="font-display text-[15px] text-ink">
                  T{n} · {typeFullName(n, locale)}
                </span>
                <span
                  className="rounded-full border px-2 py-0.5 font-mono text-[11px]"
                  style={{
                    color: d.color,
                    borderColor: `${d.color}44`,
                    background: `${d.color}14`,
                  }}
                >
                  {typeShortLabel(n, locale)}
                </span>
              </div>
              <p className="mb-2.5 mt-0 text-[13px] leading-relaxed text-ink">{d.desc}</p>
              <p className="mb-2.5 mt-0 text-[13px] leading-relaxed text-ink-muted">
                <strong className="font-semibold text-ink">{t(locale, 'panel.help.typesAtWork')}.</strong>
                {' '}
                {t(locale, `panel.help.typeAtWork${n}`)}
              </p>
              <p className="mb-3 mt-0 text-[13px] leading-relaxed text-ink-muted">
                <strong className="font-semibold text-ink">{t(locale, 'panel.help.typesWatch')}.</strong>
                {' '}
                {t(locale, `panel.help.typeWatch${n}`)}
              </p>
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                <span className="w-full font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  {t(locale, 'panel.help.typesStrengths')}
                </span>
                {d.strengths.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border px-2.5 py-0.5 text-[11px]"
                    style={{
                      background: `${d.color}18`,
                      borderColor: `${d.color}35`,
                      color: d.color,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
              <p className="mb-1.5 mt-0 text-xs italic leading-snug text-ink-muted">
                {t(locale, 'panel.help.typesChallenge')}: {d.challenge}
              </p>
              <p className="m-0 text-xs leading-snug text-ink-muted">
                <strong className="font-semibold text-ink">{t(locale, 'panel.help.typesTeam')}.</strong>
                {' '}
                {d.team}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function StepList({ locale, sectionKey, count }) {
  const items = [];
  for (let i = 1; i <= count; i += 1) {
    items.push(t(locale, `panel.help.${sectionKey}Step${i}`));
  }
  return (
    <ol className="mt-2.5 mb-0 list-decimal pl-5 text-[13px] leading-snug text-ink-muted">
      {items.map((text) => (
        <li key={text} className="mb-1">{text}</li>
      ))}
    </ol>
  );
}

function FlowStrip({ locale }) {
  const steps = [
    t(locale, 'panel.help.flowChip1'),
    t(locale, 'panel.help.flowChip2'),
    t(locale, 'panel.help.flowChip3'),
    t(locale, 'panel.help.flowChip4'),
    t(locale, 'panel.help.flowChip5'),
    t(locale, 'panel.help.flowChip6'),
    t(locale, 'panel.help.flowChip7'),
  ];
  return (
    <div className="mt-3.5 flex flex-wrap items-center gap-2">
      {steps.map((label, i) => (
        <span key={label} className="inline-flex items-center gap-2">
          <span className="rounded-full border border-ink/12 bg-ink/[0.03] px-2.5 py-1.5 font-mono text-[11px] text-ink">
            {label}
          </span>
          {i < steps.length - 1 ? (
            <span className="font-mono text-xs text-ink-faint">→</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function LinkBtn({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-control border border-brand-500/30 bg-brand-500/[0.07] px-3 py-2 font-mono text-xs text-brand-500"
    >
      {label}
    </button>
  );
}

export function HelpTab({ locale = 'pt-BR', navigateDashboard }) {
  const [open, setOpen] = useState('welcome');

  const go = (tab) => {
    if (typeof navigateDashboard === 'function') navigateDashboard({ tab });
  };

  const stepCounts = {
    welcome: 5,
    navigation: 7,
    links: 9,
    flow: 0,
    enneagram: 7,
    vacancies: 12,
    publicVacancy: 12,
    candidates: 6,
    pipeline: 6,
    team: 6,
    people: 7,
    report: 8,
    motivators: 7,
    access: 9,
    tips: 11,
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className={cn(S.card, 'px-5 py-4')}>
        <span className={S.label}>
          {t(locale, 'panel.help.title')}
        </span>
        <p className="mt-2 mb-0 text-sm leading-relaxed text-ink-muted">
          {t(locale, 'panel.help.intro')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <LinkBtn label={t(locale, 'panel.help.linkOverview')} onClick={() => go('overview')} />
          <LinkBtn label={t(locale, 'panel.help.linkVacancies')} onClick={() => go('vacancies')} />
          <LinkBtn label={t(locale, 'panel.help.linkTeam')} onClick={() => go('team')} />
          <LinkBtn label={t(locale, 'panel.help.linkMotivators')} onClick={() => go('motivators')} />
        </div>
        <nav
          aria-label={t(locale, 'panel.help.tocAria')}
          className="mt-3 flex flex-wrap gap-1.5 border-t border-ink/12 pt-3"
        >
          {SECTIONS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setOpen(key)}
              className={cn(
                'min-h-9 cursor-pointer rounded-full border px-3 py-1.5 font-mono text-[11px]',
                open === key
                  ? 'border-brand-500/30 bg-brand-500/[0.07] text-brand-600'
                  : 'border-ink/12 bg-transparent text-ink-muted'
              )}
            >
              {t(locale, `panel.help.${key}Title`)}
            </button>
          ))}
        </nav>
      </div>

      {SECTIONS.map((key) => {
        const isOpen = open === key;
        return (
          <div key={key} className={cn(S.card, 'overflow-hidden p-0')}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? '' : key)}
              className={cn(
                'flex min-h-touch w-full cursor-pointer items-center justify-between gap-3 border-none px-4 py-2.5 text-left',
                isOpen ? 'bg-brand-500/[0.04]' : 'bg-transparent'
              )}
            >
              <span className="font-display text-sm text-ink">
                {t(locale, `panel.help.${key}Title`)}
              </span>
              <span className="font-mono text-[11px] text-ink-muted">
                {isOpen ? '▲' : '▼'}
              </span>
            </button>
            {isOpen ? (
              <div className="border-t border-ink/12 px-4 pb-3.5">
                <p className="mt-2.5 mb-0 text-[13px] leading-relaxed text-ink-muted">
                  {t(locale, `panel.help.${key}Body`)}
                </p>
                {key === 'flow' ? <FlowStrip locale={locale} /> : null}
                {stepCounts[key] > 0 ? (
                  <StepList locale={locale} sectionKey={key} count={stepCounts[key]} />
                ) : null}
                {key === 'enneagram' ? <TypeCatalog locale={locale} /> : null}
                {key === 'flow' ? (
                  <p className="mt-3 mb-0 font-mono text-xs leading-relaxed text-ink-faint">
                    {t(locale, 'panel.help.flowAlt')}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
