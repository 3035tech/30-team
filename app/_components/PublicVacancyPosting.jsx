'use client';

import Link from 'next/link';
import { RichTextView } from './RichTextView';
import { isRichTextEmpty } from '../../lib/sanitize-html';
import { t } from '../../lib/i18n';
import { C, FONTS, GRADIENT, RADIAL_GLOW, SHADOW } from '../../lib/theme';
import { brandMarkSrc } from '../../lib/brand';
import { employmentTypeLabelKey } from '../../lib/vacancy-employment-type';
import { formatVacancySalaryRangeDisplay } from '../../lib/br-masks';
import { PublicVacancyShareBar } from './PublicVacancyShareBar';
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

const shell = {
  minHeight: '100vh',
  background: C.bg,
  fontFamily: FONTS.serif,
  color: C.text,
  position: 'relative',
  boxSizing: 'border-box',
};

const glow = {
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  background: RADIAL_GLOW,
};

const wrap = {
  position: 'relative',
  zIndex: 1,
  maxWidth: '760px',
  margin: '0 auto',
  padding: '40px 20px 64px',
};

const card = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: '20px',
  padding: '36px 40px',
  boxShadow: SHADOW.cardElevated,
  boxSizing: 'border-box',
};

function MetaChip({ children }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '11px',
        fontFamily: FONTS.mono,
        letterSpacing: '0.04em',
        color: C.muted,
        border: `1px solid ${C.border}`,
        borderRadius: '999px',
        padding: '6px 12px',
        background: C.inputBg,
      }}
    >
      {children}
    </span>
  );
}

