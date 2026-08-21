'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { C } from '../../../lib/theme';
import { t } from '../../../lib/i18n';
import { PAGE_SIZE_OPTIONS, parseUsersPagination, parseUsersSort } from '../../../lib/assessment-filters';
import { ASSIGNABLE_MODULE_CAPS, ASSIGNABLE_MODULE_I18N } from '../../../lib/permissions';
import { clientSortNextDir, S, SortableTh } from '../dashboard-shared';
import { useAppFeedback } from '../../_components/AppFeedback';

function moduleOptions(locale) {
  return ASSIGNABLE_MODULE_CAPS.map((cap) => ({
    value: cap,
    label: t(locale, ASSIGNABLE_MODULE_I18N[cap] || cap),
  }));
}

function roleSelectOptions() {
  return [
    { value: 'hr', label: 'hr' },
    { value: 'direction', label: 'direction' },
    { value: 'admin', label: 'admin' },
  ];
}

function companySelectOptions(locale, companyOptions) {
  if (!companyOptions.length) {
    return [{ value: '', label: t(locale, 'panel.admin.noCompanyOption') }];
  }
  return companyOptions.map((c) => ({
    value: String(c.id),
    label: `${c.name} (#${c.id})`,
  }));
}

export function UsersAdminTab({ navigateDashboard, locale }) {
  const { promptForm } = useAppFeedback();
  const urlParams = useSearchParams();
  const spKey = urlParams.toString();
  const dateLocale = locale === 'en' ? 'en-US' : 'pt-BR';

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
        if (!rc.ok) throw new Error(dc?.error || t(locale, 'panel.admin.loadCompaniesFailed'));
        const list = Array.isArray(dc) ? dc : [];
        if (!cancelled) setCompanyOptions(list);
      } catch (e) {
        if (!cancelled) setError(e?.message || t(locale, 'panel.common.error'));
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
        if (!ru.ok) throw new Error(du?.error || t(locale, 'panel.admin.loadUsersFailed'));
        if (!cancelled) {
          setUsers(Array.isArray(du.items) ? du.items : []);
          setUsersTotal(typeof du.total === 'number' ? du.total : 0);
          setUsersTotalPages(typeof du.totalPages === 'number' ? du.totalPages : 1);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || t(locale, 'panel.common.error'));
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
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.admin.loadUsersFailed'));
      setUsers(Array.isArray(data.items) ? data.items : []);
      setUsersTotal(typeof data.total === 'number' ? data.total : 0);
      setUsersTotalPages(typeof data.totalPages === 'number' ? data.totalPages : 1);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const refreshCompanyOptions = async () => {
    try {
      const rc = await fetch('/api/admin/companies?forSelect=1');
      const dc = await rc.json();
      if (!rc.ok) throw new Error(dc?.error || t(locale, 'panel.admin.loadCompaniesFailed'));
      setCompanyOptions(Array.isArray(dc) ? dc : []);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    }
  };

  const openCreateUser = async () => {
    const defaultCompanyId = companyOptions[0] ? String(companyOptions[0].id) : '';
    const values = await promptForm({
      title: t(locale, 'panel.admin.createUserTitle'),
      message: t(locale, 'panel.admin.userModulesHint'),
      confirmLabel: t(locale, 'panel.admin.createUserBtn'),
      fields: [
        {
          key: 'email',
          label: t(locale, 'panel.admin.editUserEmail'),
          placeholder: t(locale, 'panel.admin.emailPh'),
          defaultValue: '',
        },
        {
          key: 'password',
          type: 'password',
          label: t(locale, 'panel.admin.passwordPh'),
          placeholder: t(locale, 'panel.admin.passwordPh'),
          defaultValue: '',
        },
        {
          key: 'role',
          type: 'select',
          label: t(locale, 'panel.admin.editUserRole'),
          options: roleSelectOptions(),
          defaultValue: 'hr',
        },
        {
          key: 'companyId',
          type: 'select',
          label: t(locale, 'panel.admin.editUserCompanyId'),
          options: companySelectOptions(locale, companyOptions),
          defaultValue: defaultCompanyId,
          showWhen: (v) => v.role !== 'admin',
        },
        {
          key: 'modules',
          type: 'checkboxGroup',
          label: t(locale, 'panel.admin.userModulesLabel'),
          options: moduleOptions(locale),
          defaultValue: [],
        },
      ],
    });
    if (!values) return;

    const email = String(values.email || '').trim();
    const password = String(values.password || '');
    const role = String(values.role || '').trim();
    if (!email || !password) return;

    const body = {
      email,
      password,
      role,
      companyId: role === 'admin' ? null : (values.companyId ? parseInt(String(values.companyId), 10) : null),
    };
    if (Array.isArray(values.modules)) body.modules = values.modules;

    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.admin.createUserFailed'));
      setMsg(t(locale, 'panel.admin.userCreated'));
      await loadUsersOnly();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
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
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.admin.deleteUserFailed'));
      setMsg(t(locale, 'panel.admin.userDeactivated'));
      await loadUsersOnly();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const editUser = async (u) => {
    const values = await promptForm({
      title: t(locale, 'panel.admin.editUserTitle'),
      message: t(locale, 'panel.admin.userModulesHint'),
      fields: [
        { key: 'email', label: t(locale, 'panel.admin.editUserEmail'), defaultValue: u?.email ?? '' },
        {
          key: 'role',
          type: 'select',
          label: t(locale, 'panel.admin.editUserRole'),
          options: roleSelectOptions(),
          defaultValue: u?.role ?? 'hr',
        },
        {
          key: 'companyId',
          type: 'select',
          label: t(locale, 'panel.admin.editUserCompanyId'),
          options: companySelectOptions(locale, companyOptions),
          defaultValue: u?.companyId != null ? String(u.companyId) : (companyOptions[0] ? String(companyOptions[0].id) : ''),
          showWhen: (v) => v.role !== 'admin',
        },
        {
          key: 'active',
          type: 'boolean',
          label: t(locale, 'panel.admin.editUserActive'),
          defaultValue: Boolean(u?.active),
        },
        {
          key: 'password',
          label: t(locale, 'panel.admin.editUserPassword'),
          defaultValue: '',
          type: 'password',
        },
        {
          key: 'modules',
          type: 'checkboxGroup',
          label: t(locale, 'panel.admin.userModulesLabel'),
          options: moduleOptions(locale),
          defaultValue: Array.isArray(u?.modules) ? u.modules : [],
        },
      ],
    });
    if (!values) return;

    const nextEmail = values.email;
    const nextRole = values.role;
    const nextCompanyIdRaw = values.companyId;
    const nextActive = values.active === true;
    const nextPassword = values.password;

    const payload = {
      email: String(nextEmail).trim(),
      role: String(nextRole).trim(),
      active: nextActive,
      modules: Array.isArray(values.modules) ? values.modules : [],
    };
    if (payload.role !== 'admin') {
      payload.companyId = String(nextCompanyIdRaw || '').trim()
        ? parseInt(String(nextCompanyIdRaw).trim(), 10)
        : null;
    } else payload.companyId = null;
    if (String(nextPassword || '').trim()) payload.password = String(nextPassword).trim();

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
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.admin.updateUserFailed'));
      setMsg(t(locale, 'panel.admin.userUpdated'));
      await loadUsersOnly();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
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

      <span style={{ ...S.label, display: 'block', marginBottom: '2px' }}>{t(locale, 'panel.admin.usersTitle')}</span>
      <div style={{ ...S.card, padding: '22px 28px' }}>
        <span style={S.label}>{t(locale, 'panel.admin.usersAccounts')}</span>
        <p style={{ fontSize: '13px', color: C.muted, marginTop: '10px', lineHeight: 1.65, marginBottom: 0 }}>
          {t(locale, 'panel.admin.usersIntro')}
          <strong style={{ color: C.text, fontWeight: 600 }}>{t(locale, 'panel.admin.companiesTitle')}</strong>
          {t(locale, 'panel.admin.usersIntroSuffix')}
        </p>
      </div>

      <div style={{ ...S.card }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...S.label, marginBottom: 0 }}>{t(locale, 'panel.admin.usersList')}</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={openCreateUser}
              disabled={loading}
              style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
                borderRadius: '10px', padding: '10px 14px', color: C.purple, fontSize: '12px',
                cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1, minHeight: '40px' }}
            >
              {t(locale, 'panel.admin.newUserBtn')}
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
                cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1, minHeight: '40px' }}
            >
              {t(locale, 'panel.admin.refresh')}
            </button>
          </div>
        </div>
        {usersTotal === 0 ? (
          <p style={{ color: C.muted, fontStyle: 'italic', marginTop: '10px' }}>
            {t(locale, 'panel.admin.noUsersYet')}
          </p>
        ) : (
          <div style={{ marginTop: '10px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '640px' }}>
              <thead>
                <tr style={{ background: 'rgba(26,22,37,.02)' }}>
                  <SortableTh columnKey="id" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>{t(locale, 'panel.admin.sortId')}</SortableTh>
                  <SortableTh columnKey="email" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>{t(locale, 'panel.admin.colEmail')}</SortableTh>
                  <SortableTh columnKey="role" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>{t(locale, 'panel.admin.colRole')}</SortableTh>
                  <SortableTh columnKey="companyName" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>{t(locale, 'panel.admin.colCompany')}</SortableTh>
                  <SortableTh columnKey="active" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>{t(locale, 'panel.admin.colUserActive')}</SortableTh>
                  <SortableTh columnKey="createdAt" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>{t(locale, 'panel.admin.colUserCreated')}</SortableTh>
                  <th scope="col" style={{ textAlign: 'right', padding: '10px 12px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, fontFamily: 'monospace', borderBottom: `1px solid ${C.border}` }}>{t(locale, 'panel.admin.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const companyLabel = u.role === 'admin' ? t(locale, 'panel.common.notApplicable') : (u.companyName || `#${u.companyId || t(locale, 'panel.common.notApplicable')}`);
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
                        {u.capabilitiesCustomized ? (
                          <span
                            title={t(locale, 'panel.admin.userModulesHint')}
                            style={{
                              marginLeft: '6px',
                              padding: '2px 8px',
                              fontSize: '10px',
                              borderRadius: '20px',
                              background: `${C.purple}12`,
                              border: `1px solid ${C.purple}40`,
                              color: C.purpleDeep,
                              fontFamily: 'monospace',
                            }}
                          >
                            {t(locale, 'panel.admin.userModulesCustom')}
                          </span>
                        ) : null}
                      </td>
                      <td style={{ padding: '12px', color: C.muted, fontFamily: 'monospace' }}>{companyLabel}</td>
                      <td style={{ padding: '12px', color: C.muted, fontFamily: 'monospace' }}>{u.active ? t(locale, 'panel.common.yes') : t(locale, 'panel.common.no')}</td>
                      <td style={{ padding: '12px', color: C.faint, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {createdAt ? createdAt.toLocaleString(dateLocale) : t(locale, 'panel.common.notApplicable')}
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
                            {t(locale, 'panel.admin.editUser')}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteUser(u.id)}
                            disabled={loading}
                            title={t(locale, 'panel.admin.deactivateTitle')}
                            style={{ background: 'rgba(232,71,71,.08)', border: '1px solid rgba(232,71,71,.35)',
                              borderRadius: '10px', padding: '8px 10px', color: C.tension, fontSize: '11px',
                              cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                          >
                            {t(locale, 'panel.admin.deactivate')}
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
                  {t(locale, 'panel.admin.userCount', {
                    total: usersTotal,
                    page: usersPage,
                    totalPages: usersTotalPages,
                  })}
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
                      <option key={n} value={String(n)}>{t(locale, 'panel.compat.perPageShort', { n })}</option>
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
                    {t(locale, 'panel.admin.prev')}
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
                    {t(locale, 'panel.admin.next')}
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
