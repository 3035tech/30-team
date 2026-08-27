/**
 * Basic LMS — courses, ordered URL lessons, enrollments, progress.
 * Collaborator surface: employee portal /e (token). Academy catalog stays separate.
 */

import { asDb } from './ae/as-db.js';
import { ERR } from './api-error-codes.js';
import { EMPLOYMENT_STATUS } from './domain-status.js';
import { query } from './db.js';

export const LMS_LIST_CAP = 80;
export const LMS_LESSON_CAP = 60;
export const LMS_ENROLL_BATCH_CAP = 40;
export const LMS_CONTENT_KINDS = Object.freeze(['link', 'youtube', 'vimeo', 'pdf']);

function dbApi(dbOrQuery) {
  return asDb(dbOrQuery || query);
}

/** Infer content_kind from URL when caller omits it. */
export function inferLmsContentKind(url) {
  const s = String(url || '').trim().toLowerCase();
  if (!s) return 'link';
  if (/\.pdf(\?|#|$)/i.test(s) || s.includes('application/pdf')) return 'pdf';
  if (s.includes('youtube.com') || s.includes('youtu.be')) return 'youtube';
  if (s.includes('vimeo.com')) return 'vimeo';
  return 'link';
}

function normalizeUrl(raw) {
  const s = String(raw || '').trim().slice(0, 2000);
  if (!s) return null;
  try {
    const u = new URL(s.includes('://') ? s : `https://${s}`);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

function progressPct(done, total) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

function isComplete(pct, requiredPct) {
  return pct >= Math.min(100, Math.max(1, Number(requiredPct) || 100));
}

export async function listLmsCourses(dbOrQuery, opts = {}) {
  const db = dbApi(dbOrQuery);
  const companyId = Number(opts.companyId);
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  }
  const includeInactive = opts.includeInactive === true;
  const limit = Math.min(LMS_LIST_CAP, Math.max(1, Number(opts.limit) || 40));
  const q = String(opts.q || '').trim().slice(0, 80);

  const params = [companyId];
  const where = ['c.company_id = $1'];
  if (!includeInactive) where.push('c.active = TRUE');
  if (q) {
    params.push(`%${q}%`);
    where.push(`c.title ILIKE $${params.length}`);
  }
  params.push(limit);

  const r = await db.query(
    `SELECT c.id, c.title, c.description, c.active, c.completion_pct AS "completionPct",
            c.created_at AS "createdAt", c.updated_at AS "updatedAt",
            (SELECT COUNT(*)::int FROM lms_lessons l
              WHERE l.course_id = c.id AND l.active = TRUE) AS "lessonCount",
            (SELECT COUNT(*)::int FROM lms_enrollments e
              WHERE e.course_id = c.id) AS "enrollmentCount",
            (SELECT COUNT(*)::int FROM lms_enrollments e
              WHERE e.course_id = c.id AND e.completed_at IS NOT NULL) AS "completedCount"
     FROM lms_courses c
     WHERE ${where.join(' AND ')}
     ORDER BY LOWER(c.title) ASC, c.id ASC
     LIMIT $${params.length}`,
    params
  );
  return { ok: true, courses: r.rows };
}

export async function getLmsCourse(dbOrQuery, { companyId, courseId, includeInactiveLessons = false }) {
  const db = dbApi(dbOrQuery);
  const cid = Number(companyId);
  const id = Number(courseId);
  if (!Number.isFinite(cid) || cid <= 0) return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  if (!Number.isFinite(id) || id <= 0) return { ok: false, errorCode: ERR.NOT_FOUND };

  const courseR = await db.query(
    `SELECT id, title, description, active, completion_pct AS "completionPct",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM lms_courses
     WHERE id = $1 AND company_id = $2
     LIMIT 1`,
    [id, cid]
  );
  if (courseR.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  const course = courseR.rows[0];

  const lessonParams = [id, cid];
  let lessonWhere = 'course_id = $1 AND company_id = $2';
  if (!includeInactiveLessons) lessonWhere += ' AND active = TRUE';

  const lessonsR = await db.query(
    `SELECT id, title, content_url AS "contentUrl", content_kind AS "contentKind",
            sort_order AS "sortOrder", active,
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM lms_lessons
     WHERE ${lessonWhere}
     ORDER BY sort_order ASC, id ASC
     LIMIT ${LMS_LESSON_CAP}`,
    lessonParams
  );

  return { ok: true, course, lessons: lessonsR.rows };
}

export async function createLmsCourse(dbOrQuery, opts) {
  const db = dbApi(dbOrQuery);
  const companyId = Number(opts.companyId);
  const title = String(opts.title || '').trim().slice(0, 300);
  const description = String(opts.description || '').trim().slice(0, 8000);
  const completionPct = Math.min(100, Math.max(1, Number(opts.completionPct) || 100));
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  }
  if (!title) return { ok: false, errorCode: ERR.NAME_REQUIRED };

  const r = await db.query(
    `INSERT INTO lms_courses (company_id, title, description, completion_pct, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, description, active, completion_pct AS "completionPct",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [companyId, title, description, completionPct, opts.createdByUserId || null]
  );
  return { ok: true, course: r.rows[0] };
}

export async function updateLmsCourse(dbOrQuery, opts) {
  const db = dbApi(dbOrQuery);
  const companyId = Number(opts.companyId);
  const courseId = Number(opts.courseId);
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  }
  if (!Number.isFinite(courseId) || courseId <= 0) return { ok: false, errorCode: ERR.NOT_FOUND };

  const sets = [];
  const params = [];
  let n = 1;
  if (opts.title !== undefined) {
    const title = String(opts.title || '').trim().slice(0, 300);
    if (!title) return { ok: false, errorCode: ERR.NAME_REQUIRED };
    sets.push(`title = $${n++}`);
    params.push(title);
  }
  if (opts.description !== undefined) {
    sets.push(`description = $${n++}`);
    params.push(String(opts.description || '').trim().slice(0, 8000));
  }
  if (opts.active !== undefined) {
    sets.push(`active = $${n++}`);
    params.push(Boolean(opts.active));
  }
  if (opts.completionPct !== undefined) {
    sets.push(`completion_pct = $${n++}`);
    params.push(Math.min(100, Math.max(1, Number(opts.completionPct) || 100)));
  }
  if (sets.length === 0) return { ok: false, errorCode: ERR.NO_FIELDS_TO_UPDATE };

  sets.push('updated_at = NOW()');
  params.push(courseId, companyId);
  const r = await db.query(
    `UPDATE lms_courses SET ${sets.join(', ')}
     WHERE id = $${n++} AND company_id = $${n}
     RETURNING id, title, description, active, completion_pct AS "completionPct",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    params
  );
  if (r.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  return { ok: true, course: r.rows[0] };
}

export async function createLmsLesson(dbOrQuery, opts) {
  const db = dbApi(dbOrQuery);
  const companyId = Number(opts.companyId);
  const courseId = Number(opts.courseId);
  const title = String(opts.title || '').trim().slice(0, 300);
  const contentUrl = normalizeUrl(opts.contentUrl);
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  }
  if (!Number.isFinite(courseId) || courseId <= 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  if (!title) return { ok: false, errorCode: ERR.NAME_REQUIRED };
  if (!contentUrl) return { ok: false, errorCode: ERR.INVALID_DATA };

  const course = await db.query(
    `SELECT id FROM lms_courses WHERE id = $1 AND company_id = $2 LIMIT 1`,
    [courseId, companyId]
  );
  if (course.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };

  const cnt = await db.query(
    `SELECT COUNT(*)::int AS n FROM lms_lessons WHERE course_id = $1 AND company_id = $2`,
    [courseId, companyId]
  );
  if ((cnt.rows[0]?.n || 0) >= LMS_LESSON_CAP) {
    return { ok: false, errorCode: ERR.INVALID_DATA };
  }

  let kind = String(opts.contentKind || '').trim().toLowerCase();
  if (!LMS_CONTENT_KINDS.includes(kind)) kind = inferLmsContentKind(contentUrl);

  let sortOrder = Number(opts.sortOrder);
  if (!Number.isFinite(sortOrder)) {
    const maxR = await db.query(
      `SELECT COALESCE(MAX(sort_order), -1)::int AS m FROM lms_lessons WHERE course_id = $1`,
      [courseId]
    );
    sortOrder = (maxR.rows[0]?.m ?? -1) + 1;
  }
  sortOrder = Math.min(10000, Math.max(0, sortOrder));

  const r = await db.query(
    `INSERT INTO lms_lessons (company_id, course_id, title, content_url, content_kind, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, title, content_url AS "contentUrl", content_kind AS "contentKind",
               sort_order AS "sortOrder", active, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [companyId, courseId, title, contentUrl, kind, sortOrder]
  );
  await db.query(`UPDATE lms_courses SET updated_at = NOW() WHERE id = $1 AND company_id = $2`, [
    courseId,
    companyId,
  ]);
  return { ok: true, lesson: r.rows[0] };
}

export async function updateLmsLesson(dbOrQuery, opts) {
  const db = dbApi(dbOrQuery);
  const companyId = Number(opts.companyId);
  const lessonId = Number(opts.lessonId);
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  }
  if (!Number.isFinite(lessonId) || lessonId <= 0) return { ok: false, errorCode: ERR.NOT_FOUND };

  const sets = [];
  const params = [];
  let n = 1;
  if (opts.title !== undefined) {
    const title = String(opts.title || '').trim().slice(0, 300);
    if (!title) return { ok: false, errorCode: ERR.NAME_REQUIRED };
    sets.push(`title = $${n++}`);
    params.push(title);
  }
  if (opts.contentUrl !== undefined) {
    const contentUrl = normalizeUrl(opts.contentUrl);
    if (!contentUrl) return { ok: false, errorCode: ERR.INVALID_DATA };
    sets.push(`content_url = $${n++}`);
    params.push(contentUrl);
    if (opts.contentKind === undefined) {
      sets.push(`content_kind = $${n++}`);
      params.push(inferLmsContentKind(contentUrl));
    }
  }
  if (opts.contentKind !== undefined) {
    let kind = String(opts.contentKind || '').trim().toLowerCase();
    if (!LMS_CONTENT_KINDS.includes(kind)) kind = 'link';
    sets.push(`content_kind = $${n++}`);
    params.push(kind);
  }
  if (opts.sortOrder !== undefined) {
    sets.push(`sort_order = $${n++}`);
    params.push(Math.min(10000, Math.max(0, Number(opts.sortOrder) || 0)));
  }
  if (opts.active !== undefined) {
    sets.push(`active = $${n++}`);
    params.push(Boolean(opts.active));
  }
  if (sets.length === 0) return { ok: false, errorCode: ERR.NO_FIELDS_TO_UPDATE };

  sets.push('updated_at = NOW()');
  params.push(lessonId, companyId);
  const r = await db.query(
    `UPDATE lms_lessons SET ${sets.join(', ')}
     WHERE id = $${n++} AND company_id = $${n}
     RETURNING id, course_id AS "courseId", title, content_url AS "contentUrl",
               content_kind AS "contentKind", sort_order AS "sortOrder", active,
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    params
  );
  if (r.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  return { ok: true, lesson: r.rows[0] };
}

export async function listLmsEnrollments(dbOrQuery, { companyId, courseId, limit = 80 }) {
  const db = dbApi(dbOrQuery);
  const cid = Number(companyId);
  const course = Number(courseId);
  if (!Number.isFinite(cid) || cid <= 0) return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  if (!Number.isFinite(course) || course <= 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  const cap = Math.min(200, Math.max(1, Number(limit) || 80));

  const courseR = await db.query(
    `SELECT id, completion_pct AS "completionPct"
     FROM lms_courses WHERE id = $1 AND company_id = $2 LIMIT 1`,
    [course, cid]
  );
  if (courseR.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  const requiredPct = courseR.rows[0].completionPct;

  const lessonCnt = await db.query(
    `SELECT COUNT(*)::int AS n FROM lms_lessons
     WHERE course_id = $1 AND company_id = $2 AND active = TRUE`,
    [course, cid]
  );
  const totalLessons = lessonCnt.rows[0]?.n || 0;

  const r = await db.query(
    `SELECT e.id, e.candidate_id AS "candidateId", e.enrolled_at AS "enrolledAt",
            e.completed_at AS "completedAt",
            c.full_name AS "fullName", c.email,
            (SELECT COUNT(*)::int FROM lms_lesson_completions lc
              JOIN lms_lessons l ON l.id = lc.lesson_id AND l.active = TRUE
             WHERE lc.enrollment_id = e.id) AS "completedLessons"
     FROM lms_enrollments e
     JOIN candidates c ON c.id = e.candidate_id
     WHERE e.company_id = $1 AND e.course_id = $2
     ORDER BY LOWER(c.full_name) ASC, e.id ASC
     LIMIT $3`,
    [cid, course, cap]
  );

  const enrollments = (r.rows || []).map((row) => {
    const pct = progressPct(row.completedLessons, totalLessons);
    return {
      id: row.id,
      candidateId: row.candidateId,
      fullName: row.fullName,
      email: row.email,
      enrolledAt: row.enrolledAt,
      completedAt: row.completedAt,
      completedLessons: row.completedLessons,
      totalLessons,
      progressPct: pct,
      isComplete: Boolean(row.completedAt) || isComplete(pct, requiredPct),
    };
  });

  return { ok: true, enrollments, totalLessons, completionPct: requiredPct };
}

export async function enrollLmsCandidates(dbOrQuery, opts) {
  const db = dbApi(dbOrQuery);
  const companyId = Number(opts.companyId);
  const courseId = Number(opts.courseId);
  const ids = Array.isArray(opts.candidateIds)
    ? [...new Set(opts.candidateIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))]
    : [];
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  }
  if (!Number.isFinite(courseId) || courseId <= 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  if (ids.length === 0) return { ok: false, errorCode: ERR.INVALID_DATA };
  if (ids.length > LMS_ENROLL_BATCH_CAP) return { ok: false, errorCode: ERR.INVALID_DATA };

  const course = await db.query(
    `SELECT id FROM lms_courses WHERE id = $1 AND company_id = $2 AND active = TRUE LIMIT 1`,
    [courseId, companyId]
  );
  if (course.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };

  const valid = await db.query(
    `SELECT id FROM candidates
     WHERE company_id = $1
       AND id = ANY($2::bigint[])
       AND employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'`,
    [companyId, ids]
  );
  const validIds = (valid.rows || []).map((r) => Number(r.id));
  if (validIds.length === 0) return { ok: false, errorCode: ERR.NOT_FOUND };

  const inserted = await db.query(
    `INSERT INTO lms_enrollments (company_id, course_id, candidate_id, enrolled_by_user_id)
     SELECT $1, $2, x.id, $3
     FROM unnest($4::bigint[]) AS x(id)
     ON CONFLICT (course_id, candidate_id) DO NOTHING
     RETURNING id, candidate_id AS "candidateId"`,
    [companyId, courseId, opts.enrolledByUserId || null, validIds]
  );

  return {
    ok: true,
    enrolled: inserted.rowCount,
    skipped: validIds.length - inserted.rowCount,
    candidateIds: validIds,
  };
}

export async function removeLmsEnrollment(dbOrQuery, { companyId, enrollmentId }) {
  const db = dbApi(dbOrQuery);
  const cid = Number(companyId);
  const eid = Number(enrollmentId);
  if (!Number.isFinite(cid) || cid <= 0) return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  if (!Number.isFinite(eid) || eid <= 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  const r = await db.query(
    `DELETE FROM lms_enrollments WHERE id = $1 AND company_id = $2 RETURNING id`,
    [eid, cid]
  );
  if (r.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  return { ok: true };
}

async function refreshEnrollmentCompletion(db, { companyId, enrollmentId }) {
  const enr = await db.query(
    `SELECT e.id, e.course_id AS "courseId", c.completion_pct AS "completionPct"
     FROM lms_enrollments e
     JOIN lms_courses c ON c.id = e.course_id
     WHERE e.id = $1 AND e.company_id = $2
     LIMIT 1`,
    [enrollmentId, companyId]
  );
  if (enr.rowCount === 0) return null;
  const { courseId, completionPct } = enr.rows[0];

  const stats = await db.query(
    `SELECT
       (SELECT COUNT(*)::int FROM lms_lessons
         WHERE course_id = $1 AND company_id = $2 AND active = TRUE) AS total,
       (SELECT COUNT(*)::int FROM lms_lesson_completions lc
         JOIN lms_lessons l ON l.id = lc.lesson_id AND l.active = TRUE AND l.course_id = $1
        WHERE lc.enrollment_id = $3) AS done`,
    [courseId, companyId, enrollmentId]
  );
  const total = stats.rows[0]?.total || 0;
  const done = stats.rows[0]?.done || 0;
  const pct = progressPct(done, total);
  const complete = total > 0 && isComplete(pct, completionPct);

  if (complete) {
    await db.query(
      `UPDATE lms_enrollments SET completed_at = COALESCE(completed_at, NOW())
       WHERE id = $1 AND company_id = $2`,
      [enrollmentId, companyId]
    );
  } else {
    await db.query(
      `UPDATE lms_enrollments SET completed_at = NULL
       WHERE id = $1 AND company_id = $2 AND completed_at IS NOT NULL`,
      [enrollmentId, companyId]
    );
  }
  return { progressPct: pct, completedLessons: done, totalLessons: total, isComplete: complete };
}

export async function completeLmsLesson(dbOrQuery, opts) {
  const db = dbApi(dbOrQuery);
  const companyId = Number(opts.companyId);
  const candidateId = Number(opts.candidateId);
  const lessonId = Number(opts.lessonId);
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return { ok: false, errorCode: ERR.COMPANY_REQUIRED };
  }
  if (!Number.isFinite(candidateId) || candidateId <= 0) {
    return { ok: false, errorCode: ERR.NOT_FOUND };
  }
  if (!Number.isFinite(lessonId) || lessonId <= 0) {
    return { ok: false, errorCode: ERR.NOT_FOUND };
  }

  const lesson = await db.query(
    `SELECT l.id, l.course_id AS "courseId"
     FROM lms_lessons l
     JOIN lms_courses c ON c.id = l.course_id AND c.company_id = l.company_id
     WHERE l.id = $1 AND l.company_id = $2 AND l.active = TRUE AND c.active = TRUE
     LIMIT 1`,
    [lessonId, companyId]
  );
  if (lesson.rowCount === 0) return { ok: false, errorCode: ERR.NOT_FOUND };
  const courseId = lesson.rows[0].courseId;

  const enr = await db.query(
    `SELECT id FROM lms_enrollments
     WHERE company_id = $1 AND course_id = $2 AND candidate_id = $3
     LIMIT 1`,
    [companyId, courseId, candidateId]
  );
  if (enr.rowCount === 0) return { ok: false, errorCode: ERR.UNAUTHORIZED };
  const enrollmentId = enr.rows[0].id;

  await db.query(
    `INSERT INTO lms_lesson_completions (company_id, enrollment_id, lesson_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (enrollment_id, lesson_id) DO NOTHING`,
    [companyId, enrollmentId, lessonId]
  );

  const progress = await refreshEnrollmentCompletion(db, { companyId, enrollmentId });
  return {
    ok: true,
    enrollmentId,
    lessonId,
    ...progress,
  };
}

/**
 * Employee portal payload: enrolled courses + lessons + completion flags.
 */
export async function listCandidateLmsCourses(dbOrQuery, { companyId, candidateId }) {
  const db = dbApi(dbOrQuery);
  const cid = Number(companyId);
  const cand = Number(candidateId);
  if (!Number.isFinite(cid) || !Number.isFinite(cand)) return [];

  const enr = await db.query(
    `SELECT e.id AS "enrollmentId", e.course_id AS "courseId", e.enrolled_at AS "enrolledAt",
            e.completed_at AS "completedAt",
            c.title, c.description, c.completion_pct AS "completionPct"
     FROM lms_enrollments e
     JOIN lms_courses c ON c.id = e.course_id AND c.company_id = e.company_id
     WHERE e.company_id = $1 AND e.candidate_id = $2 AND c.active = TRUE
     ORDER BY e.enrolled_at DESC, e.id DESC
     LIMIT 30`,
    [cid, cand]
  );
  if (enr.rowCount === 0) return [];

  const courseIds = enr.rows.map((r) => Number(r.courseId));
  const enrollmentIds = enr.rows.map((r) => Number(r.enrollmentId));

  const lessonsR = await db.query(
    `SELECT id, course_id AS "courseId", title, content_url AS "contentUrl",
            content_kind AS "contentKind", sort_order AS "sortOrder"
     FROM lms_lessons
     WHERE company_id = $1 AND course_id = ANY($2::bigint[]) AND active = TRUE
     ORDER BY sort_order ASC, id ASC`,
    [cid, courseIds]
  );

  const doneR = await db.query(
    `SELECT enrollment_id AS "enrollmentId", lesson_id AS "lessonId"
     FROM lms_lesson_completions
     WHERE company_id = $1 AND enrollment_id = ANY($2::bigint[])`,
    [cid, enrollmentIds]
  );
  const doneSet = new Set(
    (doneR.rows || []).map((r) => `${r.enrollmentId}:${r.lessonId}`)
  );

  const lessonsByCourse = new Map();
  for (const l of lessonsR.rows || []) {
    const list = lessonsByCourse.get(Number(l.courseId)) || [];
    list.push(l);
    lessonsByCourse.set(Number(l.courseId), list);
  }

  return enr.rows.map((row) => {
    const lessons = (lessonsByCourse.get(Number(row.courseId)) || []).map((l) => ({
      id: l.id,
      title: l.title,
      contentUrl: l.contentUrl,
      contentKind: l.contentKind,
      sortOrder: l.sortOrder,
      completed: doneSet.has(`${row.enrollmentId}:${l.id}`),
    }));
    const done = lessons.filter((l) => l.completed).length;
    const total = lessons.length;
    const pct = progressPct(done, total);
    return {
      enrollmentId: row.enrollmentId,
      courseId: row.courseId,
      title: row.title,
      description: row.description,
      enrolledAt: row.enrolledAt,
      completedAt: row.completedAt,
      progressPct: pct,
      isComplete: Boolean(row.completedAt) || isComplete(pct, row.completionPct),
      lessons,
    };
  });
}
