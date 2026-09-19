import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, ERR } from '../../../../../../lib/api-error.js';
import { loginEmployeeWithPassword } from '../../../../../../lib/employee-auth.js';
import {
  completeMobileEmployeeAuthentication,
  MOBILE_EMPLOYEE_AUTH_OUTCOME,
  mobileEmployeeSelectionResponse,
  signMobileEmployeeSecondFactor,
} from '../../../../../../lib/mobile-employee-session.js';
import { query } from '../../../../../../lib/db.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../../../lib/rate-limit.js';
import { parseJsonBody } from '../../../../../../lib/validate.js';

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(1024),
});

const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });

async function invalidCredentials(request) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return apiError(request, ERR.INVALID_CREDENTIALS, 401, {}, { headers: NO_STORE });
}

export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request);
    const rate = await checkRateLimit(`mobile-employee-login:${ip}`, 20, 15 * 60 * 1000);
    if (!rate.ok) {
      return apiError(request, ERR.RATE_LIMIT, 429, {}, {
        headers: { ...NO_STORE, 'Retry-After': String(rate.retryAfterSec) },
      });
    }
    const parsed = await parseJsonBody(request, loginSchema);
    if (!parsed.ok) return parsed.response;
    const result = await loginEmployeeWithPassword(query, parsed.data);
    if (!result.ok) return invalidCredentials(request);
    if (result.needsCompanyPick) {
      return NextResponse.json(
        mobileEmployeeSelectionResponse(parsed.data.email, result.pickToken, result.companies),
        { headers: NO_STORE }
      );
    }
    const contexts = [{ candidateId: result.candidateId, companyId: result.companyId }];
    if (result.requires2fa) {
      return NextResponse.json({
        outcome: MOBILE_EMPLOYEE_AUTH_OUTCOME.REQUIRES_SECOND_FACTOR,
        challengeToken: signMobileEmployeeSecondFactor(result, contexts),
      }, { headers: NO_STORE });
    }
    const completed = await completeMobileEmployeeAuthentication(result, contexts);
    if (!completed.ok) return apiError(request, ERR.UNAUTHORIZED, 401, {}, { headers: NO_STORE });
    return NextResponse.json(completed, { headers: NO_STORE });
  } catch (error) {
    console.error('[mobile-employee-login]', error);
    return apiError(request, ERR.INTERNAL, 500, {}, { headers: NO_STORE });
  }
}
