'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';
import { DateField } from '../../_components/DateField';
import { EntitySearchSelect } from '../../_components/EntitySearchSelect';
import {
  AdminActionsCell,
  AdminActionsTh,
  AdminCreateButton,
  AdminDeleteButton,
  AdminEditButton,
  AdminViewButton,
  S,
} from '../dashboard-shared';

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
 */
export function LmsAdminTab({ locale = 'pt-BR', companyId, courseId }) {
  const { confirm, promptForm, toast } = useAppFeedback();
  const pdfInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
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
    async (courseId) => {
      if (!companyId || !courseId) return;
      setDetailLoading(true);
      try {
        const [cRes, eRes] = await Promise.all([
          fetch(
            `/api/admin/lms/courses/${encodeURIComponent(courseId)}?${companyQs(companyId)}&includeInactiveLessons=1`
          ),
          fetch(
            `/api/admin/lms/courses/${encodeURIComponent(courseId)}/enrollments?${companyQs(companyId)}`
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
    const queryId = Number(new URLSearchParams(window.location.search).get('course'));
    if (Number.isFinite(queryId) && queryId > 0) {
      setSelectedId(queryId);
      return;
    }
    // Prefer first course so the right panel isn’t empty after open.
    if (!selectedId && courses.length > 0) {
      setSelectedId(courses[0].id);
    }
  }, [courseId, courses, selectedId]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else {
      setDetail(null);
      setEnrollments([]);
      setOps(null);
    }
  }, [selectedId, loadDetail]);

  const createCourse = async () => {
    const values = await promptForm({
      title: t(locale, 'panel.lms.createCourse'),
      fields: [
        { name: 'title', label: t(locale, 'panel.lms.fieldTitle'), type: 'text', required: true },
        { name: 'description', label: t(locale, 'panel.lms.fieldDescription'), type: 'textarea' },
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
      setSelectedId(json.course?.id);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.lms.saveError'), 'error');
    }
  };

  const editCourse = async () => {
    const c = detail?.course;
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
          type: 'textarea',
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
      await loadDetail(c.id);
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

  if (!companyId) {
    return <p className={S.muted}>{t(locale, 'panel.lms.needCompany')}</p>;
  }

  if (loading) return <AppLoading variant="panel" />;

  return (
    <div className={S.stack}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={cn(S.cardTitle, 'mb-1')}>{t(locale, 'panel.lms.title')}</h2>
          <p className="m-0 text-[13px] text-ink-muted">{t(locale, 'panel.lms.subtitle')}</p>
        </div>
        <AdminCreateButton onClick={createCourse} label={t(locale, 'panel.lms.createCourse')} />
      </div>

      {courses.length === 0 ? (
        <EmptyState
          title={t(locale, 'panel.lms.empty')}
          message={t(locale, 'panel.lms.emptyHint')}
          actionLabel={t(locale, 'panel.lms.createCourse')}
          onAction={createCourse}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className={S.cardTight}>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 font-mono text-[11px] uppercase text-ink-faint">
                  <th className="px-2 py-2">{t(locale, 'panel.lms.colCourse')}</th>
                  <th className="px-2 py-2">{t(locale, 'panel.lms.colLessons')}</th>
                  <th className="px-2 py-2">{t(locale, 'panel.lms.colEnrolled')}</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr
                    key={c.id}
                    className={cn(
                      'border-b border-ink/8',
                      selectedId === c.id && 'bg-brand-500/[0.06]'
                    )}
                  >
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        className="cursor-pointer border-none bg-transparent p-0 text-left text-sm text-ink hover:text-brand-600"
                        onClick={() => setSelectedId(c.id)}
                      >
                        {c.title}
                        {!c.active ? (
                          <span className="ml-2 font-mono text-[10px] text-ink-faint">
                            {t(locale, 'panel.lms.inactive')}
                          </span>
                        ) : null}
                      </button>
                    </td>
                    <td className="px-2 py-2 font-mono text-xs text-ink-muted">{c.lessonCount}</td>
                    <td className="px-2 py-2 font-mono text-xs text-ink-muted">
                      {c.completedCount}/{c.enrollmentCount}
                    </td>
                    <td className="px-2 py-2">
                      <AdminViewButton
                        onClick={() => setSelectedId(c.id)}
                        label={t(locale, 'panel.lms.open')}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={S.cardTight}>
            {!selectedId ? (
              <p className={cn(S.faint, 'm-0 text-sm italic')}>{t(locale, 'panel.lms.pickCourse')}</p>
            ) : detailLoading ? (
              <AppLoading variant="inline" />
            ) : !detail?.course ? (
              <p className={S.muted}>{t(locale, 'panel.lms.loadError')}</p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="m-0 text-base text-ink">{detail.course.title}</h3>
                    <p className={cn(S.muted, 'mt-1 text-xs')}>
                      {t(locale, 'panel.lms.completionRule', {
                        pct: detail.course.completionPct,
                      })}
                    </p>
                  </div>
                  <AdminEditButton onClick={editCourse} label={t(locale, 'panel.lms.editCourse')} />
                </div>
                {detail.course.description ? (
                  <p className="m-0 whitespace-pre-wrap text-sm text-ink-muted">
                    {detail.course.description}
                  </p>
                ) : null}
                {ops ? (
                  <p
                    className={cn(
                      'm-0 font-mono text-[12px]',
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

                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className={S.label}>{t(locale, 'panel.lms.lessonsTitle')}</span>
                    <div className="flex flex-wrap items-center gap-2">
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
                  </div>
                  {(detail.lessons || []).length === 0 ? (
                    <p className={cn(S.faint, 'm-0 text-xs italic')}>{t(locale, 'panel.lms.noLessons')}</p>
                  ) : (
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                      {detail.lessons.map((l, index) => (
                        <li
                          key={l.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-ink/10 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm text-ink">
                              {index + 1}. {l.title}
                              {!l.active ? (
                                <span className="ml-2 font-mono text-[10px] text-ink-faint">
                                  {t(locale, 'panel.lms.inactive')}
                                </span>
                              ) : null}
                            </div>
                            <a
                              href={l.contentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-[11px] text-brand-600 break-all"
                            >
                              {l.contentKind} · {l.contentUrl}
                            </a>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className={cn(S.btnGhost, 'min-h-touch px-2')}
                              disabled={lessonBusy || index === 0}
                              onClick={() => reorderLesson(index, -1)}
                              aria-label={lmsText(locale, 'lessonReorderUp', 'Mover aula para cima')}
                              title={lmsText(locale, 'lessonReorderUp', 'Mover aula para cima')}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className={cn(S.btnGhost, 'min-h-touch px-2')}
                              disabled={lessonBusy || index === detail.lessons.length - 1}
                              onClick={() => reorderLesson(index, 1)}
                              aria-label={lmsText(locale, 'lessonReorderDown', 'Mover aula para baixo')}
                              title={lmsText(locale, 'lessonReorderDown', 'Mover aula para baixo')}
                            >
                              ↓
                            </button>
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
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <span className={S.label}>{t(locale, 'panel.lms.enrollmentsTitle')}</span>
                  <div className="mt-2 rounded-control border border-ink/10 bg-canvas-alt p-3">
                    <div className="mb-2 font-mono text-[11px] uppercase text-ink-faint">
                      {lmsText(locale, 'enrollBatchOpts', 'Opções da turma')}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block min-w-0">
                        <span className="font-mono text-[11px] text-ink-faint">
                          {lmsText(locale, 'batchCohortName', 'Nome da turma (opcional)')}
                        </span>
                        <input
                          type="text"
                          value={cohortName}
                          onChange={(event) => setCohortName(event.target.value)}
                          className={cn(S.input, 'mt-1 w-full')}
                        />
                      </label>
                      <label className="block min-w-0">
                        <span className="font-mono text-[11px] text-ink-faint">
                          {lmsText(locale, 'fieldDueDate', 'Data limite')}
                        </span>
                        <DateField
                          value={dueDate}
                          onChange={(event) => setDueDate(event.target.value)}
                          className="mt-1"
                          aria-label={lmsText(locale, 'fieldDueDate', 'Data limite')}
                        />
                      </label>
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
                  </div>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <div className="min-w-[220px] flex-1">
                      <EntitySearchSelect
                        value={enrollPick}
                        onChange={setEnrollPick}
                        searchUrl={`/api/admin/employees/search?${companyQs(companyId)}`}
                        locale={locale}
                        placeholder={t(locale, 'panel.lms.enrollSearchPh')}
                        aria-label={t(locale, 'panel.lms.enrollSearchPh')}
                      />
                    </div>
                    <button
                      type="button"
                      className={cn(S.btnBrandSoft, 'min-h-touch')}
                      disabled={enrollBusy || !enrollPick}
                      onClick={enrollSelected}
                    >
                      {t(locale, 'panel.lms.enrollBtn')}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
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
                    <p className={cn(S.faint, 'mt-3 m-0 text-xs italic')}>
                      {t(locale, 'panel.lms.noEnrollments')}
                    </p>
                  ) : (
                    <table className="mt-3 w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-ink/10 font-mono text-[11px] uppercase text-ink-faint">
                          <th className="px-2 py-1.5">{t(locale, 'panel.lms.colPerson')}</th>
                          <th className="px-2 py-1.5">{t(locale, 'panel.lms.colProgress')}</th>
                          <AdminActionsTh locale={locale} />
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map((row) => (
                          <tr key={row.id} className="border-b border-ink/8">
                            <td className="px-2 py-2">
                              <div className="text-sm text-ink">{row.fullName}</div>
                              <div className="font-mono text-[11px] text-ink-faint">{row.email}</div>
                              {row.cohortName ? (
                                <div className="mt-1 text-xs text-ink-muted">
                                  {lmsText(locale, 'cohortLabel', 'Turma')}: {row.cohortName}
                                </div>
                              ) : null}
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                                {row.dueDate ? (
                                  <span>
                                    {lmsText(locale, 'enrollmentDue', 'Prazo')}: {row.dueDate}
                                  </span>
                                ) : null}
                                {row.mandatory ? (
                                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning">
                                    {lmsText(locale, 'fieldMandatory', 'Obrigatório')}
                                  </span>
                                ) : null}
                                {row.overdue ? (
                                  <span className="rounded-full bg-danger/10 px-2 py-0.5 text-danger">
                                    {lmsText(locale, 'enrollmentOverdue', 'Em atraso')}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-2 py-2 font-mono text-xs text-ink-muted">
                              {row.progressPct}%
                              {row.isComplete ? (
                                <span className="ml-2 text-success">
                                  {t(locale, 'panel.lms.completed')}
                                </span>
                              ) : null}
                            </td>
                            <AdminActionsCell>
                              <button
                                type="button"
                                className={cn(S.btnGhost, 'min-h-touch px-2 text-xs')}
                                disabled={enrollBusy}
                                onClick={() => resetEnrollment(row)}
                              >
                                {lmsText(locale, 'resetProgress', 'Zerar progresso')}
                              </button>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
