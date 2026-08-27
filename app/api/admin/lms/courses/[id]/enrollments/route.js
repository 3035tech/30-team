import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../../../lib/admin-api.js';
import { CAP } from '../../../../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../../../../lib/api-error.js';
import { z, zPositiveInt } from '../../../../../../../lib/validate.js';
import { enrollLmsCandidates, listLmsEnrollments } from '../../../../../../../lib/lms.js';
import { audit } from '../../../../../../../lib/audit.js';

const listQuerySchema = z.object({
  companyId: zPositiveInt.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(80),
});

const enrollBodySchema = z.object({
  companyId: zPositiveInt.optional(),
  candidateIds: z.array(zPositiveInt).min(1).max(40),
});

/** GET /api/admin/lms/courses/[id]/enrollments */
export const GET = withAdminApi(
  {
    cap: CAP.LEARNING_VIEW,
    query: listQuerySchema,
    companyFrom: 'query',
    logLabel: 'lms enrollments GET',
  },
  async ({ request, companyId, query, params }) => {
    const courseId = parseInt(String(params?.id || ''), 10);
    if (!Number.isFinite(courseId)) {
      return apiErrorFromResult(request, { ok: false, errorCode: ERR.NOT_FOUND });
    }
    const result = await listLmsEnrollments(null, {
      companyId,
      courseId,
      limit: query.limit,
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.NOT_FOUND });
    }
    return NextResponse.json({
      ok: true,
      enrollments: result.enrollments,
      totalLessons: result.totalLessons,
      completionPct: result.completionPct,
    });
  }
);

/** POST /api/admin/lms/courses/[id]/enrollments — batch enroll employees */
export const POST = withAdminApi(
  {
    cap: CAP.LEARNING_VIEW,
    body: enrollBodySchema,
    companyFrom: 'body',
    logLabel: 'lms enrollments POST',
  },
  async ({ request, payload, companyId, body, params }) => {
    const courseId = parseInt(String(params?.id || ''), 10);
    if (!Number.isFinite(courseId)) {
      return apiErrorFromResult(request, { ok: false, errorCode: ERR.NOT_FOUND });
    }
    const result = await enrollLmsCandidates(null, {
      companyId,
      courseId,
      candidateIds: body.candidateIds,
      enrolledByUserId: payload.userId,
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.CREATE_FAILED });
    }
    await audit({
      actorUserId: payload.userId || null,
      action: 'lms.enroll.batch',
      targetType: 'lms_course',
      targetId: String(courseId),
      metadata: { enrolled: result.enrolled, skipped: result.skipped },
    });
    return NextResponse.json({
      ok: true,
      enrolled: result.enrolled,
      skipped: result.skipped,
    });
  }
);
