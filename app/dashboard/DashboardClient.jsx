'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TYPE_DATA, getCompat } from '../../lib/data';

import { PAGE_SIZE_OPTIONS } from '../../lib/assessment-filters';

const C = {
  bg:'#ffffff', card:'rgba(124,58,237,0.06)', border:'rgba(26,22,37,0.12)',
  purple:'#7C3AED', purpleLight:'#6D28D9', purpleDark:'#4C1D95',
  text:'#1a1625', muted:'rgba(26,22,37,0.62)', faint:'rgba(26,22,37,0.38)',
  synergy:'#15803d', tension:'#dc2626', neutral:'#7C3AED',
};

const S = {
  label:{ fontSize:'10px', letterSpacing:'3px', textTransform:'uppercase',
    color:'rgba(124,58,237,.55)', fontFamily:"'Courier New',monospace",
    marginBottom:'12px', display:'block' },
  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'16px',
    padding:'28px', backdropFilter:'blur(16px)' },
};

const Bar = ({ value, max, color, h=6 }) => (
  <div style={{ width:'100%', height:h, background:'rgba(26,22,37,.08)', borderRadius:h/2, overflow:'hidden' }}>
    <div style={{ height:'100%', width:`${(value/Math.max(max,1))*100}%`,
      background:`linear-gradient(90deg,${color}99,${color})`, borderRadius:h/2 }}/>
  </div>
);

const TypeBadge = ({ type }) => {
  const d = TYPE_DATA[type];
  return (
    <span
      title={d?.name ? `${d.name} (T${type})` : `T${type}`}
      style={{ padding:'3px 10px', fontSize:'11px', borderRadius:'20px',
      display:'inline-flex', alignItems:'center', gap:'4px',
      background:`${d.color}18`, border:`1px solid ${d.color}44`,
      color:d.color, fontFamily:'monospace' }}>
      {d.emoji} {d.short}
    </span>
  );
};

const CompatBadge = ({ level }) => {
  const map = { synergy:{label:'Sinergia',color:C.synergy}, tension:{label:'Tensão',color:C.tension}, neutral:{label:'Neutro',color:C.neutral} };
  const m = map[level];
  return <span style={{ padding:'2px 9px', fontSize:'10px', borderRadius:'20px',
    background:`${m.color}18`, border:`1px solid ${m.color}44`, color:m.color, fontFamily:'monospace' }}>{m.label}</span>;
};

