'use client';

import { useEffect, useMemo, useState } from 'react';
import { C } from '../../../lib/theme';
import { clientSortNextDir, S, SortableTh } from '../dashboard-shared';

export function CompaniesAdminTab() {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [listSort, setListSort] = useState({ key: 'name', dir: 'asc' });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const sortedCompanies = useMemo(() => {
    const mul = listSort.dir === 'asc' ? 1 : -1;
    const rows = [...companies];
    rows.sort((a, b) => {
      switch (listSort.key) {
        case 'id':
          return (Number(a.id) - Number(b.id)) * mul;
        case 'name':
          return String(a.name || '').localeCompare(String(b.name || ''), 'pt') * mul;
        case 'slug':
          return String(a.slug || '').localeCompare(String(b.slug || ''), 'pt') * mul;
        case 'active':
          return ((a.active ? 1 : 0) - (b.active ? 1 : 0)) * mul;
        case 'createdAt':
        default: {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return (ta - tb) * mul;
        }
      }
    });
    return rows;
  }, [companies, listSort]);

  const toggleCompanySort = (col) => {
    setListSort((prev) => ({ key: col, dir: clientSortNextDir(col, prev.key, prev.dir) }));
  };

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
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
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
    setMsg('');
    try {
      const res = await fetch(`/api/admin/companies/${encodeURIComponent(companyId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao arquivar empresa');
      setMsg('Empresa arquivada.');
      await loadCompanies();
      setTimeout(() => setMsg(''), 1600);
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
    setMsg('');
    try {
      const res = await fetch(`/api/admin/companies/${encodeURIComponent(c.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: String(nextName).trim(), slug: String(nextSlug).trim(), active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao atualizar empresa');
      setMsg('Empresa atualizada.');
      await loadCompanies();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

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



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {error ? (
        <div style={{ ...S.card, padding: '14px 18px' }}>
          <p style={{ margin: 0, color: C.tension, fontSize: '12px', fontFamily: 'monospace' }}>{error}</p>
        </div>
      ) : null}
      {msg ? (
        <div style={{ ...S.card, padding: '14px 18px' }}>
          <p style={{ margin: 0, color: C.synergy, fontSize: '12px', fontFamily: 'monospace' }}>{msg}</p>
        </div>
      ) : null}

      <span style={{ ...S.label, display: 'block', marginBottom: '2px' }}>Empresas</span>
      <div style={{ ...S.card, padding: '22px 28px' }}>
        <span style={S.label}>Cadastro de empresas</span>
        <p style={{ fontSize: '13px', color: C.muted, marginTop: '10px', lineHeight: 1.65, marginBottom: 0 }}>
          Inclua a empresa no sistema, edite dados e gere o link público único (/t/…) para candidaturas.
          Arquivar tira da lista e invalida vínculos; dados de avaliações já recebidas continuam acessíveis no dashboard.
        </p>
      </div>

      <div style={{ ...S.card }}>
        <span style={S.label}>Nova empresa</span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome (ex.: ACME)"
            style={{ flex: '1 1 260px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px', fontFamily: 'monospace' }}
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Slug opcional (ex.: acme)"
            style={{ flex: '1 1 220px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px', fontFamily: 'monospace' }}
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
          <div style={{ marginTop: '10px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '720px' }}>
              <thead>
                <tr style={{ background: 'rgba(26,22,37,.02)' }}>
                  <SortableTh columnKey="id" sortKey={listSort.key} dir={listSort.dir} onSort={toggleCompanySort}>ID</SortableTh>
                  <SortableTh columnKey="name" sortKey={listSort.key} dir={listSort.dir} onSort={toggleCompanySort}>Nome</SortableTh>
                  <SortableTh columnKey="slug" sortKey={listSort.key} dir={listSort.dir} onSort={toggleCompanySort}>Slug</SortableTh>
                  <SortableTh columnKey="active" sortKey={listSort.key} dir={listSort.dir} onSort={toggleCompanySort}>Ativa</SortableTh>
                  <SortableTh columnKey="createdAt" sortKey={listSort.key} dir={listSort.dir} onSort={toggleCompanySort}>Criada em</SortableTh>
                  <th scope="col" style={{ textAlign: 'right', padding: '10px 12px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, fontFamily: 'monospace', borderBottom: `1px solid ${C.border}` }}>Link e ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedCompanies.map((c) => {
                  const token = c.activeToken || '';
                  const link = token ? `${appUrl}/t/${token}` : '';
                  const exp = c.activeTokenExpiresAt ? new Date(c.activeTokenExpiresAt) : null;
                  const createdAt = c.createdAt ? new Date(c.createdAt) : null;
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(26,22,37,.07)', verticalAlign: 'top' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', color: C.faint }}>#{c.id}</td>
                      <td style={{ padding: '12px', color: C.text }}>{c.name}</td>
                      <td style={{ padding: '12px', color: C.muted, fontFamily: 'monospace' }}>{c.slug}</td>
                      <td style={{ padding: '12px', color: C.muted, fontFamily: 'monospace' }}>{c.active ? 'sim' : 'não'}</td>
                      <td style={{ padding: '12px', color: C.faint, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {createdAt ? createdAt.toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ marginBottom: '8px', fontSize: '11px', color: C.muted, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'left' }}>
                          {token ? link : '(sem link ativo)'}
                          {token && exp ? (
                            <div style={{ marginTop: '4px', fontSize: '10px', color: C.faint }}>expira {exp.toLocaleString()}</div>
                          ) : null}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
