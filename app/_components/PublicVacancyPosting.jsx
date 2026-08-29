'use client';

import Link from 'next/link';
import { RichTextView } from './RichTextView';
import { isRichTextEmpty } from '../../lib/sanitize-html';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { brandMarkSrc } from '../../lib/brand';
import { employmentTypeLabelKey } from '../../lib/vacancy-employment-type';
import { formatWorkplaceLabel } from '../../lib/vacancy-workplace';
import { formatVacancySalaryRangeDisplay } from '../../lib/br-masks';
import { PublicVacancyShareBar } from './PublicVacancyShareBar';
import { FormField, formFieldRowClass } from './FormField';
import {
  formatPublicVacancyDate,
  publicVacancyCanApply,
  publicVacancyClosedReason,
  publicVacancyShowsClosedExperience,
} from '../../lib/public-vacancy-lifecycle';
import { publicCompanyPath } from '../../lib/public-job-url';
import { useEffect, useRef, useState } from 'react';

function trackJobFunnel(eventType, vacancyId) {
  const id = Number(vacancyId);
  if (!Number.isFinite(id) || id <= 0) return;
  const body = JSON.stringify({ eventType, vacancyId: id });
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/public/job-funnel', blob)) return;
    }
  } catch {
    /* fall through */
  }
  fetch('/api/public/job-funnel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    credentials: 'same-origin',
    keepalive: true,
  }).catch(() => {});
}

const SC = {
  shell: 'relative box-border min-h-screen bg-canvas font-display text-ink',
  glow: 'pointer-events-none fixed inset-0 bg-radial-glow',
  wrap: 'relative z-[1] mx-auto max-w-[760px] px-5 pb-16 pt-10',
  card: 'box-border rounded-[20px] border border-ink/12 bg-white px-10 py-9 shadow-card',
  input: 'ui-field box-border w-full rounded-control border border-ink/12 bg-ink/[0.04] px-3.5 py-3 font-display text-base text-ink',
  select: 'ui-select box-border w-full cursor-pointer rounded-control border border-ink/12 bg-ink/[0.04] px-3.5 py-3 font-display text-base text-ink',
  btnPrimary:
    'min-h-touch items-center justify-center rounded-control border-none bg-brand-500 px-4 py-2.5 font-mono text-xs font-medium text-white',
};

function MetaChip({ children }) {
  return (
    <span className="inline-block rounded-full border border-ink/12 bg-ink/[0.05] px-3 py-1.5 font-mono text-2xs tracking-wide text-ink-muted">
      {children}
    </span>
  );
}

