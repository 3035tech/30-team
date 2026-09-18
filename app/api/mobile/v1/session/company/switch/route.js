import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, ERR } from '../../../../../../../lib/api-error.js';
import { auditFromRequest, AUDIT_ACTOR_KIND } from '../../../../../../../lib/audit.js';
import {
  bearerTokenFromRequest,
  switchMobileCompany,
} from '../../../../../../../lib/mobile-manager-session.js';
import { parseJsonBody } from '../../../../../../../lib/validate.js';

const switchSchema = z.object({
  membershipId: z.number().int().positive(),
  refreshToken: z.string().min(32).max(256),
});

export async function POST(request) {
  try {
    const parsed = await parseJsonBody(request, switchSchema);
    if (!parsed.ok) return parsed.response;
    const result = await switchMobileCompany(
      bearerTokenFromRequest(request),
      parsed.data.refreshToken,
      parsed.data.membershipId
    );
    if (!result.ok) {
      return apiError(request, ERR.UNAUTHORIZED, 401, {}, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    await auditFromRequest(request, {
      actorUserId: result.session.identity.id,
      actorKind: AUDIT_ACTOR_KIND.MANAGER,
      companyId: result.session.activeMembership.company.id,
      action: 'auth.mobile.company_switch',
      targetType: 'user_company_membership',
      targetId: result.session.activeMembership.id,
      metadata: { previousMembershipId: result.previousMembershipId },
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[mobile-company-switch]', error);
    return apiError(request, ERR.INTERNAL, 500, {}, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
