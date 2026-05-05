'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import AssessmentFlow from '../../_components/AssessmentFlow';
import { errorMessage, t } from '../../../lib/i18n';
import { useLocale } from '../../../lib/useLocale';

function VacancyEntryInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';
  const inviteToken = String(searchParams?.get('invite') || '').trim();
  const [state, setState] = useState({ loading: true, error: '', vacancy: null });
  const [locale] = useLocale();

  useEffect(() => {
    if (!inviteToken) return;
    (async () => {
      try {
        await fetch(`/api/public/invite-track?token=${encodeURIComponent(inviteToken)}`);
      } catch {
        /* best-effort */
      }
    })();
  }, [inviteToken]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const tokenValue = String(token || '').trim();
      if (!tokenValue) {
        if (!cancelled) setState({ loading: false, error: t(locale, 'publicPages.invalidLink'), vacancy: null });
        return;
      }
      try {
        const res = await fetch(`/api/public/vacancy-link?token=${encodeURIComponent(tokenValue)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            data?.errorCode ? errorMessage(locale, data.errorCode, data.error) : data?.error || t(locale, 'errors.EXPIRED_LINK')
          );
        }
        if (!cancelled) setState({ loading: false, error: '', vacancy: data });
      } catch (e) {
        if (!cancelled) setState({ loading: false, error: e?.message || t(locale, 'errors.INTERNAL'), vacancy: null });
      }
    };
    run();
    return () => { cancelled = true; };
  }, [token, locale]);

  if (state.loading) {
    return (
      <AssessmentFlow
        vacancyToken={token || ''}
        inviteToken={inviteToken}
        notice={{ kind: 'info', title: t(locale, 'publicPages.loadingVacancyTitle'), message: t(locale, 'publicPages.loadingVacancyMessage') }}
        initialLocale={locale}
      />
    );
  }
  if (state.error) {
    return (
      <AssessmentFlow
        vacancyToken={token || ''}
        inviteToken={inviteToken}
        notice={{ kind: 'warning', title: t(locale, 'publicPages.invalidOpenTitle'), message: state.error }}
        startDisabled={true}
        initialLocale={locale}
      />
    );
  }

  const v = state.vacancy;
  const isClosed = String(v?.status || '') === 'closed';
  const notice = isClosed
    ? { kind: 'warning', title: t(locale, 'publicPages.vacancyClosedTitle'), message: t(locale, 'publicPages.vacancyClosedMessage') }
    : {
        kind: 'info',
        title: t(locale, 'publicPages.vacancyTitle'),
        message: v?.title ? t(locale, 'publicPages.vacancyMessage', { title: v.title }) : t(locale, 'publicPages.validLinkMessage'),
      };

  return (
    <AssessmentFlow
      vacancyToken={token || ''}
      inviteToken={inviteToken}
      notice={notice}
      startDisabled={isClosed}
      requireCandidateEmail={true}
      initialLocale={locale}
    />
  );
}

export default function VacancyTokenEntryPage() {
  const [locale] = useLocale();
  return (
    <Suspense
      fallback={
        <AssessmentFlow
          vacancyToken=""
          notice={{ kind: 'info', title: t(locale, 'publicPages.loadingVacancyTitle'), message: t(locale, 'publicPages.loadingVacancyMessage') }}
          initialLocale={locale}
        />
      }
    >
      <VacancyEntryInner />
    </Suspense>
  );
}
