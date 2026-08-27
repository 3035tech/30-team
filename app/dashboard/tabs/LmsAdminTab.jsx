'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';
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

/**
 * Basic LMS admin — courses, lessons (URL), enrollments + progress.
 */
export function LmsAdminTab({ locale = 'pt-BR', companyId }) {
  const { confirm, promptForm, toast } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [enrollPick, setEnrollPick] = useState('');
  const [enrollBusy, setEnrollBusy] = useState(false);

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
      } catch (e) {
        toast(e?.message || t(locale, 'panel.lms.loadError'), 'error');
        setDetail(null);
        setEnrollments([]);
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
    if (selectedId) void loadDetail(selectedId);
    else {
      setDetail(null);
      setEnrollments([]);
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

  const deactivateLesson = async (lesson) => {
    const ok = await confirm({
      title: t(locale, 'panel.lms.deactivateLesson'),
      message: lesson.title,
    });
    if (!ok) return;
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
    }
  };

  const enrollSelected = async () => {
    const candidateId = Number(enrollPick);
    if (!selectedId || !Number.isFinite(candidateId) || candidateId <= 0) return;
    setEnrollBusy(true);
    try {
      const res = await fetch(
        `/api/admin/lms/courses/${encodeURIComponent(selectedId)}/enrollments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId, candidateIds: [candidateId] }),
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

  const removeEnrollment = async (row) => {
    const ok = await confirm({
      title: t(locale, 'panel.lms.removeEnrollment'),
      message: row.fullName,
    });
    if (!ok) return;
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

                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className={S.label}>{t(locale, 'panel.lms.lessonsTitle')}</span>
                    <AdminCreateButton onClick={addLesson} label={t(locale, 'panel.lms.addLesson')} />
                  </div>
                  {(detail.lessons || []).length === 0 ? (
                    <p className={cn(S.faint, 'm-0 text-xs italic')}>{t(locale, 'panel.lms.noLessons')}</p>
                  ) : (
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                      {detail.lessons.map((l) => (
                        <li
                          key={l.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-ink/10 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm text-ink">
                              {l.sortOrder + 1}. {l.title}
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
                          {l.active ? (
                            <AdminDeleteButton
                              onClick={() => deactivateLesson(l)}
                              label={t(locale, 'panel.lms.deactivateLesson')}
                            />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <span className={S.label}>{t(locale, 'panel.lms.enrollmentsTitle')}</span>
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
                              <AdminDeleteButton
                                onClick={() => removeEnrollment(row)}
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
