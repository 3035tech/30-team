'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { C } from '../../../lib/theme';
import { t } from '../../../lib/i18n';
import { PAGE_SIZE_OPTIONS, parseCompaniesPagination, parseCompaniesSort } from '../../../lib/assessment-filters';
import { clientSortNextDir, S, SortableTh } from '../dashboard-shared';

export function CompaniesAdminTab({ navigateDashboard, locale }) {
  const urlParams = useSearchParams();
  const spKey = urlParams.toString();
  const sp = useMemo(() => Object.fromEntries(urlParams.entries()), [spKey]);
  const { page: companiesPage, pageSize: companiesPageSize } = parseCompaniesPagination(sp);
  const listSort = parseCompaniesSort(sp);
  const dateLocale = locale === 'en' ? 'en-US' : 'pt-BR';

  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [companiesTotal, setCompaniesTotal] = useState(0);
  const [companiesTotalPages, setCompaniesTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const toggleCompanySort = (col) => {
    if (!navigateDashboard) return;
    const nextDir = clientSortNextDir(col, listSort.sort, listSort.dir);
    navigateDashboard({ companiesSort: col, companiesSortDir: nextDir, companiesPage: 1, tab: 'companies' });
  };

  const appUrl =
    (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';

  const loadCompanies = async () => {
    setLoading(true);
    setError('');
    try {
      const snap = Object.fromEntries(urlParams.entries());
      const { page, pageSize } = parseCompaniesPagination(snap);
      const sortSt = parseCompaniesSort(snap);
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort: sortSt.sort,
        sortDir: sortSt.dir,
      });
      const res = await fetch(`/api/admin/companies?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.admin.loadCompaniesFailed'));
      setCompanies(Array.isArray(data.items) ? data.items : []);
      setCompaniesTotal(typeof data.total === 'number' ? data.total : 0);
      setCompaniesTotalPages(typeof data.totalPages === 'number' ? data.totalPages : 1);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [spKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.admin.createCompanyFailed'));
      setName(''); setSlug('');
      await loadCompanies();
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
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
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.admin.rotateLinkFailed'));
      await loadCompanies();
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const deleteCompany = async (companyId, companyName) => {
    const ok = window.confirm(
      t(locale, 'panel.admin.archiveCompanyConfirm', { name: companyName })
    );
    if (!ok) return;
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/companies/${encodeURIComponent(companyId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.admin.archiveCompanyFailed'));
      setMsg(t(locale, 'panel.admin.companyArchived'));
      await loadCompanies();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const editCompany = async (c) => {
    const nextName = window.prompt(t(locale, 'panel.admin.editCompanyName'), c?.name ?? '');
    if (nextName == null) return;
    const nextSlug = window.prompt(t(locale, 'panel.admin.editCompanySlug'), c?.slug ?? '');
    if (nextSlug == null) return;
    const nextActiveRaw = window.prompt(t(locale, 'panel.admin.editCompanyActive'), String(Boolean(c?.active)));
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
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.admin.updateCompanyFailed'));
      setMsg(t(locale, 'panel.admin.companyUpdated'));
      await loadCompanies();
      setTimeout(() => setMsg(''), 1600);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(t(locale, 'panel.common.copied'));
      setTimeout(() => setMsg(''), 1200);
    } catch {
      setMsg(t(locale, 'panel.common.copyFailed'));
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

      <span style={{ ...S.label, display: 'block', marginBottom: '2px' }}>{t(locale, 'panel.admin.companiesTitle')}</span>
      <div style={{ ...S.card, padding: '22px 28px' }}>
        <span style={S.label}>{t(locale, 'panel.admin.companiesRegister')}</span>
        <p style={{ fontSize: '13px', color: C.muted, marginTop: '10px', lineHeight: 1.65, marginBottom: 0 }}>
          {t(locale, 'panel.admin.companiesRegisterDesc')}
        </p>
      </div>

      <div style={{ ...S.card }}>
        <span style={S.label}>{t(locale, 'panel.admin.companiesNew')}</span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t(locale, 'panel.admin.companiesNamePlaceholder')}
            style={{ flex: '1 1 260px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px', fontFamily: 'monospace' }}
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={t(locale, 'panel.admin.slugPlaceholder')}
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
            {t(locale, 'panel.admin.create')}
          </button>
          <button
            type="button"
            onClick={loadCompanies}
            disabled={loading}
            style={{ background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '10px 14px', color: C.muted, fontSize: '12px',
              cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
          >
            {t(locale, 'panel.admin.refresh')}
          </button>
        </div>
      </div>

      <div style={{ ...S.card }}>
        <span style={S.label}>{t(locale, 'panel.admin.companiesList')}</span>
        {companiesTotal === 0 ? (
          <p style={{ color: C.muted, fontStyle: 'italic', marginTop: '10px' }}>
            {t(locale, 'panel.admin.noCompaniesYet')}
          </p>
        ) : (
          <div style={{ marginTop: '10px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '720px' }}>
              <thead>
                <tr style={{ background: 'rgba(26,22,37,.02)' }}>
                  <SortableTh columnKey="id" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleCompanySort}>{t(locale, 'panel.admin.sortId')}</SortableTh>
                  <SortableTh columnKey="name" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleCompanySort}>{t(locale, 'panel.admin.colName')}</SortableTh>
                  <SortableTh columnKey="slug" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleCompanySort}>{t(locale, 'panel.admin.colSlug')}</SortableTh>
                  <SortableTh columnKey="active" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleCompanySort}>{t(locale, 'panel.admin.colActive')}</SortableTh>
                  <SortableTh columnKey="createdAt" sortKey={listSort.sort} dir={listSort.dir} onSort={toggleCompanySort}>{t(locale, 'panel.admin.colCreated')}</SortableTh>
                  <th scope="col" style={{ textAlign: 'right', padding: '10px 12px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, fontFamily: 'monospace', borderBottom: `1px solid ${C.border}` }}>{t(locale, 'panel.admin.colLinkActions')}</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => {
                  const token = c.activeToken || '';
                  const link = token ? `${appUrl}/t/${token}` : '';
                  const exp = c.activeTokenExpiresAt ? new Date(c.activeTokenExpiresAt) : null;
                  const createdAt = c.createdAt ? new Date(c.createdAt) : null;
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(26,22,37,.07)', verticalAlign: 'top' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', color: C.faint }}>#{c.id}</td>
                      <td style={{ padding: '12px', color: C.text }}>{c.name}</td>
                      <td style={{ padding: '12px', color: C.muted, fontFamily: 'monospace' }}>{c.slug}</td>
                      <td style={{ padding: '12px', color: C.muted, fontFamily: 'monospace' }}>{c.active ? t(locale, 'panel.common.yes') : t(locale, 'panel.common.no')}</td>
                      <td style={{ padding: '12px', color: C.faint, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {createdAt ? createdAt.toLocaleString(dateLocale) : t(locale, 'panel.common.notApplicable')}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ marginBottom: '8px', fontSize: '11px', color: C.muted, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'left' }}>
                          {token ? link : t(locale, 'panel.admin.noLink')}
                          {token && exp ? (
                            <div style={{ marginTop: '4px', fontSize: '10px', color: C.faint }}>
                              {t(locale, 'panel.admin.linkExpires', { date: exp.toLocaleString(dateLocale) })}
                            </div>
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
                            {t(locale, 'panel.admin.edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => rotateLink(c.id)}
                            disabled={loading}
                            style={{ background: 'transparent', border: `1px solid ${C.border}`,
                              borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '11px',
                              cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                          >
                            {t(locale, 'panel.admin.rotateLink')}
                          </button>
                          <button
                            type="button"
                            onClick={() => token && copy(link)}
                            disabled={loading || !token}
                            style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
                              borderRadius: '10px', padding: '8px 10px', color: C.purple, fontSize: '11px',
                              cursor: 'pointer', fontFamily: 'monospace', opacity: (loading || !token) ? 0.6 : 1 }}
                          >
                            {t(locale, 'panel.admin.copyLink')}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCompany(c.id, c.name)}
                            disabled={loading}
                            style={{ background: 'rgba(232,71,71,.08)', border: '1px solid rgba(232,71,71,.35)',
                              borderRadius: '10px', padding: '8px 10px', color: C.tension, fontSize: '11px',
                              cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                          >
                            {t(locale, 'panel.admin.archive')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {navigateDashboard && companiesTotal > 0 ? (
              <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', justifyContent: 'space-between',
                marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${C.border}`,
              }}>
                <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                  {t(locale, 'panel.admin.companyCount', {
                    total: companiesTotal,
                    page: companiesPage,
                    totalPages: companiesTotalPages,
                  })}
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={String(companiesPageSize)}
                    onChange={(e) => {
                      const ps = parseInt(e.target.value, 10);
                      navigateDashboard({ companiesPage: 1, companiesPageSize: ps, tab: 'companies' });
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
                    disabled={loading || companiesPage <= 1}
                    onClick={() => navigateDashboard({ companiesPage: Math.max(1, companiesPage - 1), tab: 'companies' })}
                    style={{ background: companiesPage <= 1 ? 'transparent' : `${C.purple}18`,
                      border: `1px solid ${companiesPage <= 1 ? C.border : `${C.purple}55`}`,
                      borderRadius: '10px', padding: '6px 12px', color: companiesPage <= 1 ? C.faint : C.purple,
                      fontSize: '11px', cursor: companiesPage <= 1 ? 'default' : 'pointer', fontFamily: 'monospace' }}
                  >
                    {t(locale, 'panel.admin.prev')}
                  </button>
                  <button
                    type="button"
                    disabled={loading || companiesPage >= companiesTotalPages}
                    onClick={() => navigateDashboard({ companiesPage: Math.min(companiesTotalPages, companiesPage + 1), tab: 'companies' })}
                    style={{ background: companiesPage >= companiesTotalPages ? 'transparent' : `${C.purple}18`,
                      border: `1px solid ${companiesPage >= companiesTotalPages ? C.border : `${C.purple}55`}`,
                      borderRadius: '10px', padding: '6px 12px',
                      color: companiesPage >= companiesTotalPages ? C.faint : C.purple,
                      fontSize: '11px', cursor: companiesPage >= companiesTotalPages ? 'default' : 'pointer', fontFamily: 'monospace' }}
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
