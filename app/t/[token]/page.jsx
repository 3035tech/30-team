'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AssessmentFlow from '../../_components/AssessmentFlow';
import { errorMessage, t } from '../../../lib/i18n';
import { useLocale } from '../../../lib/useLocale';

export default function CompanyTokenEntryPage() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';
  const [state, setState] = useState({ loading: true, error: '', company: null });
  const [locale] = useLocale();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const tokenValue = String(token || '').trim();
      if (!tokenValue) {
        if (!cancelled) setState({ loading: false, error: t(locale, 'publicPages.invalidLink'), company: null });
        return;
      }
      try {
        const res = await fetch(`/api/public/company-link?token=${encodeURIComponent(tokenValue)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.errorCode ? errorMessage(locale, data.errorCode, data.error) : data?.error || t(locale, 'errors.EXPIRED_LINK'));
        if (!cancelled) setState({ loading: false, error: '', company: data });
      } catch (e) {
        if (!cancelled) setState({ loading: false, error: e?.message || t(locale, 'errors.INTERNAL'), company: null });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token, locale]);

  if (state.loading) {
    return (
      <AssessmentFlow
        companyToken={token || ''}
        notice={{ kind: 'info', title: t(locale, 'publicPages.loadingCompanyTitle'), message: t(locale, 'publicPages.loadingCompanyMessage') }}
        startDisabled={true}
        initialLocale={locale}
      />
    );
  }
  if (state.error) {
    return (
      <AssessmentFlow
        companyToken={token || ''}
        notice={{ kind: 'warning', title: t(locale, 'publicPages.invalidOpenTitle'), message: state.error }}
        startDisabled={true}
        initialLocale={locale}
      />
    );
  }

  const c = state.company;
  const notice = c?.name
    ? { kind: 'info', title: t(locale, 'publicPages.companyTitle'), message: t(locale, 'publicPages.companyMessage', { name: c.name }) }
    : { kind: 'info', title: t(locale, 'publicPages.validLinkTitle'), message: t(locale, 'publicPages.validLinkMessage') };

  return <AssessmentFlow companyToken={token || ''} notice={notice} requireCandidateEmail={!!c?.requireCandidateEmail} initialLocale={locale} />;
}

