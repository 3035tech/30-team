'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { parseUsersPagination, parseUsersSort } from '../../../lib/assessment-filters';
import { ASSIGNABLE_MODULE_CAPS, ASSIGNABLE_MODULE_I18N } from '../../../lib/permissions';
import { clientSortNextDir, S, SortableTh, AdminListPager, AdminCreateButton, AdminEditButton, AdminDeleteButton, AdminActionsCell, AdminActionsTh, AdminViewButton, AdminIconButton } from '../dashboard-shared';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';

const BTN_GHOST =
  'min-h-touch rounded-control border border-ink/12 bg-transparent px-3.5 py-2.5 font-mono text-xs text-ink-muted disabled:cursor-default disabled:opacity-60';

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
  const { promptForm, notice } = useAppFeedback();
  const urlParams = useSearchParams();
  const spKey = urlParams.toString();
  const dateLocale = locale === 'en' ? 'en-US' : 'pt-BR';

  const sp = useMemo(() => Object.fromEntries(urlParams.entries()), [spKey]);
  const { page: usersPage, pageSize: usersPageSize } = parseUsersPagination(sp);
  const listSort = parseUsersSort(sp);
  const usersQ = String(sp.usersQ || '').trim();

  const [loading, setLoading] = useState(false);
  const [searchDraft, setSearchDraft] = useState(usersQ);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setSearchDraft(usersQ);
  }, [usersQ]);

  const toggleUserSort = (col) => {
    if (!navigateDashboard) return;
    const nextDir = clientSortNextDir(col, listSort.sort, listSort.dir);
    navigateDashboard({ usersSort: col, usersSortDir: nextDir, usersPage: 1, tab: 'users' });
  };

  const pushUsersSearch = (value) => {
    if (!navigateDashboard) return;
    navigateDashboard({
      usersQ: value || null,
      usersPage: 1,
      tab: 'users',
    });
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
        const q = String(snap.usersQ || '').trim();
        if (q) qs.set('q', q);
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
    const q = String(snap.usersQ || '').trim();
    if (q) qs.set('q', q);
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

    // Step 1: identity only (email, optional password, role, company).
    const step1 = await promptForm({
      title: t(locale, 'panel.admin.createUserStep1Title'),
      message: t(locale, 'panel.admin.passwordOptionalHelp'),
      confirmLabel: t(locale, 'panel.admin.createUserContinue'),
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
      ],
    });
    if (!step1) return;

    // Step 2: optional module overrides. Cancel here aborts create entirely (safer than
    // creating with role defaults after the admin already dismissed module choice).
    const step2 = await promptForm({
      title: t(locale, 'panel.admin.createUserStep2Title'),
      message: t(locale, 'panel.admin.createUserStep2Help'),
      confirmLabel: t(locale, 'panel.admin.createUserBtn'),
      fields: [
        {
          key: 'modules',
          type: 'checkboxGroup',
          label: t(locale, 'panel.admin.userModulesLabel'),
          options: moduleOptions(locale),
          defaultValue: [],
        },
      ],
    });
    if (!step2) return;

    const email = String(step1.email || '').trim();
    const password = String(step1.password || '');
    const role = String(step1.role || '').trim();
    if (!email) return;

    const body = {
      email,
      role,
      companyId: role === 'admin' ? null : (step1.companyId ? parseInt(String(step1.companyId), 10) : null),
    };
    if (password.trim()) body.password = password;
    else body.sendInvite = true;
    if (Array.isArray(step2.modules)) body.modules = step2.modules;

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
      if (data.inviteSent) {
        setMsg(t(locale, 'panel.admin.userCreatedInviteSent', { email }));
      } else if (data.inviteError === 'SMTP_NOT_CONFIGURED' || data.inviteError) {
        setMsg(t(locale, 'panel.admin.userCreatedInvitePending', { email }));
      } else {
        setMsg(t(locale, 'panel.admin.userCreated'));
      }
      await loadUsersOnly();
      setTimeout(() => setMsg(''), 2800);
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

  const resendInvite = async (userId, email) => {
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/resend-invite`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.admin.resendInviteFailed'));
      setMsg(t(locale, 'panel.admin.resendInviteOk', { email: email || data.email || '' }));
      await loadUsersOnly();
      setTimeout(() => setMsg(''), 2800);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const viewUser = async (u) => {
    const companyLabel =
      u.companyName ||
      (u.companyId != null ? `#${u.companyId}` : t(locale, 'panel.common.notApplicable'));
    const lines = [
      String(u.email || ''),
      `${t(locale, 'panel.admin.colRole')}: ${u.role || '—'}`,
      `${t(locale, 'panel.admin.colCompany')}: ${companyLabel}`,
      `${t(locale, 'panel.admin.colUserActive')}: ${
        u.active ? t(locale, 'panel.common.yes') : t(locale, 'panel.common.no')
      }`,
    ];
    await notice({
      title: u.displayName || u.email || `#${u.id}`,
      message: lines.join('\n'),
    });
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
    <div className="flex flex-col gap-4">
      {error ? (
        <div className={cn(S.card, 'px-[18px] py-3.5')}>
          <p className="m-0 font-mono text-xs text-danger">{error}</p>
        </div>
      ) : null}
      {msg ? (
        <div className={cn(S.card, 'px-[18px] py-3.5')}>
          <p className="m-0 font-mono text-xs text-success">{msg}</p>
        </div>
      ) : null}

      <span className={cn(S.label, 'mb-0.5')}>{t(locale, 'panel.admin.usersTitle')}</span>
      <div className={cn(S.card, 'px-7 py-[22px]')}>
        <span className={S.label}>{t(locale, 'panel.admin.usersAccounts')}</span>
        <p className="mb-0 mt-2.5 text-[13px] leading-relaxed text-ink-muted">
          {t(locale, 'panel.admin.usersIntro')}
          <strong className="font-semibold text-ink">{t(locale, 'panel.admin.companiesTitle')}</strong>
          {t(locale, 'panel.admin.usersIntroSuffix')}
        </p>
      </div>

      <div className={S.card}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <span className={cn(S.label, 'mb-0')}>{t(locale, 'panel.admin.usersList')}</span>
          <div className="flex flex-wrap gap-2">
            <AdminCreateButton
              label={t(locale, 'panel.admin.newUserBtn')}
              onClick={openCreateUser}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => {
                refreshCompanyOptions();
                loadUsersOnly();
              }}
              disabled={loading}
              className={cn(BTN_GHOST, loading && 'opacity-60')}
            >
              {t(locale, 'panel.admin.refresh')}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                pushUsersSearch(String(searchDraft || '').trim());
              }
            }}
            placeholder={t(locale, 'panel.admin.usersSearchPh')}
            aria-label={t(locale, 'panel.admin.usersSearchPh')}
            className={cn(S.input, 'max-w-xs')}
          />
          <button
            type="button"
            onClick={() => pushUsersSearch(String(searchDraft || '').trim())}
            disabled={loading}
            className={cn(BTN_GHOST, loading && 'opacity-60')}
          >
            {t(locale, 'panel.admin.usersSearchBtn')}
          </button>
        </div>
        {usersTotal === 0 ? (
          <div className="mt-3">
            <EmptyState
              message={
                usersQ
                  ? t(locale, 'panel.admin.noUsersMatch')
                  : t(locale, 'panel.admin.noUsersYet')
              }
              actionLabel={usersQ ? undefined : t(locale, 'panel.admin.createUserBtn')}
              onAction={usersQ ? undefined : openCreateUser}
              actionDisabled={loading}
            />
          </div>
        ) : (
          <div className="db-table-scroll mt-2.5 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <thead>
                <tr className="bg-ink/[0.02]">
                  <SortableTh columnKey="id" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>{t(locale, 'panel.admin.sortId')}</SortableTh>
                  <SortableTh columnKey="displayName" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>{t(locale, 'panel.admin.colDisplayName')}</SortableTh>
                  <SortableTh columnKey="email" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>{t(locale, 'panel.admin.colEmail')}</SortableTh>
                  <SortableTh columnKey="role" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>{t(locale, 'panel.admin.colRole')}</SortableTh>
                  <th scope="col" className="border-b border-ink/12 px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted">
                    {t(locale, 'panel.admin.colOrigin')}
                  </th>
                  <SortableTh columnKey="companyName" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>{t(locale, 'panel.admin.colCompany')}</SortableTh>
                  <SortableTh columnKey="active" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>{t(locale, 'panel.admin.colUserActive')}</SortableTh>
                  <SortableTh columnKey="createdAt" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleUserSort}>{t(locale, 'panel.admin.colUserCreated')}</SortableTh>
                  <AdminActionsTh>{t(locale, 'panel.admin.colActions')}</AdminActionsTh>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const companyLabel = u.role === 'admin' ? t(locale, 'panel.common.notApplicable') : (u.companyName || `#${u.companyId || t(locale, 'panel.common.notApplicable')}`);
                  const createdAt = u.createdAt ? new Date(u.createdAt) : null;
                  return (
                    <tr key={u.id} className="border-b border-ink/[0.07]">
                      <td className="px-3 py-3 font-mono text-ink-faint">#{u.id}</td>
                      <td className="px-3 py-3 text-ink">
                        {u.displayName || t(locale, 'panel.common.notApplicable')}
                      </td>
                      <td className="px-3 py-3 text-ink">{u.email}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full border border-ink/12 bg-ink/[0.04] px-2 py-0.5 font-mono text-[10px] text-ink-muted">
                          {u.role}
                        </span>
                        {u.capabilitiesCustomized ? (
                          <span
                            title={t(locale, 'panel.admin.userModulesHint')}
                            className="ml-1.5 rounded-full border border-brand-500/25 bg-brand-500/[0.07] px-2 py-0.5 font-mono text-[10px] text-brand-600"
                          >
                            {t(locale, 'panel.admin.userModulesCustom')}
                          </span>
                        ) : null}
                        {u.passwordSetupPending ? (
                          <span
                            title={t(locale, 'panel.admin.passwordSetupPendingHint')}
                            className="ml-1.5 rounded-full border border-ink/12 bg-ink/[0.04] px-2 py-0.5 font-mono text-[10px] text-ink-muted"
                          >
                            {t(locale, 'panel.admin.passwordSetupPending')}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          title={t(locale, `panel.admin.originHint.${u.origin || 'admin'}`)}
                          className={cn(
                            'inline-block rounded-full border px-2 py-0.5 font-mono text-[10px]',
                            u.origin === 'admin' || !u.origin
                              ? 'border-ink/12 bg-ink/[0.04] text-ink-muted'
                              : 'border-info/25 bg-info/10 text-info'
                          )}
                        >
                          {t(locale, `panel.admin.origin.${u.origin || 'admin'}`)}
                        </span>
                        {u.signupPending ? (
                          <div className="mt-1 font-mono text-[10px] text-warning">
                            {t(locale, 'panel.admin.signupPendingBadge')}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 font-mono text-ink-muted">{companyLabel}</td>
                      <td className="px-3 py-3 font-mono text-ink-muted">{u.active ? t(locale, 'panel.common.yes') : t(locale, 'panel.common.no')}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-ink-faint">
                        {createdAt ? createdAt.toLocaleString(dateLocale) : t(locale, 'panel.common.notApplicable')}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <AdminActionsCell>
                          {u.passwordSetupPending ? (
                            <AdminIconButton
                              label={t(locale, 'panel.admin.resendInvite')}
                              icon="refresh"
                              onClick={() => resendInvite(u.id, u.email)}
                              disabled={loading}
                            />
                          ) : (
                            <AdminViewButton
                              label={t(locale, 'panel.admin.viewUser')}
                              onClick={() => viewUser(u)}
                              disabled={loading}
                            />
                          )}
                          <AdminEditButton
                            label={t(locale, 'panel.admin.editUser')}
                            onClick={() => editUser(u)}
                            disabled={loading}
                          />
                          <AdminDeleteButton
                            label={t(locale, 'panel.admin.deactivate')}
                            onClick={() => deleteUser(u.id)}
                            disabled={loading}
                          />
                        </AdminActionsCell>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {navigateDashboard && usersTotal > 0 ? (
              <AdminListPager
                locale={locale}
                page={usersPage}
                pageSize={usersPageSize}
                total={usersTotal}
                loading={loading}
                countLabel={t(locale, 'panel.admin.userCount', {
                  total: usersTotal,
                  page: usersPage,
                  totalPages: usersTotalPages,
                })}
                onPageChange={(p) => navigateDashboard({ usersPage: p, tab: 'users' })}
                onPageSizeChange={(ps) =>
                  navigateDashboard({ usersPage: 1, usersPageSize: ps, tab: 'users' })
                }
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