function RelatedVacanciesList({ locale, items, heading }) {
  if (!items?.length) return null;
  return (
    <section aria-labelledby="public-related-heading" className="mt-7">
      <h2
        id="public-related-heading"
className="mb-3.5 mt-0 font-display text-lg font-normal"
      >
        {heading}
      </h2>
      <ul
className="m-0 flex list-none flex-col gap-2.5 p-0"
      >
        {items.map((item) => (
          <li key={item.vacancyId}>
            <Link
              href={item.path}
className="block rounded-xl border border-ink/12 bg-white px-4 py-3.5 text-ink no-underline"
            >
              <span className="block text-base leading-snug break-words">
                {item.title}
              </span>
              {item.companyName ? (
                <span
className="mt-1 block font-mono text-xs text-ink-muted"
                >
                  {item.companyName}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mb-0 mt-4">
        <Link
          href="/jobs"
          className="font-mono text-sm text-brand-500"
        >
          {t(locale, 'publicVacancy.seeAllOpen')}
        </Link>
      </p>
    </section>
  );
}

/**
 * Página pública da vaga — aberta (candidatar) ou fechada/expirada (agradecimento + outras).
 */
export function PublicVacancyPostingView({ locale = 'pt-BR', posting, related = [] }) {
  const closed = publicVacancyShowsClosedExperience(posting);
  const closedReason = publicVacancyClosedReason(posting);
  const canApply = publicVacancyCanApply(posting);
  const empKey = employmentTypeLabelKey(posting?.employmentType);
  const workplaceLabel = formatWorkplaceLabel(
    {
      workplaceModality: posting?.workplaceModality,
      workplaceCity: posting?.workplaceCity,
      workplaceState: posting?.workplaceState,
    },
    locale,
    t
  );
  const salary =
    posting?.showSalary && (posting.salaryMin || posting.salaryMax)
      ? formatVacancySalaryRangeDisplay(posting.salaryMin, posting.salaryMax)
      : null;
  const companyName = posting?.showCompany ? posting.company?.name : null;
  const companyWebsite = posting?.showCompany ? posting.company?.website : null;
  const companyAbout = posting?.showCompany ? posting.company?.aboutHtml : '';
  const companyLogoUrl = posting?.showCompany ? posting.company?.logoUrl : null;
  const companyProfileOn = Boolean(
    posting?.companyPublicProfileEnabled ?? posting?.company?.publicProfileEnabled
  );
  const companyCareersPath =
    companyProfileOn && posting?.companySlug
      ? publicCompanyPath(posting.companySlug)
      : null;
  const hasDesc = !isRichTextEmpty(posting?.description);
  const publishedLabel = formatPublicVacancyDate(posting?.createdAt, locale);
  const targetLabel = formatPublicVacancyDate(posting?.targetDate, locale);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (closed || viewedRef.current || !posting?.vacancyId) return;
    viewedRef.current = true;
    trackJobFunnel('job_view', posting.vacancyId);
  }, [closed, posting?.vacancyId]);

  const onApplyClick = () => {
    if (posting?.vacancyId) trackJobFunnel('apply_start', posting.vacancyId);
  };

  return (
    <div className={SC.shell}>
      <div className={SC.glow} aria-hidden />
      <div className={SC.wrap}>
        <header className="mb-5 flex items-center gap-3">
          <img src={brandMarkSrc(64)} alt="" width={40} height={40} />
          <span className="font-mono text-2xs uppercase tracking-[2px] text-ink-faint">
            30Team
          </span>
        </header>

        <article className={SC.card}>
          {closed ? (
            <>
              <p
className="mb-2 mt-0 font-mono text-2xs uppercase tracking-[2px] text-warning"
              >
                {closedReason === 'expired'
                  ? t(locale, 'publicVacancy.expiredBadge')
                  : t(locale, 'publicVacancy.closedBadge')}
              </p>
              <h1
                className="mb-3 break-words bg-gradient-to-br from-brand-200 via-brand-400 to-brand-500 bg-clip-text font-display text-[clamp(1.625rem,5vw,2.25rem)] font-normal leading-snug text-transparent"
              >
                {t(locale, 'publicVacancy.closedTitle')}
              </h1>
              <p className="mb-2 mt-0 text-base leading-[1.65] text-ink-muted">
                {closedReason === 'expired'
                  ? t(locale, 'publicVacancy.expiredThanks', {
                      title: posting?.title || t(locale, 'publicVacancy.thisRole'),
                    })
                  : t(locale, 'publicVacancy.closedThanks', {
                      title: posting?.title || t(locale, 'publicVacancy.thisRole'),
                    })}
              </p>
              <p className="mb-5 mt-0 text-base leading-[1.65] text-ink-muted">
                {t(locale, 'publicVacancy.closedMessage')}
              </p>
              {posting?.title ? (
                <p
className="mb-2 mt-0 font-mono text-prose text-ink-faint"
                >
                  {t(locale, 'publicVacancy.closedWas')}:{' '}
                  <strong className="text-ink">{posting.title}</strong>
                  {companyName ? ` · ${companyName}` : ''}
                </p>
              ) : null}
              <p className="mb-0 mt-5 flex flex-wrap gap-3">
                {companyCareersPath ? (
                  <Link
                    href={companyCareersPath}
                    className="inline-block cursor-pointer rounded-control border border-ink/12 bg-transparent px-5 py-3 font-ui text-sm text-ink no-underline"
                  >
                    {companyName
                      ? t(locale, 'publicVacancy.backToCompanyRoles', { name: companyName })
                      : t(locale, 'publicVacancy.backToCompanyRolesGeneric')}
                  </Link>
                ) : null}
                <Link
                  href="/jobs"
                  className="inline-block cursor-pointer rounded-control border-none bg-gradient-to-br from-brand-500 to-brand-800 px-5 py-3 font-display text-sm text-white no-underline"
                >
                  {t(locale, 'publicVacancy.browseOpenCta')}
                </Link>
              </p>
              <RelatedVacanciesList
                locale={locale}
                items={related}
                heading={t(locale, 'publicVacancy.relatedHeading')}
              />
            </>
          ) : (
            <>
              <header>
                {companyCareersPath ? (
                  <p className="mb-3 mt-0">
                    <Link
                      href={companyCareersPath}
                      className="inline-flex min-h-touch items-center font-mono text-xs text-ink-muted no-underline hover:text-brand-600"
                    >
                      ←{' '}
                      {companyName
                        ? t(locale, 'publicVacancy.backToCompanyRoles', { name: companyName })
                        : t(locale, 'publicVacancy.backToCompanyRolesGeneric')}
                    </Link>
                  </p>
                ) : null}
                {companyName ? (
                  <p
className="mb-2.5 mt-0 font-mono text-xs tracking-wide text-ink-muted"
                  >
                    {companyCareersPath ? (
                      <Link href={companyCareersPath} className="text-ink-muted no-underline hover:text-brand-600">
                        {companyName}
                      </Link>
                    ) : (
                      <span>{companyName}</span>
                    )}
                    {companyWebsite ? (
                      <>
                        {' · '}
                        <a
                          href={companyWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-500"
                        >
                          {t(locale, 'publicVacancy.companySite')}
                        </a>
                      </>
                    ) : null}
                  </p>
                ) : null}
                <h1
                  className="mb-3 break-words bg-gradient-to-br from-brand-200 via-brand-400 to-brand-500 bg-clip-text font-display text-[clamp(1.75rem,5vw,2.5rem)] font-normal leading-snug text-transparent"
                >
                  {posting.title}
                </h1>
                <div className="mb-[22px] flex flex-wrap gap-2">
                  {empKey ? <MetaChip>{t(locale, empKey)}</MetaChip> : null}
                  {workplaceLabel ? <MetaChip>{workplaceLabel}</MetaChip> : null}
                  {salary ? (
                    <MetaChip>
                      {t(locale, 'publicVacancy.salaryLabel')}: {salary}
                    </MetaChip>
                  ) : null}
                  {publishedLabel ? (
                    <MetaChip>
                      {t(locale, 'publicVacancy.publishedLabel')}: {publishedLabel}
                    </MetaChip>
                  ) : null}
                  {targetLabel ? (
                    <MetaChip>
                      {t(locale, 'publicVacancy.targetDateLabel')}: {targetLabel}
                    </MetaChip>
                  ) : null}
                </div>
              </header>

              {hasDesc ? (
                <section aria-labelledby="public-desc-heading">
                  <h2
                    id="public-desc-heading"
                    className="mb-3 mt-0 font-display text-lg font-normal"
                  >
                    {t(locale, 'publicVacancy.descriptionHeading')}
                  </h2>
                  <div>
                    <RichTextView
                      html={posting.description}
                      className="text-base leading-[1.7] text-ink"
                    />
                  </div>
                </section>
              ) : (
                <p className="m-0 italic text-ink-muted">
                  {t(locale, 'publicVacancy.noDescription')}
                </p>
              )}

              {companyAbout && !isRichTextEmpty(companyAbout) ? (
                <section
                  aria-labelledby="public-company-heading"
                  className="mt-7 border-t border-ink/12 pt-[22px]"
                >
                  <h2
                    id="public-company-heading"
                    className="mb-3 mt-0 text-lg font-normal"
                  >
                    {t(locale, 'publicVacancy.aboutCompany', {
                      name: companyName || t(locale, 'publicVacancy.companyFallback'),
                    })}
                  </h2>
                  {companyLogoUrl ? (
                    <img
                      src={companyLogoUrl}
                      alt=""
                      width={72}
                      height={72}
                      className="mb-3 block rounded-control bg-canvas object-contain"
                    />
                  ) : null}
                  <RichTextView
                    html={companyAbout}
                    className="text-sm leading-[1.65] text-ink-muted"
                  />
                </section>
              ) : companyLogoUrl && companyName ? (
                <section
                  className="mt-7 flex items-center gap-3 border-t border-ink/12 pt-[22px]"
                >
                  <img
                    src={companyLogoUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="rounded-lg object-contain"
                  />
                  <span className="text-base text-ink">{companyName}</span>
                </section>
              ) : null}

              <footer className="mt-8">
                {canApply ? (
                  <a
                    href={posting.applyPath}
                    onClick={onApplyClick}
                    className="inline-block cursor-pointer rounded-control border-none bg-gradient-to-br from-brand-500 to-brand-800 px-5 py-3 font-display text-sm text-white no-underline"
                  >
                    {t(locale, 'publicVacancy.applyCta')}
                  </a>
                ) : (
                  <p className="m-0 text-sm text-ink-muted">
                    {t(locale, 'publicVacancy.applyUnavailable')}
                  </p>
                )}
                <PublicVacancyShareBar locale={locale} posting={posting} />
                <p className="mb-0 mt-4 font-mono text-xs">
                  <Link href="/jobs" className="text-brand-500">
                    {t(locale, 'publicVacancy.seeAllOpen')}
                  </Link>
                </p>
              </footer>
            </>
          )}
        </article>
      </div>
    </div>
  );
}

/** Job listing /jobs — busca + filtro tipo + paginação (GET). Também agregadores SEO. */
export function PublicVacanciesIndexView({
  locale = 'pt-BR',
  items = [],
  total = 0,
  page = 1,
  pageSize = 12,
  filters = {},
  title = null,
  intro = null,
  basePath = '/jobs',
  showSearchForm = true,
  showJobAlert = true,
}) {
  const q = String(filters.q || '');
  const employmentType = String(filters.employmentType || '');
  const totalPages = Math.max(1, Math.ceil(Number(total) / Math.max(1, pageSize)));
  const hasFilters = Boolean(q || employmentType);
  const emptyMsg = hasFilters
    ? t(locale, 'publicVacancy.indexEmptyFiltered')
    : t(locale, 'publicVacancy.indexEmpty');
  const heading = title || t(locale, 'publicVacancy.indexTitle');
  const lead = intro || t(locale, 'publicVacancy.indexIntro');
  const listBase = String(basePath || '/jobs').replace(/\/$/, '') || '/jobs';

  function hrefForPage(p) {
    const params = new URLSearchParams();
    if (showSearchForm) {
      if (q) params.set('q', q);
      if (employmentType) params.set('employmentType', employmentType);
    }
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `${listBase}?${qs}` : listBase;
  }

  const [alertName, setAlertName] = useState('');
  const [alertEmail, setAlertEmail] = useState('');
  const [alertStatus, setAlertStatus] = useState(''); // '' | 'loading' | 'ok' | 'err'

  async function submitJobAlert(e) {
    e.preventDefault();
    if (alertStatus === 'loading') return;
    setAlertStatus('loading');
    try {
      const res = await fetch('/api/public/job-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: alertEmail,
          name: alertName || null,
          filters: {
            q: q || undefined,
            employmentType: employmentType || undefined,
          },
        }),
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('fail');
      setAlertStatus('ok');
      setAlertEmail('');
      setAlertName('');
    } catch {
      setAlertStatus('err');
    }
  }

  return (
    <div className={SC.shell}>
      <div className={SC.glow} aria-hidden />
      <div className={SC.wrap}>
        <header className="mb-6">
          <img src={brandMarkSrc(64)} alt="" width={40} height={40} className="mb-3" />
          {listBase !== '/jobs' ? (
            <p className="mb-2 mt-0 font-mono text-xs">
              <Link href="/jobs" className="text-ink-muted">
                {t(locale, 'publicVacancy.browseOpenCta')}
              </Link>
            </p>
          ) : null}
          <h1
            className="m-0 break-words bg-gradient-to-br from-brand-200 via-brand-400 to-brand-500 bg-clip-text font-display text-[clamp(1.625rem,4vw,2.25rem)] font-normal leading-snug text-transparent"
          >
            {heading}
          </h1>
          <p className="mb-0 mt-2.5 text-base leading-relaxed text-ink-muted">
            {lead}
          </p>
        </header>

        {showSearchForm ? (
        <form
          method="get"
          action="/jobs"
          className={cn(SC.card, 'mb-4 flex flex-col gap-3')}
        >
          <FormField label={t(locale, 'publicVacancy.indexSearchLabel')}>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t(locale, 'publicVacancy.indexSearchPlaceholder')}
              className={SC.input}
              autoComplete="off"
            />
          </FormField>
          <div className={cn(formFieldRowClass, 'gap-3')}>
            <FormField
              label={t(locale, 'publicVacancy.indexEmploymentLabel')}
              className="min-w-0 flex-[1_1_180px]"
            >
              <select name="employmentType" defaultValue={employmentType} className={SC.select}>
                <option value="">{t(locale, 'publicVacancy.indexEmploymentAll')}</option>
                <option value="clt">{t(locale, 'recruiting.employmentType_clt')}</option>
                <option value="pj">{t(locale, 'recruiting.employmentType_pj')}</option>
                <option value="internship">{t(locale, 'recruiting.employmentType_internship')}</option>
                <option value="cooperative">{t(locale, 'recruiting.employmentType_cooperative')}</option>
              </select>
            </FormField>
            <button
              type="submit"
              className="min-h-[44px] shrink-0 cursor-pointer self-end rounded-control border-none bg-brand-500 px-5 font-display text-base text-white"
            >
              {t(locale, 'publicVacancy.indexSearchSubmit')}
            </button>
            {hasFilters ? (
              <Link
                href="/jobs"
                className="inline-flex min-h-[44px] shrink-0 items-center self-end px-3.5 text-sm text-ink-muted"
              >
                {t(locale, 'publicVacancy.indexClearFilters')}
              </Link>
            ) : null}
          </div>
        </form>
        ) : null}

        <main className={SC.card}>
          {total > 0 ? (
            <p
className="mb-3.5 mt-0 font-mono text-xs text-ink-muted"
            >
              {t(locale, 'publicVacancy.indexResultCount', { count: String(total) })}
            </p>
          ) : null}
          {!items.length ? (
            <p className="m-0 text-ink-muted">{emptyMsg}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {items.map((item) => (
                <li key={item.vacancyId}>
                  <div
className="rounded-xl border border-ink/12 px-[18px] py-4"
                  >
                    <Link
                      href={item.path}
className="block text-lg text-ink no-underline"
                    >
                      {item.title}
                    </Link>
                    {(() => {
                      const empKey = employmentTypeLabelKey(item.employmentType);
                      const empLabel = empKey ? t(locale, empKey) : null;
                      if (!item.companyName && !empLabel) return null;
                      return (
                        <div
className="mt-1.5 font-mono text-xs text-ink-muted"
                        >
                          {item.companyName && item.companySlug ? (
                            <Link
                              href={publicCompanyPath(item.companySlug)}
                              className="text-ink-muted"
                            >
                              {item.companyName}
                            </Link>
                          ) : item.companyName ? (
                            <span>{item.companyName}</span>
                          ) : null}
                          {item.companyName && empLabel ? ' · ' : null}
                          {empLabel}
                        </div>
                      );
                    })()}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 ? (
            <nav
              aria-label={t(locale, 'publicVacancy.indexPagination')}
className="mt-5 flex flex-wrap items-center justify-between gap-3"
            >
              {page > 1 ? (
                <Link href={hrefForPage(page - 1)} className="inline-flex min-h-touch items-center text-brand-500">
                  {t(locale, 'publicVacancy.indexPrev')}
                </Link>
              ) : (
                <span className="text-ink-faint">{t(locale, 'publicVacancy.indexPrev')}</span>
              )}
              <span className="font-mono text-xs text-ink-muted">
                {t(locale, 'publicVacancy.indexPageOf', { page: String(page), pages: String(totalPages) })}
              </span>
              {page < totalPages ? (
                <Link href={hrefForPage(page + 1)} className="inline-flex min-h-touch items-center text-brand-500">
                  {t(locale, 'publicVacancy.indexNext')}
                </Link>
              ) : (
                <span className="text-ink-faint">{t(locale, 'publicVacancy.indexNext')}</span>
              )}
            </nav>
          ) : null}
        </main>

        {showJobAlert ? (
        <section className={cn(SC.card, 'mt-4')}>
          <h2 className="mb-2 mt-0 text-lg font-semibold">
            {t(locale, 'publicVacancy.alertTitle')}
          </h2>
          <p className="mb-3.5 mt-0 text-sm leading-[1.55] text-ink-muted">
            {t(locale, 'publicVacancy.alertIntro')}
          </p>
          {alertStatus === 'ok' ? (
            <p className="m-0 text-sm text-success">
              {t(locale, 'publicVacancy.alertSuccess')}
            </p>
          ) : (
            <form
              onSubmit={submitJobAlert}
              className="flex flex-col gap-3"
            >
              <FormField label={t(locale, 'publicVacancy.alertNameLabel')}>
                <input
                  type="text"
                  name="name"
                  value={alertName}
                  onChange={(ev) => setAlertName(ev.target.value)}
                  placeholder={t(locale, 'publicVacancy.alertNamePlaceholder')}
                  className={SC.input}
                  autoComplete="name"
                />
              </FormField>
              <FormField label={t(locale, 'publicVacancy.alertEmailLabel')}>
                <input
                  type="email"
                  name="email"
                  required
                  value={alertEmail}
                  onChange={(ev) => setAlertEmail(ev.target.value)}
                  placeholder={t(locale, 'publicVacancy.alertEmailPlaceholder')}
                  className={SC.input}
                  autoComplete="email"
                />
              </FormField>
              {alertStatus === 'err' ? (
                <p className="m-0 text-prose text-danger">
                  {t(locale, 'publicVacancy.alertError')}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={alertStatus === 'loading'}
                className={cn(
                  'min-h-[44px] self-start rounded-control border-none bg-brand-500 px-5 font-display text-base text-white',
                  alertStatus === 'loading' ? 'cursor-default opacity-70' : 'cursor-pointer'
                )}
              >
                {alertStatus === 'loading'
                  ? t(locale, 'publicVacancy.alertSubmitting')
                  : t(locale, 'publicVacancy.alertSubmit')}
              </button>
            </form>
          )}
        </section>
        ) : null}
      </div>
    </div>
  );
}

/** Public company page `/companies/{slug}` (perfil da empresa). */
export function PublicCompanyPageView({ locale = 'pt-BR', company, items = [], total = 0 }) {
  const name = company?.name || t(locale, 'publicVacancy.companyFallback');
  const website = String(company?.website || '').trim();
  const aboutHtml = company?.aboutHtml || '';
  const logoUrl = String(company?.logoUrl || '').trim();
  const openCount = Number(total) > 0 ? Number(total) : items.length;

  return (
    <div className={SC.shell}>
      <div className={SC.glow} aria-hidden />
      <div className={SC.wrap}>
        <nav className="mb-4 font-mono text-xs text-ink-muted" aria-label={t(locale, 'publicVacancy.breadcrumbAria')}>
          <Link href="/jobs" className="text-ink-muted no-underline hover:text-brand-500">
            {t(locale, 'publicVacancy.browseOpenCta')}
          </Link>
          <span className="mx-1.5 text-ink-faint" aria-hidden>
            /
          </span>
          <span className="text-ink">{name}</span>
        </nav>

        <header className="relative mb-6 overflow-hidden rounded-2xl border border-ink/10 bg-gradient-to-br from-brand-500/[0.12] via-ink/[0.03] to-transparent px-5 py-6 sm:px-7 sm:py-8">
          <div className="flex flex-wrap items-center gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                width={72}
                height={72}
                className="h-[72px] w-[72px] shrink-0 rounded-control bg-white/80 object-contain p-1.5 shadow-sm"
              />
            ) : (
              <img
                src={brandMarkSrc(72)}
                alt=""
                width={56}
                height={56}
                className="shrink-0 rounded-control bg-white/70 p-2"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="mb-1 mt-0 font-mono text-2xs uppercase tracking-[0.14em] text-ink-label">
                {t(locale, 'publicVacancy.companyCareersEyebrow')}
              </p>
              <h1 className="m-0 break-words font-display text-[clamp(1.625rem,4vw,2.25rem)] font-semibold leading-snug text-ink">
                {name}
              </h1>
              <p className="mb-0 mt-2 text-sm text-ink-muted">
                {t(locale, 'publicVacancy.companyOpenCount', { n: openCount })}
                {website ? (
                  <>
                    {' · '}
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-500 no-underline hover:underline"
                    >
                      {t(locale, 'publicVacancy.companySite')}
                    </a>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          {items.length > 0 ? (
            <p className="mb-0 mt-5">
              <a href="#company-open-roles" className={cn(SC.btnPrimary, 'inline-flex no-underline')}>
                {t(locale, 'publicVacancy.companySeeRolesCta')}
              </a>
            </p>
          ) : null}
        </header>

        {!isRichTextEmpty(aboutHtml) ? (
          <section className={cn(SC.card, 'mb-4')}>
            <h2 className="mb-3 mt-0 text-base font-semibold">
              {t(locale, 'publicVacancy.aboutCompany', { name })}
            </h2>
            <RichTextView html={aboutHtml} />
          </section>
        ) : null}

        <main id="company-open-roles" className={SC.card}>
          <h2 className="mb-3.5 mt-0 text-base font-semibold">
            {t(locale, 'publicVacancy.companyOpenRoles')}
          </h2>
          {!items.length ? (
            <p className="m-0 text-ink-muted">{t(locale, 'publicVacancy.companyNoOpenRoles')}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {items.map((item) => {
                const empKey = employmentTypeLabelKey(item.employmentType);
                const workplaceLabel = formatWorkplaceLabel(
                  {
                    workplaceModality: item.workplaceModality,
                    workplaceCity: item.workplaceCity,
                    workplaceState: item.workplaceState,
                  },
                  locale,
                  t
                );
                const salary =
                  item.showSalary && (item.salaryMin || item.salaryMax)
                    ? formatVacancySalaryRangeDisplay(item.salaryMin, item.salaryMax)
                    : null;
                const target =
                  item.targetDate
                    ? t(locale, 'publicVacancy.targetDateLabel') +
                      ': ' +
                      String(item.targetDate).slice(0, 10)
                    : null;
                const meta = [empKey ? t(locale, empKey) : null, workplaceLabel, salary, target]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li key={item.vacancyId}>
                    <Link
                      href={item.path}
                      className="block rounded-xl border border-ink/12 px-[18px] py-4 text-ink no-underline transition-colors hover:border-brand-500/30 hover:bg-brand-500/[0.03]"
                    >
                      <span className="block text-lg font-medium">{item.title}</span>
                      {meta ? (
                        <span className="mt-1.5 block font-mono text-xs text-ink-muted">{meta}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {total > items.length ? (
            <p className="mb-0 mt-3.5 text-xs text-ink-muted">
              <Link href="/jobs" className="text-brand-500">
                {t(locale, 'publicVacancy.seeAllOpen')}
              </Link>
            </p>
          ) : null}
        </main>
      </div>
    </div>
  );
}
