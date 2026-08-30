/**
 * POST /api/admin/candidates/[id]/compensation/[eventId]/approval
 * Approve / reject / set proposed status on a compensation event (variable pay).
 */

import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../../../../lib/admin-api.js';
import { CAP } from '../../../../../../../../lib/ae/require-admin.js';
import { apiError, apiErrorFromResult, ERR, httpStatusForError } from '../../../../../../../../lib/api-error.js';
import { audit } from '../../../../../../../../lib/audit.js';
import { COMPENSATION_APPROVAL_STATUSES } from '../../../../../../../../lib/domain-status.js';
import { z, zPositiveInt } from '../../../../../../../../lib/validate.js';
import { setCompensationApprovalStatus } from '../../../../../../../../lib/people/variable-pay.js';

const bodySchema = z.object({
  companyId: zPositiveInt.optional(),
  approvalStatus: z.enum(/** @type {[string, ...string[]]} */ (COMPENSATION_APPROVAL_STATUSES)),
});

function parsePositive(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** POST set approval_status on compensation event */
export const POST = withAdminApi(
  {
    cap: CAP.TEAM_VIEW,
    body: bodySchema,
    companyFrom: 'body',
    logLabel: 'compensation approval POST',
  },
  async ({ request, companyId, body, payload, params }) => {
    const candidateId = parsePositive(params?.id);
    const eventId = parsePositive(params?.eventId);
    if (!candidateId || !eventId) {
      return apiError(request, ERR.INVALID_ID, httpStatusForError(ERR.INVALID_ID));
    }
    const result = await setCompensationApprovalStatus(null, {
      companyId,
      candidateId,
      eventId,
      approvalStatus: body.approvalStatus,
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.NOT_FOUND });
    }
    await audit({
      actorUserId: payload.userId || null,
      action: 'compensation.approval',
      companyId,
      targetType: 'compensation_event',
      targetId: eventId,
      metadata: {
        candidateId,
        approvalStatus: result.event.approvalStatus,
        eventType: result.event.eventType,
        amount: result.event.amount,
      },
    });
    return NextResponse.json(result);
  }
);
