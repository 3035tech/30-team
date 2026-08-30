import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../lib/admin-api.js';
import { apiError, apiErrorFromResult, ERR } from '../../../../../lib/api-error.js';
import { query } from '../../../../../lib/db.js';
import { CAP, isSuperAdminPayload, requireCapability } from '../../../../../lib/permissions.js';
import { updateProductFeedback } from '../../../../../lib/product-feedback.js';
import { PRODUCT_FEEDBACK_STATUSES } from '../../../../../lib/domain-status.js';
import { z, zPositiveInt } from '../../../../../lib/validate.js';

const patchBodySchema = z
  .object({
    status: z.enum(/** @type {[string, ...string[]]} */ (PRODUCT_FEEDBACK_STATUSES)).optional(),
    adminNotes: z.string().max(4000).optional(),
  })
  .refine((b) => b.status != null || b.adminNotes != null, {
    message: 'status_or_notes',
  });

/**
 * PATCH /api/admin/product-feedback/[id] — super-admin only.
 */
export const PATCH = withAdminApi(
  {
    cap: CAP.USERS_MANAGE,
    requireCompany: false,
    companyFrom: 'none',
    body: patchBodySchema,
    logLabel: 'product-feedback-patch',
  },
  async ({ request, payload, body, params }) => {
    if (!isSuperAdminPayload(payload) || !requireCapability(payload, CAP.USERS_MANAGE)) {
      return apiError(request, ERR.UNAUTHORIZED, 401);
    }
    const idParsed = zPositiveInt.safeParse(params?.id);
    if (!idParsed.success) {
      return apiError(request, ERR.INVALID_ID, 400);
    }
    const result = await updateProductFeedback({ query }, {
      id: idParsed.data,
      status: body.status,
      adminNotes: body.adminNotes,
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.NOT_FOUND });
    }
    return NextResponse.json({ ok: true, item: result.item });
  }
);
