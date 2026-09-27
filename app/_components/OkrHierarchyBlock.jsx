'use client';

import { useCallback, useEffect, useState } from 'react';
import { S } from '../dashboard/dashboard-shared';
import { useAppFeedback } from './AppFeedback';
import { SelectField } from './SelectField';
import { MeterBar } from './MeterBar';
import { formatDisplayDate } from '../../lib/format-display-date';

export function OkrHierarchyBlock({ locale = 'pt-BR', companyId }) {
  const en = locale !== 'pt-BR';
  const label = (pt, english) => en ? english : pt;
  const { promptForm, confirm } = useAppFeedback();
  const [notice, setNotice] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(null);
  const qs = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const response = await fetch(`/api/admin/okr/hierarchy${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''}`);
      if (!response.ok) throw new Error('load');
      const data = await response.json();
      setCycles(data.cycles || []);
      setActiveId(id => data.cycles?.some(c => c.id === id) ? id : data.cycles?.[0]?.id ?? null);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [companyId]);
  useEffect(() => { void load(); }, [load]);
  const cycle = cycles.find(c => c.id === activeId);
  const locked = busy || cycle?.status === 'closed';
  const date = value => formatDisplayDate(value, locale);
  const number = value => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  const pct = value => value == null ? label('Sem medição', 'No measurement') : `${number(value)}%`;
  const muted = 'text-sm leading-relaxed text-ink-muted';
  const validDeadline = (start, end) => value => value < start || value > end ? label(`Escolha uma data entre ${date(start)} e ${date(end)}.`, `Choose a date between ${date(start)} and ${date(end)}.`) : null;
  const personField = (key, required = false) => ({ key, label:label('Responsável', 'Owner'), type:'entitySearch', searchUrl:`/api/admin/employees/search${qs}`, required });
  const titleField = value => ({ key:'title', label:label('Título', 'Title'), required:true, maxLength:300, defaultValue:value || '' });
  async function mutate(body, url = '/api/admin/okr/hierarchy', method = 'POST', form = false) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(url, { method, headers:{'Content-Type':'application/json'}, ...(method === 'DELETE' ? {} : {body:JSON.stringify({...body, ...(companyId ? {companyId} : {})})}) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || label('Não foi possível salvar. Verifique os valores, responsáveis e prazos.', 'Unable to save. Check values, owners and dates.'));
      setHistory(null); await load();
      if (data.cycle?.id) setActiveId(data.cycle.id);
      setNotice({message:label('Alteração salva.', 'Changes saved.'),error:false});
      return data;
    } catch (e) {
      const message = e instanceof TypeError ? label('Falha de conexão. Seus dados foram mantidos; tente salvar novamente.', 'Connection failed. Your entries are kept; try saving again.') : e.message;
      if(form) throw new Error(message);
      setNotice({message,error:true}); return null;
    }
    finally { setBusy(false); }
  }
  async function newCycle() {
    await promptForm({title:label('Novo ciclo', 'New cycle'), fields:[{...titleField(),maxLength:200}, {key:'startsOn',type:'date',label:label('Início','Start'),required:true}, {key:'endsOn',type:'date',label:label('Fim','End'),required:true,validate:(value,values)=>value<values.startsOn ? label('O fim não pode ser anterior ao início.','End must not precede start.') : null}],submit:values=>mutate(values,'/api/admin/okr/cycles','POST',true)});
  }
  async function newArea() {
    await promptForm({title:label('Nova área','New area'),fields:[{...titleField(),maxLength:200}],submit:values=>mutate({...values,cycleId:cycle.id},'/api/admin/okr/areas','POST',true)});
  }
  async function editObjective(area, objective) {
    const earliest = (objective?.keyResults || []).reduce((latest,k)=>k.deadline>latest?k.deadline:latest,cycle.startsOn);
    await promptForm({title:objective ? label('Editar objetivo','Edit objective') : label('Novo objetivo','New objective'),fields:[
      titleField(objective?.title),
      {key:'description',type:'textarea',label:label('Descrição','Description'),maxLength:2000,defaultValue:objective?.description || ''},
      {...personField('ownerCandidateId'),defaultValue:objective?.ownerCandidateId ? String(objective.ownerCandidateId) : '',initialSelection:objective?.ownerCandidateId ? {id:objective.ownerCandidateId,label:objective.ownerName} : undefined},
      {key:'periodEnd',type:'date',label:label('Prazo do objetivo','Objective deadline'),required:true,defaultValue:objective?.periodEnd || cycle.endsOn,min:earliest,max:cycle.endsOn,validate:validDeadline(earliest,cycle.endsOn),help:label('Dentro do ciclo e não anterior aos prazos dos resultados-chave.','Within the cycle and not before key result deadlines.')},
    ],submit:values=>mutate({...values,action:'objective',areaId:area.id,objectiveId:objective?.id,ownerCandidateId:values.ownerCandidateId ? Number(values.ownerCandidateId) : null},undefined,'POST',true)});
  }
  const krBody = k => ({action:'keyResult',keyResultId:k.id,title:k.title,unit:k.unit,startValue:k.startValue,targetValue:k.targetValue,weight:k.weight,deadline:k.deadline,assigneeIds:k.assignees.map(p=>p.candidateId)});
  async function editKr(objective, k) {
    await promptForm({title:k ? label('Editar resultado-chave','Edit key result') : label('Novo resultado-chave','New key result'),fields:[
      titleField(k?.title),
      {key:'unit',label:label('Unidade (ex.: R$, dias, clientes)','Unit (e.g. $, days, customers)'),required:true,maxLength:40,defaultValue:k?.unit || ''},
      {key:'startValue',type:'number',label:label('Valor inicial','Baseline'),required:true,step:0.01,defaultValue:String(k?.startValue ?? 0)},
      {key:'targetValue',type:'number',label:label('Meta','Target'),required:true,step:0.01,defaultValue:k ? String(k.targetValue) : '',validate:(value,values)=>Number(value)===Number(values.startValue) ? label('A meta deve ser diferente do valor inicial.','Target must differ from baseline.') : null,help:label('Diferente do valor inicial. Metas de redução são aceitas.','Different from baseline. Decreasing targets are supported.')},
      {key:'weight',type:'number',label:label('Peso (0 a 10)','Weight (0–10)'),required:true,min:0,max:10,step:1,defaultValue:String(k?.weight ?? 1),help:label('Peso 0 não participa do progresso do objetivo.','Weight 0 is excluded from objective progress.')},
      {key:'deadline',type:'date',label:label('Prazo','Deadline'),required:true,defaultValue:k?.deadline || objective.periodEnd,min:cycle.startsOn,max:objective.periodEnd,validate:validDeadline(cycle.startsOn,objective.periodEnd)},
      ...(!k ? [personField('candidateId',true)] : []),
    ],submit:values=>mutate({action:'keyResult',objectiveId:objective.id,keyResultId:k?.id,...values,startValue:Number(values.startValue),targetValue:Number(values.targetValue),weight:Number(values.weight),assigneeIds:k ? k.assignees.map(p=>p.candidateId) : [Number(values.candidateId)]},undefined,'POST',true)});
  }
  async function assign(k) {
    await promptForm({title:label('Adicionar responsável','Add owner'),fields:[personField('candidateId',true)],submit:values=>mutate({...krBody(k),assigneeIds:[...new Set([...k.assignees.map(p=>p.candidateId),Number(values.candidateId)])]},undefined,'POST',true)});
  }
  async function unassign(k, person) {
    if(await confirm({title:label('Remover responsável','Remove owner'),message:person.fullName,confirmLabel:label('Remover','Remove')})) await mutate({...krBody(k),assigneeIds:k.assignees.filter(p=>p.candidateId!==person.candidateId).map(p=>p.candidateId)});
  }
  async function checkin(k) {
    await promptForm({title:label('Registrar check-in','Record check-in'),fields:[{key:'currentValue',type:'number',label:`${label('Valor atual','Current value')} (${k.unit})`,required:true,step:0.01,defaultValue:String(k.currentValue)},{key:'note',type:'textarea',label:label('Comentário','Comment'),maxLength:500}],submit:values=>mutate({action:'checkin',keyResultId:k.id,currentValue:Number(values.currentValue),note:values.note || ''},undefined,'POST',true)});
  }
  async function showHistory(k) {
    setBusy(true);
    try {
      const response=await fetch(`/api/admin/okr/hierarchy${qs || '?'}${qs ? '&' : ''}keyResultId=${k.id}`);
      if(!response.ok) throw new Error(label('Não foi possível carregar o histórico.','Unable to load history.'));
      const data=await response.json(); setHistory({id:k.id,items:data.items});
    } catch(e) { setNotice({message:e.message,error:true}); } finally { setBusy(false); }
  }
  async function remove(kind, item, url) {
    if(await confirm({title:label('Excluir registro','Delete record'),message:label(`Excluir “${item.title}” e todos os registros e históricos vinculados? Essa ação não pode ser desfeita.`,`Delete “${item.title}” and all linked records and history? This cannot be undone.`),danger:true,confirmLabel:label('Excluir','Delete')})) await mutate({action:'delete',kind,id:item.id},url || '/api/admin/okr/hierarchy',url ? 'DELETE' : 'POST');
  }
  const progress = (name,value) => <div className="w-full shrink-0 sm:w-32"><span className="text-sm font-medium tabular-nums text-ink">{pct(value)}</span><MeterBar percent={value ?? 0} height={6} aria-label={`${name}: ${pct(value)}`} /></div>;
  const actions = children => <details className="min-w-0"><summary className={`${S.btnGhost} inline-flex min-h-touch cursor-pointer items-center`}>{label('Mais ações','More actions')}</summary><div className="mt-2 flex flex-wrap items-start gap-2">{children}</div></details>;
  if(loading && !cycles.length) return <p role="status">{label('Carregando OKRs…','Loading OKRs…')}</p>;
  if(error) return <div role="alert"><p>{label('Não foi possível carregar os OKRs.','Unable to load OKRs.')}</p><button className={S.btnBrandSoft} onClick={load}>{label('Tentar novamente','Try again')}</button></div>;
  return <section className="flex min-w-0 flex-col gap-5" aria-label="OKRs">
    {notice && <div role={notice.error?'alert':'status'} className={`flex items-center justify-between gap-3 rounded-control border p-3 text-sm ${notice.error?'border-danger/30 text-red-800 dark:text-danger':'border-success/30 text-ink'}`}><span>{notice.message}</span><button className="min-h-touch min-w-touch" aria-label={label('Dispensar aviso','Dismiss notice')} onClick={()=>setNotice(null)}>×</button></div>}
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className={S.cardBody}>{label('Ciclo → Área → Objetivos → Resultados-chave','Cycle → Area → Objectives → Key results')}</p><p className={muted}>{label('O progresso vem das medições, não de percentuais preenchidos manualmente.','Progress comes from measurements, not manually entered percentages.')}</p></div><button disabled={busy} className={S.btnBrandSoft} onClick={newCycle}>{label('Novo ciclo','New cycle')}</button></div>
    {!cycle ? <p className={muted}>{label('Crie um ciclo para começar.','Create a cycle to get started.')}</p> : <>
      <div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><label htmlFor="okr-cycle" className={S.label}>{label('Ciclo OKR ativo','Active OKR cycle')}</label><SelectField id="okr-cycle" aria-label={label('Ciclo OKR ativo','Active OKR cycle')} value={activeId} onChange={e=>{setActiveId(Number(e.target.value));setHistory(null);}}>{cycles.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</SelectField></div><button disabled={busy} className={S.btnBrandSoft} onClick={()=>mutate({status:cycle.status==='closed'?'active':'closed'},`/api/admin/okr/cycles/${cycle.id}`,'PATCH')}>{cycle.status==='closed'?label('Reabrir ciclo','Reopen cycle'):label('Encerrar ciclo','Close cycle')}</button>{actions(<button disabled={locked} className={S.btnGhost} onClick={()=>remove('cycle',cycle,`/api/admin/okr/cycles/${cycle.id}${qs}`)}>{label('Excluir ciclo','Delete cycle')}</button>)}</div>
      <div className="flex flex-wrap justify-between gap-3"><p className={muted}>{date(cycle.startsOn)} — {date(cycle.endsOn)} · {cycle.status==='closed'?label('Encerrado · somente leitura','Closed · read only'):label('Em andamento','Active')}</p>{progress(cycle.title,cycle.progressPct)}</div>
      <details className={muted}><summary className="cursor-pointer">{label('Como o progresso é calculado?','How is progress calculated?')}</summary><p>{label('Resultado-chave: (atual − inicial) ÷ (meta − inicial), limitado entre 0% e 100%. Objetivo: média ponderada dos resultados-chave. Área: média dos objetivos com medição. Ciclo: média das áreas com medição. Registros vazios não entram na média.','Key result: (current − baseline) ÷ (target − baseline), limited to 0–100%. Objective: weighted mean of key results. Area: mean of measured objectives. Cycle: mean of measured areas. Empty records are excluded.')}</p></details>
      <div><button disabled={locked} className={S.btnBrandSoft} onClick={newArea}>{label('Nova área','New area')}</button></div>
      {!cycle.areas.length && <p className={muted}>{label('Adicione uma área; os objetivos ficam dentro dela.','Add an area; objectives belong inside it.')}</p>}
      {cycle.areas.map(area=><section key={area.id} className="min-w-0 rounded-card border border-ink/12 p-4" aria-label={`${label('Área','Area')}: ${area.title}`}>
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className={S.cardTitle}>{area.title}</h3>{progress(area.title,area.progressPct)}<div className="flex flex-wrap items-start gap-2"><button disabled={locked} className={S.btnBrandSoft} onClick={()=>editObjective(area)}>{label('Novo objetivo','New objective')}</button>{actions(<button disabled={locked} className={S.btnGhost} onClick={()=>remove('area',area,`/api/admin/okr/areas/${area.id}${qs}`)}>{label('Excluir área','Delete area')}</button>)}</div></div>
        {!area.objectives.length && <p className={muted}>{label('Nenhum objetivo nesta área.','No objectives in this area.')}</p>}
        <div className="mt-4 flex flex-col gap-4">{area.objectives.map(objective=><article key={objective.id} className="min-w-0 rounded-control border border-ink/12 bg-canvas/50 p-3" aria-label={`${label('Objetivo','Objective')}: ${objective.title}`}>
          <div className="flex flex-wrap justify-between gap-3"><div className="min-w-0 flex-1"><h4 className={`${S.cardBody} break-words`}>{objective.title}</h4>{objective.description && <p className={`${muted} whitespace-pre-wrap break-words`}>{objective.description}</p>}<p className={muted}>{objective.ownerName || label('Sem responsável pelo objetivo','No objective owner')} · {date(objective.periodEnd)}</p></div>{progress(objective.title,objective.progressPct)}</div>
          <div className="my-3 flex flex-wrap items-start gap-2"><button disabled={locked} className={S.btnBrandSoft} onClick={()=>editKr(objective)}>{label('Novo resultado-chave','New key result')}</button>{actions(<><button disabled={locked} className={S.btnGhost} onClick={()=>editObjective(area,objective)}>{label('Editar objetivo','Edit objective')}</button><button disabled={locked} className={S.btnGhost} onClick={()=>remove('objective',objective)}>{label('Excluir objetivo','Delete objective')}</button></>)}</div>
          {!objective.keyResults.length && <p className={muted}>{label('Adicione um resultado mensurável com valor inicial, meta e responsável.','Add a measurable result with a baseline, target and owner.')}</p>}
          <ul className="m-0 flex list-none flex-col gap-3 p-0">{objective.keyResults.map(k=><li key={k.id} className="min-w-0 rounded-control border border-ink/12 bg-canvas p-3" aria-label={`${label('Resultado-chave','Key result')}: ${k.title}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 flex-1"><h5 className={`${S.cardBody} break-words`}>{k.title}</h5><dl className="my-3 grid grid-cols-3 gap-3" aria-label={label('Medições','Measurements')}>
              {[[label('Inicial','Baseline'),k.startValue],[label('Meta','Target'),k.targetValue],[label('Atual','Current'),k.currentValue]].map(([name,value])=><div key={name} className="min-w-0"><dt className="text-prose text-ink-muted">{name}</dt><dd className="m-0 break-words text-base font-semibold tabular-nums text-ink">{number(value)}<span className="block text-prose font-normal text-ink-muted">{k.unit}</span></dd></div>)}
            </dl><p className={muted}>{date(k.deadline)} · {label('Peso','Weight')}: {k.weight} · {k.progressPct>=100?label('Concluído','Complete'):k.urgency==='overdue'?label('Atrasado','Overdue'):label('Em andamento','In progress')}</p></div>{progress(k.title,k.progressPct)}</div>
            <div className="my-2 flex flex-wrap items-center gap-2">{k.assignees.map(p=><span key={p.candidateId} className={`${muted} inline-flex max-w-full items-center gap-1 break-words`}>{p.fullName}{k.assignees.length>1 && <button className="min-h-touch min-w-touch" disabled={locked || k.assignees.length<2} aria-label={`${label('Remover responsável','Remove owner')} ${p.fullName}`} onClick={()=>unassign(k,p)}>×</button>}</span>)}<button disabled={locked || k.assignees.length>=20} className={S.btnGhost} onClick={()=>assign(k)}>{label('Adicionar responsável','Add owner')}</button></div>
            <div className="flex flex-wrap items-start gap-2"><button disabled={locked} className={S.btnBrandSoft} onClick={()=>checkin(k)}>{label('Registrar check-in','Record check-in')}</button><button disabled={busy} className={S.btnGhost} onClick={()=>history?.id===k.id?setHistory(null):showHistory(k)}>{label('Histórico','History')}</button>{actions(<><button disabled={locked} className={S.btnGhost} onClick={()=>editKr(objective,k)}>{label('Editar resultado-chave','Edit key result')}</button><button disabled={locked} className={S.btnGhost} onClick={()=>remove('kr',k)}>{label('Excluir resultado-chave','Delete key result')}</button></>)}</div>
            {history?.id===k.id && <div className="mt-4 border-t border-ink/12 pt-4"><h6 className="m-0 text-sm font-semibold text-ink">{label('Histórico de medições','Measurement history')}</h6><p className={muted}>{label('Até 40 eventos recentes. Cada evento preserva a meta vigente na data.','Up to 40 recent events. Each event keeps its original target.')}</p><ol className="mt-3 list-none space-y-4 p-0" aria-label={label('Histórico de medições','Measurement history')}>{history.items.map(h=><li key={h.id} className="break-words border-l-2 border-brand-500/30 pl-3 text-sm text-ink"><span className="block text-prose text-ink-muted">{new Date(h.createdAt).toLocaleString(locale)} · {h.actorName} · {h.eventKind==='created'?label('Criação','Created'):h.eventKind==='configuration'?label('Configuração','Configuration'):'Check-in'}</span><p className="my-1 font-medium tabular-nums">{label('Atual','Current')}: {number(h.currentValue)} {h.unit} · {pct(h.progressPct)}</p><p className="my-1 text-ink-muted">{label('Inicial','Baseline')}: {number(h.startValue)} → {label('Meta','Target')}: {number(h.targetValue)} {h.unit}</p>{h.note && <p className="whitespace-pre-wrap">{h.note}</p>}</li>)}</ol></div>}
          </li>)}</ul>
        </article>)}</div>
        {!!area.activities?.length && <details className="mt-4"><summary className={`${muted} cursor-pointer`}>{label('Atividades anteriores (não entram nos novos OKRs)','Previous activities (excluded from new OKRs)')} · {area.activities.length}</summary><ul>{area.activities.map(a=><li className={`${muted} break-words`} key={a.id}>{a.title} · {a.progressPct}%</li>)}</ul></details>}
      </section>)}
    </>}
  </section>;
}
