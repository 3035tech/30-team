'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '../../../lib/cn';
import { TYPE_DATA } from '../../../lib/data';
import { t, localeHtmlLang } from '../../../lib/i18n';
import { C } from '../../../lib/theme';
import { getKanbanStages, PanelSubNav, S, TypeBadge } from '../dashboard-shared';
import { BrStateSelect } from '../../_components/BrStateSelect';
import { BrCitySelect } from '../../_components/BrCitySelect';
import { DateField } from '../../_components/DateField';
import { AppLoading } from '../../_components/AppLoading';
import { formatPhoneBr, formatSalaryBr, stripPhone, salaryToCentsDigits, stripSalary, digitsOnly } from '../../../lib/br-masks';
import { titleCasePersonName } from '../../../lib/person-name';
import { rejectionReasonLabel } from '../pipeline-prompts';
import { usePipelineExtras } from '../PipelineExtrasContext';
import { daysInStage, stageAgingTone } from '../vacancies/vacancy-admin-shared';
import { useAppFeedback } from '../../_components/AppFeedback';
import { AdminRichFormDrawer } from '../../_components/AdminRichFormDrawer';
import { EnneagramCross } from '../../_components/EnneagramCross';
import { Icon } from '../../_components/Icon';
import { TypeScoreChart } from '../../_components/TypeScoreChart';
import { CompensationBlock } from '../../_components/CompensationBlock';
import { PeopleManagementPanel } from '../../_components/PeopleManagementPanel';
import { HrActionBrief } from '../../_components/HrActionBrief';
import { PersonDossierBlock } from '../../_components/PersonDossierBlock';
import { CandidateTimeline } from '../../_components/CandidateTimeline';
import { CandidateCvBlock } from '../../_components/CandidateCvBlock';
import { RichTextEditor } from '../../_components/RichTextEditor';
import { RichTextView } from '../../_components/RichTextView';
import { HrScoreBadge } from '../../_components/HrScoreBadge';
import { isRichTextEmpty } from '../../../lib/sanitize-html';
import { clusterCloseTypes, rankEnneagramScores } from '../../../lib/enneagram-cross';
import { buildProfileSynthesis } from '../../../lib/profile-synthesis';
import { EMPLOYMENT_STATUS } from '../../../lib/domain-status.js';
import { PIPELINE_STAGE, PIPELINE_STAGES } from '../../../lib/pipeline';

function nearbyCluster(scores) {
  return clusterCloseTypes(rankEnneagramScores(scores));
}

function NearbyTypeBadges({ scores, topType, locale }) {
  const extras = nearbyCluster(scores).filter((item) => item.type !== topType);
  if (extras.length === 0) return null;
  return extras.map((item) => <TypeBadge key={item.type} type={item.type} locale={locale} compact />);
}

