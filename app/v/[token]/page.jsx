'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AssessmentFlow from '../../_components/AssessmentFlow';

export default function VacancyTokenEntryPage() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';
  const [state, setState] = useState({ loading: true, error: '', vacancy: null });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const t = String(token || '').trim();
      if (!t) {
        if (!cancelled) setState({ loading: false, error: 'Link inválido.', vacancy: null });
        return;
      }
      try {
        const res = await fetch(`/api/public/vacancy-link?token=${encodeURIComponent(t)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Link inválido ou expirado.');
        if (!cancelled) setState({ loading: false, error: '', vacancy: data });
      } catch (e) {
        if (!cancelled) setState({ loading: false, error: e?.message || 'Erro' , vacancy: null });
      }
    };
    run();
    return () => { cancelled = true; };
  }, [token]);

  if (state.loading) {
    return <AssessmentFlow vacancyToken={token || ''} notice={{ kind: 'info', title: 'Carregando vaga…', message: 'Validando o link e o status da vaga.' }} />;
  }
  if (state.error) {
    return <AssessmentFlow vacancyToken={token || ''} notice={{ kind: 'warning', title: 'Não foi possível abrir', message: state.error }} startDisabled={true} />;
  }

  const v = state.vacancy;
  const isClosed = String(v?.status || '') === 'closed';
  const notice = isClosed
    ? { kind: 'warning', title: 'Vaga encerrada', message: 'Essa vaga não está mais aberta. Você pode ver o formulário, mas o RH pode não considerar novas submissões.' }
    : { kind: 'info', title: 'Vaga', message: v?.title ? `Você está se candidatando para: ${v.title}` : 'Link válido.' };

  return <AssessmentFlow vacancyToken={token || ''} notice={notice} startDisabled={isClosed} />;
}

