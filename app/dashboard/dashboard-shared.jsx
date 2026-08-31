'use client';

import Link from 'next/link';
import { TYPE_DATA } from '../../lib/data';
import { t } from '../../lib/i18n';
import { PAGE_SIZE_OPTIONS } from '../../lib/assessment-filters';
import { buildAdminPagerPages } from '../../lib/admin-list-pager.js';
import { typeHintTooltip, typeShortLabel } from '../../lib/type-en';
import { C, PIPELINE_STAGE_COLORS, PIPELINE_STAGE_COLORS_DARK, typeChipSurfaceStyle } from '../../lib/theme';
import { PIPELINE_STAGE } from '../../lib/pipeline';
import { cn } from '../../lib/cn';
import {
  fieldInputClass,
  fieldSelectClass,
  fieldSelectCompactClass,
  fieldTextareaClass,
  fieldCheckboxClass,
} from '../_components/form-control-styles';
import { Icon } from '../_components/Icon';
import { IconActionTip } from '../_components/IconActionTip';
import { MeterBar } from '../_components/MeterBar';
import { useDarkMode } from '../_components/DarkModeProvider';
import { ContentEnter } from '../_components/AppLoading';
import { FormField } from '../_components/FormField';

/** Shared Tailwind class tokens (prefer `className={S.x}` — do not reinvent). */
const S = {
  label:
    'mb-3 block font-mono text-2xs uppercase tracking-[2.5px] text-ink-label',
  card: 'rounded-card border border-ink/12 bg-surface p-7 backdrop-blur-[16px]',
  cardTight: 'rounded-card border border-ink/12 bg-surface p-5',
  /** Native select — custom chevron via `.ui-select` (globals.css). */
  select: fieldSelectClass,
  /** Page-size / dense chrome selects. */
  selectCompact: fieldSelectCompactClass,
  /** Text / number — pair with `w-full` when block. */
  input: `${fieldInputClass} w-full`,
  textarea: fieldTextareaClass,
  checkbox: fieldCheckboxClass,
  sidebarSection:
    'mb-1 block px-3 font-mono text-2xs uppercase tracking-[2px] text-ink-label',
  filterChip:
    'inline-flex items-center gap-1 rounded-full border border-brand-500/25 bg-brand-500/10 px-2.5 py-1 font-mono text-xs text-brand-600',
  /** Primary CTA — brand (use once per viewport when possible) */
  btnPrimary:
    'inline-flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-control border-0 bg-brand-500 px-4 py-2.5 font-mono text-prose text-white disabled:cursor-default disabled:opacity-55',
  /** Secondary soft brand */
  btnBrandSoft:
    'inline-flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-control border border-brand-500/35 bg-brand-500/10 px-3.5 py-2.5 font-mono text-xs text-brand-600 disabled:cursor-default disabled:opacity-55',
  /** Neutral / ghost actions (pagination, refresh, cancel) */
  btnGhost:
    'inline-flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-control border border-ink/12 bg-transparent px-3.5 py-2.5 font-mono text-xs text-ink-muted disabled:cursor-default disabled:opacity-55',
  /**
   * Icon-only row action (edit / delete) — pair with AdminEditButton / AdminDeleteButton.
   * ~40px hit target; border + tint by variant.
   */
  btnRowIcon:
    'inline-flex min-h-touch min-w-touch shrink-0 cursor-pointer items-center justify-center rounded-control border p-0 disabled:cursor-default disabled:opacity-50',
  muted: 'font-ui text-prose leading-relaxed text-ink-muted',
  faint: 'font-ui text-xs leading-snug text-ink-faint',
  stack: 'flex flex-col gap-4',
  row: 'flex flex-wrap items-center gap-2',
  /**
   * Overview / intel cards — one type scale (title → subtitle → body → chips).
   * Prefer these over ad-hoc text-[Npx] / font-medium vs font-semibold mix.
   */
  cardTitle: 'font-ui text-base font-semibold text-ink',
  cardSubtitle: 'font-ui text-xs text-ink-muted',
  cardBody: 'font-ui text-sm text-ink',
  cardMuted: 'font-ui text-xs text-ink-muted',
  cardFaint: 'font-ui text-xs leading-snug text-ink-faint',
  cardSection: 'mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-ink-label',
  cardRowTitle: 'truncate font-ui text-sm font-medium text-ink',
  cardLink: 'font-ui text-xs font-medium text-brand-600 hover:text-brand-700',
  cardChip:
    'inline-flex items-center gap-1 rounded-control border border-brand-500/20 bg-brand-500/[0.08] px-1.5 py-0.5 font-mono text-xs text-ink-muted',
  cardMetric: 'font-mono text-sm font-semibold tabular-nums',
  cardMetricHero: 'font-mono text-3xl font-bold tabular-nums',
  /** Dashboard page H1 */
  pageTitle: 'm-0 break-words font-display text-xl font-normal leading-snug text-ink',
  /** Flex row for FormField — items-start evita altura “esticada” por hint/readonly */
  fieldRow: 'flex flex-wrap items-start gap-2.5',
};

