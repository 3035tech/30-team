'use client';

import { SelectField } from '../../_components/SelectField';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  AdminActionsCell,
  AdminPageHeader,
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
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { CollapsibleBlock } from '../../_components/CollapsibleBlock';
import { VACANCY_EMPLOYMENT_TYPES, employmentTypeLabelKey } from '../../../lib/vacancy-employment-type';
import { VACANCY_STATUS } from '../../../lib/domain-status.js';
import { formatWorkplaceLabel } from '../../../lib/vacancy-workplace';
import { VacancyWorkplaceFields } from '../../_components/VacancyWorkplaceFields';
import { DateField } from '../../_components/DateField';
import { publicVacancyPath } from '../../../lib/public-job-url';
import { formatPublicVacancyDate } from '../../../lib/public-vacancy-lifecycle';
import { formatVacancySalaryRange, toDatetimeLocalValue } from '../vacancies/vacancy-admin-shared';
import { VacancyPublicFlagsFields } from '../vacancies/VacancyPublicFlagsFields';
import { VacancyFormSection } from '../vacancies/VacancyFormSection';
import { VacancyDescriptionAssistBar } from '../vacancies/VacancyDescriptionAssistBar';
import { VacancyInviteByEmail } from '../vacancies/VacancyInviteByEmail';
import { VacancyInvitesBlock } from '../vacancies/VacancyInvitesBlock';
import { VacancyWhatsAppShareButton } from '../vacancies/VacancyWhatsAppShareButton';
import { VacancyRubricEditor } from '../vacancies/VacancyRubricEditor';
import { VacancyFitRankingBlock } from '../vacancies/VacancyFitRankingBlock';
import { VacancyFunnelAnalyticsBlock } from '../vacancies/VacancyFunnelAnalyticsBlock';
import { VacancyReferralBlock } from '../vacancies/VacancyReferralBlock';
import { VacancyKanbanBlock } from '../vacancies/VacancyKanbanBlock';
import { PipelineStagesEditor } from '../vacancies/PipelineStagesEditor';
import { PipelineTemplatesManager } from '../vacancies/PipelineTemplatesManager';
import { CopyableLink } from '../../_components/CopyableLink';
import { RubricEditor } from '../../_components/RubricEditor';
import { FormField, formFieldRowClass } from '../../_components/FormField';
import { fieldInputClass, fieldSelectClass } from '../../_components/form-control-styles';
import { RECRUITING_UX_EVENT } from '../../../lib/recruiting-ux-events';
import { VacancyDescriptionHtml } from '../vacancies/VacancyDescriptionHtml';
import { Icon } from '../../_components/Icon';


const FIELD = `${fieldInputClass} w-full font-mono text-xs`;
const FIELD_SELECT = `${fieldSelectClass} w-full font-mono text-xs`;
const BTN_GHOST =
  'inline-flex min-h-touch cursor-pointer items-center justify-center rounded-control border border-ink/12 bg-transparent px-3 py-2 font-ui text-sm text-ink-muted transition-colors hover:border-ink/20 hover:bg-ink/[0.035] hover:text-ink disabled:cursor-default disabled:opacity-60';
const BTN_BRAND =
  'inline-flex min-h-touch cursor-pointer items-center justify-center rounded-control border border-brand-500/35 bg-brand-500/[0.09] px-3.5 py-2 font-ui text-sm font-medium text-brand-500 transition-colors hover:bg-brand-500/[0.14] disabled:cursor-default disabled:opacity-60';
const BTN_BRAND_SOFT =
  'inline-flex min-h-touch cursor-pointer items-center justify-center rounded-control border border-brand-500/25 bg-brand-500/[0.07] px-3 py-2 font-ui text-sm font-medium text-brand-500 transition-colors hover:bg-brand-500/[0.12] disabled:cursor-default disabled:opacity-60';
const META = 'font-mono text-2xs text-ink-muted';
const META_FAINT = 'font-mono text-2xs text-ink-faint';
const GRID_AUTO = 'grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5';
const GRID_AUTO_LG = 'grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5';
const VACANCY_DETAIL_SECTIONS = Object.freeze([
  'pipeline',
  'candidates',
  'information',
  'distribution',
  'settings',
]);

function VacancyMetaItem({ label, value, warning = false }) {
  return (
    <div className="min-w-0 rounded-control border border-ink/8 bg-surface/55 px-3 py-2">
      <span className="block font-mono text-2xs uppercase tracking-[0.08em] text-ink-faint">{label}</span>
      <span className={cn('mt-1 block truncate text-xs text-ink', warning && 'text-warning')}>{value}</span>
    </div>
  );
}

function getVacancyLinkState(expiresAt, locale) {
  const date = expiresAt ? new Date(expiresAt) : null;
  const timestamp = date?.getTime();
  const expired = Number.isFinite(timestamp) && timestamp <= Date.now();
  return {
    date: Number.isFinite(timestamp) ? date : null,
    expired,
    label: expired
      ? (locale === 'en' ? 'Expired' : 'Expirado')
      : (locale === 'en' ? 'Active' : 'Ativo'),
  };
}

function normalizeVacancyDetailSection(value) {
  const legacy = {
    fit: 'candidates',
    analytics: 'pipeline',
    referral: 'distribution',
    report: 'distribution',
    config: 'settings',
  };
  if (legacy[value]) return legacy[value];
  return VACANCY_DETAIL_SECTIONS.includes(value) ? value : 'pipeline';
}

export { VacancyInviteByEmail };

