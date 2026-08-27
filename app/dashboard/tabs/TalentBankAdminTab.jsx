'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { PAGE_SIZE_OPTIONS } from '../../../lib/assessment-filters';
import { PIPELINE_STAGES } from '../../../lib/pipeline';
import {
  S,
  SortableTh,
  AdminListPager,
  clientSortNextDir,
  TypeBadge,
} from '../dashboard-shared';

const STAGE_I18N = {
  new: 'recruiting.pipelineNew',
  interview: 'recruiting.pipelineInterview',
  test_completed: 'recruiting.pipelineTestCompleted',
  screening: 'recruiting.pipelineScreening',
  approved: 'recruiting.pipelineApproved',
  hired: 'recruiting.pipelineHired',
  rejected: 'recruiting.pipelineRejected',
  archived: 'recruiting.pipelineArchived',
};

function stageLabel(locale, stage) {
  if (!stage) return '—';
  const key = STAGE_I18N[stage];
  return key ? t(locale, key) : stage;
}

/**
 * Talent bank — reuse people who already applied / linked to a vacancy.
 */
export function TalentBankAdminTab({ locale = 'pt-BR', companyId }) {
  const { promptForm, toast } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [vacancyId, setVacancyId] = useState('');
  const [stage, setStage] = useState('');
  const [topType, setTopType] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState('lastActivityAt');
  const [sortDir, setSortDir] = useState('desc');
  const [vacancyOptions, setVacancyOptions] = useState([]);

  const loadVacancies = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/vacancies?pageSize=50&page=1');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const list = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.vacancies)
          ? data.vacancies
          : [];
      setVacancyOptions(list);
    } catch {
      /* filter stays empty */
    }
  }, []);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort,
        sortDir,
      });
      if (q) qs.set('q', q);
      if (vacancyId) qs.set('vacancyId', vacancyId);
      if (stage) qs.set('stage', stage);
      if (topType) qs.set('topType', topType);
      const res = await fetch(`/api/admin/talent-bank?${qs.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.talentBank.loadFailed'));
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === 'number' ? data.total : 0);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [companyId, page, pageSize, sort, sortDir, q, vacancyId, stage, topType, locale]);

  useEffect(() => {
    loadVacancies();
  }, [loadVacancies]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSort = (columnKey) => {
    const nextDir = clientSortNextDir(columnKey, sort, sortDir);
    // Prefer desc for activity dates on first click.
    const dir =
      columnKey === 'lastActivityAt' && sort !== columnKey ? 'desc' : nextDir;
    setSort(columnKey);
    setSortDir(dir);
    setPage(1);
  };

  const applySearch = () => {
    setQ(qDraft.trim());
    setPage(1);
  };

  const addToVacancy = async (candidateId, personName) => {
    const cid = Number(candidateId);
    if (!Number.isFinite(cid)) return;
    try {
      const searchQs = new URLSearchParams();
      if (companyId) searchQs.set('companyId', String(companyId));
      const values = await promptForm({
        title: t(locale, 'panel.team.addToVacancyTitle', { name: personName || '' }),
        confirmLabel: t(locale, 'panel.team.addToVacancyConfirm'),
        fields: [
          {
            key: 'vacancyId',
            type: 'entitySearch',
            label: t(locale, 'panel.team.addToVacancyPick'),
            searchUrl: `/api/admin/vacancies/search${searchQs.toString() ? `?${searchQs}` : ''}`,
            minChars: 0,
            placeholder: t(locale, 'panel.team.addToVacancySearchPh'),
            defaultValue: '',
          },
        ],
      });
      if (!values) return;
      const vid = String(values.vacancyId || '').trim();
      if (!vid) {
        toast(t(locale, 'panel.team.addToVacancyNeedVacancy'), 'error');
        return;
      }
      const post = await fetch(`/api/admin/vacancies/${encodeURIComponent(vid)}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: cid }),
      });
      const postData = await post.json().catch(() => ({}));
      if (!post.ok) throw new Error(postData?.error || t(locale, 'panel.common.error'));
      toast(
        postData?.alreadyLinked
          ? t(locale, 'panel.team.addToVacancyAlready')
          : t(locale, 'panel.team.addToVacancyOk'),
        'ok'
      );
    } catch (e) {
      toast(e?.message || t(locale, 'panel.common.error'), 'error');
    }
  };