const Bar = ({ value, max, color, h = 6 }) => (
  <MeterBar value={value} max={max} color={color} height={h} />
);

/** Inline T1–T9 reference with localized hint (hover / aria). */
const TypeRef = ({ type, locale = 'pt-BR', children, className, style }) => {
  const tip = typeHintTooltip(type, locale);
  return (
    <span
      title={tip}
      aria-label={tip}
      className={cn('cursor-help border-b border-dotted border-ink-faint', className)}
      style={style}
    >
      {children != null ? children : `T${type}`}
    </span>
  );
};

const TypeBadge = ({ type, locale = 'pt-BR', compact = false }) => {
  const { isDark } = useDarkMode();
  const d = TYPE_DATA[type];
  const short = typeShortLabel(type, locale);
  const tip = typeHintTooltip(type, locale);
  const label = compact ? `T${type}` : short;
  const base = cn(
    'ui-type-badge inline-flex flex-shrink-0 cursor-help items-center font-mono rounded-full',
    compact ? 'gap-0.5 px-[7px] py-0.5 text-2xs' : 'gap-1 px-2.5 py-[3px] text-2xs'
  );
  if (!d) {
    return (
      <span
        title={tip}
        aria-label={tip}
        className={cn(base, !compact && 'text-2xs', 'border border-ink/12 bg-ink-muted/10 text-ink-muted')}
      >
        T{type}
      </span>
    );
  }
  return (
    <span
      title={tip}
      aria-label={tip}
      className={cn(base, !compact && 'text-xs', compact && 'tracking-[0.02em]')}
      style={typeChipSurfaceStyle(d.color, { isDark })}
    >
      {compact ? (
        <>
          <span aria-hidden className="text-2xs leading-none">
            {d.emoji}
          </span>
          {label}
        </>
      ) : (
        <>
          {d.emoji} {label}
        </>
      )}
    </span>
  );
};

function SortableTh({ children, columnKey, sortKey, dir, onSort, align = 'left' }) {
  const active = sortKey === columnKey;
  return (
    <th
      scope="col"
      tabIndex={0}
      role="columnheader"
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      onClick={() => onSort(columnKey)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSort(columnKey);
        }
      }}
      className={cn(
        'cursor-pointer select-none border-b border-ink/12 px-3 py-2.5 font-mono text-2xs font-semibold uppercase tracking-[0.06em]',
        active ? 'text-brand-600' : 'text-ink-muted',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        <span className="text-ink-faint">{active ? (dir === 'asc' ? '▲' : '▼') : ''}</span>
      </span>
    </th>
  );
}

function clientSortNextDir(column, previousKey, previousDir) {
  if (previousKey === column) return previousDir === 'asc' ? 'desc' : 'asc';
  return column === 'createdAt' || column === 'sentAt' || column === 'completedAt' || column === 'expiresAt'
    ? 'desc'
    : 'asc';
}

