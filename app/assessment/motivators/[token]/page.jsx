'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import MotivatorsFlow from '../../../_components/MotivatorsFlow';

function MotivatorsEntryInner() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';
  const [state, setState] = useState({ loading: true, error: '', invite: null });

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/ae-invite-track?token=${encodeURIComponent(token)}`).catch(() => {});
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = String(token || '').trim();
      if (!t) {
        if (!cancelled) setState({ loading: false, error: 'Link inválido.', invite: null });
        return;
      }
      try {
        const res = await fetch(`/api/public/ae-invite?token=${encodeURIComponent(t)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Convite inválido.');
        if (!cancelled) setState({ loading: false, error: '', invite: data });
      } catch (e) {
        if (!cancelled) setState({ loading: false, error: e.message || 'Erro', invite: null });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (state.loading) {
    return (
      <MotivatorsFlow
        inviteToken={token}
        notice={{ kind: 'info', title: 'Carregando', message: 'Validando seu convite…' }}
      />
    );
  }

  if (state.error || !state.invite) {
    return (
      <MotivatorsFlow
        inviteToken={token}
        notice={{ kind: 'warning', title: 'Convite indisponível', message: state.error || 'Link inválido.' }}
        startDisabled
      />
    );
  }

  return (
    <MotivatorsFlow
      inviteToken={token}
      inviteInfo={{
        candidateName: state.invite.candidateName,
        candidateEmail: state.invite.candidateEmail,
      }}
      notice={{
        kind: 'info',
        title: state.invite.definitionName || 'Motivadores Profissionais',
        message: state.invite.companyName
          ? `Convite de ${state.invite.companyName}. Use o e-mail para o qual o convite foi enviado.`
          : 'Use o e-mail para o qual o convite foi enviado.',
      }}
    />
  );
}

export default function MotivatorsTokenPage() {
  return (
    <Suspense fallback={<MotivatorsFlow inviteToken="" notice={{ kind: 'info', title: 'Carregando', message: '…' }} />}>
      <MotivatorsEntryInner />
    </Suspense>
  );
}
