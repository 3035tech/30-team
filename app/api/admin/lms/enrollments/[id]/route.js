import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../../lib/admin-api.js';
import { CAP } from '../../../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../../../lib/api-error.js';
import { removeLmsEnrollment } from '../../../../../../lib/lms.js';
import { audit } from '../../../../../../lib/audit.js';

/** DELETE /api/admin/lms/enrollments/[id] */
export const DELETE = withAdminApi(
  {
    cap: CAP.LEARNING_VIEW,
    companyFrom: 'query',
    logLabel: 'lms enrollment DELETE',
  },
  async ({ request, payload, companyId, params }) => {
    const enrollmentId = parseInt(String(params?.id || ''), 10);
    if (!Number.isFinite(enrollmentId)) {
      return apiErrorFromResult(request, { ok: false, errorCode: ERR.NOT_FOUND });
    }
    const result = await removeLmsEnrollment(null, { companyId, enrollmentId });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.NOT_FOUND });
    }
    await audit({
      actorUserId: payload.userId || null,
      action: 'lms.enroll.remove',
      targetType: 'lms_enrollment',
      targetId: String(enrollmentId),
    });
    return NextResponse.json({ ok: true });
  }
);