const PAGER_BTN =
  'min-h-touch min-w-touch rounded-control border px-2.5 py-1.5 font-mono text-2xs disabled:cursor-default';
const PAGER_BTN_IDLE =
  'cursor-pointer border-brand-500/35 bg-brand-500/[0.09] text-brand-500 hover:bg-brand-500/[0.14]';
const PAGER_BTN_DISABLED =
  'cursor-default border-ink/12 bg-transparent text-ink-faint';
const PAGER_BTN_ACTIVE =
  'cursor-default border-brand-500 bg-brand-500 text-white';

/**
 * Canonical list footer: count + page size + numbered pages + prev/next.
 * Pair with SortableTh headers on admin/table listagens.
 *
 * @param {{
 *   locale?: string,
 *   page: number,
 *   pageSize: number,
 *   total: number,
 *   loading?: boolean,
 *   onPageChange: (page: number) => void,
 *   onPageSizeChange: (pageSize: number) => void,
 *   countLabel?: string,
 *   className?: string,
 *   pageSizeOptions?: number[],
 * }} props
 */
function AdminListPager({
  locale = 'pt-BR',
  page,
  pageSize,
  total,
  loading = false,
  onPageChange,
  onPageSizeChange,
  countLabel,
  className,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}) {
  const totalPages = Math.max(1, Math.ceil(Number(total || 0) / Math.max(1, Number(pageSize) || 20)));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  if (!total || total <= 0) return null;

  const label =
    countLabel ||
    t(locale, 'panel.common.listCount', {
      total,
      page: safePage,
      totalPages,
    });

  const pageItems = buildAdminPagerPages(safePage, totalPages);
  let ellipsisIdx = 0;

  return (
    <div
      className={cn(
        'mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/12 pt-3',
        className
      )}
    >
      <span className="font-mono text-2xs text-ink-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={String(pageSize)}
          onChange={(e) => onPageSizeChange?.(parseInt(e.target.value, 10))}
          disabled={loading}
          className={S.selectCompact}
          aria-label={t(locale, 'panel.common.pageSize')}
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={String(n)}>
              {t(locale, 'panel.compat.perPageShort', { n })}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={loading || safePage <= 1}
          onClick={() => onPageChange?.(Math.max(1, safePage - 1))}
          className={cn(PAGER_BTN, safePage <= 1 ? PAGER_BTN_DISABLED : PAGER_BTN_IDLE)}
          aria-label={t(locale, 'panel.admin.prev')}
        >
          {t(locale, 'panel.admin.prev')}
        </button>
        <nav
          className="flex flex-wrap items-center gap-1"
          aria-label={t(locale, 'panel.common.paginationNav')}
        >
          {pageItems.map((item) => {
            if (item === 'ellipsis') {
              ellipsisIdx += 1;
              return (
                <span
                  key={`e-${ellipsisIdx}`}
                  className="min-w-[1.5rem] px-1 text-center font-mono text-2xs text-ink-faint"
                  aria-hidden
                >
                  …
                </span>
              );
            }
            const active = item === safePage;
            return (
              <button
                key={item}
                type="button"
                disabled={loading || active}
                onClick={() => onPageChange?.(item)}
                className={cn(PAGER_BTN, active ? PAGER_BTN_ACTIVE : PAGER_BTN_IDLE)}
                aria-label={t(locale, 'panel.common.pageGoTo', { n: item })}
                aria-current={active ? 'page' : undefined}
              >
                {item}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          disabled={loading || safePage >= totalPages}
          onClick={() => onPageChange?.(Math.min(totalPages, safePage + 1))}
          className={cn(
            PAGER_BTN,
            safePage >= totalPages ? PAGER_BTN_DISABLED : PAGER_BTN_IDLE
          )}
          aria-label={t(locale, 'panel.admin.next')}
        >
          {t(locale, 'panel.admin.next')}
        </button>
      </div>
    </div>
  );
}

const CompatBadge = ({ level, locale = 'pt-BR' }) => {
  const map = {
    synergy: { key: 'panel.compatLevel.synergy', color: C.synergy },
    tension: { key: 'panel.compatLevel.tension', color: C.tension },
    neutral: { key: 'panel.compatLevel.neutral', color: C.neutral },
  };
  const m = map[level];
  if (!m) return null;
  return (
    <span
      className="rounded-full px-[9px] py-0.5 font-mono text-xs"
      style={{
        background: `${m.color}18`,
        border: `1px solid ${m.color}44`,
        color: m.color,
      }}
    >
      {t(locale, m.key)}
    </span>
  );
};

const KANBAN_STAGE_DEFS = [
  { id: PIPELINE_STAGE.NEW, color: PIPELINE_STAGE_COLORS.new, labelKey: 'recruiting.pipelineNew' },
  { id: PIPELINE_STAGE.INTERVIEW, color: PIPELINE_STAGE_COLORS.interview, labelKey: 'recruiting.pipelineInterview' },
  { id: PIPELINE_STAGE.TEST_COMPLETED, color: PIPELINE_STAGE_COLORS.test_completed, labelKey: 'recruiting.pipelineTestCompleted' },
  { id: PIPELINE_STAGE.SCREENING, color: PIPELINE_STAGE_COLORS.screening, labelKey: 'recruiting.pipelineScreening' },
  { id: PIPELINE_STAGE.APPROVED, color: PIPELINE_STAGE_COLORS.approved, labelKey: 'recruiting.pipelineApproved' },
  { id: PIPELINE_STAGE.HIRED, color: PIPELINE_STAGE_COLORS.hired, labelKey: 'recruiting.pipelineHired' },
  { id: PIPELINE_STAGE.REJECTED, color: PIPELINE_STAGE_COLORS.rejected, labelKey: 'recruiting.pipelineRejected' },
  { id: PIPELINE_STAGE.ARCHIVED, color: PIPELINE_STAGE_COLORS.archived, labelKey: 'recruiting.pipelineArchived' },
];

function getKanbanStages(locale = 'pt-BR', { isDark = false } = {}) {
  return KANBAN_STAGE_DEFS.map((s) => ({
    id: s.id,
    color: isDark
      ? (PIPELINE_STAGE_COLORS_DARK[s.id] || s.color)
      : s.color,
    label: t(locale, s.labelKey),
  }));
}

/** @deprecated use getKanbanStages(locale) */
const KANBAN_STAGES = getKanbanStages('pt-BR');

/** Sidebar section + label key for dashboard breadcrumb / page chrome. */
const DASHBOARD_TAB_NAV = {
  overview: { sectionKey: 'dashboard.sectionAnalysis', labelKey: 'dashboard.overview' },
  team: { sectionKey: 'dashboard.sectionAnalysis', labelKey: 'dashboard.team' },
  compensation: { sectionKey: 'dashboard.sectionAnalysis', labelKey: 'dashboard.compensation' },
  compatibility: { sectionKey: 'dashboard.sectionAnalysis', labelKey: 'dashboard.compatibility' },
  compare: { sectionKey: 'dashboard.sectionAnalysis', labelKey: 'dashboard.compare' },
  group: { sectionKey: 'dashboard.sectionAnalysis', labelKey: 'dashboard.group' },
  leadership: { sectionKey: 'dashboard.sectionAnalysis', labelKey: 'dashboard.leadership' },
  vacancies: { sectionKey: 'dashboard.sectionRecruiting', labelKey: 'dashboard.vacancies' },
  'talent-bank': { sectionKey: 'dashboard.sectionRecruiting', labelKey: 'dashboard.talentBank' },
  motivators: { sectionKey: 'dashboard.sectionPeople', labelKey: 'dashboard.motivators' },
  climate: { sectionKey: 'dashboard.sectionPeople', labelKey: 'dashboard.climate' },
  'job-roles': { sectionKey: 'dashboard.sectionCatalogs', labelKey: 'dashboard.jobRoles' },
  'performance-reviews': { sectionKey: 'dashboard.sectionPeople', labelKey: 'dashboard.performanceReviews' },
  okr: { sectionKey: 'dashboard.sectionPeople', labelKey: 'dashboard.okr' },
  succession: { sectionKey: 'dashboard.sectionPeople', labelKey: 'dashboard.succession' },
  'exit-analysis': { sectionKey: 'dashboard.sectionPeople', labelKey: 'dashboard.exitAnalysis' },
  dp: { sectionKey: 'dashboard.sectionPeople', labelKey: 'dashboard.dp' },
  'learning-resources': { sectionKey: 'dashboard.sectionCatalogs', labelKey: 'dashboard.learningResources' },
  lms: { sectionKey: 'dashboard.sectionLms', labelKey: 'dashboard.lms' },
  'company-benefits': { sectionKey: 'dashboard.sectionCatalogs', labelKey: 'dashboard.companyBenefits' },
  'company-feed': { sectionKey: 'dashboard.sectionCatalogs', labelKey: 'dashboard.companyFeed' },
  companies: { sectionKey: 'dashboard.sectionAccount', labelKey: 'dashboard.companies' },
  users: { sectionKey: 'dashboard.sectionAccount', labelKey: 'dashboard.users' },
  leads: { sectionKey: 'dashboard.sectionAccount', labelKey: 'dashboard.leads' },
  audit: { sectionKey: 'dashboard.sectionAccount', labelKey: 'dashboard.audit' },
  help: { sectionKey: 'dashboard.sectionHelp', labelKey: 'dashboard.help' },
  profile: { sectionKey: null, labelKey: 'dashboard.profile' },
};

function getDashboardTabNav(tab) {
  return DASHBOARD_TAB_NAV[tab] || DASHBOARD_TAB_NAV.overview;
}

function DashboardBreadcrumb({ locale, tab, onHome }) {
  const nav = getDashboardTabNav(tab);
  const sectionLabel = nav.sectionKey ? t(locale, nav.sectionKey) : null;
  const screenLabel = t(locale, nav.labelKey);
  const sep = (
    <span aria-hidden className="mx-1.5 font-normal text-ink-faint">
      /
    </span>
  );

  return (
    <nav
      aria-label={t(locale, 'dashboard.breadcrumbAria')}
      className={cn(S.label, 'mb-0')}
    >
      <button
        type="button"
        onClick={onHome}
        title={t(locale, 'dashboard.homeAria')}
        className="m-0 cursor-pointer border-none bg-transparent p-0 font-mono text-2xs uppercase tracking-[2.5px] text-ink-label"
      >
        {t(locale, 'dashboard.panel')}
      </button>
      {sectionLabel ? (
        <>
          {sep}
          <span className="text-ink-faint">{sectionLabel}</span>
        </>
      ) : null}
      {sep}
      <span className="text-ink" aria-current="page">
        {screenLabel}
      </span>
    </nav>
  );
}

/**
 * Horizontal section tabs. Optional `moreTabs` collapses secondary sections into a native select
 * so recruiters keep primary jobs (e.g. pipeline + candidates) visible.
 * Styled with Tailwind tokens (brand / ink / canvas).
 */
function PanelSubNav({ tabs, active, onChange, ariaLabel, moreTabs = null, moreLabel = 'More' }) {
  const more = Array.isArray(moreTabs) ? moreTabs : [];
  const moreActive = more.some((tab) => tab.id === active);
  const moreValue = moreActive ? active : '';

  const tabClass = (on) =>
    cn(
      'min-h-touch cursor-pointer rounded-full border px-3.5 py-2 font-mono text-xs',
      on
        ? 'border-brand-500/40 bg-brand-500/[0.08] text-brand-600'
        : 'border-ink/12 bg-transparent text-ink-muted'
    );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel || undefined}
      className="mb-3.5 flex flex-wrap items-center gap-1.5 border-b border-ink/12 pb-3"
    >
      {tabs.map((tab) => {
        const on = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tab.id)}
            className={tabClass(on)}
          >
            {tab.label}
          </button>
        );
      })}
      {more.length > 0 ? (
        <label className="relative m-0 inline-flex min-h-touch items-center gap-2">
          <span className="sr-only">{moreLabel}</span>
          <select
            aria-label={moreLabel}
            value={moreValue}
            onChange={(e) => {
              const next = e.target.value;
              if (next) onChange(next);
            }}
            className={cn(
              'ui-select max-w-[220px] min-h-touch cursor-pointer rounded-full border px-3.5 py-2 font-mono text-xs',
              moreActive
                ? 'border-brand-500/40 bg-brand-500/[0.08] text-brand-600'
                : 'border-ink/12 bg-ink/[0.05] text-ink-muted'
            )}
          >
            <option value="">{moreLabel}</option>
            {more.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

/** Strip a leading "+ " / "+" so create labels stay consistent with Icon plus. */
function createLabelText(label) {
  return String(label || '')
    .replace(/^\s*\+\s*/, '')
    .trim();
}

/**
 * Primary create CTA for admin listagens — brand + plus icon.
 * Reference: Exit Analysis / Benefícios / Academy.
 */
function AdminCreateButton({ label, onClick, disabled = false, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(S.btnPrimary, className)}
    >
      <Icon name="plus" className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {createLabelText(label)}
    </button>
  );
}

/** Row edit — brand tint + pencil. */
function AdminEditButton({ label, onClick, disabled = false, className }) {
  return (
    <IconActionTip label={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          S.btnRowIcon,
          'border-brand-500/35 bg-brand-500/[0.09] text-brand-600',
          className
        )}
        aria-label={label}
        title={label}
      >
        <Icon name="pencil" />
      </button>
    </IconActionTip>
  );
}

/** Row delete / deactivate / archive — danger tint + trash. */
function AdminDeleteButton({ label, onClick, disabled = false, className }) {
  return (
    <IconActionTip label={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          S.btnRowIcon,
          'border-danger/35 bg-danger/[0.08] text-danger',
          className
        )}
        aria-label={label}
        title={label}
      >
        <Icon name="trash" />
      </button>
    </IconActionTip>
  );
}

/**
 * Row view — default: info tint + eye (pair with Edit / Delete).
 * Pass `asText` for rare text CTAs that reuse this slot (e.g. resend invite).
 * Pass `icon` to override the glyph (default `eye`).
 */
function AdminViewButton({
  label,
  onClick,
  disabled = false,
  className,
  asText = false,
  icon = 'eye',
}) {
  if (asText) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(S.btnGhost, 'min-h-touch px-2 text-xs', className)}
        aria-label={label}
        title={label}
      >
        {label}
      </button>
    );
  }
  return (
    <IconActionTip label={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          S.btnRowIcon,
          'border-info/35 bg-info/[0.08] text-info',
          className
        )}
        aria-label={label}
        title={label}
      >
        <Icon name={icon} />
      </button>
    </IconActionTip>
  );
}

