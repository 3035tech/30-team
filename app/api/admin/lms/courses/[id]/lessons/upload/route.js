import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../../../../lib/admin-api.js';
import { CAP } from '../../../../../../../../lib/ae/require-admin.js';
import {
  apiError,
  apiErrorFromResult,
  ERR,
  httpStatusForError,
} from '../../../../../../../../lib/api-error.js';
import { createLmsLesson } from '../../../../../../../../lib/lms.js';
import {
  isLmsStorageConfigured,
  uploadLmsLessonPdf,
} from '../../../../../../../../lib/lms-asset.js';
import { audit } from '../../../../../../../../lib/audit.js';
import { checkRateLimit } from '../../../../../../../../lib/rate-limit.js';

export const runtime = 'nodejs';

/**
 * POST /api/admin/lms/courses/[id]/lessons/upload
 * multipart: file (PDF) + title + companyId
 */
export const POST = withAdminApi(
  {
    cap: CAP.LEARNING_VIEW,
    companyFrom: 'none',
    requireCompany: false,
    logLabel: 'lms lesson pdf upload',
  },
  async ({ request, payload, params }) => {
    const courseId = parseInt(String(params?.id || ''), 10);
    if (!Number.isFinite(courseId)) {
      return apiError(request, ERR.NOT_FOUND, httpStatusForError(ERR.NOT_FOUND));
    }

    if (!isLmsStorageConfigured()) {
      return apiError(request, ERR.STORAGE_NOT_CONFIGURED, httpStatusForError(ERR.STORAGE_NOT_CONFIGURED));
    }

    const rl = await checkRateLimit(`lms-pdf:${payload.userId || 'anon'}`, 20, 60_000);
    if (!rl.ok) {
      return apiError(request, ERR.RATE_LIMITED, httpStatusForError(ERR.RATE_LIMITED));
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return apiError(request, ERR.VALIDATION, httpStatusForError(ERR.VALIDATION));
    }

    const file = form.get('file');
    const title = String(form.get('title') || '').trim();
    const companyIdRaw = form.get('companyId');
    const companyId =
      payload.role === 'admin' && companyIdRaw
        ? parseInt(String(companyIdRaw), 10)
        : payload.companyId;

    if (!Number.isFinite(companyId) || companyId <= 0) {
      return apiError(request, ERR.UNAUTHORIZED, httpStatusForError(ERR.UNAUTHORIZED));
    }
    if (!title) {
      return apiError(request, ERR.VALIDATION, httpStatusForError(ERR.VALIDATION));
    }
    if (!file || typeof file.arrayBuffer !== 'function') {
      return apiError(request, ERR.VALIDATION, httpStatusForError(ERR.VALIDATION));
    }

    const buf = Buffer.from(await file.arrayBuffer());
    let uploaded;
    try {
      uploaded = await uploadLmsLessonPdf(companyId, courseId, {
        buffer: buf,
        mimeType: file.type || 'application/pdf',
        size: buf.length,
      });
    } catch (e) {
      const code = e?.code || e?.message;
      if (code === 'STORAGE_NOT_CONFIGURED') {
        return apiError(request, ERR.STORAGE_NOT_CONFIGURED, httpStatusForError(ERR.STORAGE_NOT_CONFIGURED));
      }
      if (code === 'INVALID_LMS_FILE_TYPE' || code === 'INVALID_LMS_FILE_SIZE') {
        return apiError(request, ERR.VALIDATION, httpStatusForError(ERR.VALIDATION));
      }
      console.error('lms pdf upload', e);
      return apiError(request, ERR.CREATE_FAILED, httpStatusForError(ERR.CREATE_FAILED));
    }

    const result = await createLmsLesson(null, {
      companyId,
      courseId,
      title,
      contentUrl: uploaded.contentUrl,
      contentKind: 'pdf',
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.CREATE_FAILED });
    }
    await audit({
      actorUserId: payload.userId || null,
      action: 'lms.lesson.upload_pdf',
      targetType: 'lms_lesson',
      targetId: String(result.lesson.id),
      metadata: { courseId, key: uploaded.contentKey },
    });
    return NextResponse.json({
      ok: true,
      lesson: result.lesson,
      url: uploaded.contentUrl,
    });
  }
);
