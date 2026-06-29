'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { C } from '../../../lib/theme';
import { S, Bar } from '../dashboard-shared';

const VIEWS = [
  { id: 'invites', label: 'Convites' },
  { id: 'results', label: 'Resultados' },
  { id: 'dashboard', label: 'Dashboard RH' },
  { id: 'config', label: 'Configuração', adminOnly: true },
];

function statusBadge(status) {
  const colors = {
    sent: C.muted,
    opened: C.purple,
    completed: C.synergy,
    cancelled: C.tension,
    expired: C.tension,
  };
  return (
    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: `${colors[status] || C.muted}18`, color: colors[status] || C.muted, fontFamily: 'monospace' }}>
      {status}
    </span>
  );
}

function InviteForm({ isAdmin, companies, companyId, onSent }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (companyId && companyId !== 'all') {
      setCompany(String(companyId));
      return;
    }
    if (isAdmin && companies.length === 1) {
      setCompany(String(companies[0].id));
    }
  }, [companyId, isAdmin, companies]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const companyOk = !isAdmin || (company !== '' && Number.isFinite(Number(company)));
  const canSend = name.trim().length > 1 && emailOk && companyOk && !busy;

  const send = async () => {
    setErr('');
    setMsg('');
    if (!name.trim()) {
      setErr('Informe o nome do colaborador.');
      return;
    }
    if (!emailOk) {
      setErr('Informe um e-mail válido.');
      return;
    }
    if (isAdmin && !companyOk) {
      setErr('Selecione a empresa.');
      return;
    }
    setBusy(true);
    try {
      const body = { candidateName: name.trim(), candidateEmail: email.trim().toLowerCase() };
      if (isAdmin) body.companyId = Number(company);
      const res = await fetch('/api/admin/ae/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar convite.');
      setMsg(`Convite enviado para ${data.sentTo}`);
      setName('');
      setEmail('');
      onSent?.();
      setTimeout(() => setMsg(''), 8000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...S.card, marginBottom: '20px' }}>
      <span style={S.label}>Novo convite</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        {isAdmin ? (
          <select value={company} onChange={(e) => setCompany(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, minWidth: '160px' }}>
            <option value="">Empresa…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        ) : null}
        <input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, flex: '1 1 140px' }} />
        <input placeholder="email@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, flex: '2 1 200px' }} />
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: C.purple,
            color: '#fff',
            cursor: canSend ? 'pointer' : 'not-allowed',
            opacity: canSend ? 1 : 0.5,
          }}
        >
          {busy ? 'Enviando…' : 'Enviar convite'}
        </button>
      </div>
      {err ? <p style={{ color: C.tension, fontSize: '12px', marginTop: '8px' }}>{err}</p> : null}
      {msg ? <p style={{ color: C.synergy, fontSize: '12px', marginTop: '8px' }}>{msg}</p> : null}
    </div>
  );
}

function InvitesList({ refreshKey, isAdmin, companyFilter }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ pageSize: '30' });
    if (status !== 'all') p.set('status', status);
    if (isAdmin && companyFilter && companyFilter !== 'all') p.set('company', companyFilter);
    const res = await fetch(`/api/admin/ae/invites?${p}`);
    const data = await res.json().catch(() => ({}));
    setItems(data.items || []);
    setLoading(false);
  }, [status, isAdmin, companyFilter, refreshKey]);

  useEffect(() => { load(); }, [load]);

  const cancel = async (id) => {
    if (!confirm('Cancelar este convite?')) return;
    await fetch(`/api/admin/ae/invites/${id}`, { method: 'DELETE' });
    load();
  };

  const remind = async (id) => {
    await fetch(`/api/admin/ae/invites/${id}/remind`, { method: 'POST' });
    alert('Lembrete enviado.');
  };

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <span style={S.label}>Convites</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
          <option value="all">Todos os status</option>
          <option value="sent">Pendente</option>
          <option value="opened">Aberto</option>
          <option value="completed">Respondido</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>
      {loading ? <p style={{ color: C.muted }}>Carregando…</p> : null}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: C.muted, fontFamily: 'monospace', fontSize: '10px' }}>
            <th style={{ padding: '8px' }}>Colaborador</th>
            <th style={{ padding: '8px' }}>Status</th>
            <th style={{ padding: '8px' }}>Enviado</th>
            <th style={{ padding: '8px' }}>Expira</th>
            <th style={{ padding: '8px' }} />
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} style={{ borderTop: `1px solid ${C.border}` }}>
              <td style={{ padding: '10px 8px' }}>
                <div>{row.candidateName}</div>
                <div style={{ color: C.muted, fontSize: '11px' }}>{row.candidateEmail}</div>
              </td>
              <td style={{ padding: '10px 8px' }}>{statusBadge(row.status)}</td>
              <td style={{ padding: '10px 8px', color: C.muted }}>{row.sentAt ? new Date(row.sentAt).toLocaleDateString('pt-BR') : '—'}</td>
              <td style={{ padding: '10px 8px', color: C.muted }}>{row.expiresAt ? new Date(row.expiresAt).toLocaleDateString('pt-BR') : '—'}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                {['sent', 'opened'].includes(row.status) ? (
                  <>
                    <button type="button" onClick={() => remind(row.id)} style={{ marginRight: '8px', fontSize: '11px', cursor: 'pointer', background: 'none', border: 'none', color: C.purple }}>Reenviar</button>
                    <button type="button" onClick={() => cancel(row.id)} style={{ fontSize: '11px', cursor: 'pointer', background: 'none', border: 'none', color: C.tension }}>Cancelar</button>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && items.length === 0 ? <p style={{ color: C.muted, marginTop: '12px' }}>Nenhum convite encontrado.</p> : null}
    </div>
  );
}

