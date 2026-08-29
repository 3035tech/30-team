'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import {
  PAGE_SIZE_OPTIONS,
  parseVacanciesPagination,
  parseVacanciesSort,
} from '../../../lib/assessment-filters';
import {
  clientSortNextDir,
  PanelSubNav,
  S,
  AdminCreateButton,
  AdminEditButton,
  AdminDeleteButton,
  AdminActionsCell,
  AdminIconButton,
  AdminViewButton,
} from '../dashboard-shared';
import { VacancyInterviewCandidates } from '../VacancyInterviewCandidates';
import { VacancyClientReportBlock } from '../VacancyClientReportBlock';
import { RichTextEditor } from '../../_components/RichTextEditor';
import {
  AdminRichFormDrawer,
  dialogBtnGhostClass,
  dialogBtnPrimaryClass,
} from '../../_components/AdminRichFormDrawer';
import { formatSalaryBr, salaryToCentsDigits, stripSalary, digitsOnly } from '../../../lib/br-masks';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';
import { VACANCY_EMPLOYMENT_TYPES, employmentTypeLabelKey } from '../../../lib/vacancy-employment-type';
import { VACANCY_STATUS } from '../../../lib/domain-status.js';
import { formatWorkplaceLabel } from '../../../lib/vacancy-workplace';
import { VacancyWorkplaceFields } from '../../_components/VacancyWorkplaceFields';
import { DateField } from '../../_components/DateField';
import { publicVacancyPath } from '../../../lib/public-job-url';
import { formatPublicVacancyDate } from '../../../lib/public-vacancy-lifecycle';
import { formatVacancySalaryRange, toDatetimeLocalValue } from '../vacancies/vacancy-admin-shared';
import { VacancyDescriptionHtml } from '../vacancies/VacancyDescriptionHtml';
import { VacancyPublicFlagsFields } from '../vacancies/VacancyPublicFlagsFields';
import { VacancyFormSection } from '../vacancies/VacancyFormSection';
import { VacancyDescriptionAssistBar } from '../vacancies/VacancyDescriptionAssistBar';
import { VacancyInviteByEmail } from '../vacancies/VacancyInviteByEmail';
import { VacancyInvitesBlock } from '../vacancies/VacancyInvitesBlock';
import { VacancyRubricEditor } from '../vacancies/VacancyRubricEditor';
import { VacancyFitRankingBlock } from '../vacancies/VacancyFitRankingBlock';
import { VacancyFunnelAnalyticsBlock } from '../vacancies/VacancyFunnelAnalyticsBlock';
import { VacancyReferralBlock } from '../vacancies/VacancyReferralBlock';
import { VacancyKanbanBlock } from '../vacancies/VacancyKanbanBlock';
import { CopyableLink } from '../../_components/CopyableLink';
import { RubricEditor } from '../../_components/RubricEditor';
import { fieldInputClass, fieldSelectClass } from '../../_components/form-control-styles';


const FIELD = `${fieldInputClass} w-full font-mono text-xs`;
const FIELD_SELECT = `${fieldSelectClass} w-full font-mono text-xs`;
const FIELD_LABEL =
  'flex flex-col gap-1.5 font-mono text-[11px] text-ink-faint';
const FIELD_LABEL_INLINE =
  'flex items-center gap-2 font-mono text-xs text-ink-muted';
const BTN_GHOST =
  'min-h-touch cursor-pointer rounded-control border border-ink/12 bg-transparent px-3 py-2 font-mono text-xs text-ink-muted disabled:cursor-default disabled:opacity-60';
const BTN_BRAND =
  'min-h-touch cursor-pointer rounded-control border border-brand-500/35 bg-brand-500/[0.09] px-3.5 py-2 font-mono text-xs text-brand-500 disabled:cursor-default disabled:opacity-60';
const BTN_BRAND_SOFT =
  'min-h-touch cursor-pointer rounded-control border border-brand-500/25 bg-brand-500/[0.07] px-3 py-2 font-mono text-[11px] text-brand-500 disabled:cursor-default disabled:opacity-60';
const CHECK_LABEL =
  'flex max-w-[520px] items-start gap-2.5 text-xs leading-[1.45] text-ink-muted';
const LINK_ROW = 'mt-2.5 flex min-w-0 flex-col gap-1';
const META = 'font-mono text-[11px] text-ink-muted';
const META_FAINT = 'font-mono text-[11px] text-ink-faint';
const GRID_AUTO = 'grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5';
const GRID_AUTO_LG = 'grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5';

export { VacancyInviteByEmail };