const ADMIN_ICON_TINT = {
  brand: 'border-brand-500/35 bg-brand-500/[0.09] text-brand-600',
  info: 'border-info/35 bg-info/[0.08] text-info',
  muted: 'border-ink/15 bg-ink/[0.04] text-ink-muted',
  warning: 'border-warning/40 bg-warning/[0.1] text-warning',
  danger: 'border-danger/35 bg-danger/[0.08] text-danger',
  success: 'border-success/35 bg-success/[0.08] text-success',
};

/**
 * Icon-only secondary row action (button or Next.js Link).
 * Prefer AdminView / Edit / Delete for CRUD; use this for “open team”, rotate, clone, reset…
 */
function AdminIconButton({
  href,
  onClick,
  label,
  icon,
  tint = 'brand',
  disabled = false,
  className,
}) {
  const classes = cn(
    S.btnRowIcon,
    ADMIN_ICON_TINT[tint] || ADMIN_ICON_TINT.brand,
    className
  );
  if (href && !disabled) {
    return (
      <IconActionTip label={label}>
        <Link href={href} className={classes} aria-label={label} title={label}>
          <Icon name={icon} />
        </Link>
      </IconActionTip>
    );
  }
  return (
    <IconActionTip label={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={classes}
        aria-label={label}
        title={label}
      >
        <Icon name={icon} />
      </button>
    </IconActionTip>
  );
}

function AdminActionsCell({ children, className }) {
  /* inline-flex + nowrap: keep Ver/Editar/Excluir side-by-side in every admin grid
     (flex-wrap + narrow Ações column was stacking icons and inflating row height). */
  return (
    <div
      className={cn(
        'inline-flex max-w-none flex-nowrap items-center justify-end gap-1 whitespace-nowrap',
        className
      )}
    >
      {children}
    </div>
  );
}

function AdminActionsTh({ children }) {
  return (
    <th
      scope="col"
      className="w-px whitespace-nowrap border-b border-ink/12 px-4 py-3 text-right align-middle font-mono text-2xs uppercase tracking-[0.06em] text-ink-muted"
    >
      {children}
    </th>
  );
}

/** Non-sortable table header cell (pair with SortableTh). */
function AdminTh({ children, align = 'left', className }) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-ink/12 px-4 py-3 font-mono text-2xs uppercase tracking-[0.06em] text-ink-muted',
        align === 'right' ? 'text-right' : 'text-left',
        className
      )}
    >
      {children}
    </th>
  );
}

