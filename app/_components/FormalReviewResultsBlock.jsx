'use client';

import { useEffect, useState } from 'react';
import { S } from '../dashboard/dashboard-shared';
import { useAppFeedback } from './AppFeedback';

export function FormalReviewResultsBlock({ candidateId, locale = 'pt-BR', onPdiChanged }) {
  const en = locale.startsWith('en');
  const { promptForm, confirm, toast } = useAppFeedback();
  const [results, setResults] = useState([]);
  const [state, setState] = useState('loading');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    fetch(`/api/admin/candidates/${candidateId}/formal-review-results`, { signal: controller.signal }).then(async response => {
      if (response.status === 401 || response.status === 403) { setState('forbidden'); return; }
      if (!response.ok) throw new Error('load');
      const data = await response.json();
      setResults(data.results || []); setState('ready');
    }).catch(error => { if (error.name !== 'AbortError') setState('error'); });
    return () => controller.abort();
  }, [candidateId]);

  async function useResult(result, item) {
    const values = await promptForm({
      title: en ? 'Create a development goal' : 'Criar meta de PDI',
      fields: [
        { key: 'title', label: en ? 'Title' : 'Título', required: true, maxLength: 200, defaultValue: item.label },
        { key: 'objective', label: en ? 'Development agreement' : 'Acordo de desenvolvimento', type: 'textarea', maxLength: 4000 },
      ],
    });
    if (!values || !await confirm({ title: en ? 'Use this result in PDI?' : 'Usar este resultado no PDI?', message: en ? 'A separate development plan will be created. Review answers will not change.' : 'Será criado um plano de desenvolvimento separado. As respostas da avaliação não serão alteradas.' })) return;
    setBusy(true);
    try {
      const source = `${en ? 'Source' : 'Origem'}: ${result.cycleTitle} · ${en ? 'Review' : 'Avaliação'} #${result.id} · ${item.label}`;
      const response = await fetch(`/api/admin/candidates/${candidateId}/development-plans`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: values.title, objective: `${source}\n${values.objective || ''}`, seedIdeas: [values.title], status: 'active' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (en ? 'Could not save.' : 'Não foi possível salvar.'));
      toast(en ? 'Development plan created.' : 'Plano de desenvolvimento criado.', 'ok');
      onPdiChanged?.();
    } catch (error) { toast(error.message, 'error'); }
    finally { setBusy(false); }
  }
  if (state === 'forbidden') return null;
  return <section className={`${S.card} ${S.stack}`} aria-label={en ? 'Review results' : 'Resultados de avaliações'}>
    <h3 className={S.cardSection}>{en ? 'Review results' : 'Resultados de avaliações'}</h3>
    {state === 'loading' ? <p>{en ? 'Loading…' : 'Carregando…'}</p> : null}
    {state === 'error' ? <p role="alert">{en ? 'Could not load review results.' : 'Não foi possível carregar os resultados.'}</p> : null}
    {state === 'ready' && !results.length ? <p>{en ? 'No completed reviews.' : 'Nenhuma avaliação concluída.'}</p> : null}
    {results.map(result => <details key={result.id} className="rounded-control border border-ink/10 p-3">
      <summary className="cursor-pointer font-medium">{result.cycleTitle} · {result.periodStart?.slice(0, 10) || '—'} — {result.periodEnd?.slice(0, 10) || '—'}</summary>
      <ul className="m-0 list-none space-y-3 p-0 pt-3">{result.items.map(item => <li key={item.id}>
        <p className="m-0">{item.label} · {item.average == null ? '—' : item.average.toLocaleString(locale, { maximumFractionDigits: 2 })}/5</p>
        <p className={S.faint}>{item.description}</p>
        <button type="button" className={S.btnGhost} disabled={busy} onClick={() => useResult(result, item)}>{en ? 'Use in PDI' : 'Usar no PDI'}</button>
      </li>)}</ul>
    </details>)}
  </section>;
}