export function VacanciesAdminTab({ isAdmin, navigateDashboard, locale = 'pt-BR' }) {
  const { confirm, notice, toast } = useAppFeedback();
  const urlParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [vacancies, setVacancies] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [invitesRefresh, setInvitesRefresh] = useState(0);
  const [pipelineRefresh, setPipelineRefresh] = useState(0);
  const [linkExpiryEdit, setLinkExpiryEdit] = useState(null);
  const [editingVacancy, setEditingVacancy] = useState(null);
  const [detailVacancy, setDetailVacancy] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSection, setDetailSection] = useState('pipeline');

  const vacancyDetailId = String(urlParams.get('vacancyDetail') || '').trim();
  const isDetailView = Boolean(vacancyDetailId);

  const { page: vacPage, pageSize: vacPageSize } = parseVacanciesPagination(
    Object.fromEntries(urlParams.entries())
  );
  const vacSortSt = parseVacanciesSort(Object.fromEntries(urlParams.entries()), { isAdmin });
  const vacFilterFromUrl = String(urlParams.get('vacancy') || 'all');
  const companyFilterFromUrl = String(urlParams.get('company') || 'all');
  const [vacTotal, setVacTotal] = useState(0);
  const [vacTotalPages, setVacTotalPages] = useState(1);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState(VACANCY_STATUS.OPEN);
  const [positionsCount, setPositionsCount] = useState('1');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');
  const [descAiBusy, setDescAiBusy] = useState(false);
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [workplaceModality, setWorkplaceModality] = useState('');
  const [workplaceState, setWorkplaceState] = useState('');
  const [workplaceCity, setWorkplaceCity] = useState('');
  const [clientReportShowSalary, setClientReportShowSalary] = useState(false);
  const [publicPageEnabled, setPublicPageEnabled] = useState(false);
  const [publicAllowIndex, setPublicAllowIndex] = useState(true);
  const [publicShowCompanyInfo, setPublicShowCompanyInfo] = useState(false);
  const [publicShowSalary, setPublicShowSalary] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [jobRoleId, setJobRoleId] = useState('');
  const [jobRoles, setJobRoles] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const appUrl =
    (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';

  const pushVacanciesSort = (column) => {
    const cur = parseVacanciesSort(Object.fromEntries(urlParams.entries()), { isAdmin });
    const nextDir = clientSortNextDir(column, cur.sort, cur.dir);
    navigateDashboard({
      vacanciesSort: column,
      vacanciesSortDir: nextDir,
      vacanciesPage: 1,
      tab: 'vacancies',
    });
  };

  const loadVacancies = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        page: String(vacPage),
        pageSize: String(vacPageSize),
        sort: vacSortSt.sort,
        sortDir: vacSortSt.dir,
      });
      if (vacFilterFromUrl && vacFilterFromUrl !== 'all') qs.set('vacancy', vacFilterFromUrl);
      if (isAdmin && companyFilterFromUrl && companyFilterFromUrl !== 'all') {
        qs.set('company', companyFilterFromUrl);
      }
      const res = await fetch(`/api/admin/vacancies?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'recruiting.loadVacanciesFailed'));
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
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/companies?forSelect=1');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.admin.loadCompaniesFailed'));
      setCompanies(Array.isArray(data) ? data : []);
      if (!companyId && Array.isArray(data) && data.length) {
        const fromFilter =
          companyFilterFromUrl !== 'all' &&
          data.some((c) => String(c.id) === companyFilterFromUrl)
            ? companyFilterFromUrl
            : String(data[0].id);
        setCompanyId(fromFilter);
      }
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const loadJobRoles = async (cid) => {
    try {
      const qs = cid ? `?companyId=${encodeURIComponent(cid)}` : '';
      const res = await fetch(`/api/admin/job-roles${qs}`);
      if (!res.ok) return;
      const data = await res.json();
      setJobRoles(data.roles || []);
    } catch (e) {
      console.error('[VacanciesTab] Load job roles error:', e);
    }
  };

  useEffect(() => {
    if (isDetailView) return;
    loadVacancies();
  }, [vacPage, vacPageSize, vacSortSt.sort, vacSortSt.dir, vacFilterFromUrl, companyFilterFromUrl, isDetailView]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadCompanies();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isAdmin) {
      if (companyId) loadJobRoles(companyId);
      return;
    }
    loadJobRoles();
  }, [companyId, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (companyFilterFromUrl !== 'all') setCompanyId(companyFilterFromUrl);
  }, [companyFilterFromUrl, isAdmin]);

  const loadVacancyDetail = async (id) => {
    setDetailLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'recruiting.loadVacancyFailed'));
      setDetailVacancy(data);
    } catch (e) {
      setDetailVacancy(null);
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!vacancyDetailId) {
      setDetailVacancy(null);
      return;
    }
    setDetailSection('pipeline');
    loadVacancyDetail(vacancyDetailId);
  }, [vacancyDetailId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openVacancyDetail = (id) => {
    navigateDashboard({ tab: 'vacancies', vacancyDetail: String(id) });
  };

  const backToVacanciesList = () => {
    setDetailVacancy(null);
    setLinkExpiryEdit(null);
    setEditingVacancy(null);
    navigateDashboard({ tab: 'vacancies', vacancyDetail: '' });
  };

  const createVacancy = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const body = {
        title: title.trim(), status, slug: slug.trim() || undefined,
        positionsCount: parseInt(positionsCount, 10) || 1,
        targetDate: targetDate || null,
        description,
        employmentType,
        workplaceModality,
        workplaceState,
        workplaceCity,
        salaryMin: stripSalary(salaryMin),
        salaryMax: stripSalary(salaryMax),
        clientReportShowSalary,
        publicPageEnabled,
        publicAllowIndex,
        publicShowCompanyInfo,
        publicShowSalary,
        jobRoleId: jobRoleId ? parseInt(jobRoleId, 10) : null,
      };
      if (isAdmin) body.companyId = companyId ? parseInt(companyId, 10) : null;
      const res = await fetch('/api/admin/vacancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'recruiting.createVacancyFailed'));
      setTitle(''); setSlug(''); setStatus(VACANCY_STATUS.OPEN); setPositionsCount('1'); setTargetDate('');
      setDescription(''); setEmploymentType(''); setWorkplaceModality(''); setWorkplaceState(''); setWorkplaceCity('');
      setSalaryMin(''); setSalaryMax(''); setClientReportShowSalary(false);
      setPublicPageEnabled(false); setPublicAllowIndex(true);
      setPublicShowCompanyInfo(false); setPublicShowSalary(false);
      setJobRoleId('');
      setShowCreate(false);
      setMsg(t(locale, 'recruiting.vacancyCreated'));
      await loadVacancies();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const rotateLink = async (vacancyId) => {
    setLoading(true);
    setError('');
    setMsg('');
    setLinkExpiryEdit((cur) => (cur?.vacancyId === vacancyId ? null : cur));
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/link`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.admin.rotateLinkFailed'));
      setMsg(t(locale, 'recruiting.linkRotated'));
      if (isDetailView) await loadVacancyDetail(vacancyId);
      else await loadVacancies();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const saveLinkExpiry = async () => {
    if (!linkExpiryEdit?.vacancyId) return;
    const parsed = new Date(linkExpiryEdit.value);
    if (Number.isNaN(parsed.getTime())) {
      setError(t(locale, 'recruiting.invalidExpiry'));
      return;
    }
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(linkExpiryEdit.vacancyId)}/link`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresAt: parsed.toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'recruiting.updateExpiryFailed'));
      setMsg(t(locale, 'recruiting.expiryUpdated'));
      setLinkExpiryEdit(null);
      if (isDetailView) await loadVacancyDetail(linkExpiryEdit.vacancyId);
      else await loadVacancies();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
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
      if (!res.ok) throw new Error(data?.error || t(locale, 'recruiting.updateVacancyFailed'));
      setMsg(t(locale, 'recruiting.vacancyUpdated'));
      if (isDetailView) await loadVacancyDetail(vacancyId);
      else await loadVacancies();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const editVacancy = (v) => {
    setShowCreate(false);
    if (v.companyId) loadJobRoles(v.companyId);
    setEditingVacancy({
      id: v.id,
      companyId: v.companyId ?? null,
      title: v.title ?? '',
      slug: v.slug ?? '',
      status: v.status ?? VACANCY_STATUS.OPEN,
      positionsCount: String(v.positionsCount ?? 1),
      targetDate: v.targetDate ? String(v.targetDate).slice(0, 10) : '',
      description: v.description ?? '',
      employmentType: v.employmentType ?? '',
      workplaceModality: v.workplaceModality ?? '',
      workplaceState: v.workplaceState ?? '',
      workplaceCity: v.workplaceCity ?? '',
      salaryMin: salaryToCentsDigits(v.salaryMin),
      salaryMax: salaryToCentsDigits(v.salaryMax),
      clientReportShowSalary: Boolean(v.clientReportShowSalary),
      publicPageEnabled: Boolean(v.publicPageEnabled),
      publicAllowIndex: Boolean(v.publicAllowIndex),
      publicShowCompanyInfo: Boolean(v.publicShowCompanyInfo),
      publicShowSalary: Boolean(v.publicShowSalary),
      jobRoleId: v.jobRoleId != null ? String(v.jobRoleId) : '',
      companySlug: v.companySlug || '',
    });
  };

  const cloneVacancyAction = async (v) => {
    if (!v?.id) return;
    const ok = await confirm({
      title: t(locale, 'recruiting.cloneVacancyConfirmTitle'),
      message: t(locale, 'recruiting.cloneVacancyConfirmBody', { title: v.title || '' }),
      confirmLabel: t(locale, 'recruiting.cloneVacancy'),
    });
    if (!ok) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(v.id)}/clone`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      toast(t(locale, 'recruiting.cloneVacancyDone', { title: data.title || '' }), 'ok');
      openVacancyDetail(data.id);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const saveVacancyEdit = async () => {
    if (!editingVacancy) return;
    const {
      id,
      title,
      slug,
      status,
      positionsCount,
      targetDate,
      description,
      employmentType,
      workplaceModality,
      workplaceState,
      workplaceCity,
      salaryMin,
      salaryMax,
      clientReportShowSalary,
      publicPageEnabled,
      publicAllowIndex,
      publicShowCompanyInfo,
      publicShowSalary,
      jobRoleId: editJobRoleId,
    } = editingVacancy;
    if (!title.trim()) { setError(t(locale, 'recruiting.titleRequired')); return; }
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || undefined,
          status,
          positionsCount: parseInt(positionsCount, 10) || 1,
          targetDate: targetDate || null,
          description,
          employmentType,
          workplaceModality,
          workplaceState,
          workplaceCity,
          salaryMin: stripSalary(salaryMin),
          salaryMax: stripSalary(salaryMax),
          clientReportShowSalary: Boolean(clientReportShowSalary),
          publicPageEnabled: Boolean(publicPageEnabled),
          publicAllowIndex: Boolean(publicAllowIndex),
          publicShowCompanyInfo: Boolean(publicShowCompanyInfo),
          publicShowSalary: Boolean(publicShowSalary),
          jobRoleId: editJobRoleId ? parseInt(editJobRoleId, 10) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'recruiting.updateVacancyFailed'));
      setMsg(t(locale, 'recruiting.vacancyUpdated'));
      setEditingVacancy(null);
      if (isDetailView) await loadVacancyDetail(id);
      else await loadVacancies();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const archiveVacancy = async (vacancyId, title) => {
    const ok = await confirm({
      message: t(locale, 'recruiting.archiveConfirm', { title }),
      danger: true,
    });
    if (!ok) return;
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'recruiting.archiveVacancyFailed'));
      setMsg(t(locale, 'recruiting.vacancyArchived'));
      if (isDetailView) {
        backToVacanciesList();
      } else {
        await loadVacancies();
      }
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const vacancyFormDrawers = (
    <>
      <AdminRichFormDrawer
        open={showCreate}
        title={t(locale, 'recruiting.createVacancyDrawerTitle')}
        locale={locale}
        onClose={() => setShowCreate(false)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              disabled={loading}
              className={dialogBtnGhostClass}
            >
              {t(locale, 'panel.admin.cancel')}
            </button>
            <button
              type="button"
              onClick={createVacancy}
              disabled={loading || !title.trim() || (isAdmin && !companyId)}
              className={cn(
                dialogBtnPrimaryClass,
                'inline-flex items-center gap-2',
                (loading || !title.trim() || (isAdmin && !companyId)) && 'opacity-60'
              )}
            >
              {loading ? <span className="spinner" /> : null}
              {t(locale, 'panel.admin.create')}
            </button>
          </>
        )}
      >
        <div className="flex flex-col gap-3">
          <VacancyFormSection locale={locale} titleKey="recruiting.formSectionEssentials" defaultOpen>
            {isAdmin ? (
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                aria-label={t(locale, 'dashboard.allCompanies')}
                className={cn(FIELD_SELECT, "max-w-[420px]")}
              >
                {companies.length === 0 ? (
                  <option value="">{t(locale, 'panel.admin.loadingCompanies')}</option>
                ) : companies.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name} (#{c.id})</option>
                ))}
              </select>
            ) : null}

            {jobRoles.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className={FIELD_LABEL}>
                  {t(locale, 'jobRoles.title')} ({t(locale, 'common.optional')})
                  <select
                    value={jobRoleId}
                    onChange={(e) => setJobRoleId(e.target.value)}
                    className={cn(FIELD_SELECT, "max-w-[420px]")}
                  >
                    <option value="">{t(locale, 'recruiting.noJobRole')}</option>
                    {jobRoles.map((jr) => (
                      <option key={jr.id} value={String(jr.id)}>{jr.name}</option>
                    ))}
                  </select>
                </label>
                {(() => {
                  const selected = jobRoles.find((jr) => String(jr.id) === String(jobRoleId));
                  const rubric =
                    selected?.rubric && typeof selected.rubric === 'object' ? selected.rubric : {};
                  if (!jobRoleId || Object.keys(rubric).length === 0) return null;
                  return (
                    <div className="max-w-[420px]">
                      <p className="m-0 mb-1 font-mono text-[10px] text-ink-faint">
                        {t(locale, 'jobRoles.rubricPreview')}
                      </p>
                      <RubricEditor value={rubric} locale={locale} compact />
                    </div>
                  );
                })()}
              </div>
            )}

            <div className={GRID_AUTO_LG}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t(locale, 'recruiting.createTitlePh')}
                aria-label={t(locale, 'recruiting.createTitlePh')}
                className={FIELD}
              />
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={t(locale, 'recruiting.createSlugPh')}
                aria-label={t(locale, 'recruiting.createSlugPh')}
                className={cn(FIELD, "max-w-[320px]")}
              />
            </div>

            <div className={cn(GRID_AUTO, 'items-end')}>
              <label className={FIELD_LABEL}>
                {t(locale, 'recruiting.sortStatus')}
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={FIELD_SELECT}
                >
                  <option value="open">{t(locale, 'recruiting.openStatus')}</option>
                  <option value="closed">{t(locale, 'recruiting.closedStatus')}</option>
                </select>
              </label>
              <label className={FIELD_LABEL}>
                {t(locale, 'recruiting.positionsLabel')}
                <input
                  type="number"
                  min="1"
                  value={positionsCount}
                  onChange={(e) => setPositionsCount(e.target.value)}
                  aria-label={t(locale, 'recruiting.positionsLabel')}
                  className={cn(FIELD, "min-w-[72px] px-2")}
                />
              </label>
              <label className={FIELD_LABEL}>
                {t(locale, 'recruiting.targetDateLabel')}
                <DateField
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  aria-label={t(locale, 'recruiting.targetDateLabel')}
                  className={cn(FIELD, 'px-2 py-[9px]')}
                />
              </label>
            </div>
          </VacancyFormSection>

          <VacancyFormSection locale={locale} titleKey="recruiting.formSectionRolePay" defaultOpen>
            <div className={cn(GRID_AUTO, 'max-w-[640px]')}>
              <label className={FIELD_LABEL}>
                {t(locale, 'recruiting.employmentTypeLabel')}
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className={FIELD_SELECT}
                >
                  <option value="">{t(locale, 'recruiting.employmentTypeNone')}</option>
                  {VACANCY_EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{t(locale, employmentTypeLabelKey(type))}</option>
                  ))}
                </select>
              </label>
              <label className={FIELD_LABEL}>
                {t(locale, 'recruiting.salaryMinPh')}
                <input
                  value={formatSalaryBr(salaryMin)}
                  onChange={(e) => setSalaryMin(digitsOnly(e.target.value).slice(0, 15))}
                  placeholder={t(locale, 'recruiting.salaryMinPh')}
                  inputMode="numeric"
                  aria-label={t(locale, 'recruiting.salaryMinPh')}
                  className={FIELD}
                />
              </label>
              <label className={FIELD_LABEL}>
                {t(locale, 'recruiting.salaryMaxPh')}
                <input
                  value={formatSalaryBr(salaryMax)}
                  onChange={(e) => setSalaryMax(digitsOnly(e.target.value).slice(0, 15))}
                  placeholder={t(locale, 'recruiting.salaryMaxPh')}
                  inputMode="numeric"
                  aria-label={t(locale, 'recruiting.salaryMaxPh')}
                  className={FIELD}
                />
              </label>
            </div>

            <VacancyWorkplaceFields
              locale={locale}
              workplaceModality={workplaceModality}
              workplaceState={workplaceState}
              workplaceCity={workplaceCity}
              onChange={(patch) => {
                if (patch.workplaceModality !== undefined) setWorkplaceModality(patch.workplaceModality);
                if (patch.workplaceState !== undefined) setWorkplaceState(patch.workplaceState);
                if (patch.workplaceCity !== undefined) setWorkplaceCity(patch.workplaceCity);
              }}
            />

            <label className={CHECK_LABEL}>
              <input
                type="checkbox"
                checked={clientReportShowSalary}
                onChange={(e) => setClientReportShowSalary(e.target.checked)}
                className="mt-0.5 accent-brand-500"
              />
              <span>
                <strong className="text-ink">{t(locale, 'recruiting.clientReportShowSalary')}</strong>
                <br />
                {t(locale, 'recruiting.clientReportShowSalaryHelp')}
              </span>
            </label>
          </VacancyFormSection>

          <VacancyFormSection locale={locale} titleKey="recruiting.formSectionPublic" defaultOpen={false}>
            <VacancyPublicFlagsFields
              locale={locale}
              values={{
                publicPageEnabled,
                publicAllowIndex,
                publicShowCompanyInfo,
                publicShowSalary,
              }}
              seoContext={{
                title,
                description,
                employmentType,
                salaryMin,
                salaryMax,
                workplaceModality,
                workplaceCity,
                workplaceState,
              }}
              onChange={(patch) => {
                if (patch.publicPageEnabled != null) setPublicPageEnabled(patch.publicPageEnabled);
                if (patch.publicAllowIndex != null) setPublicAllowIndex(patch.publicAllowIndex);
                if (patch.publicShowCompanyInfo != null) setPublicShowCompanyInfo(patch.publicShowCompanyInfo);
                if (patch.publicShowSalary != null) setPublicShowSalary(patch.publicShowSalary);
              }}
            />
          </VacancyFormSection>

          <VacancyFormSection locale={locale} titleKey="recruiting.formSectionDescription" defaultOpen>
            <VacancyDescriptionAssistBar
              locale={locale}
              busy={descAiBusy}
              title={title}
              descriptionHtml={description}
              employmentType={employmentType}
              salaryMin={salaryMin}
              salaryMax={salaryMax}
              onApplyDescription={setDescription}
              onBusyChange={setDescAiBusy}
            />
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder={t(locale, 'recruiting.vacancyDescriptionPh')}
              minHeight={120}
              locale={locale}
              disabled={descAiBusy}
            />
          </VacancyFormSection>
        </div>
      </AdminRichFormDrawer>

      <AdminRichFormDrawer
        open={!!editingVacancy}
        title={t(locale, 'recruiting.editVacancyDrawerTitle')}
        locale={locale}
        onClose={() => setEditingVacancy(null)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setEditingVacancy(null)}
              disabled={loading}
              className={dialogBtnGhostClass}
            >
              {t(locale, 'panel.admin.cancel')}
            </button>
            <button
              type="button"
              onClick={saveVacancyEdit}
              disabled={loading || !editingVacancy}
              className={cn(dialogBtnPrimaryClass, (loading || !editingVacancy) && 'opacity-60')}
            >
              {t(locale, 'panel.admin.save')}
            </button>
          </>
        )}
      >
        {editingVacancy ? (
          <div className="flex flex-col gap-3">
            <VacancyFormSection locale={locale} titleKey="recruiting.formSectionEssentials" defaultOpen>
              {jobRoles.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <label className={FIELD_LABEL}>
                    {t(locale, 'jobRoles.title')} ({t(locale, 'common.optional')})
                    <select
                      value={editingVacancy.jobRoleId || ''}
                      onChange={(e) =>
                        setEditingVacancy((cur) => ({ ...cur, jobRoleId: e.target.value }))
                      }
                      className={cn(FIELD_SELECT, 'max-w-[420px] text-[13px]')}
                    >
                      <option value="">{t(locale, 'recruiting.noJobRole')}</option>
                      {jobRoles.map((jr) => (
                        <option key={jr.id} value={String(jr.id)}>{jr.name}</option>
                      ))}
                    </select>
                  </label>
                  {(() => {
                    const selected = jobRoles.find(
                      (jr) => String(jr.id) === String(editingVacancy.jobRoleId || '')
                    );
                    const rubric =
                      selected?.rubric && typeof selected.rubric === 'object' ? selected.rubric : {};
                    if (!editingVacancy.jobRoleId || Object.keys(rubric).length === 0) return null;
                    return (
                      <div className="max-w-[420px]">
                        <p className="m-0 mb-1 font-mono text-[10px] text-ink-faint">
                          {t(locale, 'jobRoles.rubricPreview')}
                        </p>
                        <RubricEditor value={rubric} locale={locale} compact />
                      </div>
                    );
                  })()}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2.5">
                <input
                  value={editingVacancy.title}
                  onChange={(e) => setEditingVacancy((cur) => ({ ...cur, title: e.target.value }))}
                  placeholder={t(locale, 'recruiting.vacancyTitlePh')}
                  aria-label={t(locale, 'recruiting.vacancyTitlePh')}
                  className={cn(FIELD, "flex-[2_1_280px] text-[13px]")}
                />
                <input
                  value={editingVacancy.slug}
                  onChange={(e) => setEditingVacancy((cur) => ({ ...cur, slug: e.target.value }))}
                  placeholder={t(locale, 'recruiting.vacancySlugPh')}
                  aria-label={t(locale, 'recruiting.vacancySlugPh')}
                  className={cn(FIELD, "flex-[1_1_200px] text-[13px]")}
                />
                <select
                  value={editingVacancy.status}
                  onChange={(e) => setEditingVacancy((cur) => ({ ...cur, status: e.target.value }))}
                  aria-label={t(locale, 'recruiting.sortStatus')}
                  className={cn(FIELD_SELECT, "flex-[0_0_140px] text-[13px] text-ink")}
                >
                  <option value="open">{t(locale, 'recruiting.openStatus')}</option>
                  <option value="closed">{t(locale, 'recruiting.closedStatus')}</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <label className={FIELD_LABEL_INLINE}>
                  {t(locale, 'recruiting.positionsLabel')}
                  <input
                    type="number"
                    min="1"
                    value={editingVacancy.positionsCount}
                    onChange={(e) => setEditingVacancy((cur) => ({ ...cur, positionsCount: e.target.value }))}
                    aria-label={t(locale, 'recruiting.positionsLabel')}
                    className="w-[70px] rounded-control border border-ink/12 bg-ink/[0.04] px-2.5 py-2 font-mono text-[13px] text-ink"
                  />
                </label>
                <label className={FIELD_LABEL_INLINE}>
                  {t(locale, 'recruiting.targetDateLabel')}
                  <DateField
                    value={editingVacancy.targetDate}
                    onChange={(e) => setEditingVacancy((cur) => ({ ...cur, targetDate: e.target.value }))}
                    aria-label={t(locale, 'recruiting.targetDateLabel')}
                    className="rounded-control border border-ink/12 bg-ink/[0.04] px-2.5 py-2 font-mono text-[13px] text-ink"
                  />
                </label>
              </div>
            </VacancyFormSection>

            <VacancyFormSection locale={locale} titleKey="recruiting.formSectionRolePay" defaultOpen>
              <div className={cn(GRID_AUTO, 'max-w-[640px]')}>
                <select
                  value={editingVacancy.employmentType}
                  onChange={(e) => setEditingVacancy((cur) => ({ ...cur, employmentType: e.target.value }))}
                  aria-label={t(locale, 'recruiting.employmentTypeLabel')}
                  className={cn(FIELD_SELECT, "px-2.5 py-2 text-[13px]")}
                >
                  <option value="">{t(locale, 'recruiting.employmentTypeNone')}</option>
                  {VACANCY_EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{t(locale, employmentTypeLabelKey(type))}</option>
                  ))}
                </select>
                <input
                  value={formatSalaryBr(editingVacancy.salaryMin)}
                  onChange={(e) => setEditingVacancy((cur) => ({ ...cur, salaryMin: digitsOnly(e.target.value).slice(0, 15) }))}
                  placeholder={t(locale, 'recruiting.salaryMinPh')}
                  inputMode="numeric"
                  aria-label={t(locale, 'recruiting.salaryMinPh')}
                  className={cn(FIELD, "px-2.5 py-2 text-[13px]")}
                />
                <input
                  value={formatSalaryBr(editingVacancy.salaryMax)}
                  onChange={(e) => setEditingVacancy((cur) => ({ ...cur, salaryMax: digitsOnly(e.target.value).slice(0, 15) }))}
                  placeholder={t(locale, 'recruiting.salaryMaxPh')}
                  inputMode="numeric"
                  aria-label={t(locale, 'recruiting.salaryMaxPh')}
                  className={cn(FIELD, "px-2.5 py-2 text-[13px]")}
                />
              </div>
              <VacancyWorkplaceFields
                locale={locale}
                compact
                workplaceModality={editingVacancy.workplaceModality}
                workplaceState={editingVacancy.workplaceState}
                workplaceCity={editingVacancy.workplaceCity}
                onChange={(patch) => setEditingVacancy((cur) => ({ ...cur, ...patch }))}
              />
              <label className={CHECK_LABEL}>
                <input
                  type="checkbox"
                  checked={Boolean(editingVacancy.clientReportShowSalary)}
                  onChange={(e) =>
                    setEditingVacancy((cur) => ({ ...cur, clientReportShowSalary: e.target.checked }))
                  }
                  className="mt-0.5 accent-brand-500"
                />
                <span>
                  <strong className="text-ink">{t(locale, 'recruiting.clientReportShowSalary')}</strong>
                  <br />
                  {t(locale, 'recruiting.clientReportShowSalaryHelp')}
                </span>
              </label>
            </VacancyFormSection>

            <VacancyFormSection locale={locale} titleKey="recruiting.formSectionPublic" defaultOpen={false}>
              <VacancyPublicFlagsFields
                locale={locale}
                values={{
                  publicPageEnabled: editingVacancy.publicPageEnabled,
                  publicAllowIndex: editingVacancy.publicAllowIndex,
                  publicShowCompanyInfo: editingVacancy.publicShowCompanyInfo,
                  publicShowSalary: editingVacancy.publicShowSalary,
                }}
                seoContext={{
                  title: editingVacancy.title,
                  description: editingVacancy.description,
                  employmentType: editingVacancy.employmentType,
                  salaryMin: editingVacancy.salaryMin,
                  salaryMax: editingVacancy.salaryMax,
                  workplaceModality: editingVacancy.workplaceModality,
                  workplaceCity: editingVacancy.workplaceCity,
                  workplaceState: editingVacancy.workplaceState,
                }}
                onChange={(patch) => setEditingVacancy((cur) => ({ ...cur, ...patch }))}
              />
            </VacancyFormSection>

            <VacancyFormSection locale={locale} titleKey="recruiting.formSectionDescription" defaultOpen>
              <VacancyDescriptionAssistBar
                locale={locale}
                busy={descAiBusy}
                title={editingVacancy.title}
                descriptionHtml={editingVacancy.description}
                employmentType={editingVacancy.employmentType}
                salaryMin={editingVacancy.salaryMin}
                salaryMax={editingVacancy.salaryMax}
                vacancyId={editingVacancy.id}
                onApplyDescription={(html) =>
                  setEditingVacancy((cur) => ({ ...cur, description: html }))
                }
                onBusyChange={setDescAiBusy}
              />
              <RichTextEditor
                value={editingVacancy.description}
                onChange={(html) => setEditingVacancy((cur) => ({ ...cur, description: html }))}
                placeholder={t(locale, 'recruiting.vacancyDescriptionPh')}
                minHeight={140}
                locale={locale}
                disabled={descAiBusy}
              />
            </VacancyFormSection>
          </div>
        ) : null}
      </AdminRichFormDrawer>
    </>
  );

  if (isDetailView) {
    const v = detailVacancy;
    const token = v?.activeToken || null;
    const link = token ? `${appUrl}/v/${token}` : '';
    const publicPagePath =
      v?.id && v?.slug
        ? publicVacancyPath({ vacancySlug: v.slug, vacancyId: v.id })
        : '';
    const publicPageLink = publicPagePath ? `${appUrl}${publicPagePath}` : '';
    const exp = v?.activeTokenExpiresAt ? new Date(v.activeTokenExpiresAt) : null;
    return (
      <>
        {vacancyFormDrawers}
      <div className="flex flex-col gap-4">
        <div className={cn(S.card, 'px-7 py-[22px]')}>
          <div className="mb-2.5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={backToVacanciesList}
              className={BTN_GHOST}
            >
              {t(locale, 'recruiting.backToVacancies')}
            </button>
            <span className={S.label}>{t(locale, 'recruiting.vacancyDetailTitle')}</span>
          </div>
          {error ? (
            <p className="mb-0 mt-2.5 font-mono text-xs text-danger">
              {error}
            </p>
          ) : null}
          {msg ? (
            <p className="mb-0 mt-2.5 font-mono text-xs text-success">
              {msg}
            </p>
          ) : null}
          {(detailLoading || loading) && !v ? (
            <AppLoading
              locale={locale}
              variant="block"
              label={t(locale, 'recruiting.loadingVacancy')}
            />
          ) : null}
          {!detailLoading && !v && error ? (
            <button
              type="button"
              onClick={backToVacanciesList}
              className={cn(BTN_BRAND, "mt-3.5")}
            >
              {t(locale, 'recruiting.backToList')}
            </button>
          ) : null}
        </div>

        {v ? (
          <>
            <div className={S.card}>
              <span className={cn(S.label, 'mb-3.5 block')}>{t(locale, 'recruiting.vacancyInfoTitle')}</span>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-[1_1_280px]">
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <span className="text-lg font-bold text-ink">{v.title}</span>
                    <span
                      className={cn(
                      'rounded-full border px-2 py-0.5 font-mono text-[11px]',
                      v.status === VACANCY_STATUS.OPEN
                        ? 'border-success/35 text-success'
                        : 'border-ink/12 text-ink-faint'
                    )}
                    >
                      {v.status === VACANCY_STATUS.OPEN ? t(locale, 'recruiting.openStatus') : t(locale, 'recruiting.closedStatus')}
                    </span>
                    {isAdmin && (
                      <span className="font-mono text-xs text-ink-faint">
                        · {v.companyName}
                      </span>
                    )}
                  </div>
                  {token ? (
                    <div className={LINK_ROW}>
                      <CopyableLink
                        url={link}
                        locale={locale}
                        label={t(locale, 'recruiting.enneagramLinkLabel')}
                        iconOnly
                        compact
                        disabled={loading}
                      />
                      {exp ? (
                        <span className={META_FAINT}>
                          {t(locale, 'recruiting.expiresAt', {
                            when: exp.toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR'),
                          })}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-2 font-mono text-xs text-ink-faint">
                      {t(locale, 'recruiting.noActiveLink')}
                    </div>
                  )}
                  {publicPageLink ? (
                    <div className={LINK_ROW}>
                      <CopyableLink
                        url={publicPageLink}
                        locale={locale}
                        label={t(locale, 'recruiting.publicPageLinkLabel')}
                        iconOnly
                        compact
                        disabled={loading}
                      />
                      {!v.publicPageEnabled ? (
                        <span className={META_FAINT}>
                          {t(locale, 'recruiting.publicPageLinkDisabledHint')}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-3">
                    {v.positionsCount != null && v.positionsCount > 0 && (
                      <span className={META}>
                        {t(locale, 'recruiting.positionsCount', { n: v.positionsCount })}
                      </span>
                    )}
                    {v.targetDate && formatPublicVacancyDate(v.targetDate, locale) ? (
                      <span className={META}>
                        {t(locale, 'recruiting.targetDate', {
                          date: formatPublicVacancyDate(v.targetDate, locale),
                        })}
                      </span>
                    ) : null}
                    {formatVacancySalaryRange(locale, v.salaryMin, v.salaryMax) ? (
                      <span className={META}>
                        {formatVacancySalaryRange(locale, v.salaryMin, v.salaryMax)}
                      </span>
                    ) : null}
                    {employmentTypeLabelKey(v.employmentType) ? (
                      <span className={META}>
                        {t(locale, employmentTypeLabelKey(v.employmentType))}
                      </span>
                    ) : null}
                    {formatWorkplaceLabel(
                      {
                        workplaceModality: v.workplaceModality,
                        workplaceCity: v.workplaceCity,
                        workplaceState: v.workplaceState,
                      },
                      locale,
                      t
                    ) ? (
                      <span className={META}>
                        {formatWorkplaceLabel(
                          {
                            workplaceModality: v.workplaceModality,
                            workplaceCity: v.workplaceCity,
                            workplaceState: v.workplaceState,
                          },
                          locale,
                          t
                        )}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <AdminActionsCell>
                  <AdminEditButton
                    label={t(locale, 'recruiting.editVacancy')}
                    onClick={() => editVacancy(v)}
                    disabled={loading}
                  />
                  <AdminIconButton
                    label={t(locale, 'recruiting.cloneVacancy')}
                    icon="copy"
                    tint="muted"
                    onClick={() => cloneVacancyAction(v)}
                    disabled={loading}
                  />
                </AdminActionsCell>
                <button
                  type="button"
                  onClick={() => setDetailSection('config')}
                  className={BTN_GHOST}
                >
                  {t(locale, 'recruiting.moreActions')}
                </button>
              </div>

              <div className="mt-[18px]">
                <PanelSubNav
                  ariaLabel={t(locale, 'recruiting.detailTabsAria')}
                  active={detailSection}
                  onChange={setDetailSection}
                  moreLabel={t(locale, 'recruiting.detailTabMore')}
                  tabs={[
                    { id: 'pipeline', label: t(locale, 'recruiting.detailTabPipeline') },
                    { id: 'candidates', label: t(locale, 'recruiting.detailTabCandidates') },
                  ]}
                  moreTabs={[
                    { id: 'fit', label: t(locale, 'recruiting.detailTabFit') },
                    { id: 'analytics', label: t(locale, 'recruiting.detailTabAnalytics') },
                    { id: 'referral', label: t(locale, 'recruiting.detailTabReferral') },
                    { id: 'report', label: t(locale, 'recruiting.detailTabReport') },
                    { id: 'config', label: t(locale, 'recruiting.detailTabConfig') },
                  ]}
                />
                {detailSection === 'pipeline' ? (
                  <p className="mb-3 mt-0 text-xs leading-relaxed text-ink-muted">
                    {t(locale, 'recruiting.vacancyKanbanHint')}
                  </p>
                ) : null}
              </div>

              {detailSection === 'pipeline' ? (
                <VacancyKanbanBlock vacancyId={v.id} locale={locale} refreshKey={pipelineRefresh} />
              ) : null}

              {detailSection === 'analytics' ? (
                <VacancyFunnelAnalyticsBlock
                  vacancyId={v.id}
                  locale={locale}
                  appUrl={appUrl}
                  publicPagePath={
                    v.publicPageEnabled && v.slug
                      ? publicVacancyPath({ vacancySlug: v.slug, vacancyId: v.id })
                      : ''
                  }
                />
              ) : null}

              {detailSection === 'referral' ? (
                <VacancyReferralBlock
                  vacancyId={v.id}
                  locale={locale}
                  appUrl={appUrl}
                  publicPagePath={
                    v.publicPageEnabled && v.slug
                      ? publicVacancyPath({ vacancySlug: v.slug, vacancyId: v.id })
                      : ''
                  }
                />
              ) : null}

              {detailSection === 'candidates' ? (
                <div>
                  <VacancyInterviewCandidates
                    vacancyId={v.id}
                    locale={locale}
                    onPipelineChange={() => {
                      setInvitesRefresh((x) => x + 1);
                      setPipelineRefresh((x) => x + 1);
                    }}
                  />
                  <VacancyInviteByEmail
                    vacancyId={v.id}
                    locale={locale}
                    onSent={() => {
                      setInvitesRefresh((x) => x + 1);
                      setPipelineRefresh((x) => x + 1);
                    }}
                  />
                  <VacancyInvitesBlock vacancyId={v.id} locale={locale} refreshKey={invitesRefresh} />
                </div>
              ) : null}

              {detailSection === 'fit' ? (
                <div>
                  <VacancyRubricEditor
                    vacancyId={v.id}
                    locale={locale}
                    vacancyTitle={v.title || ''}
                    vacancyDescription={v.description || ''}
                    onSaved={() => setPipelineRefresh((x) => x + 1)}
                  />
                  <div className="mt-4">
                    <VacancyFitRankingBlock vacancyId={v.id} locale={locale} refreshKey={pipelineRefresh} />
                  </div>
                </div>
              ) : null}

              {detailSection === 'report' ? (
                <VacancyClientReportBlock
                  vacancyId={v.id}
                  locale={locale}
                  appUrl={appUrl}
                  clientReportShowSalary={Boolean(v.clientReportShowSalary)}
                  onClientReportShowSalaryChange={(next) => {
                    setVacancies((list) =>
                      list.map((row) =>
                        Number(row.id) === Number(v.id)
                          ? { ...row, clientReportShowSalary: next }
                          : row
                      )
                    );
                  }}
                />
              ) : null}

              {detailSection === 'config' ? (
                <div>
                  {v.description ? <VacancyDescriptionHtml html={v.description} /> : null}
                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigateDashboard({ tab: 'team', vacancy: String(v.id), vacancyDetail: '' })}
                      className={BTN_BRAND_SOFT}
                    >
                      {t(locale, 'recruiting.viewCandidates')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setVacancyStatus(v.id, v.status === VACANCY_STATUS.OPEN ? VACANCY_STATUS.CLOSED : VACANCY_STATUS.OPEN)}
                      disabled={loading}
                      className={cn(BTN_GHOST, loading && "opacity-60")}
                    >
                      {v.status === VACANCY_STATUS.OPEN ? t(locale, 'recruiting.closeVacancy') : t(locale, 'recruiting.reopenVacancy')}
                    </button>
                    <button
                      type="button"
                      onClick={() => rotateLink(v.id)}
                      disabled={loading}
                      className={cn(BTN_GHOST, loading && "opacity-60")}
                    >
                      {t(locale, 'recruiting.rotateLink')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!token) return;
                        setLinkExpiryEdit((cur) =>
                          cur?.vacancyId === v.id
                            ? null
                            : {
                                vacancyId: v.id,
                                value: v.activeTokenExpiresAt
                                  ? toDatetimeLocalValue(new Date(v.activeTokenExpiresAt))
                                  : toDatetimeLocalValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
                              }
                        );
                      }}
                      disabled={loading || !token}
                      className={cn(BTN_GHOST, (loading || !token) && "opacity-60")}
                    >
                      {t(locale, 'recruiting.editLinkExpiry')}
                    </button>
                    <button
                      type="button"
                      onClick={() => archiveVacancy(v.id, v.title)}
                      disabled={loading}
                      className={cn("min-h-touch cursor-pointer rounded-control border border-danger/35 bg-danger/[0.08] px-2.5 py-2 font-mono text-xs text-danger", loading && "opacity-60")}
                    >
                      {t(locale, 'recruiting.archiveVacancy')}
                    </button>
                  </div>
                  {linkExpiryEdit?.vacancyId === v.id && (
                    <div className="mt-3 flex flex-wrap items-center gap-2.5 rounded-control border border-ink/12 bg-ink/[0.04] p-3">
                      <span className="font-mono text-xs text-ink-muted">
                        {t(locale, 'panel.admin.expiringOn')}
                      </span>
                      <DateField
                        mode="datetime-local"
                        value={linkExpiryEdit.value}
                        onChange={(e) =>
                          setLinkExpiryEdit((cur) =>
                            cur && cur.vacancyId === v.id ? { ...cur, value: e.target.value } : cur
                          )
                        }
                        disabled={loading}
                        aria-label={t(locale, 'panel.admin.ariaLinkExpiry')}
                        className={cn(FIELD, 'min-w-[180px] flex-[1_1_200px] px-2.5 py-2 text-[13px]')}
                      />
                      <button type="button" onClick={saveLinkExpiry} disabled={loading}
                        className={cn("min-h-touch cursor-pointer rounded-control border border-success/35 bg-success/[0.09] px-3 py-2 font-mono text-xs text-success", loading && "opacity-60")}>
                        {t(locale, 'panel.admin.save')}
                      </button>
                      <button type="button" onClick={() => setLinkExpiryEdit(null)} disabled={loading}
                        className={cn(BTN_GHOST, loading && "opacity-60")}>
                        {t(locale, 'panel.admin.cancel')}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
      </>
    );
  }

  return (
    <>
      {vacancyFormDrawers}
    <div className="flex flex-col gap-4">
      <div className={cn(S.card, 'px-7 py-[22px]')}>
        <span className={S.label}>{t(locale, 'recruiting.vacanciesTitle')}</span>
        <p className="mb-0 mt-2.5 text-[13px] leading-[1.65] text-ink-muted">
          {t(locale, 'recruiting.vacanciesIntro')}
        </p>
        {error ? (
          <p className="mb-0 mt-2.5 font-mono text-xs text-danger">
            {error}
          </p>
        ) : null}
        {msg ? (
          <p className="mb-0 mt-2.5 font-mono text-xs text-success">
            {msg}
          </p>
        ) : null}
      </div>

      <div className={S.card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={S.label}>{t(locale, 'recruiting.registeredVacancies')}</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadVacancies}
              disabled={loading}
              className={cn(BTN_GHOST, "inline-flex items-center gap-2 px-3.5 py-2.5", loading && "opacity-60")}
            >
              {loading ? <span className="spinner" /> : null}
              {t(locale, 'recruiting.refresh')}
            </button>
            <AdminCreateButton
              label={t(locale, 'recruiting.createVacancyOpen')}
              onClick={() => { setEditingVacancy(null); setShowCreate(true); }}
            />
          </div>
        </div>

        {vacFilterFromUrl !== 'all' ? (
          <div className="mt-2.5 rounded-control border border-ink/12 bg-ink/[0.03] px-3.5 py-2.5">
            <p className="m-0 text-xs leading-[1.55] text-ink-muted">
              {t(locale, 'recruiting.filterLimited')}{' '}
              <button
                type="button"
                onClick={() => navigateDashboard({ vacancy: 'all', vacanciesPage: 1, tab: 'vacancies' })}
                className="cursor-pointer border-none bg-transparent p-0 font-mono text-xs text-brand-600 underline"
              >
                {t(locale, 'recruiting.showAllVacancies')}
              </button>
            </p>
          </div>
        ) : null}
        {vacTotal === 0 ? (
          <div className="mt-3">
            <EmptyState
              message={
                vacFilterFromUrl !== 'all'
                  ? t(locale, 'recruiting.noVacancyFilter')
                  : t(locale, 'recruiting.noVacanciesYet')
              }
              actionLabel={
                vacFilterFromUrl === 'all' ? t(locale, 'recruiting.createVacancyOpen') : undefined
              }
              onAction={
                vacFilterFromUrl === 'all'
                  ? () => {
                      setEditingVacancy(null);
                      setShowCreate(true);
                    }
                  : undefined
              }
              actionDisabled={loading}
            />
          </div>
        ) : (
          <>
            <div
              role="group"
              aria-label={t(locale, 'recruiting.sortVacanciesAria')}
              className="mt-3 flex flex-wrap items-center gap-2.5 rounded-xl border border-ink/12 bg-ink/[0.03] p-3"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                {t(locale, 'recruiting.sortBy')}
              </span>
              {[
                { k: 'id', label: 'ID' },
                { k: 'title', label: t(locale, 'recruiting.sortTitle') },
                { k: 'status', label: t(locale, 'recruiting.sortStatus') },
                ...(isAdmin ? [{ k: 'companyName', label: t(locale, 'recruiting.sortCompany') }] : []),
                { k: 'createdAt', label: t(locale, 'recruiting.sortCreated') },
              ].map(({ k, label }) => {
                const active = vacSortSt.sort === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => pushVacanciesSort(k)}
                    aria-pressed={active}
                    className={cn(
                      'cursor-pointer rounded-lg border px-3 py-1.5 font-mono text-[11px]',
                      active
                        ? 'border-brand-500/35 bg-brand-500/[0.09] text-brand-500'
                        : 'border-ink/12 bg-transparent text-ink-muted'
                    )}
                  >
                    {label}
                    {active ? (vacSortSt.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                );
              })}
            </div>
          <div className="mt-2.5 flex flex-col gap-2.5">
            {vacancies.map((v) => {
              const token = v.activeToken || '';
              const link = token ? `${appUrl}/v/${token}` : '';
              const exp = v.activeTokenExpiresAt ? new Date(v.activeTokenExpiresAt) : null;
              return (
                <div key={v.id} className="rounded-xl border border-ink/12 bg-ink/[0.03] p-3.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink">
                      <span className="font-mono text-xs text-ink-faint">#{v.id}</span>
                      <strong className="font-medium">{v.title}</strong>
                      <span
                        className={cn(
                          'rounded-lg border px-2 py-0.5 font-mono text-[11px]',
                          v.status === VACANCY_STATUS.OPEN
                            ? 'border-success/30 bg-success/[0.12] text-success'
                            : 'border-ink/12 bg-ink/[0.08] text-ink-muted'
                        )}
                      >
                        {v.status === VACANCY_STATUS.OPEN
                          ? t(locale, 'recruiting.openStatus')
                          : t(locale, 'recruiting.closedStatus')}
                      </span>
                      {isAdmin ? (
                        <span className="font-mono text-xs text-ink-faint">· {v.companyName}</span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {v.positionsCount != null && v.positionsCount > 0 ? (
                        <span className={META}>
                          {t(locale, 'recruiting.positionsCount', { n: v.positionsCount })}
                        </span>
                      ) : null}
                      {v.targetDate && formatPublicVacancyDate(v.targetDate, locale) ? (
                        <span className={META}>
                          {t(locale, 'recruiting.targetDate', {
                            date: formatPublicVacancyDate(v.targetDate, locale),
                          })}
                        </span>
                      ) : null}
                      {formatVacancySalaryRange(locale, v.salaryMin, v.salaryMax) ? (
                        <span className={META}>
                          {formatVacancySalaryRange(locale, v.salaryMin, v.salaryMax)}
                        </span>
                      ) : null}
                    </div>

                    {token ? (
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <CopyableLink
                          url={link}
                          locale={locale}
                          label={t(locale, 'recruiting.enneagramLinkLabel')}
                          iconOnly
                          compact
                          disabled={loading}
                        />
                        {exp ? (
                          <span className="font-mono text-[11px] text-ink-faint">
                            {t(locale, 'recruiting.expiresAt', {
                              when: exp.toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR'),
                            })}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-2 font-mono text-xs text-ink-faint">
                        {t(locale, 'recruiting.noActiveLink')}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/8 pt-3">
                    <AdminActionsCell>
                      <AdminIconButton
                        label={t(locale, 'recruiting.viewCandidates')}
                        icon="users"
                        onClick={() => navigateDashboard({ tab: 'team', vacancy: String(v.id) })}
                      />
                      <AdminViewButton
                        label={t(locale, 'recruiting.details')}
                        onClick={() => openVacancyDetail(v.id)}
                      />
                      <AdminEditButton
                        label={t(locale, 'recruiting.editVacancy')}
                        onClick={() => editVacancy(v)}
                        disabled={loading}
                      />
                      <AdminDeleteButton
                        label={t(locale, 'recruiting.archiveVacancy')}
                        onClick={() => archiveVacancy(v.id, v.title)}
                        disabled={loading}
                      />
                      <AdminIconButton
                        label={t(locale, 'recruiting.cloneVacancy')}
                        icon="copy"
                        tint="muted"
                        onClick={() => cloneVacancyAction(v)}
                        disabled={loading}
                      />
                      <AdminIconButton
                        label={
                          v.status === VACANCY_STATUS.OPEN
                            ? t(locale, 'recruiting.closeVacancy')
                            : t(locale, 'recruiting.reopenVacancy')
                        }
                        icon="door"
                        tint={v.status === VACANCY_STATUS.OPEN ? 'warning' : 'brand'}
                        onClick={() =>
                          setVacancyStatus(
                            v.id,
                            v.status === VACANCY_STATUS.OPEN
                              ? VACANCY_STATUS.CLOSED
                              : VACANCY_STATUS.OPEN
                          )
                        }
                        disabled={loading}
                      />
                      <AdminIconButton
                        label={t(locale, 'recruiting.rotateLink')}
                        icon="refresh"
                        tint="muted"
                        onClick={() => rotateLink(v.id)}
                        disabled={loading}
                      />
                    </AdminActionsCell>
                  </div>
                </div>
              );
            })}
          </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink/12 pt-3.5">
              <span className={META}>
                {t(locale, 'recruiting.vacanciesPage', { total: vacTotal, page: vacPage, pages: vacTotalPages })}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={String(vacPageSize)}
                  onChange={(e) => {
                    const ps = parseInt(e.target.value, 10);
                    navigateDashboard({ vacanciesPage: 1, vacanciesPageSize: ps, tab: 'vacancies' });
                  }}
                  disabled={loading}
                  className={S.selectCompact}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={String(n)}>{t(locale, 'panel.compat.perPageShort', { n })}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={loading || vacPage <= 1}
                  onClick={() => navigateDashboard({ vacanciesPage: Math.max(1, vacPage - 1), tab: 'vacancies' })}
                  className={cn(
                    'rounded-control border px-3 py-1.5 font-mono text-[11px]',
                    vacPage <= 1
                      ? 'cursor-default border-ink/12 bg-transparent text-ink-faint'
                      : 'cursor-pointer border-brand-500/35 bg-brand-500/[0.09] text-brand-500'
                  )}
                >
                  {t(locale, 'panel.admin.prev')}
                </button>
                <button
                  type="button"
                  disabled={loading || vacPage >= vacTotalPages}
                  onClick={() => navigateDashboard({ vacanciesPage: Math.min(vacTotalPages, vacPage + 1), tab: 'vacancies' })}
                  className={cn(
                    'rounded-control border px-3 py-1.5 font-mono text-[11px]',
                    vacPage >= vacTotalPages
                      ? 'cursor-default border-ink/12 bg-transparent text-ink-faint'
                      : 'cursor-pointer border-brand-500/35 bg-brand-500/[0.09] text-brand-500'
                  )}
                >
                  {t(locale, 'panel.admin.next')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
