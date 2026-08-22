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
          href="/vagas"
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
                  href="/vagas"
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
                  <Link href="/vagas" style={{ color: C.purple }}>
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

/** Listagem /vagas */
export function PublicVacanciesIndexView({ locale = 'pt-BR', items = [] }) {
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

        <main style={card}>
          {!items.length ? (
            <p style={{ margin: 0, color: C.muted }}>{t(locale, 'publicVacancy.indexEmpty')}</p>
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
                      const meta = [item.companyName, empKey ? t(locale, empKey) : null]
                        .filter(Boolean)
                        .join(' · ');
                      if (!meta) return null;
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
                          {meta}
                        </span>
                      );
                    })()}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}
