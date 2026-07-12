'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { t } from '../../../../lib/i18n';
import { useLocale } from '../../../../lib/useLocale';
import MotivatorsFlow from '../../../_components/MotivatorsFlow';

function MotivatorsEntryInner() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';
  const [locale] = useLocale('pt-BR');
  const [state, setState] = useState({ loading: true, error: '', invite: null });

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/ae-invite-track?token=${encodeURIComponent(token)}`).catch(() => {});
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tok = String(token || '').trim();
      if (!tok) {
        if (!cancelled) setState({ loading: false, error: t(locale, 'motivators.invalidLink'), invite: null });
        return;
      }
      try {
        const res = await fetch(`/api/public/ae-invite?token=${encodeURIComponent(tok)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || t(locale, 'motivators.invalidInvite'));
        if (!cancelled) setState({ loading: false, error: '', invite: data });
      } catch (e) {
        if (!cancelled) setState({ loading: false, error: e.message || t(locale, 'panel.common.error'), invite: null });
      }
    })();
    return () => { cancelled = true; };
  }, [token, locale]);

  if (state.loading) {
    return (
      <MotivatorsFlow
        inviteToken={token}
        initialLocale={locale}
        notice={{
          kind: 'info',
          title: t(locale, 'motivators.loadingInviteTitle'),
          message: t(locale, 'motivators.loadingInviteMessage'),
        }}
      />
    );
  }

  if (state.error || !state.invite) {
    return (
      <MotivatorsFlow
        inviteToken={token}
        initialLocale={locale}
        notice={{
          kind: 'warning',
          title: t(locale, 'motivators.inviteUnavailableTitle'),
          message: state.error || t(locale, 'motivators.invalidLink'),
        }}
        startDisabled
      />
    );
  }

  return (
    <MotivatorsFlow
      inviteToken={token}
      initialLocale={locale}
      inviteInfo={{
        candidateName: state.invite.candidateName,
        candidateEmail: state.invite.candidateEmail,
      }}
      notice={{
        kind: 'info',
        title: state.invite.definitionName || t(locale, 'motivators.title'),
        message: state.invite.companyName
          ? t(locale, 'motivators.inviteFromCompany', { name: state.invite.companyName })
          : t(locale, 'motivators.inviteEmailHint'),
      }}
    />
  );
}

export default function MotivatorsTokenPage() {
  return (
    <Suspense
      fallback={
        <MotivatorsFlow
          inviteToken=""
          notice={{ kind: 'info', title: '…', message: '…' }}
        />
      }
    >
      <MotivatorsEntryInner />
    </Suspense>
  );
}
