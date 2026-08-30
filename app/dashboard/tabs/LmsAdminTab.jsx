'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { PAGE_SIZE_OPTIONS } from '../../../lib/assessment-filters';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { DateField } from '../../_components/DateField';
import { FormField } from '../../_components/FormField';
import {
  AdminListFilters,
  AdminListFilterSelect,
  AdminListResults,
} from '../../_components/AdminListFilters';
import { EntitySearchSelect } from '../../_components/EntitySearchSelect';
import { CopyableLink } from '../../_components/CopyableLink';
import { CollapsibleBlock } from '../../_components/CollapsibleBlock';
import {
  AdminActionsCell,
  AdminActionsTh,
  AdminCreateButton,
  AdminDeleteButton,
  AdminEditButton,
  AdminIconButton,
  AdminListPager,
  AdminListSearch,
  AdminPageHeader,
  AdminTableShell,
  AdminTh,
  AdminViewButton,
  S,
  SortableTh,
  clientSortNextDir,
} from '../dashboard-shared';
import { StatusToneChip } from '../../_components/StatusToneChip';
import { RichTextView } from '../../_components/RichTextView';

const ENROLL_PAGE_THRESHOLD = 10;

function companyQs(companyId) {
  return companyId ? `companyId=${encodeURIComponent(companyId)}` : '';
}

function lmsText(locale, key, fallback) {
  const path = `panel.lms.${key}`;
  const translated = t(locale, path);
  return translated === path ? fallback : translated;
}

/**
 * LMS admin — courses, ordered URL/PDF lessons, cohort enrollment + progress.
 * List-first grid; detail opens via Ver or URL `course=`.
 */
