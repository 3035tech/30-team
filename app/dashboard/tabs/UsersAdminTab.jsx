'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { C } from '../../../lib/theme';
import { PAGE_SIZE_OPTIONS, parseUsersPagination, parseUsersSort } from '../../../lib/assessment-filters';
import { clientSortNextDir, S, SortableTh } from '../dashboard-shared';

export function UsersAdminTab({ navigateDashboard }) {
  const urlParams = useSearchParams();
  const spKey = urlParams.toString();

  const sp = useMemo(() => Object.fromEntries(urlParams.entries()), [spKey]);
  const { page: usersPage, pageSize: usersPageSize } = parseUsersPagination(sp);
  const listSort = parseUsersSort(sp);

  const [loading, setLoading] = useState(false);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('hr');
  const [newUserCompanyId, setNewUserCompanyId] = useState('');

  const toggleUserSort = (col) => {
    if (!navigateDashboard) return;
    const nextDir = clientSortNextDir(col, listSort.sort, listSort.dir);
    navigateDashboard({ usersSort: col, usersSortDir: nextDir, usersPage: 1, tab: 'users' });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rc = await fetch('/api/admin/companies?forSelect=1');
        const dc = await rc.json();
        if (!rc.ok) throw new Error(dc?.error || 'Falha ao carregar empresas');
        const list = Array.isArray(dc) ? dc : [];
        if (!cancelled) {
          setCompanyOptions(list);
          setNewUserCompanyId((prev) => (prev && list.some((c) => String(c.id) === prev) ? prev : (list[0] ? String(list[0].id) : '')));
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Erro');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const snap = Object.fromEntries(urlParams.entries());
        const { page, pageSize } = parseUsersPagination(snap);
        const sortSt = parseUsersSort(snap);
        const qs = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          sort: sortSt.sort,
          sortDir: sortSt.dir,
        });
        const ru = await fetch(`/api/admin/users?${qs.toString()}`);
        const du = await ru.json();
        if (!ru.ok) throw new Error(du?.error || 'Falha ao carregar usuários');
        if (!cancelled) {
          setUsers(Array.isArray(du.items) ? du.items : []);
          setUsersTotal(typeof du.total === 'number' ? du.total : 0);
          setUsersTotalPages(typeof du.totalPages === 'number' ? du.totalPages : 1);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Erro');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spKey]);

  const loadUsersOnly = async () => {
    const snap = Object.fromEntries(urlParams.entries());
    const { page, pageSize } = parseUsersPagination(snap);
    const sortSt = parseUsersSort(snap);
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort: sortSt.sort,
      sortDir: sortSt.dir,
    });
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao carregar usuários');
      setUsers(Array.isArray(data.items) ? data.items : []);
      setUsersTotal(typeof data.total === 'number' ? data.total : 0);
      setUsersTotalPages(typeof data.totalPages === 'number' ? data.totalPages : 1);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const refreshCompanyOptions = async () => {
    try {
      const rc = await fetch('/api/admin/companies?forSelect=1');
      const dc = await rc.json();
      if (!rc.ok) throw new Error(dc?.error || 'Falha ao carregar empresas');
      const list = Array.isArray(dc) ? dc : [];
      setCompanyOptions(list);
      setNewUserCompanyId((prev) => (prev && list.some((c) => String(c.id) === prev) ? prev : (list[0] ? String(list[0].id) : '')));
    } catch (e) {
      setError(e?.message || 'Erro');
    }
  };

  const createUser = async () => {
    setLoading(true);
    setError('');
    setMsg('');
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
      setNewUserEmail('');
      setNewUserPassword('');
      setMsg('Usuário criado.');
      await loadUsersOnly();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao excluir usuário');
      setMsg('Usuário desativado (exclusão lógica).');
      await loadUsersOnly();
      setTimeout(() => setMsg(''), 1600);
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
    if (payload.role !== 'admin') {
      payload.companyId = String(nextCompanyIdRaw).trim()
        ? parseInt(String(nextCompanyIdRaw).trim(), 10)
        : null;
    } else payload.companyId = null;
    if (String(nextPassword).trim()) payload.password = String(nextPassword).trim();

    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao atualizar usuário');
      setMsg('Usuário atualizado.');
      await loadUsersOnly();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
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

      <span style={{ ...S.label, display: 'block', marginBottom: '2px' }}>Usuários</span>
      <div style={{ ...S.card, padding: '22px 28px' }}>
        <span style={S.label}>Contas do painel</span>
        <p style={{ fontSize: '13px', color: C.muted, marginTop: '10px', lineHeight: 1.65, marginBottom: 0 }}>
          Perfis RH e Direção precisam de uma empresa cadastrada em <strong style={{ color: C.text, fontWeight: 600 }}>Empresas</strong>.
          Admin tem acesso global. O login usa e-mail e senha definidos aqui.
        </p>
      </div>

      <div style={{ ...S.card }}>
        <span style={S.label}>Novo usuário (RH / Direção / admin)</span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
          <input
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            placeholder="email@empresa.com"
            style={{ flex: '1 1 260px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px', fontFamily: 'monospace' }}
          />
          <input
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            placeholder="Senha"
            type="password"
            style={{ flex: '1 1 220px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px', fontFamily: 'monospace' }}
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
            {companyOptions.length === 0 ? (
              <option value="">(nenhuma empresa — cadastre em Empresas)</option>
            ) : companyOptions.map((c) => (
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
            onClick={() => {
              refreshCompanyOptions();
              loadUsersOnly();
            }}
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
        {usersTotal === 0 ? (
          <p style={{ color: C.muted, fontStyle: 'italic', marginTop: '10px' }}>
            Nenhum usuário ainda.
          </p>
        ) : (
          <div style={{ marginTop: '10px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '640px' }}>
              <thead>
                <tr style={{ background: 'rgba(26,22,37,.02)' }}>
                  <SortableTh columnKey="id" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>ID</SortableTh>
                  <SortableTh columnKey="email" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>Email</SortableTh>
                  <SortableTh columnKey="role" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>Função</SortableTh>
                  <SortableTh columnKey="companyName" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>Empresa</SortableTh>
                  <SortableTh columnKey="active" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>Ativo</SortableTh>
                  <SortableTh columnKey="createdAt" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>Criado em</SortableTh>
                  <th scope="col" style={{ textAlign: 'right', padding: '10px 12px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, fontFamily: 'monospace', borderBottom: `1px solid ${C.border}` }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const companyLabel = u.role === 'admin' ? '—' : (u.companyName || `#${u.companyId || '—'}`);
                  const createdAt = u.createdAt ? new Date(u.createdAt) : null;
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(26,22,37,.07)' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', color: C.faint }}>#{u.id}</td>
                      <td style={{ padding: '12px', color: C.text }}>{u.email}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '2px 8px', fontSize: '10px', borderRadius: '20px',
                          background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                          color: C.muted, fontFamily: 'monospace' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: C.muted, fontFamily: 'monospace' }}>{companyLabel}</td>
                      <td style={{ padding: '12px', color: C.muted, fontFamily: 'monospace' }}>{u.active ? 'sim' : 'não'}</td>
                      <td style={{ padding: '12px', color: C.faint, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {createdAt ? createdAt.toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {navigateDashboard && usersTotal > 0 ? (
              <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', justifyContent: 'space-between',
                marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${C.border}`,
              }}>
                <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                  {usersTotal} usuário(s) · página {usersPage}/{usersTotalPages}
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={String(usersPageSize)}
                    onChange={(e) => {
                      const ps = parseInt(e.target.value, 10);
                      navigateDashboard({ usersPage: 1, usersPageSize: ps, tab: 'users' });
                    }}
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
                    disabled={loading || usersPage <= 1}
                    onClick={() => navigateDashboard({ usersPage: Math.max(1, usersPage - 1), tab: 'users' })}
                    style={{ background: usersPage <= 1 ? 'transparent' : `${C.purple}18`,
                      border: `1px solid ${usersPage <= 1 ? C.border : `${C.purple}55`}`,
                      borderRadius: '10px', padding: '6px 12px', color: usersPage <= 1 ? C.faint : C.purple,
                      fontSize: '11px', cursor: usersPage <= 1 ? 'default' : 'pointer', fontFamily: 'monospace' }}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={loading || usersPage >= usersTotalPages}
                    onClick={() => navigateDashboard({ usersPage: Math.min(usersTotalPages, usersPage + 1), tab: 'users' })}
                    style={{ background: usersPage >= usersTotalPages ? 'transparent' : `${C.purple}18`,
                      border: `1px solid ${usersPage >= usersTotalPages ? C.border : `${C.purple}55`}`,
                      borderRadius: '10px', padding: '6px 12px',
                      color: usersPage >= usersTotalPages ? C.faint : C.purple,
                      fontSize: '11px', cursor: usersPage >= usersTotalPages ? 'default' : 'pointer', fontFamily: 'monospace' }}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