export function VacanciesAdminTab({ isAdmin, navigateDashboard, locale = 'pt-BR' }) {
  const { confirm, notice, promptForm, toast } = useAppFeedback();
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
  const [detailSection, setDetailSection] = useState(() =>
    normalizeVacancyDetailSection(urlParams.get('vacancySection'))
  );

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

  // Auto-limpa msg após 3s; cancela timer anterior a cada nova msg e ao desmontar
  // (evita setState em componente desmontado quando o gestor troca de aba/vaga).
  const msgTimerRef = useRef(null);
  const createFromNavigationHandledRef = useRef(false);
  useEffect(() => {
    if (urlParams.get('create') !== '1' || createFromNavigationHandledRef.current) return;
    createFromNavigationHandledRef.current = true;
    setEditingVacancy(null);
    setShowCreate(true);
  }, [urlParams]);
  useEffect(() => () => {
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
  }, []);
  const showMsg = useCallback((text) => {
    setMsg(text);
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMsg(''), 3000);
  }, []);

  const handlePipelineStagesChange = useCallback(() => {
    setPipelineRefresh((current) => current + 1);
  }, []);

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
  const [pipelineTemplates, setPipelineTemplates] = useState([]);
  const [pipelineTemplateId, setPipelineTemplateId] = useState('');
  const [pipelineTemplatesLoading, setPipelineTemplatesLoading] = useState(false);
  const [pipelineTemplatesError, setPipelineTemplatesError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showPipelineSettings, setShowPipelineSettings] = useState(false);
  const createOpenedAtRef = useRef(null);
  const pipelineTemplateLoadRef = useRef(0);

  const trackRecruitingUx = useCallback((event, extra = {}) => {
    const body = { event, ...extra };
    if (isAdmin && companyId) body.companyId = Number(companyId);
    void fetch('/api/admin/recruiting-ux-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  }, [companyId, isAdmin]);

  const openCreate = useCallback(() => {
    setEditingVacancy(null);
    setShowCreate(true);
    createOpenedAtRef.current = Date.now();
    trackRecruitingUx(RECRUITING_UX_EVENT.VACANCY_CREATE_OPENED);
  }, [trackRecruitingUx]);

  const closeCreate = useCallback((trackCancel = true) => {
    if (trackCancel && showCreate && createOpenedAtRef.current) {
      trackRecruitingUx(RECRUITING_UX_EVENT.VACANCY_CREATE_CANCELLED, {
        elapsedMs: Date.now() - createOpenedAtRef.current,
      });
    }
    createOpenedAtRef.current = null;
    setShowCreate(false);
    if (urlParams.get('create') === '1') {
      navigateDashboard({ tab: 'vacancies', create: null, scroll: false });
    }
  }, [navigateDashboard, showCreate, trackRecruitingUx, urlParams]);

  useEffect(() => {
    if (!showCreate || createOpenedAtRef.current) return;
    createOpenedAtRef.current = Date.now();
    trackRecruitingUx(RECRUITING_UX_EVENT.VACANCY_CREATE_OPENED);
  }, [showCreate, trackRecruitingUx]);

  useEffect(() => {
    if (!showCreate || (!title.trim() && !description.trim())) return () => {};
    const preventAccidentalLeave = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventAccidentalLeave);
    return () => window.removeEventListener('beforeunload', preventAccidentalLeave);
  }, [description, showCreate, title]);

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

  const loadPipelineTemplates = async (cid = companyId) => {
    pipelineTemplateLoadRef.current += 1;
    const requestId = pipelineTemplateLoadRef.current;
    setPipelineTemplatesLoading(true);
    setPipelineTemplatesError('');
    try {
      const qs = isAdmin && cid ? `?companyId=${encodeURIComponent(cid)}` : '';
      const res = await fetch(`/api/admin/pipeline-templates${qs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.pipelineTemplates.loadFailed'));
      if (requestId !== pipelineTemplateLoadRef.current) return;
      const items = Array.isArray(data.templates) ? data.templates : [];
      setPipelineTemplates(items);
      setPipelineTemplateId((current) => {
        if (items.some((item) => String(item.id) === String(current))) return current;
        const preferred = items.find((item) => item.isDefault) || items[0];
        return preferred ? String(preferred.id) : '';
      });
    } catch (e) {
      console.error('[VacanciesTab] Load pipeline templates error:', e);
      if (requestId === pipelineTemplateLoadRef.current) {
        setPipelineTemplates([]);
        setPipelineTemplateId('');
        setPipelineTemplatesError(e?.message || t(locale, 'panel.pipelineTemplates.loadFailed'));
      }
    } finally {
      if (requestId === pipelineTemplateLoadRef.current) setPipelineTemplatesLoading(false);
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
    if (isAdmin && !companyId) return;
    loadPipelineTemplates(companyId);
  }, [companyId, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

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
    loadVacancyDetail(vacancyDetailId);
  }, [vacancyDetailId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDetailSection(normalizeVacancyDetailSection(urlParams.get('vacancySection')));
  }, [urlParams]);

  const openVacancyDetail = (id) => {
    navigateDashboard({ tab: 'vacancies', vacancyDetail: String(id), vacancySection: 'pipeline' });
  };

  const backToVacanciesList = () => {
    setDetailVacancy(null);
    setLinkExpiryEdit(null);
    setEditingVacancy(null);
    navigateDashboard({ tab: 'vacancies', vacancyDetail: '', vacancySection: null });
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
        pipelineTemplateId: pipelineTemplateId ? parseInt(pipelineTemplateId, 10) : null,
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
      const defaultTemplate = pipelineTemplates.find((item) => item.isDefault) || pipelineTemplates[0];
      setPipelineTemplateId(defaultTemplate ? String(defaultTemplate.id) : '');
      trackRecruitingUx(RECRUITING_UX_EVENT.VACANCY_CREATE_COMPLETED, {
        vacancyId: data?.id || data?.vacancy?.id,
        templateId: pipelineTemplateId ? Number(pipelineTemplateId) : undefined,
        elapsedMs: createOpenedAtRef.current ? Date.now() - createOpenedAtRef.current : undefined,
      });
      closeCreate(false);
      await loadVacancies();
      showMsg(t(locale, 'recruiting.vacancyCreated'));
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentPipelineAsTemplate = async () => {
    if (!detailVacancy?.id) return;
    const values = await promptForm({
      title: t(locale, 'panel.pipelineTemplates.saveTitle'),
      message: t(locale, 'panel.pipelineTemplates.saveHint'),
      confirmLabel: t(locale, 'panel.pipelineTemplates.saveAction'),
      fields: [
        {
          key: 'name',
          label: t(locale, 'panel.pipelineTemplates.nameLabel'),
          placeholder: t(locale, 'panel.pipelineTemplates.namePlaceholder'),
          required: true,
          maxLength: 80,
        },
        {
          key: 'isDefault',
          type: 'boolean',
          label: t(locale, 'panel.pipelineTemplates.defaultLabel'),
          defaultValue: false,
        },
      ],
    });
    if (!values?.name?.trim()) return;
    setLoading(true);
    try {
      const body = {
        vacancyId: detailVacancy.id,
        name: values.name.trim(),
        isDefault: values.isDefault === true,
      };
      if (isAdmin && detailVacancy.companyId) body.companyId = detailVacancy.companyId;
      const res = await fetch('/api/admin/pipeline-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.pipelineTemplates.saveFailed'));
      await loadPipelineTemplates(detailVacancy.companyId);
      toast(t(locale, 'panel.pipelineTemplates.saved'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.common.error'), 'error');
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
      if (isDetailView) await loadVacancyDetail(vacancyId);
      else await loadVacancies();
      showMsg(t(locale, 'recruiting.linkRotated'));
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
      setLinkExpiryEdit(null);
      if (isDetailView) await loadVacancyDetail(linkExpiryEdit.vacancyId);
      else await loadVacancies();
      showMsg(t(locale, 'recruiting.expiryUpdated'));
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
      if (isDetailView) await loadVacancyDetail(vacancyId);
      else await loadVacancies();
      showMsg(t(locale, 'recruiting.vacancyUpdated'));
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
      setEditingVacancy(null);
      if (isDetailView) await loadVacancyDetail(id);
      else await loadVacancies();
      showMsg(t(locale, 'recruiting.vacancyUpdated'));
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
      if (isDetailView) {
        backToVacanciesList();
      } else {
        await loadVacancies();
      }
      showMsg(t(locale, 'recruiting.vacancyArchived'));
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
        onClose={closeCreate}
        footer={(
          <>
            <button
              type="button"
              onClick={closeCreate}
              disabled={loading}
              className={dialogBtnGhostClass}
            >
              {t(locale, 'panel.admin.cancel')}
            </button>
            <button
              type="button"
              onClick={createVacancy}
              disabled={loading || pipelineTemplatesLoading || !pipelineTemplateId || !title.trim() || (isAdmin && !companyId)}
              className={cn(
                dialogBtnPrimaryClass,
                'inline-flex items-center gap-2',
                (loading || pipelineTemplatesLoading || !pipelineTemplateId || !title.trim() || (isAdmin && !companyId)) && 'opacity-60'
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
              <FormField label={t(locale, 'panel.admin.companyLabel')} className="max-w-[420px]">
                <SelectField
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  aria-label={t(locale, 'panel.admin.companyLabel')}
                  className={FIELD_SELECT}
                >
                  {companies.length === 0 ? (
                    <option value="">{t(locale, 'panel.admin.loadingCompanies')}</option>
                  ) : companies.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name} (#{c.id})</option>
                  ))}
                </SelectField>
              </FormField>
            ) : null}

            {jobRoles.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <FormField
                  label={`${t(locale, 'jobRoles.title')} (${t(locale, 'common.optional')})`}
                  className="max-w-[420px]"
                >
                  <SelectField
                    value={jobRoleId}
                    onChange={(e) => setJobRoleId(e.target.value)}
                    className={FIELD_SELECT}
                  >
                    <option value="">{t(locale, 'recruiting.noJobRole')}</option>
                    {jobRoles.map((jr) => (
                      <option key={jr.id} value={String(jr.id)}>{jr.name}</option>
                    ))}
                  </SelectField>
                </FormField>
                {(() => {
                  const selected = jobRoles.find((jr) => String(jr.id) === String(jobRoleId));
                  const rubric =
                    selected?.rubric && typeof selected.rubric === 'object' ? selected.rubric : {};
                  if (!jobRoleId || Object.keys(rubric).length === 0) return null;
                  return (
                    <div className="max-w-[420px]">
                      <p className="m-0 mb-1 font-mono text-2xs text-ink-faint">
                        {t(locale, 'jobRoles.rubricPreview')}
                      </p>
                      <RubricEditor value={rubric} locale={locale} compact />
                    </div>
                  );
                })()}
              </div>
            )}

            <FormField
              label={t(locale, 'panel.pipelineTemplates.fieldLabel')}
              hint={pipelineTemplatesError || t(locale, 'panel.pipelineTemplates.fieldHint')}
              className="max-w-[420px]"
            >
              <SelectField
                value={pipelineTemplateId}
                onChange={(e) => {
                  setPipelineTemplateId(e.target.value);
                  if (e.target.value) {
                    trackRecruitingUx(RECRUITING_UX_EVENT.PIPELINE_TEMPLATE_SELECTED, { templateId: Number(e.target.value) });
                  }
                }}
                className={FIELD_SELECT}
                disabled={pipelineTemplatesLoading || pipelineTemplates.length === 0}
              >
                {pipelineTemplatesLoading ? (
                  <option value="">{t(locale, 'panel.pipelineTemplates.loading')}</option>
                ) : null}
                {!pipelineTemplatesLoading && pipelineTemplates.length === 0 ? (
                  <option value="">{t(locale, 'panel.pipelineTemplates.empty')}</option>
                ) : null}
                {pipelineTemplates.map((template) => (
                  <option key={template.id} value={String(template.id)}>
                    {t(locale, 'panel.pipelineTemplates.optionLabel', {
                      name: template.name,
                      n: template.stageCount,
                      default: template.isDefault ? ` · ${t(locale, 'panel.pipelineTemplates.defaultBadge')}` : '',
                    })}
                  </option>
                ))}
              </SelectField>
            </FormField>
            {(() => {
              const selectedTemplate = pipelineTemplates.find((template) => String(template.id) === String(pipelineTemplateId));
              if (!selectedTemplate?.stages?.length) return null;
              return (
                <div className="-mt-1 flex max-w-[760px] flex-wrap gap-1.5" aria-label={t(locale, 'panel.pipelineTemplates.previewLabel')}>
                  {selectedTemplate.stages.map((stage, index) => (
                    <span key={stage.id || stage.stageKey} className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-canvas px-2 py-1 font-ui text-xs text-ink-muted">
                      <span className="font-mono text-2xs text-ink-faint">{index + 1}</span>
                      {locale === 'en' ? (stage.labelEn || stage.labelPt) : (stage.labelPt || stage.labelEn)}
                    </span>
                  ))}
                </div>
              );
            })()}

            <div className={cn(GRID_AUTO_LG, 'items-start')}>
              <FormField label={t(locale, 'recruiting.vacancyTitlePh')}>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t(locale, 'recruiting.createTitlePh')}
                  aria-label={t(locale, 'recruiting.vacancyTitlePh')}
                  className={FIELD}
                />
              </FormField>
              <FormField label={t(locale, 'recruiting.slugLabel')} className="max-w-[320px]">
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={t(locale, 'recruiting.createSlugPh')}
                  aria-label={t(locale, 'recruiting.slugLabel')}
                  className={FIELD}
                />
              </FormField>
            </div>

            <div className={cn(GRID_AUTO, 'items-start')}>
              <FormField label={t(locale, 'recruiting.sortStatus')}>
                <SelectField
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={FIELD_SELECT}
                >
                  <option value="open">{t(locale, 'recruiting.openStatus')}</option>
                  <option value="closed">{t(locale, 'recruiting.closedStatus')}</option>
                </SelectField>
              </FormField>
              <FormField label={t(locale, 'recruiting.positionsLabel')}>
                <input
                  type="number"
                  min="1"
                  value={positionsCount}
                  onChange={(e) => setPositionsCount(e.target.value)}
                  aria-label={t(locale, 'recruiting.positionsLabel')}
                  className={cn(FIELD, 'min-w-[72px] px-2')}
                />
              </FormField>
              <FormField as="div" label={t(locale, 'recruiting.targetDateLabel')}>
                <DateField
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  aria-label={t(locale, 'recruiting.targetDateLabel')}
                  className={cn(FIELD, 'px-2 py-[9px]')}
                />
              </FormField>
            </div>
          </VacancyFormSection>

          <VacancyFormSection locale={locale} titleKey="recruiting.formSectionRolePay" defaultOpen>
            <div className={cn(GRID_AUTO, 'max-w-[640px] items-start')}>
              <FormField label={t(locale, 'recruiting.employmentTypeLabel')}>
                <SelectField
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className={FIELD_SELECT}
                >
                  <option value="">{t(locale, 'recruiting.employmentTypeNone')}</option>
                  {VACANCY_EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{t(locale, employmentTypeLabelKey(type))}</option>
                  ))}
                </SelectField>
              </FormField>
              <FormField label={t(locale, 'recruiting.salaryMinPh')}>
                <input
                  value={formatSalaryBr(salaryMin)}
                  onChange={(e) => setSalaryMin(digitsOnly(e.target.value).slice(0, 15))}
                  placeholder={t(locale, 'recruiting.salaryMinPh')}
                  inputMode="numeric"
                  aria-label={t(locale, 'recruiting.salaryMinPh')}
                  className={FIELD}
                />
              </FormField>
              <FormField label={t(locale, 'recruiting.salaryMaxPh')}>
                <input
                  value={formatSalaryBr(salaryMax)}
                  onChange={(e) => setSalaryMax(digitsOnly(e.target.value).slice(0, 15))}
                  placeholder={t(locale, 'recruiting.salaryMaxPh')}
                  inputMode="numeric"
                  aria-label={t(locale, 'recruiting.salaryMaxPh')}
                  className={FIELD}
                />
              </FormField>
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
            <FormField as="div" label={t(locale, 'recruiting.vacancyDescriptionLabel')}>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder={t(locale, 'recruiting.vacancyDescriptionPh')}
                minHeight={120}
                locale={locale}
                disabled={descAiBusy}
              />
            </FormField>
          </VacancyFormSection>
        </div>
      </AdminRichFormDrawer>

      <AdminRichFormDrawer
        open={!!editingVacancy}
        title={t(locale, 'recruiting.editVacancyDrawerTitle')}
        locale={locale}
        fullPage={Boolean(editingVacancy)}
        backLabel={locale === 'en' ? 'Back to vacancies' : 'Voltar para vagas'}
        closeLabel={locale === 'en' ? 'Close vacancy editor' : 'Fechar editor da vaga'}
        eyebrow={locale === 'en' ? 'RECRUITMENT / VACANCIES' : 'RECRUTAMENTO / VAGAS'}
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
                  <FormField
                    label={`${t(locale, 'jobRoles.title')} (${t(locale, 'common.optional')})`}
                    className="max-w-[420px]"
                  >
                    <SelectField
                      value={editingVacancy.jobRoleId || ''}
                      onChange={(e) =>
                        setEditingVacancy((cur) => ({ ...cur, jobRoleId: e.target.value }))
                      }
                      className={cn(FIELD_SELECT, 'text-prose')}
                    >
                      <option value="">{t(locale, 'recruiting.noJobRole')}</option>
                      {jobRoles.map((jr) => (
                        <option key={jr.id} value={String(jr.id)}>{jr.name}</option>
                      ))}
                    </SelectField>
                  </FormField>
                  {(() => {
                    const selected = jobRoles.find(
                      (jr) => String(jr.id) === String(editingVacancy.jobRoleId || '')
                    );
                    const rubric =
                      selected?.rubric && typeof selected.rubric === 'object' ? selected.rubric : {};
                    if (!editingVacancy.jobRoleId || Object.keys(rubric).length === 0) return null;
                    return (
                      <div className="max-w-[420px]">
                        <p className="m-0 mb-1 font-mono text-2xs text-ink-faint">
                          {t(locale, 'jobRoles.rubricPreview')}
                        </p>
                        <RubricEditor value={rubric} locale={locale} compact />
                      </div>
                    );
                  })()}
                </div>
              ) : null}
              <div className={formFieldRowClass}>
                <FormField label={t(locale, 'recruiting.vacancyTitlePh')} className="min-w-0 flex-[2_1_280px]">
                  <input
                    value={editingVacancy.title}
                    onChange={(e) => setEditingVacancy((cur) => ({ ...cur, title: e.target.value }))}
                    placeholder={t(locale, 'recruiting.vacancyTitlePh')}
                    aria-label={t(locale, 'recruiting.vacancyTitlePh')}
                    className={cn(FIELD, 'text-prose')}
                  />
                </FormField>
                <FormField label={t(locale, 'recruiting.slugLabel')} className="min-w-0 flex-[1_1_200px]">
                  <input
                    value={editingVacancy.slug}
                    onChange={(e) => setEditingVacancy((cur) => ({ ...cur, slug: e.target.value }))}
                    placeholder={t(locale, 'recruiting.vacancySlugPh')}
                    aria-label={t(locale, 'recruiting.slugLabel')}
                    className={cn(FIELD, 'text-prose')}
                  />
                </FormField>
                <FormField label={t(locale, 'recruiting.sortStatus')} className="flex-[0_0_140px]">
                  <SelectField
                    value={editingVacancy.status}
                    onChange={(e) => setEditingVacancy((cur) => ({ ...cur, status: e.target.value }))}
                    aria-label={t(locale, 'recruiting.sortStatus')}
                    className={cn(FIELD_SELECT, 'text-prose text-ink')}
                  >
                    <option value="open">{t(locale, 'recruiting.openStatus')}</option>
                    <option value="closed">{t(locale, 'recruiting.closedStatus')}</option>
                  </SelectField>
                </FormField>
              </div>
              <div className={formFieldRowClass}>
                <FormField label={t(locale, 'recruiting.positionsLabel')}>
                  <input
                    type="number"
                    min="1"
                    value={editingVacancy.positionsCount}
                    onChange={(e) => setEditingVacancy((cur) => ({ ...cur, positionsCount: e.target.value }))}
                    aria-label={t(locale, 'recruiting.positionsLabel')}
                    className="w-[70px] rounded-control border border-ink/12 bg-ink/[0.04] px-2.5 py-2 font-mono text-prose text-ink"
                  />
                </FormField>
                <FormField as="div" label={t(locale, 'recruiting.targetDateLabel')}>
                  <DateField
                    value={editingVacancy.targetDate}
                    onChange={(e) => setEditingVacancy((cur) => ({ ...cur, targetDate: e.target.value }))}
                    aria-label={t(locale, 'recruiting.targetDateLabel')}
                    className="rounded-control border border-ink/12 bg-ink/[0.04] px-2.5 py-2 font-mono text-prose text-ink"
                  />
                </FormField>
              </div>
            </VacancyFormSection>

            <VacancyFormSection locale={locale} titleKey="recruiting.formSectionRolePay" defaultOpen>
              <div className={cn(GRID_AUTO, 'max-w-[640px] items-start')}>
                <FormField label={t(locale, 'recruiting.employmentTypeLabel')}>
                  <SelectField
                    value={editingVacancy.employmentType}
                    onChange={(e) => setEditingVacancy((cur) => ({ ...cur, employmentType: e.target.value }))}
                    aria-label={t(locale, 'recruiting.employmentTypeLabel')}
                    className={cn(FIELD_SELECT, 'px-2.5 py-2 text-prose')}
                  >
                    <option value="">{t(locale, 'recruiting.employmentTypeNone')}</option>
                    {VACANCY_EMPLOYMENT_TYPES.map((type) => (
                      <option key={type} value={type}>{t(locale, employmentTypeLabelKey(type))}</option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField label={locale === 'en' ? 'Minimum salary' : 'Salário mínimo'}>
                  <input
                    value={formatSalaryBr(editingVacancy.salaryMin)}
                    onChange={(e) => setEditingVacancy((cur) => ({ ...cur, salaryMin: digitsOnly(e.target.value).slice(0, 15) }))}
                    placeholder={t(locale, 'recruiting.salaryMinPh')}
                    inputMode="numeric"
                    aria-label={t(locale, 'recruiting.salaryMinPh')}
                    className={cn(FIELD, 'px-2.5 py-2 text-prose')}
                  />
                </FormField>
                <FormField label={locale === 'en' ? 'Maximum salary' : 'Salário máximo'}>
                  <input
                    value={formatSalaryBr(editingVacancy.salaryMax)}
                    onChange={(e) => setEditingVacancy((cur) => ({ ...cur, salaryMax: digitsOnly(e.target.value).slice(0, 15) }))}
                    placeholder={t(locale, 'recruiting.salaryMaxPh')}
                    inputMode="numeric"
                    aria-label={t(locale, 'recruiting.salaryMaxPh')}
                    className={cn(FIELD, 'px-2.5 py-2 text-prose')}
                  />
                </FormField>
              </div>
              <VacancyWorkplaceFields
                locale={locale}
                compact
                workplaceModality={editingVacancy.workplaceModality}
                workplaceState={editingVacancy.workplaceState}
                workplaceCity={editingVacancy.workplaceCity}
                onChange={(patch) => setEditingVacancy((cur) => ({ ...cur, ...patch }))}
              />
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
              <FormField as="div" label={t(locale, 'recruiting.vacancyDescriptionLabel')}>
                <RichTextEditor
                  value={editingVacancy.description}
                  onChange={(html) => setEditingVacancy((cur) => ({ ...cur, description: html }))}
                  placeholder={t(locale, 'recruiting.vacancyDescriptionPh')}
                  minHeight={140}
                  locale={locale}
                  disabled={descAiBusy}
                />
              </FormField>
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
    const linkState = getVacancyLinkState(v?.activeTokenExpiresAt, locale);
    const exp = linkState.date;
    return (
      <>
        {vacancyFormDrawers}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 px-1">
            <button
              type="button"
              onClick={backToVacanciesList}
              className={BTN_GHOST}
            >
              {t(locale, 'recruiting.backToVacancies')}
            </button>
        </div>
        {!v || error || msg ? (
        <div className={cn(S.card, 'px-7 py-[22px]')}>
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
              variant="panel"
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
        ) : null}

        {v ? (
          <>
            <div className={S.card}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <h2 className="m-0 text-xl font-bold text-ink">{v.title}</h2>
                    <span className="font-mono text-2xs text-ink-faint">{locale === 'en' ? 'Vacancy' : 'Vaga'}:</span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 font-mono text-2xs',
                        v.status === VACANCY_STATUS.OPEN
                          ? 'border-success/35 text-success'
                          : 'border-ink/12 text-ink-faint'
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
                  <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {v.positionsCount != null && v.positionsCount > 0 && (
                      <VacancyMetaItem
                        label={locale === 'en' ? 'Openings' : 'Vagas'}
                        value={t(locale, 'recruiting.positionsCount', { n: v.positionsCount })}
                      />
                    )}
                    {v.targetDate && formatPublicVacancyDate(v.targetDate, locale) ? (
                      <VacancyMetaItem
                        label={locale === 'en' ? 'Deadline' : 'Prazo'}
                        value={t(locale, 'recruiting.targetDate', {
                          date: formatPublicVacancyDate(v.targetDate, locale),
                        })}
                      />
                    ) : null}
                    {formatVacancySalaryRange(locale, v.salaryMin, v.salaryMax) ? (
                      <VacancyMetaItem
                        label={locale === 'en' ? 'Salary range' : 'Faixa salarial'}
                        value={formatVacancySalaryRange(locale, v.salaryMin, v.salaryMax)}
                      />
                    ) : null}
                    <VacancyMetaItem
                      label={locale === 'en' ? 'Owner' : 'Responsável'}
                      value={v.ownerName || (locale === 'en' ? 'Not assigned' : 'Não definido')}
                      warning={!v.ownerName}
                    />
                    {employmentTypeLabelKey(v.employmentType) ? (
                      <VacancyMetaItem
                        label={locale === 'en' ? 'Employment' : 'Contratação'}
                        value={t(locale, employmentTypeLabelKey(v.employmentType))}
                      />
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
                      <VacancyMetaItem
                        label={locale === 'en' ? 'Workplace' : 'Local de trabalho'}
                        value={formatWorkplaceLabel(
                          {
                            workplaceModality: v.workplaceModality,
                            workplaceCity: v.workplaceCity,
                            workplaceState: v.workplaceState,
                          },
                          locale,
                          t
                        )}
                      />
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => editVacancy(v)}
                    disabled={loading}
                    className={cn(BTN_BRAND_SOFT, loading && 'opacity-60')}
                  >
                    {t(locale, 'recruiting.editVacancy')}
                  </button>
                  <details className="group relative">
                    <summary className={cn(BTN_GHOST, 'gap-2 list-none select-none [&::-webkit-details-marker]:hidden')}>
                      {t(locale, 'recruiting.moreActions')}
                      <Icon
                        name="chevronDown"
                        className="h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-180"
                      />
                    </summary>
                    <div className="absolute right-0 z-30 mt-1.5 grid min-w-[190px] gap-1 rounded-control border border-ink/12 bg-surface p-1.5 shadow-lg">
                      <button
                        type="button"
                        onClick={() =>
                          setVacancyStatus(
                            v.id,
                            v.status === VACANCY_STATUS.OPEN
                              ? VACANCY_STATUS.CLOSED
                              : VACANCY_STATUS.OPEN
                          )
                        }
                        disabled={loading}
                        className={cn(BTN_GHOST, 'w-full justify-start border-transparent text-left', loading && 'opacity-60')}
                      >
                        {v.status === VACANCY_STATUS.OPEN
                          ? t(locale, 'recruiting.closeVacancy')
                          : t(locale, 'recruiting.reopenVacancy')}
                      </button>
                      <button
                        type="button"
                        onClick={() => cloneVacancyAction(v)}
                        disabled={loading}
                        className={cn(BTN_GHOST, 'w-full justify-start border-transparent text-left', loading && 'opacity-60')}
                      >
                        {t(locale, 'recruiting.cloneVacancy')}
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveVacancy(v.id, v.title)}
                        disabled={loading}
                        className="min-h-touch w-full cursor-pointer rounded-control border border-transparent bg-transparent px-3 py-2 text-left font-ui text-sm text-danger hover:bg-danger/[0.08] disabled:cursor-default disabled:opacity-60"
                      >
                        {t(locale, 'recruiting.archiveVacancy')}
                      </button>
                    </div>
                  </details>
                </div>
              </div>

              <div className="mt-5">
                <PanelSubNav
                  ariaLabel={t(locale, 'recruiting.detailTabsAria')}
                  active={detailSection}
                  onChange={(id) => {
                    const next = normalizeVacancyDetailSection(id);
                    setDetailSection(next);
                    navigateDashboard({
                      tab: 'vacancies',
                      vacancyDetail: String(v.id),
                      vacancySection: next,
                      scroll: false,
                      clientOnly: true,
                    });
                  }}
                  tabs={[
                    { id: 'pipeline', label: t(locale, 'recruiting.detailTabPipeline') },
                    { id: 'candidates', label: t(locale, 'recruiting.detailTabCandidates') },
                    { id: 'information', label: t(locale, 'recruiting.detailTabInformation') },
                    { id: 'distribution', label: t(locale, 'recruiting.detailTabDistribution') },
                    { id: 'settings', label: t(locale, 'recruiting.detailTabSettings') },
                  ]}
                />
              </div>

              <ContentEnter animKey={detailSection}>
              {detailSection === 'distribution' ? (
              <div className="grid gap-3 md:grid-cols-2">
                <section className="rounded-control border border-ink/10 bg-ink/[0.025] p-3.5" aria-label={t(locale, 'recruiting.enneagramLinkLabel')}>
                  <span className={cn(S.label, 'mb-2.5 block')}>{t(locale, 'recruiting.enneagramLinkLabel')}</span>
                      {token ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn(
                              'rounded-full border px-2 py-1 font-mono text-2xs',
                              linkState.expired
                                ? 'border-warning/35 bg-warning/[0.10] text-warning'
                                : 'border-success/30 bg-success/[0.08] text-success'
                            )}>
                              {linkState.label}
                            </span>
                            <CopyableLink
                          url={link}
                          locale={locale}
                          label={t(locale, 'recruiting.enneagramLinkLabel')}
                          iconOnly
                          compact
                          disabled={loading}
                        />
                            <button
                          type="button"
                          onClick={() => rotateLink(v.id)}
                          disabled={loading}
                          className={cn(BTN_GHOST, loading && 'opacity-60')}
                            >
                              {linkState.expired
                                ? (locale === 'en' ? 'Renew link' : 'Renovar link')
                                : t(locale, 'recruiting.rotateLink')}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setLinkExpiryEdit((cur) =>
                              cur?.vacancyId === v.id
                                ? null
                                : {
                                    vacancyId: v.id,
                                    value: v.activeTokenExpiresAt
                                      ? toDatetimeLocalValue(new Date(v.activeTokenExpiresAt))
                                      : toDatetimeLocalValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
                                  }
                            )
                          }
                          disabled={loading}
                          className={cn(BTN_GHOST, loading && 'opacity-60')}
                        >
                          {t(locale, 'recruiting.editLinkExpiry')}
                        </button>
                      </div>
                      {exp ? (
                        <span className={cn(META_FAINT, 'mt-2 block', linkState.expired && 'text-warning')}>
                          {linkState.expired
                            ? (locale === 'en' ? `Expired on ${exp.toLocaleString('en-US')}` : `Expirou em ${exp.toLocaleString('pt-BR')}`)
                            : t(locale, 'recruiting.expiresAt', {
                                when: exp.toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR'),
                              })}
                        </span>
                      ) : null}
                      <p className="m-0 mt-2 font-mono text-2xs text-ink-faint">
                        {locale === 'en'
                          ? 'Vacancy status describes recruiting; this link has its own expiry.'
                          : 'A situação da vaga descreve o recrutamento; este link tem validade própria.'}
                      </p>
                    </>
                  ) : (
                    <div>
                      <span className={META_FAINT}>{t(locale, 'recruiting.noActiveLink')}</span>
                      <p className="m-0 mt-2 font-mono text-2xs text-ink-faint">
                        {locale === 'en'
                          ? 'Vacancy status describes recruiting; this link has its own expiry.'
                          : 'A situação da vaga descreve o recrutamento; este link tem validade própria.'}
                      </p>
                    </div>
                  )}

                  {linkExpiryEdit?.vacancyId === v.id ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-ink/8 pt-3">
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
                        className={cn(FIELD, 'min-w-[180px] flex-[1_1_200px] px-2.5 py-2 text-prose')}
                      />
                      <button type="button" onClick={saveLinkExpiry} disabled={loading} className={cn(BTN_BRAND, loading && 'opacity-60')}>
                        {t(locale, 'panel.admin.save')}
                      </button>
                      <button type="button" onClick={() => setLinkExpiryEdit(null)} disabled={loading} className={cn(BTN_GHOST, loading && 'opacity-60')}>
                        {t(locale, 'panel.admin.cancel')}
                      </button>
                    </div>
                  ) : null}
                </section>

                <section className="rounded-control border border-ink/10 bg-ink/[0.025] p-3.5" aria-label={t(locale, 'recruiting.publicPageLinkLabel')}>
                  <span className={cn(S.label, 'mb-2.5 block')}>{t(locale, 'recruiting.publicPageLinkLabel')}</span>
                  {publicPageLink ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <CopyableLink
                        url={publicPageLink}
                        locale={locale}
                        label={t(locale, 'recruiting.publicPageLinkLabel')}
                        iconOnly
                        compact
                        disabled={loading}
                      />
                      <VacancyWhatsAppShareButton
                        locale={locale}
                        pageUrl={publicPageLink}
                        title={v.title}
                        companyName={v.companyName}
                        disabled={loading || !v.publicPageEnabled}
                      />
                    </div>
                  ) : null}
                  {!v.publicPageEnabled ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/8 pt-3">
                      <span className={cn(META_FAINT, 'block flex-1')}>{t(locale, 'recruiting.publicPageLinkDisabledHint')}</span>
                      <button type="button" onClick={() => editVacancy(v)} disabled={loading} className={BTN_BRAND_SOFT}>
                        {locale === 'en' ? 'Activate page' : 'Ativar página'}
                      </button>
                    </div>
                  ) : null}
                </section>
              </div>
              ) : null}

              {detailSection === 'pipeline' ? (
                <>
                  <VacancyKanbanBlock
                    vacancyId={v.id}
                    companyId={v.companyId}
                    locale={locale}
                    refreshKey={pipelineRefresh}
                    onPersonClick={(candidateId) => {
                      if (!candidateId) return;
                      navigateDashboard({
                        tab: 'team',
                        candidate: String(candidateId),
                        vacancy: String(v.id),
                      });
                    }}
                  />
                  <CollapsibleBlock
                    locale={locale}
                    title={t(locale, 'recruiting.detailTabAnalytics')}
                    defaultOpen={false}
                    className="mt-4"
                  >
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
                  </CollapsibleBlock>
                </>
              ) : null}

              {detailSection === 'candidates' ? (
                <div className="space-y-4">
                  <div className="rounded-control border border-brand-500/20 bg-brand-500/[0.045] px-4 py-3">
                    <h3 className="m-0 font-ui text-sm font-semibold text-ink">
                      {locale === 'en' ? 'Candidate intake' : 'Entrada de candidatos'}
                    </h3>
                    <p className="mb-0 mt-1 text-xs leading-[1.5] text-ink-muted">
                      {locale === 'en'
                        ? 'Register interview details first, then send assessments and follow invitations below.'
                        : 'Cadastre os dados da entrevista primeiro. Depois envie avaliações e acompanhe os convites abaixo.'}
                    </p>
                  </div>
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
                  <div className="grid gap-4 xl:grid-cols-2">
                    <section className="flex flex-col">
                      <h3 className="mb-2 font-ui text-sm font-semibold text-ink">
                        {t(locale, 'recruiting.inviteListTitle')}
                      </h3>
                      <VacancyInvitesBlock vacancyId={v.id} locale={locale} refreshKey={invitesRefresh} />
                    </section>
                    <section className="flex flex-col">
                      <h3 className="mb-2 font-ui text-sm font-semibold text-ink">
                        {locale === 'en' ? 'Next step' : 'Próximo passo'}
                      </h3>
                      <div className="flex-1 rounded-control border border-ink/10 bg-ink/[0.02] p-4">
                        <p className="m-0 text-xs leading-[1.55] text-ink-muted">
                          {locale === 'en'
                            ? 'Use the pipeline tab to move candidates through the hiring stages and compare fit when results arrive.'
                            : 'Use a aba Pipeline para mover candidatos pelas etapas e comparar aderência quando os resultados chegarem.'}
                        </p>
                      </div>
                    </section>
                  </div>
                  <CollapsibleBlock
                    locale={locale}
                    title={t(locale, 'recruiting.detailTabFit')}
                    defaultOpen={false}
                    className="mt-4"
                  >
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
                  </CollapsibleBlock>
                </div>
              ) : null}

              {detailSection === 'information' ? (
                <div className="rounded-card border border-ink/10 bg-ink/[0.02] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="m-0 font-ui text-base font-semibold text-ink">
                        {t(locale, 'recruiting.vacancyDescriptionLabel')}
                      </h3>
                      <p className="mb-0 mt-1 max-w-[68ch] font-ui text-xs text-ink-muted">
                        {t(locale, 'recruiting.detailInformationHint')}
                      </p>
                    </div>
                    <button type="button" onClick={() => editVacancy(v)} disabled={loading} className={BTN_BRAND_SOFT}>
                      {t(locale, 'recruiting.editVacancy')}
                    </button>
                  </div>
                  {v.description ? (
                    <VacancyDescriptionHtml html={v.description} />
                  ) : (
                    <p className="mb-0 mt-4 font-ui text-sm text-ink-muted">
                      {t(locale, 'recruiting.detailInformationEmpty')}
                    </p>
                  )}
                </div>
              ) : null}

              {detailSection === 'distribution' ? (
                <div className="mt-4 grid gap-4 xl:grid-cols-2 xl:items-start">
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
                </div>
              ) : null}

              {detailSection === 'settings' ? (
                <div className="rounded-card border border-ink/10 bg-ink/[0.02] p-5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="m-0 font-ui text-base font-semibold text-ink">
                        {t(locale, 'panel.pipelineEditor.title')}
                      </h3>
                      <p className="mb-0 mt-1 max-w-[68ch] font-ui text-xs leading-[1.55] text-ink-muted">
                        {t(locale, 'panel.pipelineEditor.subtitle')}
                      </p>
                    </div>
                    <button type="button" className={BTN_GHOST} onClick={saveCurrentPipelineAsTemplate} disabled={loading}>
                      {t(locale, 'panel.pipelineTemplates.saveAction')}
                    </button>
                  </div>
                  <PipelineStagesEditor
                    locale={locale}
                    vacancyId={v.id}
                    companyId={v.companyId}
                    onChange={handlePipelineStagesChange}
                  />
                </div>
              ) : null}
              </ContentEnter>
            </div>
          </>
        ) : null}
      </div>
      </>
    );
  }

  if (showPipelineSettings) {
    return (
      <ContentEnter animKey="pipeline-template-settings">
        <div className="flex flex-col gap-4">
          <div className={cn(S.card, 'px-7 py-[22px]')}>
            <button type="button" className={cn(BTN_GHOST, 'mb-4')} onClick={() => setShowPipelineSettings(false)}>
              {t(locale, 'panel.pipelineTemplates.backToVacancies')}
            </button>
            <span className={S.label}>{t(locale, 'panel.pipelineTemplates.manageTitle')}</span>
            <p className="mb-0 mt-2.5 max-w-[720px] text-prose leading-[1.65] text-ink-muted">
              {t(locale, 'panel.pipelineTemplates.manageHint')}
            </p>
          </div>
          <div className={S.card}>
            <PipelineTemplatesManager
              locale={locale}
              companyId={companyId}
              templates={pipelineTemplates}
              loading={pipelineTemplatesLoading}
              onChanged={loadPipelineTemplates}
            />
          </div>
        </div>
      </ContentEnter>
    );
  }

  return (
    <>
      {vacancyFormDrawers}
    <div className="flex flex-col gap-4">
      <div className={S.card}>
        <AdminPageHeader
          title={t(locale, 'recruiting.registeredVacancies')}
          description={t(locale, 'recruiting.vacanciesIntro')}
          actions={(
            <>
            <button
              type="button"
              onClick={() => setShowPipelineSettings(true)}
              className={cn(BTN_GHOST, 'px-3.5 py-2.5')}
            >
              {t(locale, 'panel.pipelineTemplates.manageAction')}
            </button>
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
              onClick={openCreate}
            />
            </>
          )}
        />
        {error ? <p className="mb-0 mt-2 font-ui text-sm text-danger">{error}</p> : null}
        {msg ? <p className="mb-0 mt-2 font-ui text-sm text-success">{msg}</p> : null}

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
                      openCreate();
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
              <span className="font-mono text-2xs uppercase tracking-[0.08em] text-ink-faint">
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
                      'cursor-pointer rounded-lg border px-3 py-1.5 font-mono text-2xs',
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
              const linkState = getVacancyLinkState(v.activeTokenExpiresAt, locale);
              const exp = linkState.date;
              return (
                <div
                  key={v.id}
                  className={cn(
                    'grid gap-3 rounded-xl border bg-ink/[0.03] p-3.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start',
                    linkState.expired ? 'border-warning/30' : 'border-ink/12'
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink">
                      <span className="font-mono text-xs text-ink-faint">#{v.id}</span>
                      <strong className="font-medium">{v.title}</strong>
                      <span className="font-mono text-2xs text-ink-faint">{locale === 'en' ? 'Vacancy:' : 'Vaga:'}</span>
                      <span
                        className={cn(
                          'rounded-lg border px-2 py-0.5 font-mono text-2xs',
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

                    <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                      {v.positionsCount != null && v.positionsCount > 0 ? (
                        <VacancyMetaItem
                          label={locale === 'en' ? 'Openings' : 'Vagas'}
                          value={t(locale, 'recruiting.positionsCount', { n: v.positionsCount })}
                        />
                      ) : null}
                      {v.targetDate && formatPublicVacancyDate(v.targetDate, locale) ? (
                        <VacancyMetaItem
                          label={locale === 'en' ? 'Deadline' : 'Prazo'}
                          value={t(locale, 'recruiting.targetDate', {
                            date: formatPublicVacancyDate(v.targetDate, locale),
                          })}
                        />
                      ) : null}
                      {formatVacancySalaryRange(locale, v.salaryMin, v.salaryMax) ? (
                        <VacancyMetaItem
                          label={locale === 'en' ? 'Salary range' : 'Faixa salarial'}
                          value={formatVacancySalaryRange(locale, v.salaryMin, v.salaryMax)}
                        />
                      ) : null}
                      <VacancyMetaItem
                        label={locale === 'en' ? 'Owner' : 'Responsável'}
                        value={v.ownerName || (locale === 'en' ? 'Not assigned' : 'Não definido')}
                        warning={!v.ownerName}
                      />
                    </div>

                    {token ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/8 pt-3">
                        <span className="font-ui text-xs text-ink-muted">
                          {locale === 'en' ? 'Candidate link · availability:' : 'Link para candidatos · disponibilidade:'}
                        </span>
                        <span className={cn(
                          'rounded-full border px-2 py-0.5 font-mono text-2xs',
                          linkState.expired
                            ? 'border-warning/35 bg-warning/[0.10] text-warning'
                            : 'border-success/30 bg-success/[0.08] text-success'
                        )}>
                          {linkState.label}
                        </span>
                        <CopyableLink
                          url={link}
                          locale={locale}
                          label={t(locale, 'recruiting.enneagramLinkLabel')}
                          iconOnly
                          compact
                          disabled={loading}
                        />
                        {exp ? (
                          <span className={cn('font-mono text-2xs text-ink-faint', linkState.expired && 'text-warning')}>
                            {linkState.expired
                              ? (locale === 'en' ? `Expired on ${exp.toLocaleString('en-US')}` : `Expirou em ${exp.toLocaleString('pt-BR')}`)
                              : t(locale, 'recruiting.expiresAt', {
                                  when: exp.toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR'),
                                })}
                          </span>
                        ) : null}
                        {linkState.expired ? (
                          <button
                            type="button"
                            onClick={() => rotateLink(v.id)}
                            disabled={loading}
                            className={cn(BTN_BRAND_SOFT, 'ml-auto', loading && 'opacity-60')}
                          >
                            {locale === 'en' ? 'Renew link' : 'Renovar link'}
                          </button>
                        ) : null}
                        <span className="basis-full font-mono text-2xs text-ink-faint">
                          {locale === 'en'
                            ? 'Open/closed describes recruiting; active/expired describes this link’s validity.'
                            : 'Aberta/fechada descreve o recrutamento; ativo/expirado indica a validade deste link.'}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 border-t border-ink/8 pt-3 font-mono text-2xs text-ink-faint">
                        {t(locale, 'recruiting.noActiveLink')}
                        <span className="ml-1">
                          {locale === 'en'
                            ? '(separate from recruiting status)'
                            : '(separado da situação do recrutamento)'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center border-t border-ink/8 pt-3 md:border-t-0 md:pt-0">
                    <AdminActionsCell className="justify-start md:justify-end">
                      <AdminViewButton
                        asText
                        label={t(locale, 'recruiting.viewCandidates')}
                        onClick={() => openVacancyDetail(v.id)}
                        className={BTN_BRAND_SOFT}
                      />
                      <AdminEditButton
                        label={t(locale, 'recruiting.editVacancy')}
                        onClick={() => editVacancy(v)}
                        disabled={loading}
                      />
                      <details className="group relative">
                        <summary className={cn(BTN_GHOST, 'min-h-10 list-none px-2.5 [&::-webkit-details-marker]:hidden')}>
                          <Icon name="moreHorizontal" className="h-4 w-4" />
                          <span className="sr-only">{t(locale, 'recruiting.moreActions')}</span>
                        </summary>
                        <div className="absolute right-0 z-30 mt-1.5 grid min-w-[210px] gap-1 rounded-control border border-ink/12 bg-surface p-1.5 shadow-lg">
                          <button
                            type="button"
                            onClick={() => cloneVacancyAction(v)}
                            disabled={loading}
                            className={cn(BTN_GHOST, 'w-full justify-start border-transparent text-left')}
                          >
                            {t(locale, 'recruiting.cloneVacancy')}
                          </button>
                          <button
                            type="button"
                            onClick={() => rotateLink(v.id)}
                            disabled={loading}
                            className={cn(BTN_GHOST, 'w-full justify-start border-transparent text-left')}
                          >
                            {t(locale, 'recruiting.rotateLink')}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setVacancyStatus(
                                v.id,
                                v.status === VACANCY_STATUS.OPEN
                                  ? VACANCY_STATUS.CLOSED
                                  : VACANCY_STATUS.OPEN
                              )
                            }
                            disabled={loading}
                            className={cn(BTN_GHOST, 'w-full justify-start border-transparent text-left')}
                          >
                            {v.status === VACANCY_STATUS.OPEN
                              ? t(locale, 'recruiting.closeVacancy')
                              : t(locale, 'recruiting.reopenVacancy')}
                          </button>
                          <button
                            type="button"
                            onClick={() => archiveVacancy(v.id, v.title)}
                            disabled={loading}
                            className="min-h-touch w-full cursor-pointer rounded-control border border-transparent bg-transparent px-3 py-2 text-left font-ui text-sm text-danger hover:bg-danger/[0.08] disabled:cursor-default disabled:opacity-60"
                          >
                            {t(locale, 'recruiting.archiveVacancy')}
                          </button>
                        </div>
                      </details>
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
                <SelectField
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
                </SelectField>
                <button
                  type="button"
                  disabled={loading || vacPage <= 1}
                  onClick={() => navigateDashboard({ vacanciesPage: Math.max(1, vacPage - 1), tab: 'vacancies' })}
                  className={cn(
                    'rounded-control border px-3 py-1.5 font-mono text-2xs',
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
                    'rounded-control border px-3 py-1.5 font-mono text-2xs',
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