export function LmsAdminTab({ locale = 'pt-BR', companyId, courseId, navigateDashboard }) {
  const { confirm, promptForm, toast } = useAppFeedback();
  const pdfInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [courseQ, setCourseQ] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [ops, setOps] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [enrollPick, setEnrollPick] = useState('');
  const [enrollBusy, setEnrollBusy] = useState(false);
  const [lessonBusy, setLessonBusy] = useState(false);
  const [cohortName, setCohortName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [mandatory, setMandatory] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState('title');
  const [sortDir, setSortDir] = useState('asc');
  const [enrollPage, setEnrollPage] = useState(1);
  const [enrollPageSize, setEnrollPageSize] = useState(ENROLL_PAGE_THRESHOLD);

  const openCourse = useCallback(
    (id) => {
      const nextId = Number(id);
      if (!Number.isFinite(nextId) || nextId <= 0) return;
      setSelectedId(nextId);
      navigateDashboard?.({ tab: 'lms', course: nextId });
    },
    [navigateDashboard]
  );

  const backToList = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setEnrollments([]);
    setOps(null);
    navigateDashboard?.({ tab: 'lms', course: null });
  }, [navigateDashboard]);

  const loadCourses = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/lms/courses?${companyQs(companyId)}&includeInactive=1&limit=80`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'load');
      setCourses(json.courses || []);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.lms.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [companyId, locale, toast]);

  const loadDetail = useCallback(
    async (id) => {
      if (!companyId || !id) return;
      setDetailLoading(true);
      try {
        const [cRes, eRes] = await Promise.all([
          fetch(
            `/api/admin/lms/courses/${encodeURIComponent(id)}?${companyQs(companyId)}&includeInactiveLessons=1`
          ),
          fetch(
            `/api/admin/lms/courses/${encodeURIComponent(id)}/enrollments?${companyQs(companyId)}`
          ),
        ]);
        const cJson = await cRes.json().catch(() => ({}));
        const eJson = await eRes.json().catch(() => ({}));
        if (!cRes.ok) throw new Error(cJson?.error || 'detail');
        setDetail({ course: cJson.course, lessons: cJson.lessons || [] });
        setEnrollments(eRes.ok ? eJson.enrollments || [] : []);
        setOps(eRes.ok ? eJson.ops || null : null);
      } catch (e) {
        toast(e?.message || t(locale, 'panel.lms.loadError'), 'error');
        setDetail(null);
        setEnrollments([]);
        setOps(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [companyId, locale, toast]
  );

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    const passedId = Number(courseId);
    if (Number.isFinite(passedId) && passedId > 0) {
      setSelectedId(passedId);
      return;
    }
    if (typeof window !== 'undefined') {
      const queryId = Number(new URLSearchParams(window.location.search).get('course'));
      if (Number.isFinite(queryId) && queryId > 0) {
        setSelectedId(queryId);
        return;
      }
    }
    setSelectedId(null);
  }, [courseId]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else {
      setDetail(null);
      setEnrollments([]);
      setOps(null);
    }
  }, [selectedId, loadDetail]);

  useEffect(() => {
    setEnrollPage(1);
  }, [selectedId, enrollments.length]);

  const createCourse = async () => {
    const values = await promptForm({
      title: t(locale, 'panel.lms.createCourse'),
      fields: [
        { name: 'title', label: t(locale, 'panel.lms.fieldTitle'), type: 'text', required: true },
        {
          name: 'description',
          label: t(locale, 'panel.lms.fieldDescription'),
          type: 'richText',
          minHeight: 120,
        },
        {
          name: 'completionPct',
          label: t(locale, 'panel.lms.fieldCompletionPct'),
          type: 'number',
          defaultValue: '100',
        },
      ],
    });
    if (!values) return;
    try {
      const res = await fetch('/api/admin/lms/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          title: values.title,
          description: values.description || '',
          completionPct: Number(values.completionPct) || 100,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'create');
      toast(t(locale, 'panel.lms.courseCreated'), 'ok');
      await loadCourses();
      if (json.course?.id) openCourse(json.course.id);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.lms.saveError'), 'error');
    }
  };

  const editCourse = async (courseRow = null) => {
    const c = courseRow || detail?.course;
    if (!c) return;
    const values = await promptForm({
      title: t(locale, 'panel.lms.editCourse'),
      fields: [
        {
          name: 'title',
          label: t(locale, 'panel.lms.fieldTitle'),
          type: 'text',
          required: true,
          defaultValue: c.title,
        },
        {
          name: 'description',
          label: t(locale, 'panel.lms.fieldDescription'),
          type: 'richText',
          minHeight: 120,
          defaultValue: c.description || '',
        },
        {
          name: 'completionPct',
          label: t(locale, 'panel.lms.fieldCompletionPct'),
          type: 'number',
          defaultValue: String(c.completionPct ?? 100),
        },
        {
          name: 'active',
          label: t(locale, 'panel.lms.fieldActive'),
          type: 'boolean',
          defaultValue: c.active !== false,
        },
      ],
    });
    if (!values) return;
    try {
      const res = await fetch(`/api/admin/lms/courses/${encodeURIComponent(c.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          title: values.title,
          description: values.description || '',
          completionPct: Number(values.completionPct) || 100,
          active: values.active !== false,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'update');
      toast(t(locale, 'panel.lms.courseUpdated'), 'ok');
      await loadCourses();
      if (selectedId && Number(selectedId) === Number(c.id)) await loadDetail(c.id);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.lms.saveError'), 'error');
    }
  };

  const setCourseActive = async (courseRow, nextActive) => {
    const c = courseRow || detail?.course;
    if (!c) return;
    if (!nextActive) {
      const ok = await confirm({
        title: t(locale, 'panel.lms.deactivateCourse'),
        message: `${c.title}\n\n${t(locale, 'panel.lms.deactivateCourseConfirm')}`,
        danger: true,
      });
      if (!ok) return;
    }
    try {
      const res = await fetch(`/api/admin/lms/courses/${encodeURIComponent(c.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, active: Boolean(nextActive) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'update');
      toast(
        nextActive
          ? t(locale, 'panel.lms.courseReactivated')
          : t(locale, 'panel.lms.courseDeactivated'),
        'ok'
      );
      await loadCourses();
      if (selectedId && Number(selectedId) === Number(c.id)) {
        if (!nextActive) backToList();
        else await loadDetail(c.id);
      }
    } catch (e) {
      toast(e?.message || t(locale, 'panel.lms.saveError'), 'error');
    }
  };

  const addLesson = async () => {
    if (!selectedId) return;
    const values = await promptForm({
      title: t(locale, 'panel.lms.addLesson'),
      fields: [
        { name: 'title', label: t(locale, 'panel.lms.fieldTitle'), type: 'text', required: true },
        {
          name: 'contentUrl',
          label: t(locale, 'panel.lms.fieldUrl'),
          type: 'text',
          required: true,
          placeholder: 'https://…',
        },
      ],
    });
    if (!values) return;
    try {
      const res = await fetch(`/api/admin/lms/courses/${encodeURIComponent(selectedId)}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          title: values.title,
          contentUrl: values.contentUrl,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'lesson');
      toast(t(locale, 'panel.lms.lessonCreated'), 'ok');
      await loadDetail(selectedId);
      await loadCourses();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.lms.saveError'), 'error');
    }
  };

  const editLesson = async (lesson) => {
    const values = await promptForm({
      title: lmsText(locale, 'lessonEdit', 'Editar aula'),
      fields: [
        {
          name: 'title',
          label: t(locale, 'panel.lms.fieldTitle'),
          type: 'text',
          required: true,
          defaultValue: lesson.title,
        },
        {
          name: 'contentUrl',
          label: t(locale, 'panel.lms.fieldUrl'),
          type: 'text',
          required: true,
          defaultValue: lesson.contentUrl,
        },
      ],
    });
    if (!values) return;
    setLessonBusy(true);
    try {
      const res = await fetch(`/api/admin/lms/lessons/${encodeURIComponent(lesson.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          title: values.title,
          contentUrl: values.contentUrl,
          contentKind: lesson.contentKind,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'lesson update');
      toast(lmsText(locale, 'lessonUpdated', 'Aula atualizada.'), 'ok');
      await loadDetail(selectedId);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.lms.saveError'), 'error');
    } finally {
      setLessonBusy(false);
    }
  };

  const reorderLesson = async (lessonIndex, direction) => {
    const nextIndex = lessonIndex + direction;
    const lessons = [...(detail?.lessons || [])];
    if (!selectedId || nextIndex < 0 || nextIndex >= lessons.length) return;
    [lessons[lessonIndex], lessons[nextIndex]] = [lessons[nextIndex], lessons[lessonIndex]];
    setLessonBusy(true);
    try {
      const res = await fetch(
        `/api/admin/lms/courses/${encodeURIComponent(selectedId)}/lessons/reorder`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            lessonIds: lessons.map((lesson) => Number(lesson.id)),
          }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'lesson reorder');
      setDetail((current) => (current ? { ...current, lessons } : current));
    } catch (e) {
      toast(e?.message || t(locale, 'panel.lms.saveError'), 'error');
    } finally {
      setLessonBusy(false);
    }
  };

  const uploadPdf = async (file) => {
    if (!selectedId || !file) return;
    if (!companyId) {
      toast(t(locale, 'errors.COMPANY_REQUIRED'), 'error');
      return;
    }
    const name = String(file.name || '');
    if (!/\.pdf$/i.test(name) && file.type && !String(file.type).includes('pdf')) {
      toast(t(locale, 'errors.INVALID_LMS_FILE_TYPE'), 'error');
      return;
    }
    if (Number(file.size) > 5 * 1024 * 1024) {
      toast(t(locale, 'errors.INVALID_LMS_FILE_SIZE'), 'error');
      return;
    }
    const values = await promptForm({
      title: lmsText(locale, 'uploadPdf', 'Enviar PDF'),
      fields: [
        {
          key: 'title',
          label: t(locale, 'panel.lms.fieldTitle'),
          type: 'text',
          required: true,
          defaultValue: name.replace(/\.pdf$/i, ''),
        },
      ],
    });
    if (!values) return;
    setLessonBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('title', values.title);
      form.append('companyId', String(companyId));
      const res = await fetch(
        `/api/admin/lms/courses/${encodeURIComponent(selectedId)}/lessons/upload`,
        { method: 'POST', body: form }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = json?.errorCode;
        const localized = code ? t(locale, `errors.${code}`) : '';
        const msg =
          (localized && localized !== `errors.${code}` && localized) ||
          json?.error ||
          lmsText(locale, 'storageNotConfigured', 'Armazenamento não configurado');
        throw new Error(msg);
      }
      toast(t(locale, 'panel.lms.lessonCreated'), 'ok');
      await loadDetail(selectedId);
      await loadCourses();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.lms.saveError'), 'error');
    } finally {
      setLessonBusy(false);
    }
  };

  const deactivateLesson = async (lesson) => {
    const ok = await confirm({
      title: t(locale, 'panel.lms.deactivateLesson'),
      message: lesson.title,
    });
    if (!ok) return;
    setLessonBusy(true);
    try {
      const res = await fetch(`/api/admin/lms/lessons/${encodeURIComponent(lesson.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, active: false }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'deactivate');
      }
      toast(t(locale, 'panel.lms.lessonDeactivated'), 'ok');
      await loadDetail(selectedId);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.lms.saveError'), 'error');
    } finally {
      setLessonBusy(false);
    }
  };

  const enroll = async (target) => {
    if (!selectedId) return;
    setEnrollBusy(true);
    try {
      const res = await fetch(
        `/api/admin/lms/courses/${encodeURIComponent(selectedId)}/enrollments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            ...target,
            cohortName: cohortName.trim() || null,
            dueDate: dueDate || null,
            mandatory,
            notify: true,
          }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'enroll');
      toast(
        t(locale, 'panel.lms.enrolled', {
          n: json.enrolled ?? 0,
          skipped: json.skipped ?? 0,
        }),
        'ok'
      );
      setEnrollPick('');
      await loadDetail(selectedId);
      await loadCourses();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.lms.saveError'), 'error');
    } finally {
      setEnrollBusy(false);
    }
  };

  const enrollSelected = async () => {
    const candidateId = Number(enrollPick);
    if (!Number.isFinite(candidateId) || candidateId <= 0) return;
    await enroll({ candidateIds: [candidateId] });
  };

  const enrollAllEmployees = async () => {
    const ok = await confirm({
      title: lmsText(locale, 'batchAllEmployees', 'Matricular todos os colaboradores'),
      message: detail?.course?.title || '',
    });
    if (ok) await enroll({ allEmployees: true });
  };

  const enrollTeamGroup = async () => {
    setEnrollBusy(true);
    try {
      const res = await fetch(`/api/admin/team-groups?${companyQs(companyId)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'groups');
      const groups = Array.isArray(json.items) ? json.items : [];
      const values = await promptForm({
        title: lmsText(locale, 'batchTeamGroup', 'Matricular grupo'),
        fields: [
          {
            name: 'teamGroupId',
            label: lmsText(locale, 'batchTeamGroup', 'Grupo'),
            type: 'select',
            required: true,
            options: groups.map((group) => ({
              value: String(group.id),
              label: group.name,
            })),
          },
        ],
      });
      if (!values) return;
      const teamGroupId = Number(values.teamGroupId);
      if (Number.isFinite(teamGroupId) && teamGroupId > 0) await enroll({ teamGroupId });
    } catch (e) {
      toast(e?.message || t(locale, 'panel.lms.loadError'), 'error');
    } finally {
      setEnrollBusy(false);
    }
  };

  const editEnrollment = async (row) => {
    const values = await promptForm({
      title: lmsText(locale, 'enrollmentDue', 'Prazo da matrícula'),
      fields: [
        {
          name: 'dueDate',
          label: lmsText(locale, 'fieldDueDate', 'Data limite'),
          type: 'date',
          defaultValue: row.dueDate || '',
        },
        {
          name: 'mandatory',
          label: lmsText(locale, 'fieldMandatory', 'Obrigatório'),
          type: 'boolean',
          defaultValue: row.mandatory,
        },
      ],
    });
    if (!values) return;
    setEnrollBusy(true);
    try {
      const res = await fetch(`/api/admin/lms/enrollments/${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          dueDate: values.dueDate || null,
          mandatory: values.mandatory === true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'enrollment update');
      await loadDetail(selectedId);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.lms.saveError'), 'error');
    } finally {
      setEnrollBusy(false);
    }
  };

  const resetEnrollment = async (row) => {
    const ok = await confirm({
      title: lmsText(locale, 'resetProgress', 'Zerar progresso'),
      message: row.fullName,
    });
    if (!ok) return;
    setEnrollBusy(true);
    try {
      const res = await fetch(`/api/admin/lms/enrollments/${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, resetProgress: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'reset progress');
      await loadDetail(selectedId);
      await loadCourses();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.lms.saveError'), 'error');
    } finally {
      setEnrollBusy(false);
    }
  };

  const removeEnrollment = async (row) => {
    const ok = await confirm({
      title: t(locale, 'panel.lms.removeEnrollment'),
      message: row.fullName,
    });
    if (!ok) return;
    setEnrollBusy(true);
    try {
      const res = await fetch(
        `/api/admin/lms/enrollments/${encodeURIComponent(row.id)}?${companyQs(companyId)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'remove');
      }
      toast(t(locale, 'panel.lms.enrollmentRemoved'), 'ok');
      await loadDetail(selectedId);
      await loadCourses();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.lms.saveError'), 'error');
    } finally {
      setEnrollBusy(false);
    }
  };

  const sortedCourses = useMemo(() => {
    const dirMul = sortDir === 'asc' ? 1 : -1;
    const q = String(courseQ || '').trim().toLowerCase();
    const rows = courses.filter((c) => {
      if (activeFilter === 'active' && !c.active) return false;
      if (activeFilter === 'inactive' && c.active) return false;
      if (!q) return true;
      return String(c.title || '').toLowerCase().includes(q);
    });
    rows.sort((a, b) => {
      if (sort === 'lessonCount' || sort === 'enrollmentCount') {
        return (Number(a[sort] || 0) - Number(b[sort] || 0)) * dirMul;
      }
      if (sort === 'active') {
        return (Number(Boolean(a.active)) - Number(Boolean(b.active))) * dirMul;
      }
      return (
        String(a.title || '').localeCompare(String(b.title || ''), locale === 'en' ? 'en' : 'pt-BR') *
        dirMul
      );
    });
    return rows;
  }, [courses, courseQ, activeFilter, sort, sortDir, locale]);

  const total = sortedCourses.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedCourses.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (columnKey) => {
    const nextDir = clientSortNextDir(columnKey, sort, sortDir);
    setSort(columnKey);
    setSortDir(nextDir);
    setPage(1);
  };

  const enrollTotal = enrollments.length;
  const enrollTotalPages = Math.max(1, Math.ceil(enrollTotal / Math.max(1, enrollPageSize)));
  const safeEnrollPage = Math.min(enrollPage, enrollTotalPages);
  const enrollPageRows = enrollments.slice(
    (safeEnrollPage - 1) * enrollPageSize,
    safeEnrollPage * enrollPageSize
  );
  const showEnrollPager = enrollTotal > ENROLL_PAGE_THRESHOLD;

  if (!companyId) {
    return <p className={S.muted}>{t(locale, 'panel.lms.needCompany')}</p>;
  }

  if (loading) return <AppLoading variant="panel" />;

  /* ── Detail mode ─────────────────────────────────────────────── */
  if (selectedId) {
    const course = detail?.course;
    return (
      <ContentEnter animKey={String(selectedId)} className={S.stack}>
        <div>
          <button type="button" className={cn(S.btnGhost, 'min-h-touch')} onClick={backToList}>
            {t(locale, 'panel.lms.backToList')}
          </button>
        </div>

        {detailLoading && !course ? (
          <AppLoading variant="panel" />
        ) : !course ? (
          <EmptyState
            title={t(locale, 'panel.lms.loadError')}
            actionLabel={t(locale, 'panel.lms.backToList')}
            onAction={backToList}
          />
        ) : (
          <>
            <AdminPageHeader
              title={course.title}
              subtitle={t(locale, 'panel.lms.detailSubtitle')}
              actions={
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <AdminEditButton
                    onClick={() => editCourse(course)}
                    label={t(locale, 'panel.lms.editCourse')}
                  />
                  {course.active !== false ? (
                    <AdminDeleteButton
                      onClick={() => setCourseActive(course, false)}
                      label={t(locale, 'panel.lms.deactivateCourse')}
                    />
                  ) : (
                    <AdminIconButton
                      icon="refresh"
                      tint="success"
                      label={t(locale, 'panel.lms.reactivateCourse')}
                      onClick={() => setCourseActive(course, true)}
                    />
                  )}
                </div>
              }
            />

            <div className="flex flex-wrap items-center gap-2">
              {course.active !== false ? (
                <StatusToneChip tone="success" bordered={false}>
                  {t(locale, 'panel.lms.statusActive')}
                </StatusToneChip>
              ) : (
                <StatusToneChip tone="neutral" bordered={false}>
                  {t(locale, 'panel.lms.statusInactive')}
                </StatusToneChip>
              )}
              <span className={cn(S.muted, 'text-xs')}>
                {t(locale, 'panel.lms.completionRule', { pct: course.completionPct })}
              </span>
            </div>

            {course.description ? (
              <RichTextView
                html={course.description}
                className="m-0 max-w-3xl text-sm leading-relaxed text-ink-muted"
              />
            ) : null}

            {ops ? (
              <p
                className={cn(
                  'm-0 font-mono text-xs',
                  ops.overdue > 0 ? 'text-danger' : 'text-ink-muted'
                )}
              >
                {t(locale, 'panel.lms.opsSummary', {
                  completed: ops.completed,
                  enrolled: ops.enrolled,
                  overdue: ops.overdue,
                })}
              </p>
            ) : null}

            {detailLoading ? <AppLoading variant="inline" /> : null}

            <CollapsibleBlock
              locale={locale}
              variant="card"
              title={t(locale, 'panel.lms.lessonsTitle')}
              count={(detail.lessons || []).length}
              defaultOpen
            >
              <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  className={cn(S.btnBrandSoft, 'min-h-touch')}
                  disabled={lessonBusy}
                  onClick={() => pdfInputRef.current?.click()}
                >
                  {lmsText(locale, 'uploadPdf', 'Enviar PDF')}
                </button>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void uploadPdf(file);
                  }}
                />
                <AdminCreateButton
                  onClick={addLesson}
                  disabled={lessonBusy}
                  label={t(locale, 'panel.lms.addLesson')}
                />
              </div>
              {(detail.lessons || []).length === 0 ? (
                <EmptyState
                  title={t(locale, 'panel.lms.noLessons')}
                  message={t(locale, 'panel.lms.noLessonsHint')}
                  actionLabel={t(locale, 'panel.lms.addLesson')}
                  onAction={addLesson}
                  className="py-5"
                />
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {detail.lessons.map((l, index) => (
                    <li
                      key={l.id}
                      className="grid grid-cols-1 items-start gap-3 rounded-control border border-ink/10 bg-surface px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
                          <span className="font-mono text-2xs text-ink-faint">{index + 1}.</span>
                          <span className="font-medium">{l.title}</span>
                          {!l.active ? (
                            <StatusToneChip tone="neutral" bordered={false}>
                              {t(locale, 'panel.lms.inactive')}
                            </StatusToneChip>
                          ) : null}
                        </div>
                        <div className="mt-1.5">
                          <CopyableLink
                            url={l.contentUrl}
                            locale={locale}
                            compact
                            iconOnly
                            label={String(l.contentKind || 'url')}
                          />
                        </div>
                      </div>
                      <AdminActionsCell className="sm:pt-0.5">
                        <AdminIconButton
                          icon="chevronDown"
                          label={lmsText(locale, 'lessonReorderUp', 'Mover aula para cima')}
                          disabled={lessonBusy || index === 0}
                          onClick={() => reorderLesson(index, -1)}
                          className="rotate-180"
                        />
                        <AdminIconButton
                          icon="chevronDown"
                          label={lmsText(locale, 'lessonReorderDown', 'Mover aula para baixo')}
                          disabled={lessonBusy || index === detail.lessons.length - 1}
                          onClick={() => reorderLesson(index, 1)}
                        />
                        <AdminEditButton
                          onClick={() => editLesson(l)}
                          disabled={lessonBusy}
                          label={lmsText(locale, 'lessonEdit', 'Editar aula')}
                        />
                        {l.active ? (
                          <AdminDeleteButton
                            onClick={() => deactivateLesson(l)}
                            disabled={lessonBusy}
                            label={t(locale, 'panel.lms.deactivateLesson')}
                          />
                        ) : null}
                      </AdminActionsCell>
                    </li>
                  ))}
                </ul>
              )}
            </CollapsibleBlock>

            <CollapsibleBlock
              locale={locale}
              variant="card"
              title={lmsText(locale, 'enrollBatchOpts', 'Opções da turma')}
              defaultOpen={false}
            >
              <div className="grid items-start gap-3 sm:grid-cols-2">
                <FormField label={lmsText(locale, 'batchCohortName', 'Nome da turma (opcional)')}>
                  <input
                    type="text"
                    value={cohortName}
                    onChange={(event) => setCohortName(event.target.value)}
                    className={cn(S.input, 'w-full')}
                  />
                </FormField>
                <FormField as="div" label={lmsText(locale, 'fieldDueDate', 'Data limite')}>
                  <DateField
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    aria-label={lmsText(locale, 'fieldDueDate', 'Data limite')}
                  />
                </FormField>
              </div>
              <label className="mt-3 flex min-h-touch cursor-pointer items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={mandatory}
                  onChange={(event) => setMandatory(event.target.checked)}
                  className={S.checkbox}
                />
                {lmsText(locale, 'fieldMandatory', 'Obrigatório')}
              </label>
            </CollapsibleBlock>

            <CollapsibleBlock
              locale={locale}
              variant="card"
              title={t(locale, 'panel.lms.enrollmentsTitle')}
              count={enrollments.length}
              defaultOpen
            >
              <div className={cn(S.fieldRow, 'items-end')}>
                <div className="min-w-[220px] flex-1">
                  <FormField label={t(locale, 'panel.lms.enrollSearchPh')}>
                    <EntitySearchSelect
                      value={enrollPick}
                      onChange={setEnrollPick}
                      searchUrl={`/api/admin/employees/search?${companyQs(companyId)}`}
                      locale={locale}
                      placeholder={t(locale, 'panel.lms.enrollSearchPh')}
                      aria-label={t(locale, 'panel.lms.enrollSearchPh')}
                    />
                  </FormField>
                </div>
                <button
                  type="button"
                  className={cn(S.btnPrimary, 'min-h-touch shrink-0')}
                  disabled={enrollBusy || !enrollPick}
                  onClick={enrollSelected}
                >
                  {t(locale, 'panel.lms.enrollBtn')}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cn(S.btnBrandSoft, 'min-h-touch')}
                  disabled={enrollBusy}
                  onClick={enrollAllEmployees}
                >
                  {lmsText(locale, 'batchAllEmployees', 'Matricular todos os colaboradores')}
                </button>
                <button
                  type="button"
                  className={cn(S.btnGhost, 'min-h-touch')}
                  disabled={enrollBusy}
                  onClick={enrollTeamGroup}
                >
                  {lmsText(locale, 'batchTeamGroup', 'Matricular grupo')}
                </button>
              </div>
              {enrollments.length === 0 ? (
                <EmptyState
                  title={t(locale, 'panel.lms.noEnrollments')}
                  message={t(locale, 'panel.lms.noEnrollmentsHint')}
                  className="mt-3 py-5"
                />
              ) : (
                <>
                  <AdminTableShell
                    minWidth="560px"
                    className="mt-3"
                    animKey={`${selectedId}|${safeEnrollPage}|${enrollPageSize}`}
                  >
                    <thead>
                      <tr className="border-b border-ink/10 bg-canvas-alt">
                        <AdminTh>{t(locale, 'panel.lms.colPerson')}</AdminTh>
                        <AdminTh>{t(locale, 'panel.lms.colProgress')}</AdminTh>
                        <AdminActionsTh>{t(locale, 'panel.admin.colActions')}</AdminActionsTh>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollPageRows.map((row) => (
                        <tr key={row.id} className="border-b border-ink/8">
                          <td className="px-4 py-3">
                            <div className="text-sm text-ink">{row.fullName}</div>
                            <div className="font-mono text-2xs text-ink-faint">{row.email}</div>
                            {row.cohortName ? (
                              <div className="mt-1 text-xs text-ink-muted">
                                {lmsText(locale, 'cohortLabel', 'Turma')}: {row.cohortName}
                              </div>
                            ) : null}
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                              {row.dueDate ? (
                                <span>
                                  {lmsText(locale, 'enrollmentDue', 'Prazo')}: {row.dueDate}
                                </span>
                              ) : null}
                              {row.mandatory ? (
                                <StatusToneChip tone="warning" bordered={false}>
                                  {lmsText(locale, 'fieldMandatory', 'Obrigatório')}
                                </StatusToneChip>
                              ) : null}
                              {row.overdue ? (
                                <StatusToneChip tone="danger" bordered={false}>
                                  {lmsText(locale, 'enrollmentOverdue', 'Em atraso')}
                                </StatusToneChip>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                            {row.progressPct}%
                            {row.isComplete ? (
                              <span className="ml-2 text-success">
                                {t(locale, 'panel.lms.completed')}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <AdminActionsCell>
                              <AdminIconButton
                                label={lmsText(locale, 'resetProgress', 'Zerar progresso')}
                                icon="refresh"
                                tint="warning"
                                disabled={enrollBusy}
                                onClick={() => resetEnrollment(row)}
                              />
                              <AdminEditButton
                                onClick={() => editEnrollment(row)}
                                disabled={enrollBusy}
                                label={lmsText(locale, 'enrollmentDue', 'Editar prazo')}
                              />
                              <AdminDeleteButton
                                onClick={() => removeEnrollment(row)}
                                disabled={enrollBusy}
                                label={t(locale, 'panel.lms.removeEnrollment')}
                              />
                            </AdminActionsCell>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </AdminTableShell>
                  {showEnrollPager ? (
                    <AdminListPager
                      locale={locale}
                      page={safeEnrollPage}
                      pageSize={enrollPageSize}
                      total={enrollTotal}
                      pageSizeOptions={PAGE_SIZE_OPTIONS}
                      onPageChange={setEnrollPage}
                      onPageSizeChange={(ps) => {
                        setEnrollPageSize(ps);
                        setEnrollPage(1);
                      }}
                    />
                  ) : null}
                </>
              )}
            </CollapsibleBlock>
          </>
        )}
      </ContentEnter>
    );
  }

  /* ── List mode ───────────────────────────────────────────────── */
  return (
    <div className={S.stack}>
      <AdminPageHeader
        title={t(locale, 'panel.lms.title')}
        subtitle={t(locale, 'panel.lms.subtitle')}
        actions={<AdminCreateButton onClick={createCourse} label={t(locale, 'panel.lms.createCourse')} />}
      />

      {courses.length === 0 ? (
        <EmptyState
          title={t(locale, 'panel.lms.empty')}
          message={t(locale, 'panel.lms.emptyHint')}
          actionLabel={t(locale, 'panel.lms.createCourse')}
          onAction={createCourse}
        />
      ) : (
        <>
          <AdminListFilters
            aria-label={t(locale, 'panel.lms.title')}
            locale={locale}
            onClear={() => {
              setCourseQ('');
              setActiveFilter('');
              setPage(1);
            }}
            clearEnabled={Boolean(String(courseQ || '').trim() || activeFilter)}
          >
            <AdminListSearch
              locale={locale}
              value={courseQ}
              onChange={(v) => {
                setCourseQ(v);
                setPage(1);
              }}
              placeholder={t(locale, 'panel.lms.searchCoursePh')}
            />
            <AdminListFilterSelect
              label={t(locale, 'panel.admin.filterActive')}
              value={activeFilter}
              onChange={(v) => {
                setActiveFilter(v);
                setPage(1);
              }}
            >
              <option value="">{t(locale, 'panel.admin.filterAll')}</option>
              <option value="active">{t(locale, 'panel.admin.filterActiveYes')}</option>
              <option value="inactive">{t(locale, 'panel.admin.filterActiveNo')}</option>
            </AdminListFilterSelect>
          </AdminListFilters>

          <AdminListResults animKey={`${courseQ}|${activeFilter}|${sort}|${sortDir}|${safePage}|${pageSize}`}>
            {total === 0 ? (
              <EmptyState title={t(locale, 'panel.lms.listEmptyFilter')} />
            ) : (
              <>
                <AdminTableShell minWidth="640px">
                  <thead className="border-b border-ink/10 bg-canvas-alt">
                    <tr>
                      <SortableTh columnKey="title" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                        {t(locale, 'panel.lms.colCourse')}
                      </SortableTh>
                      <SortableTh
                        columnKey="lessonCount"
                        sortKey={sort}
                        dir={sortDir}
                        onSort={toggleSort}
                      >
                        {t(locale, 'panel.lms.colLessons')}
                      </SortableTh>
                      <SortableTh
                        columnKey="enrollmentCount"
                        sortKey={sort}
                        dir={sortDir}
                        onSort={toggleSort}
                      >
                        {t(locale, 'panel.lms.colEnrolled')}
                      </SortableTh>
                      <SortableTh columnKey="active" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                        {t(locale, 'panel.lms.colStatus')}
                      </SortableTh>
                      <AdminActionsTh>{t(locale, 'panel.admin.colActions')}</AdminActionsTh>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {pageRows.map((c) => (
                      <tr key={c.id} className="hover:bg-canvas-alt/50">
                        <td className="px-4 py-3 text-sm text-ink">{c.title}</td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-muted">{c.lessonCount}</td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                          {c.completedCount}/{c.enrollmentCount}
                        </td>
                        <td className="px-4 py-3">
                          {c.active ? (
                            <StatusToneChip tone="success" bordered={false}>
                              {t(locale, 'panel.admin.filterActiveYes')}
                            </StatusToneChip>
                          ) : (
                            <StatusToneChip tone="neutral" bordered={false}>
                              {t(locale, 'panel.lms.inactive')}
                            </StatusToneChip>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <AdminActionsCell>
                            <AdminViewButton
                              onClick={() => openCourse(c.id)}
                              label={t(locale, 'panel.lms.open')}
                            />
                            <AdminEditButton
                              onClick={() => editCourse(c)}
                              label={t(locale, 'panel.lms.editCourse')}
                            />
                            {c.active ? (
                              <AdminDeleteButton
                                onClick={() => setCourseActive(c, false)}
                                label={t(locale, 'panel.lms.deactivateCourse')}
                              />
                            ) : (
                              <AdminIconButton
                                icon="refresh"
                                tint="success"
                                label={t(locale, 'panel.lms.reactivateCourse')}
                                onClick={() => setCourseActive(c, true)}
                              />
                            )}
                          </AdminActionsCell>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </AdminTableShell>
                <AdminListPager
                  locale={locale}
                  page={safePage}
                  pageSize={pageSize}
                  total={total}
                  loading={loading}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageChange={setPage}
                  onPageSizeChange={(ps) => {
                    setPageSize(ps);
                    setPage(1);
                  }}
                />
              </>
            )}
          </AdminListResults>
        </>
      )}
    </div>
  );
}
