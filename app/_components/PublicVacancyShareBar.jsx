'use client';

import { useState } from 'react';
import { t } from '../../lib/i18n';
import { C, FONTS } from '../../lib/theme';
import { buildJobShareCopy } from '../../lib/job-share-copy';
import { employmentTypeLabelKey } from '../../lib/vacancy-employment-type';

const btn = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '40px',
  padding: '8px 14px',
  borderRadius: '10px',
  fontSize: '12px',
  fontFamily: FONTS.mono,
  cursor: 'pointer',
  textDecoration: 'none',
  boxSizing: 'border-box',
};

/**
 * Share WhatsApp / LinkedIn / copy — URLs com UTM.
 */
export function PublicVacancyShareBar({ locale = 'pt-BR', posting }) {
  const [copied, setCopied] = useState(false);
  if (!posting?.pageUrl && !posting?.title) return null;

  const pageUrlRaw = String(posting.pageUrl || '').trim();
  const pageUrlAbs =
    pageUrlRaw.startsWith('http')
      ? pageUrlRaw
      : typeof window !== 'undefined'
        ? `${window.location.origin}${pageUrlRaw.startsWith('/') ? '' : '/'}${pageUrlRaw}`
        : pageUrlRaw;

  const empKey = employmentTypeLabelKey(posting.employmentType);
  const share = buildJobShareCopy(
    {
      title: posting.title,
      companyName: posting.showCompany ? posting.company?.name : null,
      pageUrl: pageUrlAbs || pageUrlRaw,
      employmentLabel: empKey ? t(locale, empKey) : null,
    },
    locale
  );

  const copyLink = async () => {
    const text = share.pageUrl || '';
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      style={{
        marginTop: '20px',
        paddingTop: '18px',
        borderTop: `1px solid ${C.border}`,
      }}
      aria-label={t(locale, 'publicVacancy.shareAria')}
    >
      <p
        style={{
          margin: '0 0 10px',
          fontSize: '11px',
          fontFamily: FONTS.mono,
          color: C.faint,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {t(locale, 'publicVacancy.shareHeading')}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {share.whatsappShareHref ? (
          <a
            href={share.whatsappShareHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...btn,
              background: `${C.synergy}18`,
              border: `1px solid ${C.synergy}55`,
              color: C.synergy,
            }}
          >
            {t(locale, 'publicVacancy.shareWhatsapp')}
          </a>
        ) : null}
        {share.linkedinShareHref ? (
          <a
            href={share.linkedinShareHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...btn,
              background: `${C.purple}12`,
              border: `1px solid ${C.purple}44`,
              color: C.purple,
            }}
          >
            {t(locale, 'publicVacancy.shareLinkedin')}
          </a>
        ) : null}
        <button
          type="button"
          onClick={copyLink}
          disabled={!share.pageUrl}
          style={{
            ...btn,
            background: 'transparent',
            border: `1px solid ${C.border}`,
            color: C.muted,
            opacity: share.pageUrl ? 1 : 0.5,
          }}
        >
          {copied ? t(locale, 'publicVacancy.shareCopied') : t(locale, 'publicVacancy.shareCopy')}
        </button>
      </div>
    </div>
  );
}
