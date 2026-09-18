import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, ERR } from '../../../../../../../lib/api-error.js';
import { auditFromRequest, AUDIT_ACTOR_KIND } from '../../../../../../../lib/audit.js';
import {
  MOBILE_SESSION_FAILURE,
  selectMobileCompany,
} from '../../../../../../../lib/mobile-manager-session.js';
import { parseJsonBody } from '../../../../../../../lib/validate.js';

const selectSchema = z.object({
  membershipId: z.number().int().positive(),
  selectionToken: z.string().min(1).max(4096),
});

export async function POST(request) {
  try {
    const parsed = await parseJsonBody(request, selectSchema);
    if (!parsed.ok) return parsed.response;
    const result = await selectMobileCompany(
      parsed.data.selectionToken,
      parsed.data.membershipId
    );
    if (!result.ok) {
      const code = result.reason === MOBILE_SESSION_FAILURE.INVALID_TOKEN ? ERR.INVALID_TOKEN : ERR.UNAUTHORIZED;
      return apiError(request, code, 401, {}, { headers: { 'Cache-Control': 'no-store' } });
    }
    await auditFromRequest(request, {
      actorUserId: result.session.identity.id,
      actorKind: AUDIT_ACTOR_KIND.MANAGER,
      companyId: result.session.activeMembership.company.id,
      action: 'auth.mobile.company_select',
      targetType: 'user_company_membership',
      targetId: result.session.activeMembership.id,
      metadata: {},
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[mobile-company-select]', error);
    return apiError(request, ERR.INTERNAL, 500, {}, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
