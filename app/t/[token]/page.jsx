'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AssessmentFlow from '../../_components/AssessmentFlow';

export default function CompanyTokenEntryPage() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';
  const [state, setState] = useState({ loading: true, error: '', company: null });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const t = String(token || '').trim();
      if (!t) {
        if (!cancelled) setState({ loading: false, error: 'Link inválido.', company: null });
        return;
      }
      try {
        const res = await fetch(`/api/public/company-link?token=${encodeURIComponent(t)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Link inválido ou expirado.');
        if (!cancelled) setState({ loading: false, error: '', company: data });
      } catch (e) {
        if (!cancelled) setState({ loading: false, error: e?.message || 'Erro', company: null });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.loading) {
    return <AssessmentFlow companyToken={token || ''} notice={{ kind: 'info', title: 'Carregando…', message: 'Validando o link da empresa.' }} startDisabled={true} />;
  }
  if (state.error) {
    return <AssessmentFlow companyToken={token || ''} notice={{ kind: 'warning', title: 'Não foi possível abrir', message: state.error }} startDisabled={true} />;
  }

  const c = state.company;
  const notice = c?.name
    ? { kind: 'info', title: 'Empresa', message: `Você está respondendo pela empresa: ${c.name}` }
    : { kind: 'info', title: 'Link válido', message: 'Você pode iniciar o formulário.' };

  return <AssessmentFlow companyToken={token || ''} notice={notice} />;
}

