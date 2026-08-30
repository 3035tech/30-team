/**
 * PATCH /api/admin/whistleblowing/reports/[id] — triage / respond
 */

import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../../lib/admin-api.js';
import { CAP } from '../../../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../../../lib/api-error.js';
import { audit, auditRequestContext } from '../../../../../../lib/audit.js';
import { WHISTLEBLOWING_REPORT_STATUSES } from '../../../../../../lib/domain-status.js';
import { z, zPositiveInt } from '../../../../../../lib/validate.js';
import { updateWhistleblowingReport } from '../../../../../../lib/people/whistleblowing.js';

const bodySchema = z.object({
  companyId: zPositiveInt.optional(),
  status: z.enum(/** @type {[string, ...string[]]} */ (WHISTLEBLOWING_REPORT_STATUSES)).optional(),
  triageNotes: z.string().max(2000).optional(),
  responseNotes: z.string().max(4000).optional(),
});

export const PATCH = withAdminApi(
  {
    cap: CAP.WHISTLEBLOWING_VIEW,
    body: bodySchema,
    companyFrom: 'body',
    logLabel: 'whistleblowing report PATCH',
  },
  async ({ request, companyId, body, payload, params }) => {
    const reportId = Number(params?.id);
    if (!Number.isFinite(reportId) || reportId <= 0) {
      return apiErrorFromResult(request, { ok: false, errorCode: ERR.NOT_FOUND });
    }
    const result = await updateWhistleblowingReport(null, {
      companyId,
      reportId,
      status: body.status,
      triageNotes: body.triageNotes,
      responseNotes: body.responseNotes,
      respondedByUserId: payload.userId || null,
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.NOT_FOUND });
    }
    await audit({
      actorUserId: payload.userId || null,
      action: 'whistleblowing.report_update',
      companyId,
      targetType: 'whistleblowing_report',
      targetId: reportId,
      metadata: { status: body.status || null },
      ...auditRequestContext(request),
    });
    return NextResponse.json({ report: result.report });
  }
);