function ResultsList({ isAdmin, companyFilter }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const p = new URLSearchParams({ status: 'completed', pageSize: '30' });
    if (isAdmin && companyFilter && companyFilter !== 'all') p.set('company', companyFilter);
    fetch(`/api/admin/ae/attempts?${p}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }, [isAdmin, companyFilter]);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    fetch(`/api/admin/ae/attempts/${selected}`)
      .then((r) => r.json())
      .then((d) => setDetail(d));
  }, [selected]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: detail ? '1fr 1fr' : '1fr', gap: '20px' }}>
      <div style={S.card}>
        <span style={S.label}>Resultados</span>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ color: C.muted, fontFamily: 'monospace', fontSize: '10px' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Colaborador</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Data</th>
              <th style={{ padding: '8px' }} />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '10px 8px' }}>
                  <div>{row.candidateName}</div>
                  <div style={{ fontSize: '11px', color: C.muted }}>{row.areaLabel || '—'}</div>
                </td>
                <td style={{ padding: '10px 8px', color: C.muted }}>
                  {row.completedAt ? new Date(row.completedAt).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                  <button type="button" onClick={() => setSelected(row.id)} style={{ background: 'none', border: 'none', color: C.purple, cursor: 'pointer', fontSize: '11px' }}>Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detail?.attempt ? (
        <div style={S.card}>
          <span style={S.label}>Detalhe + histórico</span>
          <p style={{ fontSize: '14px', color: C.text, lineHeight: 1.6 }}>{detail.attempt.profileSummary}</p>
          {(detail.attempt.ranking || []).slice(0, 6).map((dim) => (
            <div key={dim.key} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ width: '110px', fontSize: '11px', color: dim.color }}>{dim.label}</span>
              <div style={{ flex: 1 }}><Bar value={dim.score} max={100} color={dim.color} h={6} /></div>
              <span style={{ fontSize: '11px', color: C.muted }}>{dim.score}</span>
            </div>
          ))}
          {detail.history?.length > 1 ? (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '11px', color: C.muted, marginBottom: '8px', fontFamily: 'monospace' }}>Evolução ({detail.history.length} avaliações)</div>
              {detail.history.map((h) => (
                <div key={h.id} style={{ fontSize: '12px', color: C.muted, marginBottom: '4px' }}>
                  {h.completedAt ? new Date(h.completedAt).toLocaleDateString('pt-BR') : '—'}
                  {' — top: '}
                  {Array.isArray(h.ranking) ? h.ranking.slice(0, 2).join(', ') : '—'}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AnalyticsPanel({ isAdmin, companyFilter }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const p = new URLSearchParams();
    if (isAdmin && companyFilter && companyFilter !== 'all') p.set('company', companyFilter);
    fetch(`/api/admin/ae/analytics?${p}`)
      .then((r) => r.json())
      .then(setData);
  }, [isAdmin, companyFilter]);

  if (!data) return <div style={S.card}><p style={{ color: C.muted }}>Carregando analytics…</p></div>;

  const maxAvg = Math.max(...(data.distribution || []).map((d) => d.average), 1);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
      <div style={S.card}>
        <span style={S.label}>Distribuição média</span>
        <p style={{ fontSize: '12px', color: C.muted, marginBottom: '16px' }}>{data.totalAttempts} avaliações concluídas</p>
        {(data.distribution || []).slice(0, 8).map((d) => (
          <div key={d.key} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ width: '100px', fontSize: '11px', fontFamily: 'monospace' }}>{d.key}</span>
            <div style={{ flex: 1 }}><Bar value={d.average} max={maxAvg} color={C.purple} h={6} /></div>
            <span style={{ fontSize: '11px', color: C.muted }}>{d.average}</span>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <span style={S.label}>Top motivadores (#1)</span>
        {(data.topMotivators || []).slice(0, 6).map((t) => (
          <div key={t.key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
            <span>{t.key}</span>
            <span style={{ color: C.muted }}>{t.pct}% ({t.count})</span>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <span style={S.label}>Convites por status</span>
        {(data.inviteStats || []).map((s) => (
          <div key={s.status} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
            <span>{statusBadge(s.status)}</span>
            <span>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigPanel() {
  const [questions, setQuestions] = useState([]);
  const [dims, setDims] = useState([]);

  useEffect(() => {
    fetch('/api/admin/ae/config/questions?definition=motivators')
      .then((r) => r.json())
      .then((d) => setQuestions((d.items || []).slice(0, 50)));
    fetch('/api/admin/ae/config/dimensions')
      .then((r) => r.json())
      .then((d) => setDims(d.items || []));
  }, []);

  const toggleQuestion = async (id, active) => {
    await fetch('/api/admin/ae/config/questions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, active: !active } : q)));
  };

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={S.card}>
        <span style={S.label}>Dimensões ({dims.length})</span>
        <p style={{ fontSize: '12px', color: C.muted }}>Edite labels e ative/desative dimensões no banco via API admin.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
          {dims.map((d) => (
            <span key={d.id} style={{ padding: '4px 10px', borderRadius: '16px', fontSize: '11px', background: `${d.color || C.purple}18`, color: d.color || C.purple, opacity: d.active ? 1 : 0.4 }}>
              {d.label}
            </span>
          ))}
        </div>
      </div>
      <div style={S.card}>
        <span style={S.label}>Banco de perguntas (amostra)</span>
        <p style={{ fontSize: '12px', color: C.muted, marginBottom: '12px' }}>200 perguntas no banco; 48 sorteadas por sessão. Ative/desative sem alterar código.</p>
        {questions.map((q) => (
          <div key={q.id} style={{ padding: '10px 0', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <button type="button" onClick={() => toggleQuestion(q.id, q.active)} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '8px', border: `1px solid ${C.border}`, background: q.active ? `${C.synergy}18` : 'transparent', cursor: 'pointer' }}>
              {q.active ? 'Ativa' : 'Inativa'}
            </button>
            <div style={{ flex: 1, fontSize: '12px', color: q.active ? C.text : C.muted, lineHeight: 1.5 }}>
              <span style={{ fontFamily: 'monospace', fontSize: '10px', color: C.faint }}>{q.questionType} · {q.key}</span>
              <div>{q.text.length > 120 ? `${q.text.slice(0, 120)}…` : q.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MotivatorsAdminTab({ isAdmin, companies = [], locale: _locale }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = searchParams.get('motivatorsView') || 'invites';
  const companyFilter = searchParams.get('company') || 'all';
  const [refreshKey, setRefreshKey] = useState(0);
  const [moduleStatus, setModuleStatus] = useState(null);
  const [setupBusy, setSetupBusy] = useState(false);

  useEffect(() => {
    fetch('/api/admin/ae/status')
      .then((r) => r.json())
      .then(setModuleStatus)
      .catch(() => {});
  }, [refreshKey]);

  const runSetup = async () => {
    setSetupBusy(true);
    try {
      const res = await fetch('/api/admin/ae/setup', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao inicializar');
      setRefreshKey((k) => k + 1);
      alert('Módulo inicializado com sucesso.');
    } catch (e) {
      alert(e.message || 'Erro');
    } finally {
      setSetupBusy(false);
    }
  };

  const setView = (id) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', 'motivators');
    p.set('motivatorsView', id);
    router.replace(`?${p.toString()}`);
  };

  const visibleViews = VIEWS.filter((v) => !v.adminOnly || isAdmin);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 'normal', color: C.text }}>Motivadores Profissionais</h2>
        <p style={{ margin: 0, fontSize: '13px', color: C.muted }}>Convites, resultados e analytics do assessment de motivadores — independente do Eneagrama.</p>
      </div>

      {moduleStatus && !moduleStatus.ready ? (
        <div style={{ ...S.card, marginBottom: '20px', borderColor: `${C.tension}44`, background: `${C.tension}08` }}>
          <span style={{ ...S.label, color: C.tension }}>Configuração pendente</span>
          <p style={{ fontSize: '13px', color: C.muted, margin: '0 0 12px', lineHeight: 1.6 }}>
            {moduleStatus.reason === 'schema_missing'
              ? 'As tabelas do banco ainda não foram criadas. Aplique as migrations 010 e 011 no Postgres.'
              : 'O assessment ainda não foi inicializado (perguntas e dimensões). Clique abaixo ou envie um convite após o deploy mais recente.'}
          </p>
          {moduleStatus.reason !== 'schema_missing' ? (
            <button type="button" disabled={setupBusy} onClick={runSetup} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: C.purple, color: '#fff', cursor: 'pointer' }}>
              {setupBusy ? 'Inicializando…' : 'Inicializar módulo agora'}
            </button>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {visibleViews.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: `1px solid ${view === v.id ? C.purple : C.border}`,
              background: view === v.id ? `${C.purple}14` : 'transparent',
              color: view === v.id ? C.purpleDark : C.muted,
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'invites' ? (
        <>
          <InviteForm isAdmin={isAdmin} companies={companies} companyId={companyFilter !== 'all' ? companyFilter : ''} onSent={() => setRefreshKey((k) => k + 1)} />
          <InvitesList refreshKey={refreshKey} isAdmin={isAdmin} companyFilter={companyFilter} />
        </>
      ) : null}
      {view === 'results' ? <ResultsList isAdmin={isAdmin} companyFilter={companyFilter} /> : null}
      {view === 'dashboard' ? <AnalyticsPanel isAdmin={isAdmin} companyFilter={companyFilter} /> : null}
      {view === 'config' && isAdmin ? <ConfigPanel /> : null}
    </div>
  );
}
