/**
 * Resolve employee session from request cookies (Node API routes).
 */

import { cookies } from 'next/headers';
import { EMPLOYEE_COOKIE_NAME } from './employee-auth-constants.js';
import { verifyEmployeeToken, isEmployeeSessionPayload } from './employee-auth.js';

export async function getEmployeeSessionPayload() {
  const jar = cookies();
  const token = jar.get(EMPLOYEE_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyEmployeeToken(token);
  return isEmployeeSessionPayload(payload) ? payload : null;
}