export default function DashboardClient({
  results,
  areas = [],
  companies = [],
  counts = [],
  vacancies = [],
  selectedArea = 'all',
  selectedVacancy = 'all',
  selectedCompany = 'all',
  pagination = { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  compatMetrics = {
    pairs: [],
    tensions: [],
    synergies: [],
    typeCount: {},
    total: 0,
  },
  interactionPeople = [],
  selectedEnneagram = 'all',
  analytics = null,
  auth = null,
}) {
  const [tab, setTab] = useState('overview');
  const router = useRouter();
  const [area, setArea] = useState(selectedArea);
  const [vacancy, setVacancy] = useState(selectedVacancy);
  const [company, setCompany] = useState(selectedCompany);
  const [enneagram, setEnneagram] = useState(selectedEnneagram);
  const [groupBaseId, setGroupBaseId] = useState(null);
  const [groupIds, setGroupIds] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method:'POST' });
    router.push('/');
  };

  const isAdmin = (auth?.role || '') === 'admin';
  const canManage = ['admin','hr','direction'].includes(auth?.role || '');

  useEffect(() => {
    setArea(selectedArea);
  }, [selectedArea]);
  useEffect(() => {
    setVacancy(selectedVacancy);
  }, [selectedVacancy]);
  useEffect(() => {
    setCompany(selectedCompany);
  }, [selectedCompany]);
  useEffect(() => {
    setEnneagram(selectedEnneagram);
  }, [selectedEnneagram]);

  const buildSearchParams = (opts = {}) => {
    const nextArea = opts.area ?? area;
    const nextVacancy = opts.vacancy ?? vacancy;
    const nextCompany = opts.company ?? company;
    const nextEnneagram = opts.enneagram ?? enneagram;
    const nextPage = opts.page != null ? opts.page : pagination.page;
    const nextPageSize = opts.pageSize != null ? opts.pageSize : pagination.pageSize;
    const sp = new URLSearchParams();
    if (isAdmin && nextCompany && nextCompany !== 'all') sp.set('company', nextCompany);
    if (nextArea && nextArea !== 'all') sp.set('area', nextArea);
    if (nextVacancy && nextVacancy !== 'all') sp.set('vacancy', nextVacancy);
    if (nextEnneagram && nextEnneagram !== 'all') sp.set('enneagram', nextEnneagram);
    sp.set('page', String(Math.max(1, nextPage)));
    sp.set('pageSize', String(nextPageSize));
    return sp;
  };

  const navigateWith = (opts) => {
    const sp = buildSearchParams(opts);
    router.push(`/dashboard?${sp.toString()}`);
  };

  const pushFilters = (next) => {
    navigateWith({
      ...(next?.company != null ? { company: next.company } : {}),
      ...(next?.area != null ? { area: next.area } : {}),
      ...(next?.vacancy != null ? { vacancy: next.vacancy } : {}),
      ...(next?.enneagram != null ? { enneagram: next.enneagram } : {}),
      page: 1,
    });
  };

  const pushPagination = (opts) => {
    navigateWith({
      page: opts.page ?? pagination.page,
      pageSize: opts.pageSize ?? pagination.pageSize,
    });
  };

  const pairs = compatMetrics.pairs || [];
  const tensions = compatMetrics.tensions || [];
  const synergies = compatMetrics.synergies || [];
  const typeCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  Object.assign(typeCount, compatMetrics.typeCount || {});
  const maxCount = Math.max(...Object.values(typeCount), 1);
  const listTotal = compatMetrics.total ?? 0;

  const byAssessmentId = {};
  interactionPeople.forEach((r) => {
    byAssessmentId[String(r.assessmentId)] = r;
  });

  const groupBase = groupBaseId ? byAssessmentId[String(groupBaseId)] : null;
  const groupMembers = groupIds.map((id) => byAssessmentId[String(id)]).filter(Boolean);

  const suggestions = groupBase
    ? interactionPeople
        .filter((r) => String(r.assessmentId) !== String(groupBase.assessmentId))
        .filter((r) => !dismissedIds.includes(String(r.assessmentId)))
        .map((r) => ({ person: r, compat: getCompat(groupBase.topType, r.topType) }))
        .sort((x, y) => {
          const order = { synergy: 0, neutral: 1, tension: 2 };
          return (order[x.compat.level] ?? 9) - (order[y.compat.level] ?? 9);
        })
    : [];

  const groupPairs = [];
  for (let i = 0; i < groupMembers.length; i++) {
    for (let j = i + 1; j < groupMembers.length; j++) {
      const c = getCompat(groupMembers[i].topType, groupMembers[j].topType);
      groupPairs.push({ a: groupMembers[i], b: groupMembers[j], compat: c });
    }
  }
  const groupTensions = groupPairs.filter((p) => p.compat.level === 'tension');

  const compareQueryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (isAdmin && company && company !== 'all') sp.set('company', company);
    if (area && area !== 'all') sp.set('area', area);
    if (vacancy && vacancy !== 'all') sp.set('vacancy', vacancy);
    if (enneagram && enneagram !== 'all') sp.set('enneagram', enneagram);
    return sp.toString();
  }, [isAdmin, company, area, vacancy, enneagram]);

  const Tab = ({id,label}) => (
    <button onClick={()=>setTab(id)} style={{
      padding:'8px 16px', background:tab===id?C.purple:'transparent',
      border:tab===id?'none':`1px solid ${C.border}`, borderRadius:'8px',
      color:tab===id?'#fff':C.muted, fontSize:'11px', cursor:'pointer',
      fontFamily:'monospace', letterSpacing:'1px', textTransform:'uppercase' }}>
      {label}
    </button>
  );

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:"'Georgia','Times New Roman',serif",
      color:C.text, padding:'32px 24px 60px' }}>
      <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, pointerEvents:'none',
        background:`radial-gradient(ellipse at 15% 25%,rgba(124,58,237,.06) 0%,transparent 55%)` }}/>
      <div style={{ maxWidth:'920px', margin:'0 auto', position:'relative', zIndex:1 }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
          flexWrap:'wrap', gap:'16px', marginBottom:'28px' }}>
          <div>
            <span style={S.label}>◈ 30Team · Dashboard</span>
            <h2 style={{ fontSize:'32px', fontWeight:'normal', marginBottom:'4px',
              background:'linear-gradient(135deg,#E8E0FF,#A78BFA 55%,#7C3AED)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              Resultados da Equipe
            </h2>
            <span style={{ fontSize:'13px', color:C.muted }}>
              {listTotal} {listTotal === 1 ? 'avaliação com os filtros atuais' : 'avaliações com os filtros atuais'}
              {pagination.total > 0 ? (
                <span style={{ color: C.faint }}>
                  {' '}· página {pagination.page} de {pagination.totalPages} ({pagination.pageSize} por página na Equipe)
                </span>
              ) : null}
            </span>
          </div>
          <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
            {isAdmin && companies.length > 0 ? (
              <select
                value={company}
                onChange={(e) => {
                  const v = e.target.value;
                  setCompany(v);
                  pushFilters({ company: v });
                }}
                style={{ background:'rgba(26,22,37,.05)', border:`1px solid ${C.border}`,
                  borderRadius:'10px', padding:'10px 14px', color:C.muted,
                  fontSize:'12px', cursor:'pointer', fontFamily:"'Georgia',serif" }}
              >
                <option value="all">Todas as empresas</option>
                {companies.map((co) => (
                  <option key={co.id} value={String(co.id)}>
                    {co.name}
                  </option>
                ))}
              </select>
            ) : null}
            <select value={area} onChange={(e)=>{ const v=e.target.value; setArea(v); pushFilters({ area: v }); }}
              style={{ background:'rgba(26,22,37,.05)', border:`1px solid ${C.border}`,
                borderRadius:'10px', padding:'10px 14px', color:C.muted,
                fontSize:'12px', cursor:'pointer', fontFamily:"'Georgia',serif" }}>
              <option value="all">Todas as áreas</option>
              {areas.map(a=>(
                <option key={a.key} value={a.key}>
                  {a.label} ({counts.find(c=>c.key===a.key)?.count ?? 0})
                </option>
              ))}
            </select>
            <select value={vacancy} onChange={(e)=>{ const v=e.target.value; setVacancy(v); pushFilters({ vacancy: v }); }}
              style={{ background:'rgba(26,22,37,.05)', border:`1px solid ${C.border}`,
                borderRadius:'10px', padding:'10px 14px', color:C.muted,
                fontSize:'12px', cursor:'pointer', fontFamily:"'Georgia',serif" }}>
              <option value="all">Todas as vagas</option>
              {vacancies.map(v=>(
                <option key={v.id} value={String(v.id)}>
                  {v.title} {v.status === 'closed' ? '(fechada)' : ''}
                </option>
              ))}
            </select>
            <select
              value={enneagram}
              onChange={(e) => {
                const v = e.target.value;
                setEnneagram(v);
                pushFilters({ enneagram: v });
              }}
              style={{ background:'rgba(26,22,37,.05)', border:`1px solid ${C.border}`,
                borderRadius:'10px', padding:'10px 14px', color:C.muted,
                fontSize:'12px', cursor:'pointer', fontFamily:"'Georgia',serif" }}>
              <option value="all">Todos os perfis (T1–T9)</option>
              {[1,2,3,4,5,6,7,8,9].map(t=>(
                <option key={t} value={String(t)}>
                  T{t} · {TYPE_DATA[t].short}
                </option>
              ))}
            </select>
            <a
              href={`/api/admin/export?area=${encodeURIComponent(area)}${
                isAdmin && company !== 'all' ? `&company=${encodeURIComponent(company)}` : ''
              }`}
              style={{ background:'rgba(26,22,37,.05)', border:`1px solid ${C.border}`,
                borderRadius:'10px', padding:'10px 14px', color:C.muted,
                fontSize:'12px', cursor:'pointer', fontFamily:"'Georgia',serif",
                textDecoration:'none', display:'inline-block' }}
            >
              Exportar CSV
            </a>
            <button onClick={logout}
              style={{ background:'rgba(26,22,37,.05)', border:`1px solid ${C.border}`,
                borderRadius:'10px', padding:'10px 20px', color:C.muted,
                fontSize:'12px', cursor:'pointer', fontFamily:"'Georgia',serif" }}>
              Sair →
            </button>
          </div>
        </div>

        {listTotal > 0 ? (
          <div style={{ ...S.card, padding: '16px 22px', marginBottom: '18px', display: 'flex',
            flexWrap: 'wrap', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
              Itens por página (Equipe)
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <select
                value={String(pagination.pageSize)}
                onChange={(e) => {
                  const ps = parseInt(e.target.value, 10);
                  pushPagination({ page: 1, pageSize: ps });
                }}
                style={{ background: 'rgba(26,22,37,.05)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '8px 12px', color: C.muted, fontSize: '12px',
                  cursor: 'pointer', fontFamily: 'monospace' }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={String(n)}>{n}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => pushPagination({ page: pagination.page - 1 })}
                  style={{ background: pagination.page <= 1 ? 'transparent' : `${C.purple}18`,
                    border: `1px solid ${pagination.page <= 1 ? C.border : `${C.purple}55`}`,
                    borderRadius: '10px', padding: '8px 14px', color: pagination.page <= 1 ? C.faint : C.purple,
                    fontSize: '12px', cursor: pagination.page <= 1 ? 'default' : 'pointer', fontFamily: 'monospace' }}
                >
                  Anterior
                </button>
                <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace', minWidth: '100px', textAlign: 'center' }}>
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => pushPagination({ page: pagination.page + 1 })}
                  style={{ background: pagination.page >= pagination.totalPages ? 'transparent' : `${C.purple}18`,
                    border: `1px solid ${pagination.page >= pagination.totalPages ? C.border : `${C.purple}55`}`,
                    borderRadius: '10px', padding: '8px 14px',
                    color: pagination.page >= pagination.totalPages ? C.faint : C.purple,
                    fontSize: '12px',
                    cursor: pagination.page >= pagination.totalPages ? 'default' : 'pointer', fontFamily: 'monospace' }}
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <>
          <div style={{ display:'flex', gap:'8px', marginBottom:'24px', flexWrap:'wrap' }}>
            <Tab id="overview"      label="Visão Geral"/>
            <Tab id="team"          label="Equipe"/>
            <Tab id="compatibility" label="Compatibilidade"/>
            <Tab id="compare"       label="Comparativo"/>
            <Tab id="group"         label="Grupos"/>
            <Tab id="leadership"    label="Liderança"/>
            {canManage && <Tab id="vacancies"   label="Vagas"/>}
            {isAdmin && <Tab id="companies"    label="Empresas"/>}
          </div>

          {compatMetrics.total === 0 && tab !== 'companies' && tab !== 'vacancies' ? (
            <div style={{...S.card, textAlign:'center', padding:'60px'}}>
              <div style={{ fontSize:'40px', marginBottom:'16px' }}>🌑</div>
              <p style={{ color:C.muted, fontStyle:'italic' }}>
                Nenhum resultado ainda.<br/>Compartilhe o link com sua equipe.
              </p>
            </div>
          ) : (
            <>
              {tab==='leadership'    && <LeadershipTab analytics={analytics}/>}
              {tab==='overview'      && <OverviewTab typeCount={typeCount} maxCount={maxCount} distributionTotal={listTotal} tensions={tensions} synergies={synergies}/>}
              {tab==='team'          && <TeamTab results={results}/>}
              {tab==='compatibility' && <CompatTab tensions={tensions} synergies={synergies} pairs={pairs}/>}
              {tab==='compare'       && <CompareTabLoader queryString={compareQueryString}/>}
              {tab==='vacancies'     && canManage && <VacanciesAdminTab isAdmin={isAdmin}/>}
              {tab==='companies'     && isAdmin && <CompaniesAdminTab/>}
              {tab==='group'         && (
                <GroupTab
                  results={interactionPeople}
                  groupBase={groupBase}
                  setGroupBaseId={setGroupBaseId}
                  groupIds={groupIds}
                  setGroupIds={setGroupIds}
                  dismissedIds={dismissedIds}
                  setDismissedIds={setDismissedIds}
                  suggestions={suggestions}
                  groupTensions={groupTensions}
                />
              )}
            </>
          )}
        </>
      </div>
    </div>
  );
}

function LeadershipTab({ analytics }) {
  const hasData = analytics && analytics.kpis && analytics.kpis.assessments > 0;
  if (!hasData) {
    return (
      <div style={{ ...S.card, textAlign: 'center', padding: '48px' }}>
        <span style={S.label}>Analytics para liderança</span>
        <p style={{ color: C.muted, fontSize: '14px', marginTop: '12px', lineHeight: 1.6 }}>
          Ainda não há avaliações suficientes para montar o painel executivo.
        </p>
      </div>
    );
  }

  const { kpis, monthlyTrend, globalTopTypeCounts: gCounts, globalTotal, areaSummaries, leadershipPotentials = [] } = analytics;
  const maxMonthly = Math.max(...monthlyTrend.map((m) => m.cnt), 1);
  const maxG = Math.max(...Object.values(gCounts), 1);
  const gTot = globalTotal || 1;

  const Kpi = ({ icon, value, label, hint }) => (
    <div style={{ ...S.card, padding: '22px' }}>
      <div style={{ fontSize: '22px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '28px', color: C.purpleLight, fontFamily: 'monospace', marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
      {hint && <div style={{ fontSize: '11px', color: C.faint, marginTop: '8px', lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...S.card, padding: '22px 28px' }}>
        <span style={S.label}>Analytics para liderança</span>
        <p style={{ fontSize: '13px', color: C.muted, marginTop: '10px', lineHeight: 1.65, marginBottom: 0 }}>
          Consolida todas as avaliações cadastradas — não aplica os filtros de área, vaga ou perfil do topo.
          Se você for admin e escolher uma empresa no cabeçalho, estes números ficam restritos a essa empresa.
          Use para ver volume, distribuição de tipos por área, tendência mensal e aderência média às rubricas definidas.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <Kpi icon="📊" value={kpis.assessments} label="Avaliações" hint="Total de testes concluídos (inclui re-testes)." />
        <Kpi icon="👤" value={kpis.candidates} label="Candidatos únicos" hint="Pessoas distintas com pelo menos uma avaliação." />
        <Kpi icon="🏢" value={kpis.areasActive} label="Áreas com dados" hint="Áreas com pelo menos uma avaliação." />
      </div>

      {leadershipPotentials.length > 0 ? (
        <div style={{ ...S.card }}>
          <span style={S.label}>Potenciais líderes por empresa</span>
          <p style={{ fontSize: '12px', color: C.faint, marginTop: '8px', marginBottom: '18px', lineHeight: 1.65 }}>
            Indicativo automático por empresa: usa a <span style={{ color: C.text }}>avaliação mais recente</span> de cada
            pessoa e calcula um score 0–10 a partir do perfil completo (não só o tipo dominante), ponderando tipos associados a direção, decisão,
            execução e confiabilidade (ex.: Realizador, Desafiador, Leal, Perfeccionista). Serve como ponto de partida para conversas de sucessão —
            não substitui julgamento de competência ou contexto.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {leadershipPotentials.map((co) => (
              <div
                key={String(co.companyId)}
                style={{
                  background: 'rgba(26,22,37,.03)',
                  border: `1px solid ${C.border}`,
                  borderRadius: '12px',
                  padding: '16px 18px',
                }}
              >
                <div style={{ fontSize: '13px', color: C.text, marginBottom: '12px', fontFamily: 'monospace' }}>
                  {co.companyName}
                  <span style={{ color: C.faint, marginLeft: '8px' }}>#{co.companyId}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '420px' }}>
                    <thead>
                      <tr>
                        {['Pessoa', 'Tipo dominante', 'Indicador', 'Faixa'].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: 'left',
                              padding: '8px 10px',
                              color: C.muted,
                              fontWeight: 'normal',
                              fontFamily: 'monospace',
                              borderBottom: `1px solid ${C.border}`,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {co.people.map((p) => (
                        <tr key={`${co.companyId}-${p.candidateId}`} style={{ borderBottom: '1px solid rgba(26,22,37,.07)' }}>
                          <td style={{ padding: '10px', color: C.text, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.name}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <TypeBadge type={p.topType} />
                          </td>
                          <td
                            style={{ padding: '10px', color: C.purpleLight, fontFamily: 'monospace' }}
                            title="Score heurístico 0–10 (ver texto acima)."
                          >
                            {p.leadership010}/10
                          </td>
                          <td style={{ padding: '10px', color: C.muted, fontFamily: 'monospace' }}>{p.leadershipLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ ...S.card }}>
        <span style={S.label}>Volume mensal</span>
        <p style={{ fontSize: '11px', color: C.faint, marginTop: '6px', marginBottom: '16px' }}>
          Contagem de avaliações por mês (data de conclusão no servidor).
        </p>
        {monthlyTrend.length === 0 ? (
          <p style={{ color: C.muted, fontStyle: 'italic', fontSize: '13px' }}>Sem série temporal.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {monthlyTrend.map((m) => (
              <div key={m.period} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '72px', fontSize: '12px', color: C.muted, fontFamily: 'monospace', flexShrink: 0 }}>{m.period}</span>
                <div style={{ flex: 1 }}>
                  <Bar value={m.cnt} max={maxMonthly} color={C.purple} h={8} />
                </div>
                <span style={{ width: '36px', textAlign: 'right', fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>{m.cnt}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div style={{ ...S.card }}>
          <span style={S.label}>Distribuição global (tipo dominante)</span>
          <p style={{ fontSize: '11px', color: C.faint, marginTop: '6px', marginBottom: '14px' }}>
            Soma de todas as áreas — tipo com maior pontuação em cada avaliação.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9]
              .filter((t) => (gCounts[t] || 0) > 0)
              .sort((a, b) => (gCounts[b] || 0) - (gCounts[a] || 0))
              .map((t) => {
                const d = TYPE_DATA[t];
                const c = gCounts[t] || 0;
                return (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      title={d?.name ? `${d.name} (T${t})` : `T${t}`}
                      style={{
                        width: '160px',
                        fontSize: '12px',
                        color: d.color,
                        flexShrink: 0,
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span style={{ width: '22px', textAlign: 'center', flexShrink: 0 }}>{d.emoji}</span>
                      <span style={{ minWidth: 0 }}>{d.short}</span>
                    </span>
                    <div style={{ flex: 1 }}>
                      <Bar value={c} max={maxG} color={d.color} h={8} />
                    </div>
                    <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace', width: '28px', textAlign: 'right' }}>{c}</span>
                    <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace', width: '40px', textAlign: 'right' }}>
                      {Math.round((c / gTot) * 100)}%
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        <div style={{ ...S.card }}>
          <span style={S.label}>Diversidade cognitiva por área</span>
          <p style={{ fontSize: '11px', color: C.faint, marginTop: '6px', marginBottom: '14px', lineHeight: 1.55 }}>
            Índice 0–100% derivado da entropia de Shannon na distribuição dos tipos dominantes (100% = mistura mais uniforme entre T1–T9).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {areaSummaries.map((row) => (
              <div key={row.areaKey} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ flex: '0 0 38%', fontSize: '12px', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.areaLabel}
                </span>
                <div style={{ flex: 1 }}>
                  <Bar value={row.diversity01} max={1} color={C.synergy} h={8} />
                </div>
                <span style={{ width: '44px', textAlign: 'right', fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
                  {Math.round(row.diversity01 * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...S.card, overflow: 'hidden' }}>
        <span style={S.label}>Por área — resumo executivo</span>
        <div style={{ overflowX: 'auto', marginTop: '14px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '640px' }}>
            <thead>
              <tr>
                {['Área', 'N', 'Dominante', 'Diversidade', 'Fit médio (rubrica)', 'Topos rubrica'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      color: C.muted,
                      fontWeight: 'normal',
                      fontFamily: 'monospace',
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {areaSummaries.map((row) => (
                <tr key={row.areaKey} style={{ borderBottom: '1px solid rgba(26,22,37,.07)' }}>
                  <td style={{ padding: '10px 12px', color: C.text }}>{row.areaLabel}</td>
                  <td style={{ padding: '10px 12px', color: C.muted, fontFamily: 'monospace' }}>{row.n}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {row.dominantType ? <TypeBadge type={row.dominantType} /> : <span style={{ color: C.faint }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', color: C.muted, fontFamily: 'monospace' }}>
                    {Math.round(row.diversity01 * 100)}%
                  </td>
                  <td style={{ padding: '10px 12px', color: C.muted, fontFamily: 'monospace' }}>
                    {row.avgFit010 != null ? `${row.avgFit010}/10` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', color: C.muted, fontFamily: 'monospace' }}>
                    {row.rubricAlignPct != null ? `${row.rubricAlignPct}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '11px', color: C.faint, marginTop: '14px', lineHeight: 1.65, fontStyle: 'italic', marginBottom: 0 }}>
          “Topos rubrica”: percentual de avaliações cujo tipo dominante está entre os tipos mais valorados na rubrica da área (peso ≥ 92% do maior peso).
          Fit médio usa a mesma fórmula de aderência 0–10 do restante do dashboard.
        </p>
      </div>
    </div>
  );
}

function CompareTabLoader({ queryString }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr('');
    const q = queryString ? `?${queryString}` : '';
    fetch(`/api/admin/assessment-rows${q}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) throw new Error(d?.error || 'Falha ao carregar');
        setRows(Array.isArray(d.rows) ? d.rows : []);
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.message || 'Erro');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [queryString]);

  if (loading) {
    return (
      <div style={{ ...S.card, textAlign: 'center', padding: '40px' }}>
        <p style={{ color: C.muted, margin: 0 }}>Carregando dados do comparativo…</p>
      </div>
    );
  }
  if (err) {
    return (
      <div style={{ ...S.card, textAlign: 'center', padding: '40px' }}>
        <p style={{ color: C.tension, margin: 0 }}>{err}</p>
      </div>
    );
  }
  return <CompareTab results={rows} />;
}

function OverviewTab({ typeCount, maxCount, distributionTotal, tensions, synergies }) {
  const denom = Math.max(
    distributionTotal || 0,
    Object.values(typeCount).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0),
    1,
  );
  const top = Object.entries(typeCount).sort((a,b)=>b[1]-a[1]).find(([,c])=>c>0);
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
      <div style={{...S.card, gridColumn:'1/-1'}}>
        <span style={S.label}>Distribuição de tipos</span>
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          {Object.entries(typeCount).filter(([,c])=>c>0).sort((a,b)=>b[1]-a[1]).map(([t,c])=>{
            const d=TYPE_DATA[parseInt(t)];
            return (
              <div key={t} style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <span
                  title={d?.name ? `${d.name} (T${t})` : `T${t}`}
                  style={{
                    width:'160px',
                    fontSize:'12px',
                    color:d.color,
                    flexShrink:0,
                    fontFamily:'monospace',
                    whiteSpace:'nowrap',
                    overflow:'hidden',
                    textOverflow:'ellipsis',
                    display:'inline-flex',
                    alignItems:'center',
                    gap:'8px',
                  }}
                >
                  <span style={{ width:'22px', textAlign:'center', flexShrink:0 }}>{d.emoji}</span>
                  <span style={{ minWidth:0 }}>{d.short}</span>
                </span>
                <div style={{ flex:1 }}><Bar value={c} max={maxCount} color={d.color} h={10}/></div>
                <span style={{ fontSize:'13px', color:C.muted, fontFamily:'monospace', width:'20px', textAlign:'right' }}>{c}</span>
                <span style={{ fontSize:'11px', color:C.faint, fontFamily:'monospace', width:'36px', textAlign:'right' }}>
                  {Math.round((c / denom) * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={S.card}>
        <span style={S.label}>Alertas rápidos</span>
        {[{icon:'⚠️',n:tensions.length,c:C.tension,l:'Pares em tensão'},
          {icon:'✅',n:synergies.length,c:C.synergy,l:'Parcerias naturais'},
          {icon:'👥',n:Object.values(typeCount).filter(c=>c>0).length,c:C.purpleLight,l:'Tipos presentes'}
        ].map(x=>(
          <div key={x.l} style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
            <span style={{ fontSize:'20px' }}>{x.icon}</span>
            <div>
              <div style={{ fontSize:'22px', color:x.c }}>{x.n}</div>
              <div style={{ fontSize:'11px', color:C.muted, fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'1px' }}>{x.l}</div>
            </div>
          </div>
        ))}
      </div>
      {top&&(()=>{
        const d=TYPE_DATA[parseInt(top[0])];
        return (
          <div style={{...S.card, background:`${d.color}08`, border:`1px solid ${d.color}25`}}>
            <span style={{...S.label, color:`${d.color}70`}}>Tipo dominante</span>
            <div style={{ fontSize:'32px', marginBottom:'8px' }}>{d.emoji}</div>
            <h3 style={{ fontSize:'18px', color:d.color, fontWeight:'normal', marginBottom:'8px' }}>{d.name}</h3>
            <p style={{ fontSize:'13px', color:C.muted, lineHeight:1.6, margin:0 }}>{d.team}</p>
          </div>
        );
      })()}
    </div>
  );
}

function TeamTab({ results }) {
  const [open, setOpen] = useState(null);
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const deleteCandidate = async (candidateId, name) => {
    const id = String(candidateId || '').trim();
    if (!id) return;
    const ok = window.confirm(`Excluir "${name}" e todas as respostas/avaliações associadas? Essa ação não pode ser desfeita.`);
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/candidates/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Falha ao excluir');
      router.refresh();
    } catch (e) {
      window.alert(e?.message || 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
      {results.map((r) => {
        const id = String(r.assessmentId);
        const d = TYPE_DATA[r.topType];
        const isOpen = open === id;
        const sorted = Object.entries(r.scores || {}).sort((a, b) => b[1] - a[1]);
        const second = sorted[1];
        const maxS = sorted[0] ? parseInt(sorted[0][1], 10) : 0;
        return (
          <div key={id} style={{...S.card, padding:0, overflow:'hidden', cursor:'pointer',
            border:isOpen?`1px solid ${d.color}44`:`1px solid ${C.border}`}}
            onClick={()=>setOpen(isOpen?null:id)}>
            <div style={{ display:'flex', alignItems:'center', gap:'16px', padding:'18px 24px' }}>
              <div style={{ fontSize:'24px', flexShrink:0 }}>{d.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'15px', marginBottom:'4px' }}>{r.name}</div>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
                  <TypeBadge type={r.topType}/>
                  {r.areaLabel && (
                    <span style={{ padding:'3px 10px', fontSize:'11px', borderRadius:'20px',
                      background:'rgba(26,22,37,.04)', border:`1px solid ${C.border}`,
                      color:C.muted, fontFamily:'monospace' }}>
                      {r.areaLabel}
                    </span>
                  )}
                  {r.fitLabel && (
                    <span style={{ padding:'3px 10px', fontSize:'11px', borderRadius:'20px',
                      background:`${C.purple}18`, border:`1px solid ${C.purple}44`,
                      color:C.purpleLight, fontFamily:'monospace' }}>
                      Fit: {r.fitLabel}
                    </span>
                  )}
                  {r.areaFitScore010 !== null && r.areaFitScore010 !== undefined && (
                    <span style={{ padding:'3px 10px', fontSize:'11px', borderRadius:'20px',
                      background:'rgba(71,232,123,.08)', border:'1px solid rgba(71,232,123,.25)',
                      color:'rgba(71,232,123,.95)', fontFamily:'monospace' }}>
                      Aderência: {r.areaFitScore010}/10
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                {r.candidateId ? (
                  <button
                    type="button"
                    onClick={(e)=>{ e.stopPropagation(); deleteCandidate(r.candidateId, r.name); }}
                    disabled={deleting}
                    title="Excluir pessoa e respostas"
                    aria-label="Excluir pessoa e respostas"
                    style={{
                      background:'rgba(232,71,71,.08)',
                      border:'1px solid rgba(232,71,71,.35)',
                      borderRadius:'10px',
                      padding:'8px 10px',
                      color:C.tension,
                      fontSize:'11px',
                      cursor:'pointer',
                      fontFamily:'monospace',
                      opacity: deleting ? 0.6 : 1,
                    }}
                  >
                    Excluir
                  </button>
                ) : null}
                <span style={{ fontSize:'11px', color:C.muted, fontFamily:'monospace' }}>{isOpen?'▲':'▼'}</span>
              </div>
            </div>
            {isOpen&&(
              <div style={{ borderTop:`1px solid ${C.border}`, padding:'20px 24px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'20px' }}>
                  <div>
                    <span style={{...S.label,marginBottom:'8px'}}>Pontos fortes</span>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                      {d.strengths.slice(0,3).map(s=>(
                        <span key={s} style={{ padding:'3px 10px', background:`${d.color}15`,
                          border:`1px solid ${d.color}35`, borderRadius:'20px', fontSize:'11px', color:d.color }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span style={{...S.label,marginBottom:'8px'}}>Ala secundária</span>
                    {second&&<TypeBadge type={parseInt(second[0])}/>}
                  </div>
                </div>
                <div style={{ background:`${d.color}0a`, border:`1px solid ${d.color}20`,
                  borderRadius:'10px', padding:'14px 16px', marginBottom:'16px' }}>
                  <span style={{...S.label,marginBottom:'6px',color:`${d.color}70`}}>Contribuição para a equipe</span>
                  <p style={{ fontSize:'13px', color:C.muted, lineHeight:1.65, margin:0 }}>{d.team}</p>
                </div>
                <span style={{...S.label,marginBottom:'8px'}}>Pontuação por tipo</span>
                <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
                  {sorted.map(([t,s])=>(
                    <div key={t} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <span
                        title={TYPE_DATA?.[parseInt(t)]?.name ? `${TYPE_DATA[parseInt(t)].name} (T${t})` : `T${t}`}
                        style={{ width:'60px', fontSize:'10px', color:TYPE_DATA[parseInt(t)].color, fontFamily:'monospace' }}
                      >
                        {TYPE_DATA[parseInt(t)].emoji} T{t}
                      </span>
                      <div style={{ flex:1 }}><Bar value={parseInt(s)} max={maxS} color={TYPE_DATA[parseInt(t)].color} h={5}/></div>
                      <span style={{ fontSize:'10px', color:C.muted, fontFamily:'monospace', width:'24px', textAlign:'right' }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CompatTab({ tensions, synergies, pairs }) {
  const [section, setSection] = useState('tensions');
  const SecBtn=({id,label,count,color})=>(
    <button onClick={()=>setSection(id)} style={{
      padding:'8px 16px', display:'flex', alignItems:'center', gap:'8px',
      background:section===id?`${color}20`:'rgba(26,22,37,.04)',
      border:`1px solid ${section===id?color:C.border}`,
      borderRadius:'10px', color:section===id?color:C.muted, fontSize:'12px',
      cursor:'pointer', fontFamily:'monospace' }}>
      {label} <span style={{ background:`${color}30`, padding:'1px 7px', borderRadius:'10px', fontSize:'11px' }}>{count}</span>
    </button>
  );
  const display=section==='tensions'?tensions:section==='synergies'?synergies:pairs;
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'20px' }}>
        {[{l:'Pares em tensão',n:tensions.length,c:C.tension,i:'⚠️',d:'Risco de atrito interpessoal'},
          {l:'Parcerias naturais',n:synergies.length,c:C.synergy,i:'✅',d:'Alta complementaridade'},
          {l:'Total de pares',n:pairs.length,c:C.purpleLight,i:'👥',d:'Combinações analisadas'}
        ].map(x=>(
          <div key={x.l} style={{ background:C.card, border:`1px solid ${x.c}25`, borderRadius:'14px', padding:'20px' }}>
            <div style={{ fontSize:'22px', marginBottom:'6px' }}>{x.i}</div>
            <div style={{ fontSize:'26px', color:x.c, marginBottom:'4px' }}>{x.n}</div>
            <div style={{ fontSize:'11px', color:C.muted, fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px' }}>{x.l}</div>
            <div style={{ fontSize:'11px', color:C.faint }}>{x.d}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'20px', flexWrap:'wrap' }}>
        <SecBtn id="tensions"  label="Tensões"        count={tensions.length}  color={C.tension}/>
        <SecBtn id="synergies" label="Sinergias"      count={synergies.length} color={C.synergy}/>
        <SecBtn id="all"       label="Todos os pares" count={pairs.length}     color={C.purpleLight}/>
      </div>
      {display.length===0?(
        <div style={{...S.card, textAlign:'center', padding:'40px'}}>
          <p style={{ color:C.muted, fontStyle:'italic' }}>Nenhum par nessa categoria.</p>
        </div>
      ):(
        display.map((pair,i)=>{
          const {a,b,compat}=pair;
          const lc={synergy:C.synergy,tension:C.tension,neutral:C.neutral}[compat.level];

          const PersonCard = ({ person }) => {
            const d = TYPE_DATA[person.topType];
            return (
              <div style={{ background:'rgba(26,22,37,.03)', border:`1px solid ${C.border}`,
                borderRadius:'12px', padding:'14px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                  <div style={{ fontSize:'22px' }}>{d.emoji}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:'13px', color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {person.name}
                    </div>
                    <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                      <TypeBadge type={person.topType}/>
                      {person.areaLabel && (
                        <span style={{ padding:'2px 8px', fontSize:'10px', borderRadius:'20px',
                          background:'rgba(26,22,37,.04)', border:`1px solid ${C.border}`,
                          color:C.muted, fontFamily:'monospace' }}>
                          {person.areaLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize:'12px', color:C.faint, lineHeight:1.6, margin:0 }}>
                  {d.team}
                </p>
              </div>
            );
          };

          return (
            <div key={i} style={{ background:C.card, border:`1px solid ${lc}30`,
              borderRadius:'14px', padding:'18px 18px', marginBottom:'12px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                flexWrap:'wrap', gap:'12px', marginBottom:'12px' }}>
                <div style={{ fontSize:'12px', color:lc, fontFamily:'monospace',
                  letterSpacing:'1px', textTransform:'uppercase' }}>{compat.title}</div>
                <CompatBadge level={compat.level}/>
              </div>

              {compat.level === 'tension' ? (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 56px 1fr', gap:'10px', alignItems:'stretch' }}>
                  <PersonCard person={a}/>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', color:C.faint, fontFamily:'monospace' }}>×</div>
                  <PersonCard person={b}/>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'10px' }}>
                  <TypeBadge type={a.topType}/><span style={{ color:C.muted, fontSize:'13px' }}>{a.name.split(' ')[0]}</span>
                  <span style={{ color:C.faint }}>×</span>
                  <TypeBadge type={b.topType}/><span style={{ color:C.muted, fontSize:'13px' }}>{b.name.split(' ')[0]}</span>
                </div>
              )}

              <p style={{ fontSize:'13px', color:C.muted, lineHeight:1.65, margin:'12px 0 0' }}>{compat.desc}</p>

              {compat.level==='tension'&&(
                <div style={{ marginTop:'12px', padding:'10px 14px', background:'rgba(232,71,71,.06)',
                  border:'1px solid rgba(232,71,71,.2)', borderRadius:'8px' }}>
                  <span style={{ fontSize:'11px', color:C.tension, fontFamily:'monospace', display:'block', marginBottom:'4px' }}>⚠ Decisão para grupos</span>
                  <p style={{ fontSize:'12px', color:C.muted, lineHeight:1.6, margin:0 }}>
                    Evite colocar esse par como dupla fixa sem um acordo claro de papéis. Se precisarem trabalhar juntos, prefira um terceiro elemento “ponte” e rituais curtos de alinhamento (check-in semanal + definição explícita de entregáveis).
                  </p>
                </div>
              )}
              {compat.level==='synergy'&&(
                <div style={{ marginTop:'12px', padding:'10px 14px', background:'rgba(71,232,123,.06)',
                  border:'1px solid rgba(71,232,123,.2)', borderRadius:'8px' }}>
                  <span style={{ fontSize:'11px', color:C.synergy, fontFamily:'monospace', display:'block', marginBottom:'4px' }}>✓ Oportunidade</span>
                  <p style={{ fontSize:'12px', color:C.muted, lineHeight:1.6, margin:0 }}>
                    Alta complementaridade. Bom candidato para projetos de alta interdependência (pairing, discovery/entrega, liderança técnica + execução).
                  </p>
                </div>
              )}
            </div>
          );
        })
      )}
      <div style={{ marginTop:'16px', padding:'16px 20px', background:'rgba(167,139,250,.05)',
        border:`1px solid rgba(167,139,250,.15)`, borderRadius:'12px' }}>
        <span style={{...S.label,marginBottom:'6px'}}>Nota metodológica</span>
        <p style={{ fontSize:'12px', color:C.faint, lineHeight:1.65, margin:0 }}>
          A análise de compatibilidade é baseada no modelo interno de perfis e serve como ponto de partida para conversas — não como diagnóstico definitivo.
        </p>
      </div>
    </div>
  );
}

function CompareTab({ results }) {
  const allIds = useMemo(() => results.map((r) => String(r.assessmentId)), [results]);
  const [selectedIds, setSelectedIds] = useState(() => new Set(allIds));
  const [sortBy, setSortBy] = useState(() => ({ key: 'name', dir: 'asc' })); // key: 'name' | 1..9

  useEffect(() => {
    setSelectedIds((prev) => {
      const idSet = new Set(allIds);
      const next = new Set([...prev].filter((id) => idSet.has(id)));
      if (next.size === 0 && allIds.length > 0) allIds.forEach((id) => next.add(id));
      return next;
    });
  }, [allIds]);

  const toggleId = (id) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAll = () => setSelectedIds(new Set(allIds));
  const clearSelection = () => setSelectedIds(new Set());

  const visible = results.filter((r) => selectedIds.has(String(r.assessmentId)));
  const resultsByFirstName = useMemo(() => {
    const first = (row) => String(row?.name ?? '').trim().split(' ')[0].toLowerCase();
    return [...results].sort((a, b) => {
      const an = first(a);
      const bn = first(b);
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
  }, [results]);
  const visibleSorted = useMemo(() => {
    const dirMul = sortBy.dir === 'asc' ? 1 : -1;
    const getScore = (row, t) => {
      const v = row?.scores?.[t] ?? row?.scores?.[String(t)] ?? 0;
      const n = typeof v === 'number' ? v : parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    const getName = (row) => String(row?.name ?? '').trim().split(' ')[0].toLowerCase();
    return [...visible].sort((a, b) => {
      if (sortBy.key === 'name') {
        const an = getName(a);
        const bn = getName(b);
        if (an < bn) return -1 * dirMul;
        if (an > bn) return 1 * dirMul;
        return 0;
      }
      const t = sortBy.key;
      const av = getScore(a, t);
      const bv = getScore(b, t);
      if (av < bv) return -1 * dirMul;
      if (av > bv) return 1 * dirMul;
      const an = getName(a);
      const bn = getName(b);
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
  }, [visible, sortBy]);

  const toggleSort = (key) => {
    setSortBy((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      // padrão: nome A→Z; números maior→menor
      return { key, dir: key === 'name' ? 'asc' : 'desc' };
    });
  };
  const sortMark = (key) => (sortBy.key === key ? (sortBy.dir === 'asc' ? '▲' : '▼') : '');
  const nSel = selectedIds.size;
  const nTot = results.length;
  const allSelected = nTot > 0 && nSel === nTot;

  const btnBar = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: `1px solid ${C.border}`,
  };
  const miniBtn = {
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '11px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  };

  return (
    <div style={S.card}>
      <span style={S.label}>Mapa de perfis da equipe</span>
      <p style={{ fontSize: '13px', color: C.muted, marginTop: '8px', marginBottom: '14px', lineHeight: 1.55 }}>
        Escolha quem entra na comparação. Use os atalhos abaixo ou marque/desmarque cada pessoa.
      </p>

      <div style={btnBar}>
        <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
          {nSel} de {nTot} na tabela
        </span>
        <button
          type="button"
          onClick={selectAll}
          disabled={nTot === 0 || allSelected}
          style={{
            ...miniBtn,
            background: allSelected ? 'rgba(26,22,37,.04)' : `${C.purple}18`,
            border: `1px solid ${allSelected ? C.border : `${C.purple}55`}`,
            color: allSelected ? C.faint : C.purple,
            opacity: nTot === 0 ? 0.5 : 1,
          }}
        >
          Selecionar todos
        </button>
        <button
          type="button"
          onClick={clearSelection}
          disabled={nSel === 0}
          style={{
            ...miniBtn,
            background: 'transparent',
            border: `1px solid ${C.border}`,
            color: C.muted,
            opacity: nSel === 0 ? 0.5 : 1,
          }}
        >
          Limpar seleção
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 14px',
          marginBottom: '20px',
          maxHeight: '160px',
          overflowY: 'auto',
          padding: '4px 0',
        }}
      >
        {resultsByFirstName.map((r) => {
          const id = String(r.assessmentId);
          const on = selectedIds.has(id);
          return (
            <label
              key={id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '10px',
                border: `1px solid ${on ? `${C.purple}40` : C.border}`,
                background: on ? `${C.purple}10` : 'rgba(26,22,37,.03)',
                fontSize: '12px',
                color: C.text,
              }}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggleId(id)}
                style={{ accentColor: C.purple, width: '15px', height: '15px', cursor: 'pointer' }}
              />
              <span style={{ whiteSpace: 'nowrap' }}>{r.name.split(' ')[0]}</span>
              <TypeBadge type={r.topType} />
            </label>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p style={{ color: C.muted, fontStyle: 'italic', fontSize: '14px', padding: '24px 0' }}>
          Ninguém selecionado. Marque uma ou mais pessoas acima para ver o comparativo lado a lado.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th
                  onClick={() => toggleSort('name')}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    color: C.muted,
                    fontWeight: 'normal',
                    fontFamily: 'monospace',
                    borderBottom: `1px solid ${C.border}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    Pessoa
                    <span style={{ color: C.faint, fontSize: '11px' }}>{sortMark('name')}</span>
                  </span>
                </th>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => (
                  <th
                    key={t}
                    onClick={() => toggleSort(t)}
                    style={{
                      padding: '8px 6px',
                      color: TYPE_DATA[t].color,
                      fontWeight: 'normal',
                      fontFamily: 'monospace',
                      borderBottom: `1px solid ${C.border}`,
                      textAlign: 'center',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minWidth: '34px' }}>
                      {TYPE_DATA[t].emoji}
                      <span style={{ color: C.faint, fontSize: '11px' }}>{sortMark(t)}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleSorted.map((r, i) => {
                const maxS = Math.max(...Object.values(r.scores).map(Number));
                return (
                  <tr key={String(r.assessmentId) || i} style={{ borderBottom: '1px solid rgba(26,22,37,.07)' }}>
                    <td style={{ padding: '10px 12px', color: C.text, whiteSpace: 'nowrap' }}>
                      {r.name.split(' ')[0]} <TypeBadge type={r.topType} />
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => {
                      const s = parseInt(r.scores[t] || 0);
                      const pct = Math.round((s / maxS) * 100);
                      const isTop = r.topType === t;
                      return (
                        <td key={t} style={{ padding: '6px', textAlign: 'center' }}>
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              background: isTop
                                ? TYPE_DATA[t].color
                                : `${TYPE_DATA[t].color}${Math.max(20, Math.round(pct * 1.5))
                                    .toString(16)
                                    .padStart(2, '0')}`,
                              margin: '0 auto',
                              border: isTop ? `2px solid ${TYPE_DATA[t].color}` : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              color: isTop ? '#fff' : 'rgba(26,22,37,.72)',
                              fontFamily: 'monospace',
                            }}
                          >
                            {s}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: '11px', color: C.faint, marginTop: '16px', fontStyle: 'italic' }}>
        Círculo com borda = tipo dominante. Intensidade da cor = pontuação relativa.
      </p>
    </div>
  );
}

function CompaniesAdminTab() {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('hr');
  const [newUserCompanyId, setNewUserCompanyId] = useState('');
  const [userMsg, setUserMsg] = useState('');

  const appUrl =
    (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';

  const loadCompanies = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/companies');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao carregar empresas');
      setCompanies(Array.isArray(data) ? data : []);
      if (!newUserCompanyId && Array.isArray(data) && data.length) setNewUserCompanyId(String(data[0].id));
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao carregar usuários');
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createCompany = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao criar empresa');
      setName(''); setSlug('');
      await loadCompanies();
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const rotateLink = async (companyId) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/companies/${encodeURIComponent(companyId)}/link`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao rotacionar link');
      await loadCompanies();
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const deleteCompany = async (companyId, companyName) => {
    const ok = window.confirm(
      `Arquivar empresa "${companyName}"? Ela some das listagens, as vagas somem e os links públicos deixam de funcionar. Candidatos e avaliações já feitas continuam visíveis no dashboard.`
    );
    if (!ok) return;
    setLoading(true);
    setError('');
    setUserMsg('');
    try {
      const res = await fetch(`/api/admin/companies/${encodeURIComponent(companyId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao arquivar empresa');
      setUserMsg('Empresa arquivada.');
      await loadCompanies();
      await loadUsers();
      setTimeout(() => setUserMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const editCompany = async (c) => {
    const nextName = window.prompt('Nome da empresa', c?.name ?? '');
    if (nextName == null) return;
    const nextSlug = window.prompt('Slug (URL-friendly)', c?.slug ?? '');
    if (nextSlug == null) return;
    const nextActiveRaw = window.prompt('Ativa? (true/false)', String(Boolean(c?.active)));
    if (nextActiveRaw == null) return;
    const nextActive = String(nextActiveRaw).trim().toLowerCase() !== 'false';

    setLoading(true);
    setError('');
    setUserMsg('');
    try {
      const res = await fetch(`/api/admin/companies/${encodeURIComponent(c.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: String(nextName).trim(), slug: String(nextSlug).trim(), active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao atualizar empresa');
      setUserMsg('Empresa atualizada.');
      await loadCompanies();
      setTimeout(() => setUserMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setUserMsg('Copiado.');
      setTimeout(() => setUserMsg(''), 1200);
    } catch {
      setUserMsg('Não foi possível copiar automaticamente.');
      setTimeout(() => setUserMsg(''), 1600);
    }
  };

  const createUser = async () => {
    setLoading(true);
    setError('');
    setUserMsg('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail.trim(),
          password: newUserPassword,
          role: newUserRole,
          companyId: newUserRole === 'admin' ? null : (newUserCompanyId ? parseInt(newUserCompanyId, 10) : null),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao criar usuário');
      setNewUserEmail(''); setNewUserPassword('');
      setUserMsg('Usuário criado.');
      await loadUsers();
      setTimeout(() => setUserMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    setLoading(true);
    setError('');
    setUserMsg('');
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao excluir usuário');
      setUserMsg('Usuário desativado (exclusão lógica).');
      await loadUsers();
      setTimeout(() => setUserMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const editUser = async (u) => {
    const nextEmail = window.prompt('Email', u?.email ?? '');
    if (nextEmail == null) return;
    const nextRole = window.prompt('Role (hr/direction/admin)', u?.role ?? 'hr');
    if (nextRole == null) return;
    const nextCompanyIdRaw =
      nextRole.trim() === 'admin'
        ? ''
        : window.prompt('Company ID (obrigatório para hr/direction)', u?.companyId != null ? String(u.companyId) : '');
    if (nextCompanyIdRaw == null) return;
    const nextActiveRaw = window.prompt('Ativo? (true/false)', String(Boolean(u?.active)));
    if (nextActiveRaw == null) return;
    const nextActive = String(nextActiveRaw).trim().toLowerCase() !== 'false';
    const nextPassword = window.prompt('Nova senha (deixe em branco para não alterar)', '');
    if (nextPassword == null) return;

    const payload = {
      email: String(nextEmail).trim(),
      role: String(nextRole).trim(),
      active: nextActive,
    };
    if (payload.role !== 'admin') payload.companyId = String(nextCompanyIdRaw).trim() ? parseInt(String(nextCompanyIdRaw).trim(), 10) : null;
    else payload.companyId = null;
    if (String(nextPassword).trim()) payload.password = String(nextPassword).trim();

    setLoading(true);
    setError('');
    setUserMsg('');
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao atualizar usuário');
      setUserMsg('Usuário atualizado.');
      await loadUsers();
      setTimeout(() => setUserMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...S.card, padding: '22px 28px' }}>
        <span style={S.label}>Empresas</span>
        <p style={{ fontSize: '13px', color: C.muted, marginTop: '10px', lineHeight: 1.65, marginBottom: 0 }}>
          Cadastre empresas, gere o link único de candidatura e crie usuários de RH/Direção vinculados à empresa.
        </p>
        {error ? (
          <p style={{ marginTop: '10px', marginBottom: 0, color: C.tension, fontSize: '12px', fontFamily: 'monospace' }}>
            {error}
          </p>
        ) : null}
        {userMsg ? (
          <p style={{ marginTop: '10px', marginBottom: 0, color: C.synergy, fontSize: '12px', fontFamily: 'monospace' }}>
            {userMsg}
          </p>
        ) : null}
      </div>

      <div style={{ ...S.card }}>
        <span style={S.label}>Criar empresa</span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome (ex.: ACME)"
            style={{ flex: '1 1 260px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px', fontFamily: 'monospace', outline: 'none' }}
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Slug opcional (ex.: acme)"
            style={{ flex: '1 1 220px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px', fontFamily: 'monospace', outline: 'none' }}
          />
          <button
            type="button"
            onClick={createCompany}
            disabled={loading || !name.trim()}
            style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
              borderRadius: '10px', padding: '10px 14px', color: C.purple, fontSize: '12px',
              cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
          >
            Criar
          </button>
          <button
            type="button"
            onClick={loadCompanies}
            disabled={loading}
            style={{ background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 14px', color: C.muted, fontSize: '12px',
              cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
          >
            Atualizar
          </button>
        </div>
      </div>

      <div style={{ ...S.card }}>
        <span style={S.label}>Empresas cadastradas</span>
        {companies.length === 0 ? (
          <p style={{ color: C.muted, fontStyle: 'italic', marginTop: '10px' }}>
            Nenhuma empresa ainda.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {companies.map((c) => {
              const token = c.activeToken || '';
              const link = token ? `${appUrl}/t/${token}` : '';
              const exp = c.activeTokenExpiresAt ? new Date(c.activeTokenExpiresAt) : null;
              return (
                <div key={c.id} style={{ background: 'rgba(26,22,37,.03)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: C.text, fontSize: '13px' }}>
                        <span style={{ fontFamily: 'monospace', color: C.faint, marginRight: '8px' }}>#{c.id}</span>
                        <strong style={{ fontWeight: 'normal' }}>{c.name}</strong>
                        <span style={{ fontFamily: 'monospace', color: C.faint, marginLeft: '10px' }}>({c.slug})</span>
                      </div>
                      {token ? (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: C.muted, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {link}
                        </div>
                      ) : (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
                          (sem link ativo)
                        </div>
                      )}
                      {token && exp ? (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
                          expira em {exp.toLocaleString()}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => editCompany(c)}
                        disabled={loading}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => rotateLink(c.id)}
                        disabled={loading}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        Rotacionar link
                      </button>
                      <button
                        type="button"
                        onClick={() => token && copy(link)}
                        disabled={loading || !token}
                        style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
                          borderRadius: '10px', padding: '8px 10px', color: C.purple, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: (loading || !token) ? 0.6 : 1 }}
                      >
                        Copiar link
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCompany(c.id, c.name)}
                        disabled={loading}
                        style={{ background: 'rgba(232,71,71,.08)', border: '1px solid rgba(232,71,71,.35)',
                          borderRadius: '10px', padding: '8px 10px', color: C.tension, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        Arquivar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ ...S.card }}>
        <span style={S.label}>Criar usuário (RH/Direção)</span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
          <input
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            placeholder="email@empresa.com"
            style={{ flex: '1 1 260px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px', fontFamily: 'monospace', outline: 'none' }}
          />
          <input
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            placeholder="Senha"
            type="password"
            style={{ flex: '1 1 220px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px', fontFamily: 'monospace', outline: 'none' }}
          />
          <select
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value)}
            style={{ flex: '0 0 160px', background: 'rgba(26,22,37,.03)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.muted, fontSize: '12px',
              cursor: 'pointer', fontFamily: 'monospace' }}
          >
            <option value="hr">hr</option>
            <option value="direction">direction</option>
            <option value="admin">admin</option>
          </select>
          <select
            value={newUserCompanyId}
            onChange={(e) => setNewUserCompanyId(e.target.value)}
            disabled={newUserRole === 'admin'}
            style={{ flex: '1 1 220px', background: 'rgba(26,22,37,.03)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.muted, fontSize: '12px',
              cursor: 'pointer', fontFamily: 'monospace', opacity: newUserRole === 'admin' ? 0.6 : 1 }}
          >
            {companies.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name} (#{c.id})</option>
            ))}
          </select>
          <button
            type="button"
            onClick={createUser}
            disabled={loading || !newUserEmail.trim() || !newUserPassword.trim()}
            style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
              borderRadius: '10px', padding: '10px 14px', color: C.purple, fontSize: '12px',
              cursor: 'pointer', fontFamily: 'monospace', opacity: (loading || !newUserEmail.trim() || !newUserPassword.trim()) ? 0.6 : 1 }}
          >
            Criar usuário
          </button>
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            style={{ background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 14px', color: C.muted, fontSize: '12px',
              cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
          >
            Atualizar
          </button>
        </div>
      </div>

      <div style={{ ...S.card }}>
        <span style={S.label}>Usuários cadastrados</span>
        {users.length === 0 ? (
          <p style={{ color: C.muted, fontStyle: 'italic', marginTop: '10px' }}>
            Nenhum usuário ainda.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {users.map((u) => {
              const companyLabel = u.role === 'admin' ? '—' : (u.companyName || `#${u.companyId || '—'}`);
              const createdAt = u.createdAt ? new Date(u.createdAt) : null;
              return (
                <div key={u.id} style={{ background: 'rgba(26,22,37,.03)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: C.text, fontSize: '13px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', color: C.faint }}>#{u.id}</span>
                        <strong style={{ fontWeight: 'normal' }}>{u.email}</strong>
                        <span style={{ padding: '2px 8px', fontSize: '10px', borderRadius: '20px',
                          background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                          color: C.muted, fontFamily: 'monospace' }}>
                          {u.role}
                        </span>
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
                        Empresa: {companyLabel}
                      </div>
                      {createdAt ? (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
                          criado em {createdAt.toLocaleString()}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => editUser(u)}
                        disabled={loading}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteUser(u.id)}
                        disabled={loading}
                        title="Desativa o usuário (exclusão lógica)"
                        style={{ background: 'rgba(232,71,71,.08)', border: '1px solid rgba(232,71,71,.35)',
                          borderRadius: '10px', padding: '8px 10px', color: C.tension, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        Desativar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function VacancyInviteByEmail({ vacancyId }) {
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState('');
  const [localOk, setLocalOk] = useState('');

  const send = async () => {
    const name = candidateName.trim();
    const mail = candidateEmail.trim().toLowerCase();
    setLocalErr('');
    setLocalOk('');
    if (!name) {
      setLocalErr('Informe o nome do candidato.');
      return;
    }
    if (!mail) {
      setLocalErr('Informe o e-mail do candidato.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateName: name, candidateEmail: mail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Não foi possível enviar.');
      setLocalOk(`E-mail enviado para ${mail}.`);
      setCandidateName('');
      setCandidateEmail('');
      setTimeout(() => setLocalOk(''), 5000);
    } catch (e) {
      setLocalErr(e?.message || 'Erro');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${C.border}`, width: '100%' }}>
      <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace', display: 'block', marginBottom: '8px' }}>
        Convidar candidato — nome, e-mail e envio do desafio por e-mail
      </span>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={candidateName}
          onChange={(e) => setCandidateName(e.target.value)}
          placeholder="Nome do candidato"
          disabled={busy}
          aria-label="Nome do candidato"
          style={{
            flex: '1 1 160px', minWidth: '140px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
            borderRadius: '10px', padding: '8px 10px', color: C.text, fontSize: '12px', fontFamily: 'monospace', outline: 'none',
          }}
        />
        <input
          type="email"
          value={candidateEmail}
          onChange={(e) => setCandidateEmail(e.target.value)}
          placeholder="email@exemplo.com"
          disabled={busy}
          aria-label="E-mail do candidato"
          style={{
            flex: '2 1 220px', minWidth: '180px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
            borderRadius: '10px', padding: '8px 10px', color: C.text, fontSize: '12px', fontFamily: 'monospace', outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={busy}
          style={{
            flex: '0 0 auto', background: `${C.synergy}18`, border: `1px solid ${C.synergy}55`,
            borderRadius: '10px', padding: '8px 14px', color: C.synergy, fontSize: '12px',
            cursor: 'pointer', fontFamily: 'monospace', opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Enviando…' : 'Enviar desafio'}
        </button>
      </div>
      {localErr ? (
        <p style={{ marginTop: '8px', marginBottom: 0, color: C.tension, fontSize: '11px', fontFamily: 'monospace' }}>
          {localErr}
        </p>
      ) : null}
      {localOk ? (
        <p style={{ marginTop: '8px', marginBottom: 0, color: C.synergy, fontSize: '11px', fontFamily: 'monospace' }}>
          {localOk}
        </p>
      ) : null}
    </div>
  );
}

function VacanciesAdminTab({ isAdmin }) {
  const [loading, setLoading] = useState(false);
  const [vacancies, setVacancies] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [vacPage, setVacPage] = useState(1);
  const [vacPageSize, setVacPageSize] = useState(20);
  const [vacTotal, setVacTotal] = useState(0);
  const [vacTotalPages, setVacTotalPages] = useState(1);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('open');
  const [companyId, setCompanyId] = useState('');

  const appUrl =
    (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';

  const loadVacancies = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        page: String(vacPage),
        pageSize: String(vacPageSize),
      }).toString();
      const res = await fetch(`/api/admin/vacancies?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao carregar vagas');
      const rows = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];
      setVacancies(rows);
      const total = typeof data?.total === 'number' ? data.total : rows.length;
      const tpg = typeof data?.totalPages === 'number'
        ? data.totalPages
        : Math.max(1, Math.ceil(total / vacPageSize));
      setVacTotal(total);
      setVacTotalPages(tpg);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/companies');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao carregar empresas');
      setCompanies(Array.isArray(data) ? data : []);
      if (!companyId && Array.isArray(data) && data.length) setCompanyId(String(data[0].id));
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVacancies();
  }, [vacPage, vacPageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadCompanies();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg('Copiado.');
      setTimeout(() => setMsg(''), 1200);
    } catch {
      setMsg('Não foi possível copiar automaticamente.');
      setTimeout(() => setMsg(''), 1600);
    }
  };

  const createVacancy = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const body = { title: title.trim(), status, slug: slug.trim() || undefined };
      if (isAdmin) body.companyId = companyId ? parseInt(companyId, 10) : null;
      const res = await fetch('/api/admin/vacancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao criar vaga');
      setTitle(''); setSlug(''); setStatus('open');
      setMsg('Vaga criada.');
      await loadVacancies();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const rotateLink = async (vacancyId) => {
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/link`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao rotacionar link');
      setMsg('Link rotacionado.');
      await loadVacancies();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const setVacancyStatus = async (vacancyId, nextStatus) => {
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao atualizar vaga');
      setMsg('Vaga atualizada.');
      await loadVacancies();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const editVacancy = async (v) => {
    const nextTitle = window.prompt('Título da vaga', v?.title ?? '');
    if (nextTitle == null) return;
    const nextSlug = window.prompt('Slug (URL-friendly)', v?.slug ?? '');
    if (nextSlug == null) return;
    const nextStatus = window.prompt('Status (open/closed)', v?.status ?? 'open');
    if (nextStatus == null) return;

    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(v.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: String(nextTitle).trim(), slug: String(nextSlug).trim(), status: String(nextStatus).trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao atualizar vaga');
      setMsg('Vaga atualizada.');
      await loadVacancies();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const archiveVacancy = async (vacancyId, title) => {
    const ok = window.confirm(
      `Arquivar vaga "${title}"? Ela some das listagens e o link público deixa de funcionar. Candidatos que já responderam continuam no dashboard.`
    );
    if (!ok) return;
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao arquivar vaga');
      setMsg('Vaga arquivada.');
      await loadVacancies();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...S.card, padding: '22px 28px' }}>
        <span style={S.label}>Vagas</span>
        <p style={{ fontSize: '13px', color: C.muted, marginTop: '10px', lineHeight: 1.65, marginBottom: 0 }}>
          Cadastre cada vaga para obter um link de avaliação exclusivo. Em cada vaga, o RH preenche nome e e-mail do candidato
          e clica em <strong style={{ color: C.text, fontWeight: 600 }}>Enviar desafio</strong> — o candidato recebe um e-mail com o
          link do formulário (configure SMTP no servidor; veja{' '}
          <span style={{ fontFamily: 'monospace', color: C.faint }}>.env.example</span>
          ). Também é possível copiar o link público e enviar por outro canal.
        </p>
        {error ? (
          <p style={{ marginTop: '10px', marginBottom: 0, color: C.tension, fontSize: '12px', fontFamily: 'monospace' }}>
            {error}
          </p>
        ) : null}
        {msg ? (
          <p style={{ marginTop: '10px', marginBottom: 0, color: C.synergy, fontSize: '12px', fontFamily: 'monospace' }}>
            {msg}
          </p>
        ) : null}
      </div>

      <div style={{ ...S.card }}>
        <span style={S.label}>Criar vaga</span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
          {isAdmin && (
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              style={{ flex: '1 1 240px', background: 'rgba(26,22,37,.03)', border: `1px solid ${C.border}`,
                borderRadius: '10px', padding: '10px 12px', color: C.muted, fontSize: '12px',
                cursor: 'pointer', fontFamily: 'monospace' }}
            >
              {companies.length === 0 ? (
                <option value="">(carregando empresas…)</option>
              ) : companies.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name} (#{c.id})</option>
              ))}
            </select>
          )}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (ex.: Pessoa Dev Fullstack)"
            style={{ flex: '2 1 320px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px', fontFamily: 'monospace', outline: 'none' }}
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Slug opcional (ex.: dev-fullstack)"
            style={{ flex: '1 1 220px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px', fontFamily: 'monospace', outline: 'none' }}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ flex: '0 0 160px', background: 'rgba(26,22,37,.03)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.muted, fontSize: '12px',
              cursor: 'pointer', fontFamily: 'monospace' }}
          >
            <option value="open">open</option>
            <option value="closed">closed</option>
          </select>
          <button
            type="button"
            onClick={createVacancy}
            disabled={loading || !title.trim() || (isAdmin && !companyId)}
            style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
              borderRadius: '10px', padding: '10px 14px', color: C.purple, fontSize: '12px',
              cursor: 'pointer', fontFamily: 'monospace', opacity: (loading || !title.trim() || (isAdmin && !companyId)) ? 0.6 : 1 }}
          >
            Criar
          </button>
          <button
            type="button"
            onClick={loadVacancies}
            disabled={loading}
            style={{ background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 14px', color: C.muted, fontSize: '12px',
              cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
          >
            Atualizar
          </button>
        </div>
      </div>

      <div style={{ ...S.card }}>
        <span style={S.label}>Vagas cadastradas</span>
        {vacTotal === 0 ? (
          <p style={{ color: C.muted, fontStyle: 'italic', marginTop: '10px' }}>
            Nenhuma vaga ainda.
          </p>
        ) : (
          <>
            <div style={{
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', justifyContent: 'space-between',
              marginTop: '12px', marginBottom: '8px', paddingBottom: '10px', borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                {vacTotal} vaga(s) · página {vacPage}/{vacTotalPages}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <select
                  value={String(vacPageSize)}
                  onChange={(e) => { setVacPage(1); setVacPageSize(parseInt(e.target.value, 10)); }}
                  disabled={loading}
                  style={{ background: 'rgba(26,22,37,.05)', border: `1px solid ${C.border}`,
                    borderRadius: '10px', padding: '6px 10px', color: C.muted, fontSize: '11px',
                    cursor: 'pointer', fontFamily: 'monospace' }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={String(n)}>{n}/pág.</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={loading || vacPage <= 1}
                  onClick={() => setVacPage((p) => Math.max(1, p - 1))}
                  style={{ background: vacPage <= 1 ? 'transparent' : `${C.purple}18`,
                    border: `1px solid ${vacPage <= 1 ? C.border : `${C.purple}55`}`,
                    borderRadius: '10px', padding: '6px 12px', color: vacPage <= 1 ? C.faint : C.purple,
                    fontSize: '11px', cursor: vacPage <= 1 ? 'default' : 'pointer', fontFamily: 'monospace' }}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={loading || vacPage >= vacTotalPages}
                  onClick={() => setVacPage((p) => Math.min(vacTotalPages, p + 1))}
                  style={{ background: vacPage >= vacTotalPages ? 'transparent' : `${C.purple}18`,
                    border: `1px solid ${vacPage >= vacTotalPages ? C.border : `${C.purple}55`}`,
                    borderRadius: '10px', padding: '6px 12px',
                    color: vacPage >= vacTotalPages ? C.faint : C.purple,
                    fontSize: '11px', cursor: vacPage >= vacTotalPages ? 'default' : 'pointer', fontFamily: 'monospace' }}
                >
                  Próxima
                </button>
              </div>
            </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {vacancies.map((v) => {
              const token = v.activeToken || '';
              const link = token ? `${appUrl}/v/${token}` : '';
              const exp = v.activeTokenExpiresAt ? new Date(v.activeTokenExpiresAt) : null;
              return (
                <div key={v.id} style={{ background: 'rgba(26,22,37,.03)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: C.text, fontSize: '13px' }}>
                        <span style={{ fontFamily: 'monospace', color: C.faint, marginRight: '8px' }}>#{v.id}</span>
                        <strong style={{ fontWeight: 'normal' }}>{v.title}</strong>
                        <span style={{ fontFamily: 'monospace', color: C.faint, marginLeft: '10px' }}>({v.status})</span>
                        {isAdmin && (
                          <span style={{ fontFamily: 'monospace', color: C.faint, marginLeft: '10px' }}>
                            · {v.companyName}
                          </span>
                        )}
                      </div>
                      {token ? (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: C.muted, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {link}
                        </div>
                      ) : (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
                          (sem link ativo)
                        </div>
                      )}
                      {token && exp ? (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
                          expira em {exp.toLocaleString()}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => editVacancy(v)}
                        disabled={loading}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setVacancyStatus(v.id, v.status === 'open' ? 'closed' : 'open')}
                        disabled={loading}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        {v.status === 'open' ? 'Fechar' : 'Reabrir'}
                      </button>
                      <button
                        type="button"
                        onClick={() => rotateLink(v.id)}
                        disabled={loading}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        Rotacionar link
                      </button>
                      <button
                        type="button"
                        onClick={() => token && copy(link)}
                        disabled={loading || !token}
                        style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
                          borderRadius: '10px', padding: '8px 10px', color: C.purple, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: (loading || !token) ? 0.6 : 1 }}
                      >
                        Copiar link
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveVacancy(v.id, v.title)}
                        disabled={loading}
                        style={{ background: 'rgba(232,71,71,.08)', border: '1px solid rgba(232,71,71,.35)',
                          borderRadius: '10px', padding: '8px 10px', color: C.tension, fontSize: '11px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        Arquivar
                      </button>
                    </div>
                  </div>
                  <VacancyInviteByEmail vacancyId={v.id} />
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>
    </div>
  );
}

function GroupTab({ results, groupBase, setGroupBaseId, groupIds, setGroupIds, dismissedIds, setDismissedIds, suggestions, groupTensions }) {
  const [search, setSearch] = useState('');

  const addToGroup = (assessmentId) => {
    const id = String(assessmentId);
    if (groupIds.includes(id)) return;
    setGroupIds([...groupIds, id]);
  };
  const removeFromGroup = (assessmentId) => {
    const id = String(assessmentId);
    setGroupIds(groupIds.filter(x => x !== id));
  };
  const clearGroup = () => {
    setGroupBaseId(null);
    setGroupIds([]);
  };

  const dismissSuggestion = (assessmentId) => {
    const id = String(assessmentId);
    if (dismissedIds.includes(id)) return;
    setDismissedIds([...dismissedIds, id]);
  };

  const compatShort = { synergy: 'Sinergia', tension: 'Tensão', neutral: 'Neutro' };

  /** Mesmo padrão visual dos cards de sugestão: emoji só no TypeBadge; nome ao lado; × no canto se onRemove. */
  const PersonMini = ({ person, right, baseCompat = null, onRemove = null }) => {
    const showX = typeof onRemove === 'function';
    return (
      <div style={{
        position: showX ? 'relative' : 'static',
        display:'flex', flexDirection:'column', gap:'8px',
        padding:'12px 14px',
        paddingRight: showX ? '44px' : '14px',
        background:'rgba(26,22,37,.03)', border:`1px solid ${C.border}`, borderRadius:'12px',
      }}>
        {showX && (
          <button
            type="button"
            onClick={onRemove}
            title="Remover do grupo"
            aria-label="Remover do grupo"
            style={{ position:'absolute', top:'10px', right:'10px',
              width:'28px', height:'28px', display:'inline-flex', alignItems:'center', justifyContent:'center',
              background:'rgba(26,22,37,.06)', border:`1px solid ${C.border}`,
              borderRadius:'10px', color:C.muted, fontSize:'16px',
              cursor:'pointer', fontFamily:'monospace', lineHeight:1 }}
          >
            ×
          </button>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', gap:'12px', flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap', minWidth:0 }}>
            <TypeBadge type={person.topType}/>
            <span style={{ color:C.text, fontSize:'13px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {person.name}
            </span>
            {baseCompat && (
              <>
                <CompatBadge level={baseCompat.level}/>
                {baseCompat.level === 'tension' && (
                  <span style={{ padding:'2px 8px', fontSize:'10px', borderRadius:'20px',
                    background:`${C.tension}18`, border:`1px solid ${C.tension}44`,
                    color:C.tension, fontFamily:'monospace' }}>
                    ⚠ Tensão com base
                  </span>
                )}
              </>
            )}
          </div>
          {!showX && <div style={{ flexShrink:0 }}>{right}</div>}
        </div>
        {(person.areaLabel || (person.areaFitScore010 !== null && person.areaFitScore010 !== undefined)) ? (
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
            {person.areaLabel && (
              <span style={{ padding:'2px 8px', fontSize:'10px', borderRadius:'20px',
                background:'rgba(26,22,37,.04)', border:`1px solid ${C.border}`,
                color:C.muted, fontFamily:'monospace' }}>
                {person.areaLabel}
              </span>
            )}
            {person.areaFitScore010 !== null && person.areaFitScore010 !== undefined && (
              <span style={{ padding:'2px 8px', fontSize:'10px', borderRadius:'20px',
                background:'rgba(71,232,123,.08)', border:'1px solid rgba(71,232,123,.25)',
                color:'rgba(71,232,123,.95)', fontFamily:'monospace' }}>
                {person.areaFitScore010}/10
              </span>
            )}
          </div>
        ) : null}
        {baseCompat ? (
          <div style={{ marginTop:'0', fontSize:'12px', color:C.muted, lineHeight:1.55 }}>
            {baseCompat.title ? (
              <span style={{ fontSize:'11px', color:C.faint, fontFamily:'monospace', display:'block', marginBottom:'4px' }}>
                {baseCompat.title}
              </span>
            ) : null}
            {baseCompat.desc || ''}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
      <div style={S.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
          <span style={S.label}>Montar grupo</span>
          <button onClick={clearGroup} style={{ background:'rgba(26,22,37,.07)', border:`1px solid ${C.border}`,
            borderRadius:'10px', padding:'8px 12px', color:C.muted, fontSize:'11px', cursor:'pointer', fontFamily:'monospace' }}>
            Limpar
          </button>
        </div>

        <p style={{ fontSize:'12px', color:C.faint, lineHeight:1.65, marginTop:'10px' }}>
          Escolha uma pessoa base e veja quem tem melhor compatibilidade para trabalhar junto. Depois adicione membros ao grupo e acompanhe tensões internas.
        </p>

        <span style={{...S.label, marginTop:'18px'}}>Pessoa base</span>
        {groupBase ? (
          <PersonMini
            person={groupBase}
            right={
              <button onClick={()=>setGroupBaseId(null)} style={{ background:'transparent', border:`1px solid ${C.border}`,
                borderRadius:'10px', padding:'8px 10px', color:C.muted, fontSize:'11px', cursor:'pointer', fontFamily:'monospace' }}>
                Trocar
              </button>
            }
          />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {results.slice(0, 8).map(r=>(
              <PersonMini
                key={r.assessmentId}
                person={r}
                right={
                  <button onClick={()=>setGroupBaseId(String(r.assessmentId))} style={{ background:`${C.purple}22`, border:`1px solid ${C.purple}55`,
                    borderRadius:'10px', padding:'8px 10px', color:C.purpleLight, fontSize:'11px', cursor:'pointer', fontFamily:'monospace' }}>
                    Selecionar
                  </button>
                }
              />
            ))}
            <div style={{ marginTop:'6px', color:C.faint, fontSize:'11px', fontFamily:'monospace' }}>
              Dica: use o filtro de área/perfil acima para refinar a lista.
            </div>
          </div>
        )}
      </div>

      <div style={S.card}>
        <span style={S.label}>Sugestões e tensões</span>

        {!groupBase ? (
          <p style={{ color:C.muted, fontStyle:'italic', fontSize:'13px' }}>
            Selecione uma pessoa base para ver compatibilidades.
          </p>
        ) : (
          <>
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', margin:'10px 0 14px' }}>
              <input
                value={search}
                onChange={(e)=>setSearch(e.target.value)}
                placeholder="Buscar pessoa para adicionar…"
                style={{ flex:'1 1 240px', background:'rgba(26,22,37,.07)', border:`1px solid ${C.border}`,
                  borderRadius:'10px', padding:'10px 12px', color:C.text, fontSize:'12px',
                  fontFamily:'monospace', outline:'none' }}
              />
              <select
                onChange={(e)=>{ const id=e.target.value; if(id) addToGroup(id); e.target.value=''; }}
                defaultValue=""
                style={{ flex:'0 0 240px', background:'rgba(26,22,37,.05)', border:`1px solid ${C.border}`,
                  borderRadius:'10px', padding:'10px 12px', color:C.muted, fontSize:'12px',
                  cursor:'pointer', fontFamily:'monospace' }}
              >
                <option value="">+ Adicionar qualquer pessoa</option>
                {results
                  .filter(r=>String(r.assessmentId)!==String(groupBase.assessmentId))
                  .filter(r=>!groupIds.includes(String(r.assessmentId)))
                  .filter(r=>!search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase()))
                  .slice(0, 40)
                  .map(r=>{
                    const withBase = getCompat(groupBase.topType, r.topType);
                    return (
                      <option key={r.assessmentId} value={String(r.assessmentId)}>
                        {r.name} (T{r.topType}) · {compatShort[withBase.level] ?? withBase.level}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'14px' }}>
              <span style={{ padding:'2px 9px', fontSize:'10px', borderRadius:'20px',
                background:`${C.synergy}18`, border:`1px solid ${C.synergy}44`, color:C.synergy, fontFamily:'monospace' }}>
                Sinergia
              </span>
              <span style={{ padding:'2px 9px', fontSize:'10px', borderRadius:'20px',
                background:`${C.neutral}18`, border:`1px solid ${C.neutral}44`, color:C.neutral, fontFamily:'monospace' }}>
                Neutro
              </span>
              <span style={{ padding:'2px 9px', fontSize:'10px', borderRadius:'20px',
                background:`${C.tension}18`, border:`1px solid ${C.tension}44`, color:C.tension, fontFamily:'monospace' }}>
                Tensão
              </span>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'16px' }}>
              {suggestions.slice(0, 10).map(({ person, compat }) => {
                const lc = { synergy:C.synergy, tension:C.tension, neutral:C.neutral }[compat.level];
                const already = groupIds.includes(String(person.assessmentId));
                return (
                  <div key={person.assessmentId} style={{ position:'relative',
                    background:'rgba(26,22,37,.03)', border:`1px solid ${lc}30`,
                    borderRadius:'12px', padding:'12px 14px' }}>
                    <button
                      onClick={()=>dismissSuggestion(person.assessmentId)}
                      title="Remover da lista"
                      aria-label="Remover da lista"
                      style={{ position:'absolute', top:'10px', right:'10px',
                        width:'28px', height:'28px', display:'inline-flex', alignItems:'center', justifyContent:'center',
                        background:'rgba(26,22,37,.06)', border:`1px solid ${C.border}`,
                        borderRadius:'10px', color:C.muted, fontSize:'16px',
                        cursor:'pointer', fontFamily:'monospace', lineHeight:1 }}
                    >
                      ×
                    </button>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:'12px', flexWrap:'wrap', alignItems:'center' }}>
                      <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                        <TypeBadge type={person.topType}/>
                        <span style={{ color:C.text, fontSize:'13px' }}>{person.name}</span>
                        <CompatBadge level={compat.level}/>
                        {compat.level==='tension' && (
                          <span style={{ padding:'2px 8px', fontSize:'10px', borderRadius:'20px',
                            background:`${C.tension}18`, border:`1px solid ${C.tension}44`,
                            color:C.tension, fontFamily:'monospace' }}>
                            ⚠ Tensão com base
                          </span>
                        )}
                      </div>
                      <div style={{ display:'flex', gap:'8px' }}>
                        <button
                          disabled={already}
                          onClick={()=>addToGroup(person.assessmentId)}
                          style={{ background:already?'rgba(26,22,37,.04)':`${lc}18`,
                            border:`1px solid ${already?C.border:lc}55`, borderRadius:'10px',
                            padding:'8px 10px', color:already?C.faint:lc, fontSize:'11px',
                            cursor:already?'not-allowed':'pointer', fontFamily:'monospace' }}
                        >
                          {already?'No grupo':'Adicionar'}
                        </button>
                      </div>
                    </div>
                    <div style={{ marginTop:'8px', fontSize:'12px', color:C.muted, lineHeight:1.55 }}>
                      {compat.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:'14px' }}>
              <span style={{...S.label, marginBottom:'10px'}}>Grupo atual</span>
              {groupIds.length === 0 ? (
                <p style={{ color:C.faint, fontSize:'12px', fontStyle:'italic' }}>Nenhuma pessoa adicionada ainda.</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {groupIds.map(id => {
                    const p = results.find(r => String(r.assessmentId) === String(id));
                    if (!p) return null;
                    const baseCompat =
                      groupBase && String(p.assessmentId) !== String(groupBase.assessmentId)
                        ? getCompat(groupBase.topType, p.topType)
                        : null;
                    return (
                      <PersonMini
                        key={id}
                        person={p}
                        baseCompat={baseCompat}
                        onRemove={() => removeFromGroup(id)}
                      />
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop:'14px' }}>
                <span style={{...S.label, marginBottom:'6px'}}>Tensões internas</span>
                {groupTensions.length === 0 ? (
                  <p style={{ color:C.faint, fontSize:'12px', fontStyle:'italic' }}>Nenhuma tensão detectada no grupo atual.</p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    {groupTensions.slice(0, 8).map((p, idx) => (
                      <div key={idx} style={{ padding:'10px 12px', background:'rgba(232,71,71,.06)',
                        border:'1px solid rgba(232,71,71,.2)', borderRadius:'10px' }}>
                        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                          <TypeBadge type={p.a.topType}/><span style={{ color:C.muted, fontSize:'12px' }}>{p.a.name.split(' ')[0]}</span>
                          <span style={{ color:C.faint }}>×</span>
                          <TypeBadge type={p.b.topType}/><span style={{ color:C.muted, fontSize:'12px' }}>{p.b.name.split(' ')[0]}</span>
                        </div>
                        <div style={{ marginTop:'6px', fontSize:'12px', color:C.muted, lineHeight:1.55 }}>
                          {p.compat.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