function IntegratedProfileSynthesis({ synthesis, locale }) {
  if (!synthesis || synthesis.completeness === 'empty') return null;
  const sections = [
    ['convergences', 'panel.team.synthesisConvergences'],
    ['tensions', 'panel.team.synthesisTensions'],
    ['howToLead', 'panel.team.synthesisHowToLead'],
    ['pdiIdeas', 'panel.team.synthesisPdiIdeas'],
  ].filter(([key]) => synthesis[key]?.length);

  return (
    <section className="mb-4 rounded-control border border-ink/12 bg-brand-500/[0.06] p-3.5">
      <span className={cn(S.label, 'mb-2')}>{t(locale, 'panel.team.synthesisTitle')}</span>
      <p className="mb-3 mt-0 font-ui text-sm leading-snug text-ink">
        {synthesis.headline}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        {sections.map(([key, labelKey]) => (
          <div key={key}>
            <span className="font-mono text-2xs uppercase tracking-[0.08em] text-ink-faint">
              {t(locale, labelKey)}
            </span>
            <ul className="mb-0 mt-1.5 list-disc pl-[18px] text-xs leading-snug text-ink-muted">
              {synthesis[key].map((item) => <li key={item} className="mb-1">{item}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

const PIPELINE_OPTIONS = PIPELINE_STAGES;


function fitBandLabel(locale, code) {
  const map = {
    high: 'recruiting.fitHigh',
    medium: 'recruiting.fitMedium',
    low: 'recruiting.fitLow',
  };
  const key = map[code];
  return key ? t(locale, key) : code;
}

function pipelineLabel(locale, code) {
  const map = {
    [PIPELINE_STAGE.NEW]: 'recruiting.pipelineNew',
    [PIPELINE_STAGE.INTERVIEW]: 'recruiting.pipelineInterview',
    [PIPELINE_STAGE.TEST_COMPLETED]: 'recruiting.pipelineTestCompleted',
    [PIPELINE_STAGE.SCREENING]: 'recruiting.pipelineScreening',
    [PIPELINE_STAGE.APPROVED]: 'recruiting.pipelineApproved',
    [PIPELINE_STAGE.HIRED]: 'recruiting.pipelineHired',
    [PIPELINE_STAGE.REJECTED]: 'recruiting.pipelineRejected',
    [PIPELINE_STAGE.ARCHIVED]: 'recruiting.pipelineArchived',
  };
  return t(locale, map[code] || 'recruiting.pipelineNew');
}

/** Formata ms → "Xm Ys" / "Xh Ym" para telemetria admin. */
function formatFillDuration(ms) {
  if (ms == null || !Number.isFinite(Number(ms))) return null;
  const totalSec = Math.max(0, Math.round(Number(ms) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** 54 perguntas: < ~3 min é bem rápido (sinal soft). */
function isSuspiciouslyFast(ms) {
  return ms != null && Number.isFinite(Number(ms)) && Number(ms) < 3 * 60 * 1000;
}

function availabilityLabel(locale, code) {
  const map = {
    immediate: 'recruiting.availabilityImmediate',
    '15_days': 'recruiting.availability15',
    '30_days': 'recruiting.availability30',
    '60_days': 'recruiting.availability60',
    other: 'recruiting.availabilityOther',
  };
  return code ? t(locale, map[code] || 'recruiting.availabilityOther') : null;
}

function sourceLabel(locale, code) {
  const map = {
    linkedin: 'recruiting.sourceLinkedin',
    referral: 'recruiting.sourceReferral',
    agency: 'recruiting.sourceAgency',
    job_board: 'recruiting.sourceJobBoard',
    other: 'recruiting.sourceOther',
  };
  return code ? t(locale, map[code] || 'recruiting.sourceOther') : null;
}

const emptyProfileDraft = () => ({
  phone: '',
  linkedinUrl: '',
  city: '',
  state: '',
  salaryExpectation: '',
  availability: '',
  source: '',
  birthDate: '',
});

function profileFromCandidate(c) {
  const birth =
    c?.birthDate != null
      ? String(c.birthDate).slice(0, 10)
      : '';
  return {
    phone: stripPhone(c?.phone) || '',
    linkedinUrl: c?.linkedinUrl || '',
    city: c?.city || '',
    state: c?.state || '',
    salaryExpectation: salaryToCentsDigits(c?.salaryExpectation),
    availability: c?.availability || '',
    source: c?.source || '',
    birthDate: /^\d{4}-\d{2}-\d{2}$/.test(birth) ? birth : '',
  };
}

export function TeamTab({
  results,
  sortKey,
  sortDir,
  onSort,
  locale = 'pt-BR',
  isAdmin = false,
  companyId = null,
  search = '',
  onSearch,
  listTotal = 0,
  focusCandidateId = null,
  focusSection = null,
  listFilter = null,
  onClearListFilter = null,
}) {
  const [open, setOpen] = useState(null);
  const [personTab, setPersonTab] = useState('people');
  const [peopleSubTab, setPeopleSubTab] = useState('briefing');
  const [searchDraft, setSearchDraft] = useState(search || '');
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState('');
  const [stageBusy, setStageBusy] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [notesEditing, setNotesEditing] = useState(false);
  const [notesBusy, setNotesBusy] = useState(false);
  const [notesMsg, setNotesMsg] = useState('');
  const [notesMsgIsError, setNotesMsgIsError] = useState(false);
  const [profileDraft, setProfileDraft] = useState(emptyProfileDraft);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileMsgIsError, setProfileMsgIsError] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStage, setBulkStage] = useState(PIPELINE_STAGE.TEST_COMPLETED);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const [bulkMsgIsError, setBulkMsgIsError] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [stageOverrides, setStageOverrides] = useState({});
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const { requestPipelineExtras } = usePipelineExtras();
  const { confirm, notice, promptForm, toast } = useAppFeedback();

  useEffect(() => { setSelectedIds(new Set()); setStageOverrides({}); }, [results]);

  useEffect(() => {
    setSearchDraft(search || '');
  }, [search]);

  useEffect(() => {
    if (!focusCandidateId) return;
    const cid = String(focusCandidateId);
    const section =
      focusSection === 'journey' ||
      focusSection === 'oneOnOne' ||
      focusSection === 'briefing' ||
      focusSection === 'dossier' ||
      focusSection === 'compensation'
        ? focusSection === 'dossier'
          ? 'briefing'
          : focusSection
        : 'briefing';
    const match = (results || []).find((r) => String(r.candidateId) === cid);
    if (match) {
      setOpen(String(match.assessmentId));
      setPersonTab('people');
      setPeopleSubTab(section);
      loadDetail(cid);
      return;
    }
    loadDetail(cid);
  }, [focusCandidateId, focusSection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focusCandidateId || !detail?.candidate) return;
    if (String(detail.candidate.id) !== String(focusCandidateId)) return;
    const section =
      focusSection === 'journey' ||
      focusSection === 'oneOnOne' ||
      focusSection === 'briefing' ||
      focusSection === 'dossier' ||
      focusSection === 'compensation'
        ? focusSection === 'dossier'
          ? 'briefing'
          : focusSection
        : 'briefing';
    const match = (results || []).find((r) => String(r.candidateId) === String(focusCandidateId));
    if (match) {
      setOpen(String(match.assessmentId));
      setPersonTab('people');
      setPeopleSubTab(section);
      return;
    }
    const aid = detail.assessments?.[0]?.id;
    if (aid) {
      setOpen(String(aid));
      setPersonTab('people');
      setPeopleSubTab(section);
    }
  }, [detail, focusCandidateId, focusSection, results]);

  const commitSearch = () => {
    const trimmed = searchDraft.trim();
    if (trimmed === (search || '').trim()) return;
    if (typeof onSearch === 'function') onSearch(trimmed || null);
  };

  const sortColumns = [
    { k: 'createdAt', labelKey: 'panel.team.sortDate' },
    { k: 'name', labelKey: 'panel.team.sortName' },
    { k: 'area', labelKey: 'panel.team.sortArea' },
    { k: 'type', labelKey: 'panel.team.sortProfileType' },
    { k: 'vacancy', labelKey: 'panel.team.sortVacancy' },
    { k: 'pipeline', labelKey: 'recruiting.pipelineShort' },
  ];

  const loadDetail = useCallback(async (candidateId) => {
    setDetailLoading(true);
    setDetailErr('');
    setNotesEditing(false);
    setNotesMsg('');
    setProfileEditing(false);
    setProfileMsg('');
    try {
      const res = await fetch(`/api/admin/candidates/${encodeURIComponent(candidateId)}?locale=${encodeURIComponent(locale === 'en' ? 'en' : 'pt-BR')}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.team.loadDetailError'));
      setDetail(data);
      setNotesDraft(data?.candidate?.hrNotes || '');
      setProfileDraft(profileFromCandidate(data?.candidate));
    } catch (e) {
      setDetailErr(e?.message || t(locale, 'panel.common.error'));
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [locale]);

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
      const vacancyId = String(values.vacancyId || '').trim();
      if (!vacancyId) {
        toast(t(locale, 'panel.team.addToVacancyNeedVacancy'), 'error');
        return;
      }
      const post = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: cid }),
      });
      const postData = await post.json().catch(() => ({}));
      if (!post.ok) throw new Error(postData?.error || t(locale, 'panel.common.error'));
      toast(
        postData.alreadyLinked
          ? t(locale, 'panel.team.addToVacancyAlready')
          : t(locale, 'panel.team.addToVacancyOk'),
        'ok'
      );
    } catch (e) {
      toast(e?.message || t(locale, 'panel.common.error'), 'error');
    }
  };

  const deleteCandidate = async (candidateId, name) => {
    const id = String(candidateId || '').trim();
    if (!id) return;
    const ok = await confirm({
      message: t(locale, 'panel.team.confirmDeletePerson', { name }),
      danger: true,
      confirmLabel: t(locale, 'panel.common.confirmAction'),
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/candidates/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.team.deletePersonError'));
      router.refresh();
    } catch (e) {
      await notice({ message: e?.message || t(locale, 'panel.team.deletePersonError'), tone: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const deleteAssessment = async (assessmentId) => {
    const ok = await confirm({
      message: t(locale, 'recruiting.allowRetake') + t(locale, 'panel.team.allowRetakeConfirmSuffix'),
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/assessments/${encodeURIComponent(assessmentId)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      router.refresh();
      if (detail?.candidate?.id) await loadDetail(detail.candidate.id);
    } catch (e) {
      await notice({ message: e?.message || t(locale, 'panel.common.error'), tone: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const patchPipeline = async (assessmentId, pipelineStage) => {
    const extras = await requestPipelineExtras(locale, pipelineStage);
    if (extras == null) return;
    setStageBusy(String(assessmentId));
    try {
      const res = await fetch(`/api/admin/assessments/${encodeURIComponent(assessmentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStage, ...extras }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      router.refresh();
      if (detail?.candidate?.id) await loadDetail(detail.candidate.id);
    } catch (e) {
      await notice({ message: e?.message || t(locale, 'panel.common.error'), tone: 'error' });
    } finally {
      setStageBusy(null);
    }
  };

  const saveNotes = async () => {
    if (!detail?.candidate?.id) return;
    setNotesBusy(true);
    setNotesMsg('');
    try {
      const res = await fetch(`/api/admin/candidates/${encodeURIComponent(detail.candidate.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hrNotes: notesDraft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      setDetail((prev) => prev ? { ...prev, candidate: { ...prev.candidate, hrNotes: data.hrNotes } } : prev);
      setNotesEditing(false);
      setNotesMsgIsError(false);
      setNotesMsg(t(locale, 'panel.team.notesSaved'));
      setTimeout(() => setNotesMsg(''), 3000);
    } catch (e) {
      setNotesMsgIsError(true);
      setNotesMsg(e?.message || t(locale, 'panel.team.saveNotesError'));
    } finally {
      setNotesBusy(false);
    }
  };

  const saveProfile = async () => {
    if (!detail?.candidate?.id) return;
    setProfileBusy(true);
    setProfileMsg('');
    try {
      const res = await fetch(`/api/admin/candidates/${encodeURIComponent(detail.candidate.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: profileDraft.phone,
          linkedinUrl: profileDraft.linkedinUrl,
          city: profileDraft.city,
          state: profileDraft.state,
          salaryExpectation: stripSalary(profileDraft.salaryExpectation),
          availability: profileDraft.availability || null,
          source: profileDraft.source || null,
          birthDate: profileDraft.birthDate || null,
          hrNotes: notesDraft,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      setDetail((prev) => (prev ? {
        ...prev,
        candidate: {
          ...prev.candidate,
          phone: data.phone,
          linkedinUrl: data.linkedinUrl,
          city: data.city,
          state: data.state,
          salaryExpectation: data.salaryExpectation,
          availability: data.availability,
          source: data.source,
          hrNotes: data.hrNotes !== undefined ? data.hrNotes : prev.candidate.hrNotes,
        },
      } : prev));
      setProfileDraft(profileFromCandidate(data));
      setNotesDraft(data.hrNotes !== undefined ? (data.hrNotes || '') : notesDraft);
      setProfileEditing(false);
      setNotesEditing(false);
      setProfileMsgIsError(false);
      setProfileMsg(t(locale, 'recruiting.profileSaved'));
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (e) {
      setProfileMsgIsError(true);
      setProfileMsg(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setProfileBusy(false);
    }
  };

  const toggleSelect = (assessmentId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(String(assessmentId))) next.delete(String(assessmentId));
      else next.add(String(assessmentId));
      return next;
    });
  };

  const applyBulk = async () => {
    if (selectedIds.size === 0 || !bulkStage) return;
    const extras = await requestPipelineExtras(locale, bulkStage);
    if (extras == null) return;
    setBulkBusy(true);
    setBulkMsg('');
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/admin/assessments/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pipelineStage: bulkStage, ...extras }),
          })
        )
      );
      setSelectedIds(new Set());
      setBulkMsgIsError(false);
      setBulkMsg(t(locale, 'panel.team.bulkUpdatedCount', { n: selectedIds.size }));
      setTimeout(() => setBulkMsg(''), 3000);
      router.refresh();
    } catch {
      setBulkMsgIsError(true);
      setBulkMsg(t(locale, 'panel.team.bulkUpdateError'));
    } finally {
      setBulkBusy(false);
    }
  };

  const getEffectiveStage = (r) => stageOverrides[String(r.assessmentId)] ?? r.pipelineStage ?? PIPELINE_STAGE.NEW;

  const filtered = results;
  const activeSearch = (search || '').trim();
  const allSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(String(r.assessmentId)));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((r) => next.delete(String(r.assessmentId)));
      else filtered.forEach((r) => next.add(String(r.assessmentId)));
      return next;
    });
  };

  let openRow = (results || []).find((row) => String(row.assessmentId) === String(open)) || null;
  if (!openRow && open && detail?.candidate) {
    const a = (detail.assessments || []).find((x) => String(x.id) === String(open))
      || detail.assessments?.[0]
      || null;
    if (a) {
      openRow = {
        assessmentId: a.id,
        candidateId: detail.candidate.id,
        name: detail.candidate.fullName || detail.candidate.email || '',
        scores: a.scores,
        topType: a.topType,
        pipelineStage: a.pipelineStage,
      };
    }
  }
  const openCluster = openRow?.scores
    ? new Set(nearbyCluster(openRow.scores).map((item) => item.type))
    : new Set();
  const detailMatchesOpen = detail?.candidate?.id != null
    && String(detail.candidate.id) === String(openRow?.candidateId);
  const synthesis = openRow
    ? buildProfileSynthesis({
        locale,
        topType: openRow.topType,
        scores: openRow.scores,
        motivatorsTop: detailMatchesOpen ? detail?.people?.management?.motivators?.top : null,
      })
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <input
          type="search"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitSearch();
          }}
          onBlur={commitSearch}
          placeholder={t(locale, 'dashboard.searchPlaceholder')}
          aria-label={t(locale, 'panel.team.searchAriaLabel')}
          className="box-border w-full rounded-xl border border-ink/12 bg-ink/[0.03] py-3 pl-10 pr-4 font-ui text-sm text-ink outline-none"
        />
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-ink-faint">
          ⌕
        </span>
        {activeSearch ? (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-2xs text-ink-faint">
            {t(locale, 'panel.team.searchResultsTotal', { n: listTotal })}
          </span>
        ) : null}
      </div>
      {listFilter === 'turnover_risk' ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-sm text-ink"
          role="status"
        >
          <span>{t(locale, 'panel.team.filterTurnoverRisk')}</span>
          {typeof onClearListFilter === 'function' ? (
            <button
              type="button"
              onClick={onClearListFilter}
              className={S.btnGhost}
            >
              {t(locale, 'panel.team.clearListFilter')}
            </button>
          ) : null}
        </div>
      ) : null}
      <div
        role="group"
        aria-label={t(locale, 'panel.team.sortAria')}
        className="flex flex-wrap items-center gap-2.5 rounded-xl border border-ink/12 bg-ink/[0.03] px-4 py-3"
      >
        <label className="flex cursor-pointer items-center gap-1.5 font-mono text-2xs text-ink-muted">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            aria-label={t(locale, 'panel.team.selectAllPage')}
            className="h-3.5 w-3.5 accent-brand-500"
          />
          {t(locale, 'panel.team.all')}
        </label>
        <span className="font-mono text-2xs uppercase tracking-[0.08em] text-ink-faint">
          {t(locale, 'panel.team.sortBy')}
        </span>
        {viewMode === 'list' && sortColumns.map(({ k, labelKey }) => {
          const active = sortKey === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onSort(k)}
              aria-pressed={active}
              className={cn(
                'cursor-pointer rounded-lg border px-3 py-1.5 font-mono text-xs',
                active
                  ? 'border-brand-500/35 bg-brand-500/[0.09] text-brand-500'
                  : 'border-ink/12 bg-transparent text-ink-muted'
              )}
            >
              {t(locale, labelKey)}
              {active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
            </button>
          );
        })}
        <div className="ml-auto flex flex-col items-end gap-1.5">
          <div className="flex gap-1">
          {[
            { id: 'list',   icon: 'list', label: t(locale, 'panel.team.viewList') },
            { id: 'kanban', icon: 'kanban', label: t(locale, 'panel.team.viewKanban') },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setViewMode(id)}
              title={label}
              aria-pressed={viewMode === id}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs',
                viewMode === id
                  ? 'border-brand-500/35 bg-brand-500/[0.09] text-brand-500'
                  : 'border-ink/12 bg-transparent text-ink-muted'
              )}
            >
              <Icon name={icon} /> {label}
            </button>
          ))}
          </div>
          {viewMode === 'kanban' ? (
            <p className="m-0 max-w-[320px] text-right text-2xs leading-snug text-ink-faint">
              {t(locale, 'panel.team.teamKanbanHint')}
            </p>
          ) : null}
        </div>
      </div>

      {viewMode === 'kanban' && (
        <div className="kanban-scroll -mx-6 overflow-x-auto px-6 pb-4 [-webkit-overflow-scrolling:touch]">
          <div className="flex min-w-max items-start gap-3">
            {getKanbanStages(locale).map((stage) => {
              const items = filtered.filter((r) => getEffectiveStage(r) === stage.id);
              const isDropTarget = dragOverStage === stage.id;
              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStage(null); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain');
                    setDragOverStage(null);
                    setDraggingId(null);
                    if (!id) return;
                    const r = results.find((r) => String(r.assessmentId) === id);
                    if (!r || getEffectiveStage(r) === stage.id) return;
                    setStageOverrides((prev) => ({ ...prev, [id]: stage.id }));
                    await patchPipeline(parseInt(id, 10), stage.id);
                  }}
                  className="w-[260px] shrink-0 rounded-xl transition-[outline-color] duration-100"
                  style={{
                    outline: isDropTarget ? `2px dashed ${stage.color}` : '2px dashed transparent',
                    outlineOffset: '3px',
                  }}
                >
                  <div
                    className="mb-2 flex items-center justify-between rounded-t-[10px] border px-3.5 py-2.5 transition-colors duration-100"
                    style={{
                      background: isDropTarget ? `${stage.color}22` : `${stage.color}12`,
                      borderTop: `3px solid ${stage.color}`,
                      borderColor: `${stage.color}30`,
                    }}
                  >
                    <span className="font-mono text-xs font-bold tracking-[0.5px]" style={{ color: stage.color }}>
                      {stage.label}
                    </span>
                    <span
                      className="rounded-control px-2 py-px font-mono text-xs font-bold"
                      style={{ color: stage.color, background: `${stage.color}25` }}
                    >
                      {items.length}
                    </span>
                  </div>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    className={cn(
                      'flex flex-col gap-2 transition-[min-height] duration-100',
                      isDropTarget ? 'min-h-20' : 'min-h-10'
                    )}
                  >
                    {items.map((r) => {
                      const rid = String(r.assessmentId);
                      const d = TYPE_DATA[r.topType];
                      const fitScore = r.vacancyFitScore010 ?? r.areaFitScore010;
                      const isDragging = draggingId === rid;
                      const days = daysInStage(r.stageEnteredAt || r.createdAt);
                      const aging = stageAgingTone(days, r.pipelineStage || PIPELINE_STAGE.NEW);
                      return (
                        <div
                          key={rid}
                          draggable
                          onDragStart={(e) => {
                            setDraggingId(rid);
                            e.dataTransfer.setData('text/plain', rid);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => { setDraggingId(null); setDragOverStage(null); }}
                          onClick={() => {
                            if (draggingId) return;
                            setOpen(rid);
                            setPersonTab('people');
                            setPeopleSubTab('briefing');
                            if (r.candidateId) loadDetail(r.candidateId);
                          }}
                          className={cn(
                            'cursor-grab select-none rounded-control bg-surface/90 px-3.5 py-[11px] shadow-sm transition-opacity duration-150',
                            isDragging && 'opacity-40',
                            draggingId && !isDragging && 'pointer-events-none'
                          )}
                          style={{
                            border: `1px solid ${open === rid ? `${d.color}55` : C.border}`,
                          }}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <span className="shrink-0 text-xl leading-none">{d.emoji}</span>
                            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-ui text-prose leading-snug text-ink">
                              {titleCasePersonName(r.name)}
                            </span>
                            {days != null && aging ? (
                              <span
                                className={cn(
                                  'shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-2xs',
                                  aging === 'danger'
                                    ? 'border-danger/30 bg-danger/[0.09] text-danger'
                                    : 'border-warning/30 bg-warning/[0.1] text-warning'
                                )}
                                title={t(locale, 'recruiting.stageAgingTitle', { n: days })}
                              >
                                {t(locale, 'recruiting.stageAgingDays', { n: days })}
                              </span>
                            ) : days != null && days > 0 ? (
                              <span
                                className="shrink-0 font-mono text-2xs text-ink-faint"
                                title={t(locale, 'recruiting.stageAgingTitle', { n: days })}
                              >
                                {t(locale, 'recruiting.stageAgingDays', { n: days })}
                              </span>
                            ) : null}
                          </div>
                          <div className="mb-1.5 flex flex-wrap gap-1">
                            <TypeBadge type={r.topType} locale={locale} compact />
                            <NearbyTypeBadges scores={r.scores} topType={r.topType} locale={locale} />
                            {r.areaLabel && (
                              <span className="rounded-full border border-ink/12 bg-ink/[0.05] px-[7px] py-0.5 font-mono text-2xs text-ink-muted">
                                {r.areaLabel}
                              </span>
                            )}
                            {fitScore != null && (
                              <span
                                className={cn(
                                  'rounded-full border px-[7px] py-0.5 font-mono text-2xs',
                                  fitScore >= 7
                                    ? 'border-success/30 bg-success/10 text-success'
                                    : fitScore >= 4
                                      ? 'border-warning/30 bg-warning/10 text-warning'
                                      : 'border-danger/30 bg-danger/10 text-danger'
                                )}
                              >
                                {fitScore}/10
                              </span>
                            )}
                          </div>
                          {r.vacancyTitle && (
                            <div className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-2xs text-ink-faint">
                              {r.vacancyTitle}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {items.length === 0 && (
                      <div
                        className="rounded-lg px-3 py-5 text-center font-mono text-xs italic transition-all duration-100"
                        style={{
                          color: isDropTarget ? stage.color : C.faint,
                          border: isDropTarget ? `2px dashed ${stage.color}55` : '2px dashed transparent',
                        }}
                      >
                        {isDropTarget ? t(locale, 'panel.team.dropHere') : '—'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && activeSearch && (
            <div className="p-10 text-center text-sm italic text-ink-muted">
              {t(locale, 'panel.team.noResultsFor', { query: activeSearch })}
            </div>
          )}
        </div>
      )}

      {viewMode === 'list' && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-brand-500/25 bg-brand-500/[0.04] px-4 py-3">
          <span className="font-mono text-prose text-brand-500">
            {t(locale, 'panel.team.selectedCount', { n: selectedIds.size })}
          </span>
          <select
            value={bulkStage}
            onChange={(e) => setBulkStage(e.target.value)}
            disabled={bulkBusy}
            className={cn(S.select, 'bg-transparent py-1.5 text-xs')}
          >
            {PIPELINE_OPTIONS.map((code) => (
              <option key={code} value={code}>{pipelineLabel(locale, code)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyBulk}
            disabled={bulkBusy}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand-500/35 bg-brand-500/[0.09] px-3.5 py-[7px] font-mono text-xs text-brand-500',
              bulkBusy && 'opacity-60'
            )}
          >
            {bulkBusy ? <span className="spinner" /> : null}
            {t(locale, 'panel.team.applyStage')}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            disabled={bulkBusy}
            className="cursor-pointer rounded-lg border border-ink/12 bg-transparent px-3 py-[7px] font-mono text-xs text-ink-muted"
          >
            {t(locale, 'panel.compare.clearSelection')}
          </button>
          {bulkMsg && (
            <span className={cn('font-mono text-xs', bulkMsgIsError ? 'text-danger' : 'text-success')}>
              {bulkMsg}
            </span>
          )}
        </div>
      )}
      {viewMode === 'list' && filtered.length === 0 && activeSearch ? (
        <div className="p-10 text-center text-sm italic text-ink-muted">
          {t(locale, 'panel.team.noResultsFor', { query: activeSearch })}
        </div>
      ) : null}
      {focusCandidateId
        && detail?.candidate
        && String(detail.candidate.id) === String(focusCandidateId)
        && !(results || []).some((r) => String(r.candidateId) === String(focusCandidateId)) ? (
        <div className={cn(S.card, 'mb-4 px-[18px] py-3.5')}>
          <p className="m-0 text-xs text-ink-muted">
            {t(locale, 'dashboard.notifOpenOutsideFilters')}
          </p>
        </div>
      ) : null}
      {viewMode === 'list' ? (
        <div className="flex flex-col gap-1.5">
          {filtered.map((r) => {
        const id = String(r.assessmentId);
        const d = TYPE_DATA[r.topType];
        const isSelected = open === id;
        const showVacancyFit = r.vacancyFitScore010 != null && r.vacancyFitScore010 !== undefined;
        const created = r.createdAt != null ? new Date(r.createdAt) : null;
        const createdLabel =
          created && !Number.isNaN(created.getTime())
            ? created.toLocaleString(localeHtmlLang(locale), { dateStyle: 'short', timeStyle: 'short' })
            : null;
        return (
          <div
            key={id}
            className={cn(S.cardTight, 'cursor-pointer overflow-hidden p-0')}
            style={{
              border: isSelected ? `1px solid ${d.color}44` : undefined,
            }}
            onClick={() => {
              setOpen(id);
              setPersonTab('people');
              setPeopleSubTab('briefing');
              if (r.candidateId) loadDetail(r.candidateId);
              else { setDetail(null); setDetailErr(''); }
            }}
          >
            <div className="flex items-center gap-3 px-3.5 py-2.5">
              <input
                type="checkbox"
                checked={selectedIds.has(id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleSelect(id)}
                aria-label={t(locale, 'panel.team.selectPersonAria', { name: titleCasePersonName(r.name) })}
                className="h-4 w-4 shrink-0 cursor-pointer accent-brand-500"
              />
              <div className="shrink-0 text-lg leading-none">{d.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-base leading-snug text-ink">
                    {titleCasePersonName(r.name)}
                  </span>
                  {detail?.candidate?.id === r.candidateId && detail?.candidate?.employmentStatus === EMPLOYMENT_STATUS.EMPLOYEE ? (
                    <span className="rounded-full border border-success/35 px-1.5 py-px font-mono text-2xs text-success">
                      {t(locale, 'recruiting.employmentEmployee')}
                    </span>
                  ) : null}
                  {createdLabel ? (
                    <span
                      title={t(locale, 'dashboard.teamListDateHelp')}
                      className="font-mono text-2xs text-ink-faint"
                    >
                      {t(locale, 'dashboard.teamAssessmentDate')}: {createdLabel}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <TypeBadge type={r.topType} locale={locale} compact />
                  <NearbyTypeBadges scores={r.scores} topType={r.topType} locale={locale} />
                  {r.areaLabel && (
                    <span className="rounded-full border border-ink/12 bg-ink/[0.04] px-2 py-px font-mono text-2xs text-ink-muted">
                      {r.areaLabel}
                    </span>
                  )}
                  {r.pipelineStage ? (
                    <span className="rounded-full border border-brand-500/35 bg-brand-500/[0.12] px-2 py-px font-mono text-2xs text-brand-600">
                      {t(locale, 'recruiting.pipelineShort')}: {pipelineLabel(locale, r.pipelineStage)}
                    </span>
                  ) : null}
                  {r.fitLabel && (
                    <span className="rounded-full border border-brand-500/25 bg-brand-500/[0.09] px-2 py-px font-mono text-2xs text-brand-600">
                      {t(locale, 'recruiting.fitLabel')}: {fitBandLabel(locale, r.fitLabel)}
                    </span>
                  )}
                  {showVacancyFit ? (
                    <span className="rounded-full border border-success/25 bg-success/[0.08] px-2 py-px font-mono text-2xs text-success">
                      {t(locale, 'recruiting.vacancyFitShort')}: {r.vacancyFitScore010}/10
                    </span>
                  ) : r.areaFitScore010 !== null && r.areaFitScore010 !== undefined ? (
                    <span className="rounded-full border border-success/25 bg-success/[0.08] px-2 py-px font-mono text-2xs text-success">
                      {t(locale, 'recruiting.areaFitShort')}: {r.areaFitScore010}/10
                    </span>
                  ) : null}
                  {(r.hrScore != null || r.turnoverRisk) && (
                    <HrScoreBadge score={r.hrScore} risk={r.turnoverRisk} size="xs" />
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {r.candidateId && isAdmin ? (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const res = await fetch(`/api/admin/hr-score/recalculate`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ candidateId: r.candidateId }),
                        });
                        if (res.ok) {
                          toast(locale === 'en' ? 'Score recalculated' : 'Score recalculado', 'ok');
                          if (typeof onRefresh === 'function') onRefresh();
                        } else {
                          throw new Error('recalc_failed');
                        }
                      } catch (err) {
                        toast(locale === 'en' ? 'Failed to recalculate' : 'Erro ao recalcular', 'error');
                      }
                    }}
                    title={locale === 'en' ? 'Recalculate HR Score' : 'Recalcular HR Score'}
                    aria-label={locale === 'en' ? 'Recalculate HR Score' : 'Recalcular HR Score'}
                    className="inline-flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-control border border-info/35 bg-info/[0.08] p-0 text-info"
                  >
                    <Icon name="refresh" />
                  </button>
                ) : null}
                {r.candidateId ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCandidate(r.candidateId, r.name);
                    }}
                    disabled={deleting}
                    title={t(locale, 'panel.team.ariaDeletePerson')}
                    aria-label={t(locale, 'panel.team.ariaDeletePerson')}
                    className={cn(
                      'inline-flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-control border border-danger/35 bg-danger/[0.08] p-0 text-danger',
                      deleting && 'opacity-60'
                    )}
                  >
                    <Icon name="trash" />
                  </button>
                ) : null}
                <span className="font-mono text-2xs text-ink-muted">{t(locale, 'panel.team.openDetail')} →</span>
              </div>
            </div>
          </div>
        );
      })}
        </div>
      ) : null}

      <AdminRichFormDrawer
        open={Boolean(open && openRow)}
        title={openRow ? titleCasePersonName(openRow.name) : t(locale, 'panel.team.personDetailTitle')}
        locale={locale}
        onClose={() => {
          setOpen(null);
          setDetail(null);
          setDetailErr('');
          setPersonTab('people');
          setPeopleSubTab('briefing');
        }}
        maxWidth="920px"
      >
        {openRow ? (
          <div>
            <PanelSubNav
              ariaLabel={t(locale, 'panel.team.personTabsAria')}
              active={personTab}
              onChange={setPersonTab}
              tabs={[
                { id: 'people', label: t(locale, 'panel.team.personTabPeople') },
                { id: 'style', label: t(locale, 'panel.team.personTabStyle') },
                { id: 'history', label: t(locale, 'panel.team.personTabHistory') },
                { id: 'profile', label: t(locale, 'panel.team.personTabProfile') },
              ]}
            />
            {personTab === 'style' ? (
              <div>
                <EnneagramCross scores={openRow.scores} locale={locale} />
                <IntegratedProfileSynthesis synthesis={synthesis} locale={locale} />

                <div className="mb-4">
                  {openCluster.size > 1 ? (
                    <p className="mb-2 mt-0 text-xs leading-snug text-ink-faint">
                      {t(locale, 'panel.team.scoresClusterHint')}
                    </p>
                  ) : null}
                  <TypeScoreChart scores={openRow.scores} locale={locale} highlightTypes={openCluster} />
                </div>
              </div>
            ) : null}
            {personTab === 'people' ? (
              <div>
                {detailLoading ? (
                  <AppLoading locale={locale} variant="inline" />
                ) : !detailLoading && detail?.candidate?.id === openRow.candidateId ? (
                  <>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => addToVacancy(detail.candidate.id, openRow.name)}
                        className={cn(S.btnBrandSoft)}
                      >
                        {t(locale, 'panel.team.addToVacancyBtn')}
                      </button>
                    </div>
                    <PanelSubNav
                      ariaLabel={t(locale, 'panel.team.peopleSubTabsAria')}
                      active={peopleSubTab === 'dossier' ? 'briefing' : peopleSubTab}
                      onChange={(id) => setPeopleSubTab(id === 'dossier' ? 'briefing' : id)}
                      tabs={[
                        { id: 'briefing', label: t(locale, 'panel.team.peopleSubTabSummary') },
                        { id: 'oneOnOne', label: t(locale, 'panel.team.peopleSubTabOneOnOne') },
                        { id: 'journey', label: t(locale, 'panel.team.peopleSubTabJourney') },
                        ...(detail.candidate.employmentStatus === EMPLOYMENT_STATUS.EMPLOYEE ||
                        detail.candidate.employmentStatus === EMPLOYMENT_STATUS.ALUMNI
                          ? [
                              {
                                id: 'compensation',
                                label: t(locale, 'panel.team.peopleSubTabCompensation'),
                              },
                            ]
                          : []),
                      ]}
                    />
                    {peopleSubTab === 'briefing' || peopleSubTab === 'dossier' ? (
                      <div className="space-y-4">
                        <PersonDossierBlock
                          locale={locale}
                          candidateId={detail.candidate.id}
                          companyId={detail.candidate.companyId}
                          onGoSubTab={setPeopleSubTab}
                          embedded
                        />
                        <HrActionBrief
                          locale={locale}
                          brief={detail.people?.decisionBrief}
                          personName={openRow.name}
                          omitHypotheses
                        />
                      </div>
                    ) : null}
                    {peopleSubTab === 'oneOnOne' ? (
                      <PeopleManagementPanel
                        locale={locale}
                        candidateId={detail.candidate.id}
                        people={detail.people}
                        employmentStatus={detail.candidate.employmentStatus}
                        onRefresh={() => loadDetail(detail.candidate.id)}
                        section="oneOnOne"
                      />
                    ) : null}
                    {peopleSubTab === 'journey' ? (
                      <PeopleManagementPanel
                        locale={locale}
                        candidateId={detail.candidate.id}
                        people={detail.people}
                        employmentStatus={detail.candidate.employmentStatus}
                        onRefresh={() => loadDetail(detail.candidate.id)}
                        section="journey"
                      />
                    ) : null}
                    {peopleSubTab === 'compensation' ? (
                      <CompensationBlock
                        locale={locale}
                        candidateId={detail.candidate.id}
                        employmentStatus={detail.candidate.employmentStatus}
                      />
                    ) : null}
                  </>
                ) : (
                  <p className="m-0 text-xs text-ink-muted">—</p>
                )}
              </div>
            ) : null}
            {personTab === 'history' ? (
              <div>
                <div className="mb-4 rounded-control border border-ink/12 bg-ink/[0.02] p-3.5">
                  <span className={cn(S.label, 'mb-2 block text-center')}>{t(locale, 'recruiting.timelineTitle')}</span>
                  <CandidateTimeline
                    locale={locale}
                    loading={detailLoading}
                    events={detail?.timeline || []}
                    currentStage={getEffectiveStage(openRow)}
                  />
                </div>

                <div className="mb-4 rounded-control border border-ink/12 bg-ink/[0.02] p-3.5">
                  <span className={cn(S.label, 'mb-2 block')}>{t(locale, 'recruiting.assessmentsForCandidate')}</span>
                  {detailLoading ? (
                    <AppLoading locale={locale} variant="inline" />
                  ) : detailErr ? (
                    <p className="m-0 text-xs text-danger">{detailErr}</p>
                  ) : detail?.assessments?.length ? (
                    <div className="flex flex-col gap-2.5">
                      {detail.assessments.map((a) => (
                        <div
                          key={a.id}
                          className="flex flex-wrap items-center gap-2.5 rounded-lg border border-ink/12 bg-surface/40 p-2.5"
                        >
                          <div>
                            <span className="font-mono text-xs text-ink-muted">
                              #{a.id} · {a.areaLabel}
                              {a.vacancyTitle ? ` · ${a.vacancyTitle}` : ''}
                            </span>
                            {isAdmin && (a.fillDurationMs != null || a.copyEventCount != null) && (
                              <div
                                className={cn(
                                  'mt-1.5 font-mono text-2xs leading-snug',
                                  isSuspiciouslyFast(a.fillDurationMs) || (a.copyEventCount || 0) > 0
                                    ? 'text-warning'
                                    : 'text-ink-faint'
                                )}
                                title={t(locale, 'panel.team.integrityTitle')}
                              >
                                {t(locale, 'panel.team.testDuration', {
                                  duration: formatFillDuration(a.fillDurationMs) || t(locale, 'panel.common.notApplicable'),
                                })}
                                {isSuspiciouslyFast(a.fillDurationMs) ? t(locale, 'panel.team.fastFlag') : ''}
                                {' · '}
                                {t(locale, 'panel.team.screenCopies', { n: a.copyEventCount ?? 0 })}
                                {(a.copyEventCount || 0) > 0 ? t(locale, 'panel.team.attentionFlag') : ''}
                              </div>
                            )}
                            {a.rejectionReason ? (
                              <div className="mt-1 font-mono text-2xs text-danger">
                                {t(locale, 'recruiting.rejectionReasonLabel')}: {rejectionReasonLabel(locale, a.rejectionReason)}
                              </div>
                            ) : null}
                            {a.startDate && a.pipelineStage === PIPELINE_STAGE.HIRED ? (
                              <div className="mt-1 font-mono text-2xs text-success">
                                {t(locale, 'recruiting.startDateLabel')}: {a.startDate}
                              </div>
                            ) : null}
                            {a.pipelineHistory?.length > 0 && (
                              <div className="mt-1 font-mono text-2xs leading-loose text-ink-faint">
                                {a.pipelineHistory.map((h, i) => (
                                  <span key={i} className="mr-2.5">
                                    {h.fromStage || '—'} → {h.toStage}
                                    {h.reason ? ` (${rejectionReasonLabel(locale, h.reason)})` : ''}
                                    {h.startDate ? ` · ${h.startDate}` : ''}
                                    {' · '}
                                    {new Date(h.changedAt).toLocaleDateString(localeHtmlLang(locale), { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                            {t(locale, 'recruiting.stageLabel')}
                            <select
                              value={a.pipelineStage || PIPELINE_STAGE.TEST_COMPLETED}
                              disabled={!!stageBusy}
                              onChange={(e) => patchPipeline(a.id, e.target.value)}
                              className={cn(S.selectCompact, 'bg-transparent py-1')}
                            >
                              {PIPELINE_OPTIONS.map((code) => (
                                <option key={code} value={code}>
                                  {pipelineLabel(locale, code)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() => deleteAssessment(a.id)}
                            className="ml-auto cursor-pointer rounded-lg border border-danger/35 bg-danger/[0.08] px-2.5 py-1.5 font-mono text-xs text-danger"
                          >
                            {t(locale, 'recruiting.allowRetake')}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="m-0 text-xs text-ink-muted">—</p>
                  )}
                </div>
              </div>
            ) : null}
            {personTab === 'profile' ? (
              <div>
                {detail?.candidate?.id ? (
                  <div className="mb-4">
                    <CandidateCvBlock
                      candidateId={detail.candidate.id}
                      locale={locale}
                      embedded
                      onApplied={() => loadDetail(detail.candidate.id)}
                    />
                  </div>
                ) : null}
                <div className="mb-4 rounded-control border border-ink/12 bg-ink/[0.02] p-3.5">
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <span className={cn(S.label, 'mb-0')}>{t(locale, 'recruiting.candidateProfile')}</span>
                    {!profileEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDraft(profileFromCandidate(detail?.candidate));
                          setNotesDraft(detail?.candidate?.hrNotes || '');
                          setProfileEditing(true);
                          setNotesEditing(false);
                          setProfileMsg('');
                          setNotesMsg('');
                        }}
                        className="cursor-pointer rounded-md border border-ink/12 bg-transparent px-2.5 py-[3px] font-mono text-2xs text-ink-muted"
                      >
                        {t(locale, 'panel.team.editNote')}
                      </button>
                    )}
                  </div>
                  {!profileEditing ? (
                    (() => {
                      const c = detail?.candidate;
                      const locBits = [c?.city, c?.state].filter(Boolean).join(' / ');
                      const birthIso =
                        c?.birthDate != null ? String(c.birthDate).slice(0, 10) : '';
                      const startIso =
                        c?.startDate != null ? String(c.startDate).slice(0, 10) : '';
                      const dateLocale = locale === 'en' ? 'en-US' : 'pt-BR';
                      const fmtDate = (iso) => {
                        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || null;
                        const d = new Date(`${iso}T12:00:00`);
                        if (Number.isNaN(d.getTime())) return iso;
                        return d.toLocaleDateString(dateLocale, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        });
                      };
                      const bits = [
                        c?.phone,
                        locBits || null,
                        c?.linkedinUrl ? 'LinkedIn' : null,
                        c?.salaryExpectation,
                        availabilityLabel(locale, c?.availability),
                        sourceLabel(locale, c?.source),
                        birthIso || null,
                        startIso || null,
                        detail?.lmsOverdue?.length ? 'lms-overdue' : null,
                      ].filter(Boolean);
                      if (!bits.length) {
                        return (
                          <p className="m-0 text-xs italic text-ink-faint">—</p>
                        );
                      }
                      return (
                        <div className="font-mono text-prose leading-relaxed text-ink">
                          {c?.phone ? <div>{formatPhoneBr(c.phone)}</div> : null}
                          {locBits ? <div>{locBits}</div> : null}
                          {c?.linkedinUrl ? (
                            <div>
                              <a href={c.linkedinUrl} target="_blank" rel="noreferrer" className="text-brand-600">
                                {c.linkedinUrl}
                              </a>
                            </div>
                          ) : null}
                          {c?.salaryExpectation ? <div>{formatSalaryBr(c.salaryExpectation)}</div> : null}
                          {availabilityLabel(locale, c?.availability) ? (
                            <div>{availabilityLabel(locale, c.availability)}</div>
                          ) : null}
                          {sourceLabel(locale, c?.source) ? (
                            <div>{sourceLabel(locale, c.source)}</div>
                          ) : null}
                          {birthIso ? (
                            <div>
                              {t(locale, 'panel.team.birthDate')}: {fmtDate(birthIso)}
                            </div>
                          ) : null}
                          {startIso ? (
                            <div>
                              {t(locale, 'panel.team.workAnniversary')}: {fmtDate(startIso)}
                            </div>
                          ) : null}
                          {detail?.lmsOverdue?.length ? (
                            <ul className="mt-2 flex list-none flex-col gap-1 p-0">
                              {detail.lmsOverdue.map((course) => (
                                <li
                                  key={course.enrollmentId}
                                  className="w-fit rounded-full bg-danger/10 px-2 py-1 text-2xs text-danger"
                                >
                                  {t(locale, 'panel.team.lmsOverdue', {
                                    title: course.courseTitle,
                                    date: fmtDate(course.dueDate),
                                  })}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      );
                    })()
                  ) : (
                    <div>
                      <div className="mb-2.5 flex flex-wrap gap-2">
                        <input
                          value={formatPhoneBr(profileDraft.phone)}
                          onChange={(e) => setProfileDraft((p) => ({ ...p, phone: stripPhone(e.target.value) || '' }))}
                          placeholder={t(locale, 'recruiting.phonePh')}
                          inputMode="tel"
                          className={cn(S.select, 'min-w-0 flex-[1_1_140px] font-mono text-xs')}
                        />
                        <input
                          value={profileDraft.linkedinUrl}
                          onChange={(e) => setProfileDraft((p) => ({ ...p, linkedinUrl: e.target.value }))}
                          placeholder={t(locale, 'recruiting.linkedinPh')}
                          autoComplete="off"
                          name="linkedin-url"
                          className="rounded-lg border border-ink/12 bg-ink/[0.03] px-2.5 py-2 font-mono text-xs text-ink min-w-0 flex-[2_1_200px]"
                        />
                        <BrStateSelect
                          value={profileDraft.state}
                          onChange={(state) => setProfileDraft((p) => ({ ...p, state, city: '' }))}
                          locale={locale}
                          className="rounded-lg border border-ink/12 bg-ink/[0.03] px-2.5 py-2 font-mono text-xs text-ink min-w-0 flex-[0_1_160px] cursor-pointer"
                        />
                        <BrCitySelect
                          uf={profileDraft.state}
                          value={profileDraft.city}
                          onChange={(city) => setProfileDraft((p) => ({ ...p, city }))}
                          locale={locale}
                          className="rounded-lg border border-ink/12 bg-ink/[0.03] px-2.5 py-2 font-mono text-xs text-ink min-w-0 flex-[1_1_180px]"
                        />
                        <input
                          value={formatSalaryBr(profileDraft.salaryExpectation)}
                          onChange={(e) => setProfileDraft((p) => ({ ...p, salaryExpectation: digitsOnly(e.target.value).slice(0, 15) }))}
                          placeholder={t(locale, 'recruiting.salaryPh')}
                          inputMode="numeric"
                          autoComplete="off"
                          className="rounded-lg border border-ink/12 bg-ink/[0.03] px-2.5 py-2 font-mono text-xs text-ink min-w-0 flex-[1_1_160px]"
                        />
                        <select
                          value={profileDraft.availability}
                          onChange={(e) => setProfileDraft((p) => ({ ...p, availability: e.target.value }))}
                          aria-label={t(locale, 'recruiting.availabilityLabel')}
                          className={cn(S.select, 'min-w-0 flex-[1_1_140px] font-mono text-xs')}
                        >
                          <option value="">{t(locale, 'recruiting.availabilityLabel')}</option>
                          <option value="immediate">{t(locale, 'recruiting.availabilityImmediate')}</option>
                          <option value="15_days">{t(locale, 'recruiting.availability15')}</option>
                          <option value="30_days">{t(locale, 'recruiting.availability30')}</option>
                          <option value="60_days">{t(locale, 'recruiting.availability60')}</option>
                          <option value="other">{t(locale, 'recruiting.availabilityOther')}</option>
                        </select>
                        <select
                          value={profileDraft.source}
                          onChange={(e) => setProfileDraft((p) => ({ ...p, source: e.target.value }))}
                          aria-label={t(locale, 'recruiting.sourceLabel')}
                          className={cn(S.select, 'min-w-0 flex-[1_1_140px] font-mono text-xs')}
                        >
                          <option value="">{t(locale, 'recruiting.sourceLabel')}</option>
                          <option value="linkedin">{t(locale, 'recruiting.sourceLinkedin')}</option>
                          <option value="referral">{t(locale, 'recruiting.sourceReferral')}</option>
                          <option value="agency">{t(locale, 'recruiting.sourceAgency')}</option>
                          <option value="job_board">{t(locale, 'recruiting.sourceJobBoard')}</option>
                          <option value="other">{t(locale, 'recruiting.sourceOther')}</option>
                        </select>
                        <label className="flex min-w-0 flex-[1_1_160px] flex-col gap-1">
                          <span className={cn(S.label, 'mb-0')}>{t(locale, 'panel.team.birthDate')}</span>
                          <DateField
                            value={profileDraft.birthDate || ''}
                            onChange={(e) =>
                              setProfileDraft((p) => ({ ...p, birthDate: e.target.value || '' }))
                            }
                            aria-label={t(locale, 'panel.team.birthDate')}
                            className="font-mono text-xs"
                          />
                        </label>
                        {detail?.candidate?.startDate ? (
                          <p className="m-0 min-w-0 flex-[1_1_160px] font-mono text-2xs leading-snug text-ink-muted">
                            {t(locale, 'panel.team.workAnniversary')}:{' '}
                            {String(detail.candidate.startDate).slice(0, 10)}
                            <span className="mt-0.5 block text-ink-faint">
                              {t(locale, 'panel.team.workAnniversaryHint')}
                            </span>
                          </p>
                        ) : null}
                      </div>
                      <div className="mb-2.5">
                        <span className={cn(S.label, 'mb-1.5')}>{t(locale, 'panel.team.hrNotes')}</span>
                        <RichTextEditor
                          value={notesDraft}
                          onChange={setNotesDraft}
                          placeholder={t(locale, 'panel.team.notesPlaceholder')}
                          aria-label={t(locale, 'panel.team.notesAria')}
                          minHeight={120}
                          locale={locale}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={saveProfile}
                          disabled={profileBusy}
                          className={cn(
                            'cursor-pointer rounded-lg border border-brand-500/35 bg-brand-500/[0.09] px-3.5 py-[7px] font-mono text-xs text-brand-500',
                            profileBusy && 'opacity-60'
                          )}
                        >
                          {profileBusy ? t(locale, 'recruiting.savingNotes') : t(locale, 'recruiting.saveProfile')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileDraft(profileFromCandidate(detail?.candidate));
                            setNotesDraft(detail?.candidate?.hrNotes || '');
                            setProfileEditing(false);
                            setProfileMsg('');
                          }}
                          disabled={profileBusy}
                          className="cursor-pointer rounded-lg border border-ink/12 bg-transparent px-3.5 py-[7px] font-mono text-xs text-ink-muted"
                        >
                          {t(locale, 'panel.admin.cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                  {profileMsg ? (
                    <p className={cn('mt-2 mb-0 font-mono text-2xs', profileMsgIsError ? 'text-danger' : 'text-success')}>
                      {profileMsg}
                    </p>
                  ) : null}
                </div>

                {!profileEditing ? (
                <div className="mb-4 rounded-control border border-ink/12 bg-ink/[0.02] p-3.5">
                  <div className="mb-2 flex items-center gap-2.5">
                    <span className={cn(S.label, 'mb-0')}>{t(locale, 'panel.team.hrNotes')}</span>
                    {!notesEditing && (
                      <button
                        type="button"
                        onClick={() => { setNotesDraft(detail?.candidate?.hrNotes || ''); setNotesEditing(true); setNotesMsg(''); }}
                        className="cursor-pointer rounded-md border border-ink/12 bg-transparent px-2.5 py-[3px] font-mono text-2xs text-ink-muted"
                      >
                        {detail?.candidate?.hrNotes && !isRichTextEmpty(detail.candidate.hrNotes)
                          ? t(locale, 'panel.team.editNote')
                          : t(locale, 'panel.team.addNote')}
                      </button>
                    )}
                  </div>
                  {!notesEditing ? (
                    !isRichTextEmpty(detail?.candidate?.hrNotes) ? (
                      <RichTextView html={detail.candidate.hrNotes} />
                    ) : (
                      <p className="m-0 text-xs italic text-ink-faint">
                        {t(locale, 'panel.team.noNotes')}
                      </p>
                    )
                  ) : (
                    <div>
                      <div className="mb-2">
                        <RichTextEditor
                          value={notesDraft}
                          onChange={setNotesDraft}
                          placeholder={t(locale, 'panel.team.notesPlaceholder')}
                          aria-label={t(locale, 'panel.team.notesAria')}
                          minHeight={120}
                          locale={locale}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={saveNotes}
                          disabled={notesBusy}
                          className={cn(
                            'flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand-500/35 bg-brand-500/[0.09] px-3.5 py-[7px] font-mono text-xs text-brand-500',
                            notesBusy && 'opacity-60'
                          )}
                        >
                          {notesBusy ? <span className="spinner" /> : null}
                          {t(locale, 'panel.admin.save')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setNotesEditing(false); setNotesDraft(detail?.candidate?.hrNotes || ''); }}
                          disabled={notesBusy}
                          className="cursor-pointer rounded-lg border border-ink/12 bg-transparent px-3 py-[7px] font-mono text-xs text-ink-muted"
                        >
                          {t(locale, 'panel.admin.cancel')}
                        </button>
                        {notesMsg && (
                          <span className={cn('font-mono text-xs', notesMsgIsError ? 'text-danger' : 'text-success')}>
                            {notesMsg}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {!notesEditing && notesMsg && (
                    <p className={cn('mt-1.5 mb-0 font-mono text-xs', notesMsgIsError ? 'text-danger' : 'text-success')}>
                      {notesMsg}
                    </p>
                  )}
                </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminRichFormDrawer>

    </div>
  );
}