function RelatedVacanciesList({ locale, items, heading }) {
  if (!items?.length) return null;
  return (
    <section aria-labelledby="public-related-heading" style={{ marginTop: '28px' }}>
      <h2
        id="public-related-heading"
        style={{
          margin: '0 0 14px',
          fontSize: '18px',
          fontWeight: 'normal',
          fontFamily: FONTS.serif,
        }}
      >
        {heading}
      </h2>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {items.map((item) => (
          <li key={item.vacancyId}>
            <Link
              href={item.path}
              style={{
                display: 'block',
                textDecoration: 'none',
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: '12px',
                padding: '14px 16px',
                background: C.surface,
              }}
            >
              <span style={{ display: 'block', fontSize: '16px', lineHeight: 1.35 }}>
                {item.title}
              </span>
              {item.companyName ? (
                <span
                  style={{
                    display: 'block',
                    marginTop: '4px',
                    fontSize: '12px',
                    fontFamily: FONTS.mono,
                    color: C.muted,
                  }}
                >
                  {item.companyName}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      <p style={{ margin: '16px 0 0' }}>
        <Link
          href="/j"
          style={{ color: C.purple, fontSize: '14px', fontFamily: FONTS.mono }}
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
  const salary =
    posting?.showSalary && (posting.salaryMin || posting.salaryMax)
      ? formatVacancySalaryRangeDisplay(posting.salaryMin, posting.salaryMax)
      : null;
  const companyName = posting?.showCompany ? posting.company?.name : null;
  const companyWebsite = posting?.showCompany ? posting.company?.website : null;
  const companyAbout = posting?.showCompany ? posting.company?.aboutHtml : '';
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
    <div style={shell}>
      <div style={glow} aria-hidden />
      <div style={wrap}>
        <header style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={brandMarkSrc(64)} alt="" width={40} height={40} />
          <span
            style={{
              fontSize: '11px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontFamily: FONTS.mono,
              color: C.faint,
            }}
          >
            30Team
          </span>
        </header>

        <article style={card}>
          {closed ? (
            <>
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: '11px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontFamily: FONTS.mono,
                  color: C.warning,
                }}
              >
                {closedReason === 'expired'
                  ? t(locale, 'publicVacancy.expiredBadge')
                  : t(locale, 'publicVacancy.closedBadge')}
              </p>
              <h1
                style={{
                  margin: '0 0 12px',
                  fontSize: 'clamp(26px, 5vw, 36px)',
                  fontWeight: 'normal',
                  lineHeight: 1.2,
                  background: GRADIENT.title,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {t(locale, 'publicVacancy.closedTitle')}
              </h1>
              <p style={{ margin: '0 0 8px', fontSize: '16px', color: C.muted, lineHeight: 1.65 }}>
                {closedReason === 'expired'
                  ? t(locale, 'publicVacancy.expiredThanks', {
                      title: posting?.title || t(locale, 'publicVacancy.thisRole'),
                    })
                  : t(locale, 'publicVacancy.closedThanks', {
                      title: posting?.title || t(locale, 'publicVacancy.thisRole'),
                    })}
              </p>
              <p style={{ margin: '0 0 20px', fontSize: '15px', color: C.muted, lineHeight: 1.65 }}>
                {t(locale, 'publicVacancy.closedMessage')}
              </p>
              {posting?.title ? (
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '13px',
                    fontFamily: FONTS.mono,
                    color: C.faint,
                  }}
                >
                  {t(locale, 'publicVacancy.closedWas')}:{' '}
                  <strong style={{ color: C.text }}>{posting.title}</strong>
                  {companyName ? ` · ${companyName}` : ''}
                </p>
              ) : null}
              <p style={{ margin: '20px 0 0' }}>
                <Link
                  href="/j"
                  style={{
                    display: 'inline-block',
                    background: GRADIENT.primaryBtn(C.purple, C.purpleDark),
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: '10px',
                    padding: '14px 28px',
                    fontSize: '14px',
                    fontFamily: FONTS.serif,
                  }}
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
                {companyName ? (
                  <p
                    style={{
                      margin: '0 0 10px',
                      fontSize: '12px',
                      fontFamily: FONTS.mono,
                      color: C.muted,
                      letterSpacing: '0.02em',
                    }}
                  >
                    <span>{companyName}</span>
                    {companyWebsite ? (
                      <>
                        {' · '}
                        <a
                          href={companyWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: C.purple }}
                        >
                          {t(locale, 'publicVacancy.companySite')}
                        </a>
                      </>
                    ) : null}
                  </p>
                ) : null}
                <h1
                  style={{
                    margin: '0 0 14px',
                    fontSize: 'clamp(28px, 5vw, 40px)',
                    fontWeight: 'normal',
                    lineHeight: 1.15,
                    background: GRADIENT.title,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {posting.title}
                </h1>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '22px' }}>
                  {empKey ? <MetaChip>{t(locale, empKey)}</MetaChip> : null}
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
                    style={{
                      margin: '0 0 12px',
                      fontSize: '18px',
                      fontWeight: 'normal',
                      fontFamily: FONTS.serif,
                    }}
                  >
                    {t(locale, 'publicVacancy.descriptionHeading')}
                  </h2>
                  <div>
                    <RichTextView
                      html={posting.description}
                      style={{ fontSize: '15px', lineHeight: 1.7, color: C.text }}
                    />
                  </div>
                </section>
              ) : (
                <p style={{ margin: 0, color: C.muted, fontStyle: 'italic' }}>
                  {t(locale, 'publicVacancy.noDescription')}
                </p>
              )}

              {companyAbout && !isRichTextEmpty(companyAbout) ? (
                <section
                  aria-labelledby="public-company-heading"
                  style={{
                    marginTop: '28px',
                    paddingTop: '22px',
                    borderTop: `1px solid ${C.border}`,
                  }}
                >
                  <h2
                    id="public-company-heading"
                    style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 'normal' }}
                  >
                    {t(locale, 'publicVacancy.aboutCompany', {
                      name: companyName || t(locale, 'publicVacancy.companyFallback'),
                    })}
                  </h2>
                  <RichTextView
                    html={companyAbout}
                    style={{ fontSize: '14px', lineHeight: 1.65, color: C.muted }}
                  />
                </section>
              ) : null}

              <footer style={{ marginTop: '32px' }}>
                {canApply ? (
                  <a
                    href={posting.applyPath}
                    onClick={onApplyClick}
                    style={{
                      display: 'inline-block',
                      background: GRADIENT.primaryBtn(C.purple, C.purpleDark),
                      color: '#fff',
                      textDecoration: 'none',
                      borderRadius: '10px',
                      padding: '14px 28px',
                      fontSize: '14px',
                      fontFamily: FONTS.serif,
                    }}
                  >
                    {t(locale, 'publicVacancy.applyCta')}
                  </a>
                ) : (
                  <p style={{ margin: 0, fontSize: '14px', color: C.muted }}>
                    {t(locale, 'publicVacancy.applyUnavailable')}
                  </p>
                )}
                <PublicVacancyShareBar locale={locale} posting={posting} />
                <p style={{ margin: '16px 0 0', fontSize: '12px', fontFamily: FONTS.mono }}>
                  <Link href="/j" style={{ color: C.purple }}>
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

/** Listagem /j — busca + filtro tipo + paginação (GET). */
export function PublicVacanciesIndexView({
  locale = 'pt-BR',
  items = [],
  total = 0,
  page = 1,
  pageSize = 12,
  filters = {},
}) {
  const q = String(filters.q || '');
  const employmentType = String(filters.employmentType || '');
  const totalPages = Math.max(1, Math.ceil(Number(total) / Math.max(1, pageSize)));
  const hasFilters = Boolean(q || employmentType);
  const emptyMsg = hasFilters
    ? t(locale, 'publicVacancy.indexEmptyFiltered')
    : t(locale, 'publicVacancy.indexEmpty');

  function hrefForPage(p) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (employmentType) params.set('employmentType', employmentType);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/j?${qs}` : '/j';
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: '10px',
    border: `1px solid ${C.border}`,
    background: C.bg,
    color: C.text,
    fontFamily: FONTS.serif,
    fontSize: '15px',
  };

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
    <div style={shell}>
      <div style={glow} aria-hidden />
      <div style={wrap}>
        <header style={{ marginBottom: '24px' }}>
          <img src={brandMarkSrc(64)} alt="" width={40} height={40} style={{ marginBottom: '12px' }} />
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(28px, 5vw, 40px)',
              fontWeight: 'normal',
              background: GRADIENT.title,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t(locale, 'publicVacancy.indexTitle')}
          </h1>
          <p style={{ margin: '10px 0 0', color: C.muted, fontSize: '15px', lineHeight: 1.6 }}>
            {t(locale, 'publicVacancy.indexIntro')}
          </p>
        </header>

        <form
          method="get"
          action="/j"
          style={{
            ...card,
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <label style={{ display: 'block' }}>
            <span
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '12px',
                fontFamily: FONTS.mono,
                color: C.muted,
              }}
            >
              {t(locale, 'publicVacancy.indexSearchLabel')}
            </span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t(locale, 'publicVacancy.indexSearchPlaceholder')}
              style={inputStyle}
              autoComplete="off"
            />
          </label>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'flex-end',
            }}
          >
            <label style={{ flex: '1 1 180px', minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '12px',
                  fontFamily: FONTS.mono,
                  color: C.muted,
                }}
              >
                {t(locale, 'publicVacancy.indexEmploymentLabel')}
              </span>
              <select name="employmentType" defaultValue={employmentType} style={inputStyle}>
                <option value="">{t(locale, 'publicVacancy.indexEmploymentAll')}</option>
                <option value="clt">{t(locale, 'recruiting.employmentType_clt')}</option>
                <option value="pj">{t(locale, 'recruiting.employmentType_pj')}</option>
                <option value="internship">{t(locale, 'recruiting.employmentType_internship')}</option>
                <option value="cooperative">{t(locale, 'recruiting.employmentType_cooperative')}</option>
              </select>
            </label>
            <button
              type="submit"
              style={{
                flex: '0 0 auto',
                minHeight: '44px',
                padding: '0 20px',
                borderRadius: '10px',
                border: 'none',
                background: C.purple,
                color: '#fff',
                fontFamily: FONTS.serif,
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              {t(locale, 'publicVacancy.indexSearchSubmit')}
            </button>
            {hasFilters ? (
              <Link
                href="/j"
                style={{
                  flex: '0 0 auto',
                  minHeight: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0 14px',
                  color: C.muted,
                  fontSize: '14px',
                }}
              >
                {t(locale, 'publicVacancy.indexClearFilters')}
              </Link>
            ) : null}
          </div>
        </form>

        <main style={card}>
          {total > 0 ? (
            <p
              style={{
                margin: '0 0 14px',
                fontSize: '12px',
                fontFamily: FONTS.mono,
                color: C.muted,
              }}
            >
              {t(locale, 'publicVacancy.indexResultCount', { count: String(total) })}
            </p>
          ) : null}
          {!items.length ? (
            <p style={{ margin: 0, color: C.muted }}>{emptyMsg}</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {items.map((item) => (
                <li key={item.vacancyId}>
                  <div
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: '12px',
                      padding: '16px 18px',
                    }}
                  >
                    <Link
                      href={item.path}
                      style={{
                        display: 'block',
                        textDecoration: 'none',
                        color: C.text,
                        fontSize: '17px',
                      }}
                    >
                      {item.title}
                    </Link>
                    {(() => {
                      const empKey = employmentTypeLabelKey(item.employmentType);
                      const empLabel = empKey ? t(locale, empKey) : null;
                      if (!item.companyName && !empLabel) return null;
                      return (
                        <div
                          style={{
                            marginTop: '6px',
                            fontSize: '12px',
                            fontFamily: FONTS.mono,
                            color: C.muted,
                          }}
                        >
                          {item.companyName && item.companySlug ? (
                            <Link
                              href={publicCompanyPath(item.companySlug)}
                              style={{ color: C.muted }}
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
              style={{
                marginTop: '20px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {page > 1 ? (
                <Link href={hrefForPage(page - 1)} style={{ color: C.purple, minHeight: '40px', display: 'inline-flex', alignItems: 'center' }}>
                  {t(locale, 'publicVacancy.indexPrev')}
                </Link>
              ) : (
                <span style={{ color: C.faint }}>{t(locale, 'publicVacancy.indexPrev')}</span>
              )}
              <span style={{ fontSize: '12px', fontFamily: FONTS.mono, color: C.muted }}>
                {t(locale, 'publicVacancy.indexPageOf', { page: String(page), pages: String(totalPages) })}
              </span>
              {page < totalPages ? (
                <Link href={hrefForPage(page + 1)} style={{ color: C.purple, minHeight: '40px', display: 'inline-flex', alignItems: 'center' }}>
                  {t(locale, 'publicVacancy.indexNext')}
                </Link>
              ) : (
                <span style={{ color: C.faint }}>{t(locale, 'publicVacancy.indexNext')}</span>
              )}
            </nav>
          ) : null}
        </main>

        <section style={{ ...card, marginTop: '16px' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}>
            {t(locale, 'publicVacancy.alertTitle')}
          </h2>
          <p style={{ margin: '0 0 14px', color: C.muted, fontSize: '14px', lineHeight: 1.55 }}>
            {t(locale, 'publicVacancy.alertIntro')}
          </p>
          {alertStatus === 'ok' ? (
            <p style={{ margin: 0, color: C.synergy, fontSize: '14px' }}>
              {t(locale, 'publicVacancy.alertSuccess')}
            </p>
          ) : (
            <form
              onSubmit={submitJobAlert}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <label style={{ display: 'block' }}>
                <span
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '12px',
                    fontFamily: FONTS.mono,
                    color: C.muted,
                  }}
                >
                  {t(locale, 'publicVacancy.alertNameLabel')}
                </span>
                <input
                  type="text"
                  name="name"
                  value={alertName}
                  onChange={(ev) => setAlertName(ev.target.value)}
                  placeholder={t(locale, 'publicVacancy.alertNamePlaceholder')}
                  style={inputStyle}
                  autoComplete="name"
                />
              </label>
              <label style={{ display: 'block' }}>
                <span
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '12px',
                    fontFamily: FONTS.mono,
                    color: C.muted,
                  }}
                >
                  {t(locale, 'publicVacancy.alertEmailLabel')}
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  value={alertEmail}
                  onChange={(ev) => setAlertEmail(ev.target.value)}
                  placeholder={t(locale, 'publicVacancy.alertEmailPlaceholder')}
                  style={inputStyle}
                  autoComplete="email"
                />
              </label>
              {alertStatus === 'err' ? (
                <p style={{ margin: 0, color: C.tension, fontSize: '13px' }}>
                  {t(locale, 'publicVacancy.alertError')}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={alertStatus === 'loading'}
                style={{
                  alignSelf: 'flex-start',
                  minHeight: '44px',
                  padding: '0 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: C.purple,
                  color: '#fff',
                  fontFamily: FONTS.serif,
                  fontSize: '15px',
                  cursor: alertStatus === 'loading' ? 'default' : 'pointer',
                  opacity: alertStatus === 'loading' ? 0.7 : 1,
                }}
              >
                {alertStatus === 'loading'
                  ? t(locale, 'publicVacancy.alertSubmitting')
                  : t(locale, 'publicVacancy.alertSubmit')}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

/** Página pública `/c/{slug}` (perfil da empresa). */
export function PublicCompanyPageView({ locale = 'pt-BR', company, items = [], total = 0 }) {
  const name = company?.name || t(locale, 'publicVacancy.companyFallback');
  const website = String(company?.website || '').trim();
  const aboutHtml = company?.aboutHtml || '';

  return (
    <div style={shell}>
      <div style={glow} aria-hidden />
      <div style={wrap}>
        <header style={{ marginBottom: '24px' }}>
          <img src={brandMarkSrc(64)} alt="" width={40} height={40} style={{ marginBottom: '12px' }} />
          <p style={{ margin: '0 0 8px', fontSize: '12px', fontFamily: FONTS.mono }}>
            <Link href="/j" style={{ color: C.muted }}>
              {t(locale, 'publicVacancy.browseOpenCta')}
            </Link>
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(28px, 5vw, 40px)',
              fontWeight: 'normal',
              background: GRADIENT.title,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {name}
          </h1>
          {website ? (
            <p style={{ margin: '10px 0 0', fontSize: '14px' }}>
              <a href={website} target="_blank" rel="noopener noreferrer" style={{ color: C.purple }}>
                {t(locale, 'publicVacancy.companySite')}
              </a>
            </p>
          ) : null}
        </header>

        {!isRichTextEmpty(aboutHtml) ? (
          <section style={{ ...card, marginBottom: '16px' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 600 }}>
              {t(locale, 'publicVacancy.aboutCompany', { name })}
            </h2>
            <RichTextView html={aboutHtml} />
          </section>
        ) : null}

        <main style={card}>
          <h2 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 600 }}>
            {t(locale, 'publicVacancy.companyOpenRoles')}
          </h2>
          {!items.length ? (
            <p style={{ margin: 0, color: C.muted }}>{t(locale, 'publicVacancy.companyNoOpenRoles')}</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {items.map((item) => (
                <li key={item.vacancyId}>
                  <Link
                    href={item.path}
                    style={{
                      display: 'block',
                      textDecoration: 'none',
                      color: C.text,
                      border: `1px solid ${C.border}`,
                      borderRadius: '12px',
                      padding: '16px 18px',
                    }}
                  >
                    <span style={{ fontSize: '17px', display: 'block' }}>{item.title}</span>
                    {(() => {
                      const empKey = employmentTypeLabelKey(item.employmentType);
                      if (!empKey) return null;
                      return (
                        <span
                          style={{
                            display: 'block',
                            marginTop: '6px',
                            fontSize: '12px',
                            fontFamily: FONTS.mono,
                            color: C.muted,
                          }}
                        >
                          {t(locale, empKey)}
                        </span>
                      );
                    })()}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {total > items.length ? (
            <p style={{ margin: '14px 0 0', fontSize: '12px', color: C.muted }}>
              <Link href="/j" style={{ color: C.purple }}>
                {t(locale, 'publicVacancy.seeAllOpen')}
              </Link>
            </p>
          ) : null}
        </main>
      </div>
    </div>
  );
}