/** Scroll + border chrome around admin list tables.
 * Pass `animKey` (filter/search/page signature) to fade/slide results after filter changes.
 */
function AdminTableShell({ children, minWidth = '640px', className, animKey }) {
  const shell = (
    <div className={cn('overflow-x-auto rounded-card border border-ink/10', className)}>
      <table
        className="w-full border-collapse text-left text-prose"
        style={minWidth ? { minWidth } : undefined}
      >
        {children}
      </table>
    </div>
  );
  if (animKey === undefined || animKey === null || animKey === '') return shell;
  return (
    <ContentEnter animKey={String(animKey)} className="w-full">
      {shell}
    </ContentEnter>
  );
}

/** Standard admin tab title + optional subtitle + primary actions (create).
 * Create CTA stays top-right of the title row — never inside AdminListFilters.
 */
function AdminPageHeader({ title, subtitle = null, description = null, actions = null, className }) {
  const lead = subtitle || description;
  return (
    <header
      className={cn(
        'mb-4 flex items-start justify-between gap-4',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className={S.pageTitle}>{title}</h1>
        {lead ? (
          <p className={cn(S.muted, 'm-0 mt-1.5 max-w-[62ch] text-prose')}>{lead}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 pt-0.5">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

/**
 * List search field — live `onChange`; optional Enter/`onSubmit` (no Buscar button).
 * Clear filters lives on AdminListFilters `onClear`, not here.
 */
function AdminListSearch({
  locale = 'pt-BR',
  value,
  onChange,
  onSubmit,
  placeholder,
  label,
  className,
  inputClassName,
}) {
  const fieldLabel = label || t(locale, 'panel.common.search');
  return (
    <FormField label={fieldLabel} className={cn('min-w-[12rem] max-w-md shrink-0 grow', className)}>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit?.(value);
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder || fieldLabel}
        className={cn(S.input, 'w-full min-w-[10rem]', inputClassName)}
      />
    </FormField>
  );
}

export {
  AdminActionsCell,
  AdminActionsTh,
  AdminCreateButton,
  AdminDeleteButton,
  AdminEditButton,
  AdminIconButton,
  AdminListPager,
  AdminListSearch,
  AdminPageHeader,
  AdminTableShell,
  AdminTh,
  AdminViewButton,
  Bar,
  CompatBadge,
  DashboardBreadcrumb,
  getDashboardTabNav,
  KANBAN_STAGES,
  getKanbanStages,
  PanelSubNav,
  S,
  SortableTh,
  TypeBadge,
  TypeRef,
  clientSortNextDir,
};