;

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return '—';
    }
  };

  if (!companyId) {
    return (
      <EmptyState
        title={t(locale, 'panel.talentBank.needCompanyTitle')}
        message={t(locale, 'panel.talentBank.needCompanyBody')}
      />
    );
  }

  return (
    <div className={S.stack}>
      <div>
        <h2 className="m-0 font-display text-xl font-normal text-ink">
          {t(locale, 'panel.talentBank.title')}
        </h2>
        <p className={cn(S.muted, 'mt-1 max-w-2xl')}>{t(locale, 'panel.talentBank.intro')}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 font-mono text-[11px] text-ink-faint">
          {t(locale, 'panel.talentBank.filterSearch')}
          <input
            type="search"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch();
            }}
            onBlur={() => {
              if (qDraft.trim() !== q) applySearch();
            }}
            placeholder={t(locale, 'panel.talentBank.searchPh')}
            className={S.input}
          />
        </label>
        <label className="flex flex-col gap-1 font-mono text-[11px] text-ink-faint">
          {t(locale, 'panel.talentBank.filterVacancy')}
          <select
            value={vacancyId}
            onChange={(e) => {
              setVacancyId(e.target.value);
              setPage(1);
            }}
            className={S.select}
          >
            <option value="">{t(locale, 'panel.talentBank.allVacancies')}</option>
            {vacancyOptions.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.title || `#${v.id}`}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-mono text-[11px] text-ink-faint">
          {t(locale, 'panel.talentBank.filterStage')}
          <select
            value={stage}
            onChange={(e) => {
              setStage(e.target.value);
              setPage(1);
            }}
            className={S.select}
          >
            <option value="">{t(locale, 'panel.talentBank.allStages')}</option>
            {PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>
                {stageLabel(locale, s)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-mono text-[11px] text-ink-faint">
          {t(locale, 'panel.talentBank.filterType')}
          <select
            value={topType}
            onChange={(e) => {
              setTopType(e.target.value);
              setPage(1);
            }}
            className={S.select}
          >
            <option value="">{t(locale, 'panel.talentBank.allTypes')}</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={String(n)}>
                T{n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
      {loading ? (
        <AppLoading locale={locale} variant="panel" label={t(locale, 'common.loading')} />
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title={t(locale, 'panel.talentBank.emptyTitle')}
          message={t(locale, 'panel.talentBank.emptyBody')}
        />
      ) : null}

      {!loading && items.length > 0 ? (
        <>
          <p className={cn(S.faint, 'm-0')}>
            {t(locale, 'panel.talentBank.count', { n: total })}
          </p>
          <div className="overflow-x-auto rounded-card border border-ink/10 bg-white">
            <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-canvas/80">
                  <SortableTh
                    columnKey="name"
                    sortKey={sort}
                    dir={sortDir}
                    onSort={toggleSort}
                  >
                    {t(locale, 'panel.talentBank.colName')}
                  </SortableTh>
                  <SortableTh
                    columnKey="email"
                    sortKey={sort}
                    dir={sortDir}
                    onSort={toggleSort}
                  >
                    {t(locale, 'panel.talentBank.colEmail')}
                  </SortableTh>
                  <SortableTh
                    columnKey="vacancy"
                    sortKey={sort}
                    dir={sortDir}
                    onSort={toggleSort}
                  >
                    {t(locale, 'panel.talentBank.colVacancy')}
                  </SortableTh>
                  <SortableTh
                    columnKey="stage"
                    sortKey={sort}
                    dir={sortDir}
                    onSort={toggleSort}
                  >
                    {t(locale, 'panel.talentBank.colStage')}
                  </SortableTh>
                  <SortableTh
                    columnKey="type"
                    sortKey={sort}
                    dir={sortDir}
                    onSort={toggleSort}
                  >
                    {t(locale, 'panel.talentBank.colType')}
                  </SortableTh>
                  <SortableTh
                    columnKey="lastActivityAt"
                    sortKey={sort}
                    dir={sortDir}
                    onSort={toggleSort}
                  >
                    {t(locale, 'panel.talentBank.colActivity')}
                  </SortableTh>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right font-mono text-[11px] font-normal uppercase text-ink-faint"
                  >
                    {t(locale, 'panel.talentBank.colActions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-ink/6 align-middle last:border-0">
                    <td className="px-3 py-3">
                      <div className="font-medium text-ink">{row.fullName || '—'}</div>
                      <div className="font-mono text-[10px] text-ink-faint">#{row.id}</div>
                    </td>
                    <td className="px-3 py-3 text-sm text-ink-muted">{row.email || '—'}</td>
                    <td className="px-3 py-3 text-sm text-ink">
                      {row.vacancyTitle || (row.vacancyId ? `#${row.vacancyId}` : '—')}
                    </td>
                    <td className="px-3 py-3 text-sm text-ink-muted">
                      {stageLabel(locale, row.stage)}
                    </td>
                    <td className="px-3 py-3">
                      {row.topType ? (
                        <TypeBadge type={row.topType} locale={locale} compact />
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-muted whitespace-nowrap">
                      {formatDate(row.lastActivityAt)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/dashboard?tab=team&candidate=${row.id}`}
                          className={cn(S.btnGhost, 'min-h-touch inline-flex items-center')}
                        >
                          {t(locale, 'panel.talentBank.openPerson')}
                        </Link>
                        <button
                          type="button"
                          onClick={() => addToVacancy(row.id, row.fullName)}
                          className={cn(S.btnBrandSoft, 'min-h-touch')}
                        >
                          {t(locale, 'panel.team.addToVacancyBtn')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminListPager
            locale={locale}
            page={page}
            pageSize={pageSize}
            total={total}
            pageSizeOptions={PAGE_SIZE_OPTIONS.filter((n) => n <= 50)}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(ps) => {
              setPageSize(ps);
              setPage(1);
            }}
          />
        </>
      ) : null}
    </div>
  );
}
