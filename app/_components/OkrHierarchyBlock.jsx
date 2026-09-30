'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminPageHeader, S } from '../dashboard/dashboard-shared';
import { useAppFeedback } from './AppFeedback';
import { SelectField } from './SelectField';
import { CollapsibleBlock } from './CollapsibleBlock';
import { MeterBar } from './MeterBar';
import { formatDisplayDate } from '../../lib/format-display-date';
import { cn } from '../../lib/cn';
import { AppLoading, ContentEnter } from './AppLoading';
import { FormField } from './FormField';
import { RowActionsMenu } from './RowActionsMenu';
import { RichTextView } from './RichTextView';
import { EmptyState } from './EmptyState';
import { htmlToPlainText, plainOrMarkdownToSimpleHtml } from '../../lib/sanitize-html';

const RICH_TEXT_MAX = 2000;
const asRichHtml = value => !value ? '' : /<[a-z][\s\S]*>/i.test(value) ? value : plainOrMarkdownToSimpleHtml(value);

export function OkrHierarchyBlock({ locale = 'pt-BR', companyId }) {
  return <OkrHierarchyContent key={companyId ?? 'session'} locale={locale} companyId={companyId} />;
}

function OkrHierarchyContent({ locale, companyId }) {
  const en = !locale.startsWith('pt');
  const active = useRef(true);
  const requestVersion = useRef(0);
  useEffect(() => { active.current = true; return () => { active.current = false; requestVersion.current += 1; }; }, []);
  const label = (pt, english) => en ? english : pt;
  const { promptForm, confirm } = useAppFeedback();
  const [notice, setNotice] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(null);
  const [areaId, setAreaId] = useState('all');
  const [detailId, setDetailId] = useState(null);
  const qs = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true); setError(false);
    try {
      const response = await fetch(`/api/admin/okr/hierarchy${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''}`);
      if (!response.ok) throw new Error('load');
      const data = await response.json();
      if (!active.current || version !== requestVersion.current) return false;
      setCycles(data.cycles || []);
      setActiveId(id => data.cycles?.some(c => c.id === id) ? id : data.cycles?.[0]?.id ?? null);
      return true;
    } catch { if (active.current && version === requestVersion.current) setError(true); return false; }
    finally { if (active.current && version === requestVersion.current) setLoading(false); }
  }, [companyId]);
  useEffect(() => { void load(); }, [load]);
  const cycle = cycles.find(c => c.id === activeId);
  useEffect(() => { if (areaId !== 'all' && !cycle?.areas.some(area => String(area.id) === areaId)) setAreaId('all'); }, [cycle, areaId]);
  const visibleAreas = cycle?.areas.filter(area => areaId === 'all' || String(area.id) === areaId) || [];
  const locked = busy || cycle?.status === 'closed';
  const date = value => formatDisplayDate(value, locale);
  const number = value => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  const pct = value => value == null ? label('Sem medição', 'No measurement') : `${number(value)}%`;
  const muted = 'text-sm leading-relaxed text-ink-muted';
  const validDeadline = (start, end) => value => value < start || value > end ? label(`Escolha uma data entre ${date(start)} e ${date(end)}.`, `Choose a date between ${date(start)} and ${date(end)}.`) : null;
  const personField = (key, required = false) => ({ key, label:label('Responsável', 'Owner'), type:'entitySearch', searchUrl:`/api/admin/employees/search${qs}`, required });
  const richField = (key, fieldLabel, value, placeholder) => ({ key, type:'richText', label:fieldLabel, placeholder, minHeight:96, defaultValue:asRichHtml(value), validate:v => htmlToPlainText(v || '').length > RICH_TEXT_MAX ? label(`Use até ${RICH_TEXT_MAX} caracteres.`,`Use up to ${RICH_TEXT_MAX} characters.`) : null });
  const titleField = value => ({ key:'title', label:label('Título', 'Title'), required:true, maxLength:300, defaultValue:value || '' });
  async function mutate(body, url = '/api/admin/okr/hierarchy', method = 'POST', form = false) {
    if (!active.current) throw new Error(label('A empresa mudou. Abra o formulário novamente.', 'The company changed. Open the form again.'));
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(url, { method, headers:{'Content-Type':'application/json'}, ...(method === 'DELETE' ? {} : {body:JSON.stringify({...body, ...(companyId ? {companyId} : {})})}) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || label('Não foi possível salvar. Verifique os valores, responsáveis e prazos.', 'Unable to save. Check values, owners and dates.'));
      if (!active.current) return data;
      setHistory(null);
      const refreshed = await load();
      if (!active.current) return data;
      if (data.cycle?.id) setActiveId(data.cycle.id);
      setNotice({message:refreshed ? label('Alteração salva.', 'Changes saved.') : label('Alteração salva, mas a atualização da tela falhou. Recarregue os OKRs para conferir.', 'Changes saved, but the view could not refresh. Reload OKRs to review them.'),error:!refreshed});
      return data;
    } catch (e) {
      const message = e instanceof TypeError ? label('Falha de conexão. Seus dados foram mantidos; tente salvar novamente.', 'Connection failed. Your entries are kept; try saving again.') : e.message;
      if(form) throw new Error(message);
      if (!active.current) return null;
      setNotice({message,error:true}); return null;
    }
    finally { if (active.current) setBusy(false); }
  }
  async function newCycle() {
    await promptForm({title:label('Novo ciclo', 'New cycle'), fields:[{...titleField(),maxLength:200}, {key:'startsOn',type:'date',row:'period',label:label('Início','Start'),required:true}, {key:'endsOn',type:'date',row:'period',label:label('Fim','End'),required:true,validate:(value,values)=>value<values.startsOn ? label('O fim não pode ser anterior ao início.','End must not precede start.') : null}],submit:values=>mutate(values,'/api/admin/okr/cycles','POST',true)});
  }
  async function editArea(area) {
    await promptForm({title:area ? label('Editar área','Edit area') : label('Nova área','New area'),fields:[{...titleField(area?.title),maxLength:200}],submit:values=>area ? mutate(values,`/api/admin/okr/areas/${area.id}`,'PATCH',true) : mutate({...values,cycleId:cycle.id},'/api/admin/okr/areas','POST',true)});
  }
  async function editObjective(area, objective) {
    const earliest = (objective?.keyResults || []).reduce((latest,k)=>k.deadline>latest?k.deadline:latest,cycle.startsOn);
    await promptForm({title:objective ? label('Editar objetivo','Edit objective') : label('Novo objetivo','New objective'),fields:[
      titleField(objective?.title),
      richField('description',label('Descrição','Description'),objective?.description),
      {...personField('ownerCandidateId'),row:'owner',defaultValue:objective?.ownerCandidateId ? String(objective.ownerCandidateId) : '',initialSelection:objective?.ownerCandidateId ? {id:objective.ownerCandidateId,label:objective.ownerName} : undefined},
      {key:'periodEnd',type:'date',row:'owner',label:label('Prazo do objetivo','Objective deadline'),required:true,defaultValue:objective?.periodEnd || cycle.endsOn,min:earliest,max:cycle.endsOn,validate:validDeadline(earliest,cycle.endsOn),help:label('Dentro do ciclo e não anterior aos prazos dos resultados-chave.','Within the cycle and not before key result deadlines.')},
    ],submit:values=>mutate({...values,action:'objective',areaId:area.id,objectiveId:objective?.id,ownerCandidateId:values.ownerCandidateId ? Number(values.ownerCandidateId) : null},undefined,'POST',true)});
  }
  const krBody = k => ({action:'keyResult',keyResultId:k.id,title:k.title,unit:k.unit,startValue:k.startValue,targetValue:k.targetValue,weight:k.weight,deadline:k.deadline,assigneeIds:k.assignees.map(p=>p.candidateId)});
  async function editKr(objective, k) {
    await promptForm({title:k ? label('Editar resultado-chave','Edit key result') : label('Novo resultado-chave','New key result'),fields:[
      titleField(k?.title),
      {key:'startValue',type:'number',row:'values',label:label('Valor inicial','Baseline'),required:true,step:0.01,defaultValue:String(k?.startValue ?? 0)},
      {key:'targetValue',type:'number',row:'values',label:label('Meta','Target'),required:true,step:0.01,defaultValue:k ? String(k.targetValue) : '',validate:(value,values)=>Number(value)===Number(values.startValue) ? label('A meta deve ser diferente do valor inicial.','Target must differ from baseline.') : null,help:label('Diferente do valor inicial. Metas de redução são aceitas.','Different from baseline. Decreasing targets are supported.')},
      {key:'unit',row:'unit',label:label('Unidade','Unit'),placeholder:label('R$, dias, clientes','$, days, customers'),required:true,maxLength:40,defaultValue:k?.unit || ''},
      {key:'weight',type:'number',row:'unit',label:label('Peso (0 a 10)','Weight (0–10)'),required:true,min:0,max:10,step:1,defaultValue:String(k?.weight ?? 1),help:label('Peso 0 não participa do progresso do objetivo.','Weight 0 is excluded from objective progress.')},
      {key:'deadline',type:'date',row:'deadline',width:'half',label:label('Prazo','Deadline'),required:true,defaultValue:k?.deadline || objective.periodEnd,min:cycle.startsOn,max:objective.periodEnd,validate:validDeadline(cycle.startsOn,objective.periodEnd)},
      ...(!k ? [{...personField('candidateId',true),row:'deadline'}] : []),
      richField('notes',label('Observação','Notes'),k?.notes,label('Contexto, premissas ou fonte do dado','Context, assumptions or data source')),
    ],submit:values=>mutate({action:'keyResult',objectiveId:objective.id,keyResultId:k?.id,...values,startValue:Number(values.startValue),targetValue:Number(values.targetValue),weight:Number(values.weight),assigneeIds:k ? k.assignees.map(p=>p.candidateId) : [Number(values.candidateId)]},undefined,'POST',true)});
  }
  async function assign(k) {
    await promptForm({title:label('Adicionar responsável','Add owner'),fields:[personField('candidateId',true)],submit:values=>mutate({...krBody(k),assigneeIds:[...new Set([...k.assignees.map(p=>p.candidateId),Number(values.candidateId)])]},undefined,'POST',true)});
  }
  async function unassign(k, person) {
    if(await confirm({title:label('Remover responsável','Remove owner'),message:person.fullName,confirmLabel:label('Remover','Remove')})) await mutate({...krBody(k),assigneeIds:k.assignees.filter(p=>p.candidateId!==person.candidateId).map(p=>p.candidateId)});
  }
  async function checkin(k) {
    await promptForm({title:label('Registrar check-in','Record check-in'),fields:[{key:'currentValue',type:'number',width:'half',label:`${label('Valor atual','Current value')} (${k.unit})`,required:true,step:0.01,defaultValue:String(k.currentValue)},{key:'note',type:'textarea',label:label('Comentário','Comment'),maxLength:500}],submit:values=>mutate({action:'checkin',keyResultId:k.id,currentValue:Number(values.currentValue),note:values.note || ''},undefined,'POST',true)});
  }
  async function showHistory(k) {
    setBusy(true);
    try {
      const response=await fetch(`/api/admin/okr/hierarchy${qs || '?'}${qs ? '&' : ''}keyResultId=${k.id}`);
      if(!response.ok) throw new Error(label('Não foi possível carregar o histórico.','Unable to load history.'));
      const data=await response.json(); if (active.current) setHistory({id:k.id,items:data.items || []});
    } catch(e) { if (active.current) setNotice({message:e.message,error:true}); } finally { if (active.current) setBusy(false); }
  }
  async function remove(kind, item, url) {
    if(await confirm({title:label('Excluir registro','Delete record'),message:label(`Excluir “${item.title}” e todos os registros e históricos vinculados? Essa ação não pode ser desfeita.`,`Delete “${item.title}” and all linked records and history? This cannot be undone.`),danger:true,confirmLabel:label('Excluir','Delete')})) await mutate({action:'delete',kind,id:item.id},url || '/api/admin/okr/hierarchy',url ? 'DELETE' : 'POST');
  }
  const progress = (name,value,className='sm:w-36') => <div className={cn('w-full shrink-0',className)}><span className="text-sm font-medium tabular-nums text-ink">{pct(value)}</span><MeterBar percent={value ?? 0} height={6} aria-label={`${name}: ${pct(value)}`} /></div>;
  const moreLabel = name => `${label('Mais ações','More actions')}: ${name}`;
  if(loading && !cycles.length) return <AppLoading locale={locale} variant="panel" label={label('Carregando OKRs…','Loading OKRs…')} />;
  if(error) return <div role="alert" className="flex flex-col items-start gap-3">{notice && <p className={muted}>{notice.message}</p>}<p className={muted}>{label('Não foi possível carregar os OKRs.','Unable to load OKRs.')}</p><button className={S.btnBrandSoft} onClick={load}>{label('Tentar novamente','Try again')}</button></div>;
  return <section className="flex min-w-0 flex-col gap-5" aria-label="OKRs" aria-busy={busy || loading}>
    {notice && <div role={notice.error?'alert':'status'} className={`flex items-center justify-between gap-3 rounded-control border p-3 text-sm ${notice.error?'border-danger/30 text-red-800 dark:text-danger':'border-success/30 text-ink'}`}><span>{notice.message}</span><button className="min-h-touch min-w-touch" aria-label={label('Dispensar aviso','Dismiss notice')} onClick={()=>setNotice(null)}>×</button></div>}
    <AdminPageHeader title="OKRs" subtitle={label('Acompanhe os objetivos e registre a evolução dos resultados da equipe.', 'Track objectives and record your team’s results.')} actions={<button disabled={busy} className={S.btnBrandSoft} onClick={newCycle}>{label('Novo ciclo','New cycle')}</button>} />
    {!cycle ? <EmptyState title={label('Nenhum ciclo de OKR','No OKR cycle yet')} message={label('Crie um ciclo com início e fim; depois adicione áreas, objetivos e resultados-chave.','Create a cycle with start and end dates, then add areas, objectives and key results.')} actionLabel={label('Novo ciclo','New cycle')} onAction={newCycle} actionDisabled={busy} /> : <ContentEnter animKey={cycle.id} className="flex min-w-0 flex-col gap-5">
      <div className="rounded-card border border-ink/12 bg-surface p-4">
        <div className="grid min-w-0 items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]">
          <FormField label={label('Ciclo OKR ativo','Active OKR cycle')} htmlFor="okr-cycle"><SelectField className="w-full" disabled={busy || loading} id="okr-cycle" aria-label={label('Ciclo OKR ativo','Active OKR cycle')} value={activeId} onChange={e=>{setActiveId(Number(e.target.value));setAreaId('all');setDetailId(null);setHistory(null);setNotice(null);}}>{cycles.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</SelectField></FormField>
          <FormField label={label('Área','Area')} htmlFor="okr-area"><SelectField className="w-full" id="okr-area" aria-label={label('Área','Area')} disabled={busy || loading} value={areaId} onChange={event => { setAreaId(event.target.value); setDetailId(null); setHistory(null); }}>
            <option value="all">{label('Todas as áreas','All areas')}</option>
            {cycle.areas.map(area => <option key={area.id} value={area.id}>{area.title}</option>)}
          </SelectField></FormField>
          <div className="flex flex-wrap items-center justify-end gap-2 md:col-span-2 xl:col-span-1">
            <button disabled={locked} className={S.btnBrandSoft} onClick={()=>editArea()}>{label('Nova área','New area')}</button>
            <RowActionsMenu label={moreLabel(cycle.title)} disabled={busy} items={[
              {id:'status',label:cycle.status==='closed'?label('Reabrir ciclo','Reopen cycle'):label('Encerrar ciclo','Close cycle'),onSelect:()=>mutate({status:cycle.status==='closed'?'active':'closed'},`/api/admin/okr/cycles/${cycle.id}`,'PATCH')},
              {id:'delete',label:label('Excluir ciclo','Delete cycle'),danger:true,disabled:locked,onSelect:()=>remove('cycle',cycle,`/api/admin/okr/cycles/${cycle.id}${qs}`)},
            ]} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink/12 pt-3">
          <p className={cn(muted,'m-0')}>{label(`${date(cycle.startsOn)} a ${date(cycle.endsOn)}`,`${date(cycle.startsOn)} to ${date(cycle.endsOn)}`)} · {cycle.status==='closed'?label('Encerrado · somente leitura','Closed · read only'):label('Em andamento','Active')}</p>
          {progress(cycle.title,cycle.progressPct,'sm:w-48')}
        </div>
        <CollapsibleBlock locale={locale} className="mt-2" bordered={false} title={label('Como o progresso é calculado?','How is progress calculated?')} titleClassName="font-ui text-prose text-ink-muted"><p className={cn(muted,'m-0 pb-1')}>{label('Resultado-chave: (atual − inicial) ÷ (meta − inicial), limitado entre 0% e 100%. Objetivo: média ponderada dos resultados-chave. Área: média dos objetivos com medição. Ciclo: média das áreas com medição. Registros vazios não entram na média.','Key result: (current − baseline) ÷ (target − baseline), limited to 0–100%. Objective: weighted mean of key results. Area: mean of measured objectives. Cycle: mean of measured areas. Empty records are excluded.')}</p></CollapsibleBlock>
      </div>
      {!cycle.areas.length && <p className={muted}>{label('Adicione uma área; os objetivos ficam dentro dela.','Add an area; objectives belong inside it.')}</p>}
      {visibleAreas.map(area=><section key={area.id} className="min-w-0 rounded-card border border-ink/12 bg-surface p-4" aria-label={`${label('Área','Area')}: ${area.title}`}>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className={`${S.cardTitle} m-0 min-w-0 flex-1 break-words`}>{area.title}</h3>
          {progress(area.title,area.progressPct)}
          <div className="flex items-center gap-2">
            <button disabled={locked} className={S.btnBrandSoft} onClick={()=>editObjective(area)}>{label('Novo objetivo','New objective')}</button>
            <RowActionsMenu label={moreLabel(area.title)} disabled={locked} items={[
              {id:'edit',label:label('Editar área','Edit area'),onSelect:()=>editArea(area)},
              {id:'delete',label:label('Excluir área','Delete area'),danger:true,onSelect:()=>remove('area',area,`/api/admin/okr/areas/${area.id}${qs}`)},
            ]} />
          </div>
        </div>
        {!area.objectives.length && <p className={cn(muted,'mb-0 mt-3')}>{label('Nenhum objetivo nesta área.','No objectives in this area.')}</p>}
        {!!area.objectives.length && <div className="mt-4 flex flex-col gap-4">{area.objectives.map((objective,index)=><article key={objective.id} className="min-w-0 border-t border-ink/12 pt-3" aria-label={`${label('Objetivo','Objective')}: ${objective.title}`}>
          <CollapsibleBlock locale={locale} title={objective.title} defaultOpen={index===0} bordered={false} headerAside={<span className="font-ui text-sm font-medium tabular-nums">{pct(objective.progressPct)}</span>} collapsedHint={`${objective.ownerName || label('Sem responsável','No owner')} · ${date(objective.periodEnd)} · ${objective.keyResults.length} ${objective.keyResults.length===1 ? label('resultado-chave','key result') : label('resultados-chave','key results')}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className={cn(muted,'m-0')}>{objective.ownerName || label('Sem responsável pelo objetivo','No objective owner')} · {label('Prazo','Deadline')}: {date(objective.periodEnd)}</p>
              {objective.description && <RichTextView html={asRichHtml(objective.description)} className="mt-1 max-w-prose" />}
            </div>
            <div className="flex items-center gap-2">
              <button disabled={locked} className={S.btnBrandSoft} onClick={()=>editKr(objective)}>{label('Novo resultado-chave','New key result')}</button>
              <RowActionsMenu label={moreLabel(objective.title)} disabled={locked} items={[
                {id:'edit',label:label('Editar objetivo','Edit objective'),onSelect:()=>editObjective(area,objective)},
                {id:'delete',label:label('Excluir objetivo','Delete objective'),danger:true,onSelect:()=>remove('objective',objective)},
              ]} />
            </div>
          </div>
          {!objective.keyResults.length && <p className={cn(muted,'mb-0 mt-3')}>{label('Adicione um resultado mensurável com valor inicial, meta e responsável.','Add a measurable result with a baseline, target and owner.')}</p>}
          {!!objective.keyResults.length && <ul className="m-0 mt-3 list-none divide-y divide-ink/12 rounded-control border border-ink/12 p-0">{objective.keyResults.map(k=><li key={k.id} className="min-w-0 p-3" aria-label={`${label('Resultado-chave','Key result')}: ${k.title}`}>
            <div className="grid min-w-0 items-center gap-3 lg:grid-cols-[minmax(0,1fr)_9rem_auto]">
              <div className="min-w-0">
                <h5 className="m-0 break-words font-ui text-sm font-semibold text-ink">{k.title}</h5>
                <p className="mb-0 mt-1 break-words text-prose text-ink-muted">
                  <span className="font-medium tabular-nums text-ink">{label('Atual','Current')}: {number(k.currentValue)} · {label('Meta','Target')}: {number(k.targetValue)} {k.unit}</span>
                  {' · '}<span className="whitespace-nowrap">{date(k.deadline)}</span>{' · '}
                  <span className={cn('whitespace-nowrap',k.urgency==='overdue' && k.progressPct<100 && 'text-red-800 dark:text-danger')}>{k.progressPct>=100?label('Concluído','Complete'):k.urgency==='overdue'?label('Atrasado','Overdue'):label('Em andamento','In progress')}</span>
                </p>
                {!!k.assignees.length && <p className="mb-0 mt-1 break-words text-prose text-ink-muted" title={k.assignees.map(p=>p.fullName).join(', ')}>
                  {k.assignees.length===1 ? label('Responsável','Owner') : label('Responsáveis','Owners')}: <span className="text-ink">{k.assignees.slice(0,2).map(p=>p.fullName).join(', ')}{k.assignees.length>2 && ` +${k.assignees.length-2}`}</span>
                </p>}
              </div>
              {progress(k.title,k.progressPct,'sm:w-auto')}
              <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
                <button disabled={locked} className={cn(S.btnBrandSoft,'max-sm:w-full')} onClick={()=>checkin(k)}>{label('Registrar check-in','Record check-in')}</button>
                <button type="button" disabled={busy} className={cn(S.btnGhost,'max-sm:flex-1')} aria-expanded={detailId===k.id} aria-controls={detailId===k.id ? `okr-details-${k.id}` : undefined} onClick={()=>{setDetailId(detailId===k.id ? null : k.id);setHistory(null);}}>{detailId===k.id ? label('Fechar detalhes','Close details') : label('Ver detalhes','View details')}</button>
                <RowActionsMenu label={moreLabel(k.title)} disabled={locked} items={[
                  {id:'edit',label:label('Editar resultado-chave','Edit key result'),onSelect:()=>editKr(objective,k)},
                  {id:'delete',label:label('Excluir resultado-chave','Delete key result'),danger:true,onSelect:()=>remove('kr',k)},
                ]} />
              </div>
            </div>
            {detailId===k.id && <ContentEnter animKey={k.id} className="mt-3"><div id={`okr-details-${k.id}`} className="grid min-w-0 gap-4 rounded-control bg-canvas p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" role="region" aria-label={`${label('Detalhes','Details')}: ${k.title}`}>
              <div className="min-w-0">
                <p className={cn(S.label,'mb-2')}>{label('Medições','Measurements')}</p>
                <dl className="my-0 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={label('Medições','Measurements')}>
                  {[[label('Inicial','Baseline'),number(k.startValue),k.unit],[label('Meta','Target'),number(k.targetValue),k.unit],[label('Atual','Current'),number(k.currentValue),k.unit],[label('Peso','Weight'),k.weight,label('no objetivo','in objective')]].map(([name,value,sub])=><div key={name} className="min-w-0"><dt className="text-prose text-ink-muted">{name}</dt><dd className="m-0 break-words text-base font-semibold tabular-nums text-ink">{value}<span className="block text-prose font-normal text-ink-muted">{sub}</span></dd></div>)}
                </dl>
              </div>
              <div className="min-w-0">
                <p className={cn(S.label,'mb-2')}>{label('Responsáveis','Owners')}</p>
                <div className="flex flex-wrap items-center gap-2">{k.assignees.map(p=><span key={p.candidateId} className={cn('inline-flex min-h-touch max-w-full items-center gap-1 break-words rounded-control border border-ink/12 bg-surface pl-3 text-sm text-ink',k.assignees.length<2 && 'pr-3')}>{p.fullName}{k.assignees.length>1 && <button className="min-h-touch min-w-touch text-ink-muted hover:text-ink" disabled={locked} aria-label={`${label('Remover responsável','Remove owner')} ${p.fullName}`} onClick={()=>unassign(k,p)}>×</button>}</span>)}<button disabled={locked || k.assignees.length>=20} className={S.btnGhost} onClick={()=>assign(k)}>{label('Adicionar responsável','Add owner')}</button></div>
              </div>
              {k.notes && <div className="min-w-0 lg:col-span-2">
                <p className={cn(S.label,'mb-1')}>{label('Observação','Notes')}</p>
                <RichTextView html={asRichHtml(k.notes)} className="max-w-prose" />
              </div>}
              <div className="min-w-0 border-t border-ink/12 pt-3 lg:col-span-2">
                <button disabled={busy} aria-expanded={history?.id===k.id} className={S.btnGhost} onClick={()=>history?.id===k.id?setHistory(null):showHistory(k)}>{history?.id===k.id ? label('Ocultar histórico','Hide history') : label('Ver histórico de medições','View measurement history')}</button>
                {history?.id===k.id && <ContentEnter animKey={`h-${k.id}`} className="mt-3"><p className={cn(muted,'m-0')}>{label('Até 40 eventos recentes. Cada evento preserva a meta vigente na data.','Up to 40 recent events. Each event keeps its original target.')}</p><ol className="mt-3 grid list-none gap-4 p-0 md:grid-cols-2" aria-label={label('Histórico de medições','Measurement history')}>{history.items.map(h=><li key={h.id} className="break-words border-l-2 border-brand-500/30 pl-3 text-sm text-ink"><span className="block text-prose text-ink-muted">{new Date(h.createdAt).toLocaleString(locale)} · {h.actorName} · {h.eventKind==='created'?label('Criação','Created'):h.eventKind==='configuration'?label('Configuração','Configuration'):'Check-in'}</span><p className="my-1 font-medium tabular-nums">{label('Atual','Current')}: {number(h.currentValue)} {h.unit} · {pct(h.progressPct)}</p><p className="my-1 text-ink-muted">{label('Inicial','Baseline')}: {number(h.startValue)} → {label('Meta','Target')}: {number(h.targetValue)} {h.unit}</p>{h.note && <p className="my-1 whitespace-pre-wrap">{h.note}</p>}</li>)}</ol></ContentEnter>}
              </div>
            </div></ContentEnter>}
          </li>)}</ul>}
        </CollapsibleBlock></article>)}</div>}
        {!!area.activities?.length && <CollapsibleBlock locale={locale} className="mt-3" bordered={false} count={area.activities.length} title={label('Atividades anteriores (não entram nos novos OKRs)','Previous activities (excluded from new OKRs)')} titleClassName="font-ui text-prose text-ink-muted"><ul className="m-0 list-none space-y-1 p-0 pb-1">{area.activities.map(a=><li className={`${muted} break-words`} key={a.id}>{a.title} · {a.progressPct}%</li>)}</ul></CollapsibleBlock>}
      </section>)}
    </ContentEnter>}
  </section>;
}
