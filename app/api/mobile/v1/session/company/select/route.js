import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, ERR } from '../../../../../../../lib/api-error.js';
import { completeEmployeeCompanyPick } from '../../../../../../../lib/employee-auth.js';
import {
  completeMobileEmployeeAuthentication,
  contextsFromSelectionToken,
  MOBILE_EMPLOYEE_AUTH_OUTCOME,
  signMobileEmployeeSecondFactor,
} from '../../../../../../../lib/mobile-employee-session.js';
import { query } from '../../../../../../../lib/db.js';
import { parseJsonBody } from '../../../../../../../lib/validate.js';

const selectSchema = z.object({
  candidateId: z.number().int().positive(),
  selectionToken: z.string().min(1).max(4096),
});
const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });

export async function POST(request) {
  try {
    const parsed = await parseJsonBody(request, selectSchema);
    if (!parsed.ok) return parsed.response;
    const contexts = contextsFromSelectionToken(parsed.data.selectionToken);
    if (!contexts) return apiError(request, ERR.INVALID_TOKEN, 401, {}, { headers: NO_STORE });
    const selected = await completeEmployeeCompanyPick(query, {
      pickToken: parsed.data.selectionToken,
      candidateId: parsed.data.candidateId,
    });
    if (!selected.ok) return apiError(request, ERR.UNAUTHORIZED, 401, {}, { headers: NO_STORE });
    if (selected.requires2fa) {
      return NextResponse.json({
        outcome: MOBILE_EMPLOYEE_AUTH_OUTCOME.REQUIRES_SECOND_FACTOR,
        challengeToken: signMobileEmployeeSecondFactor(selected, contexts),
      }, { headers: NO_STORE });
    }
    const completed = await completeMobileEmployeeAuthentication(selected, contexts);
    if (!completed.ok) return apiError(request, ERR.UNAUTHORIZED, 401, {}, { headers: NO_STORE });
    return NextResponse.json(completed, { headers: NO_STORE });
  } catch (error) {
    console.error('[mobile-employee-company-select]', error);
    return apiError(request, ERR.INTERNAL, 500, {}, { headers: NO_STORE });
  }
}
