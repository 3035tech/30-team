import { asDb } from './ae/as-db.js';
import { query } from './db.js';
import { EMPLOYEE_NOTIF } from './employee-notification-catalog.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN_PATTERN = /^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/;
const DELIVERY_TIMEOUT_MS = 4000;
export const MOBILE_PUSH_PLATFORM = Object.freeze({ ANDROID: 'android', IOS: 'ios' });
export const MOBILE_PUSH_DESTINATION = Object.freeze({ COMMUNITY: 'community', DP: 'dp', FEEDBACK: 'feedback', LMS: 'lms', OKRS: 'okrs', PDI: 'pdi', TODAY: 'today' });

export function mobilePushDestinationFor(type) {
  if (type === EMPLOYEE_NOTIF.LMS_ENROLLED || type === EMPLOYEE_NOTIF.LMS_OVERDUE) return MOBILE_PUSH_DESTINATION.LMS;
  if (type === EMPLOYEE_NOTIF.PDI_UPDATED) return MOBILE_PUSH_DESTINATION.PDI;
  if (type === EMPLOYEE_NOTIF.DP_LEAVE_UPDATE || type === EMPLOYEE_NOTIF.DP_DOC_REMINDER || type === EMPLOYEE_NOTIF.DP_SIGNATURE_REQUESTED) return MOBILE_PUSH_DESTINATION.DP;
  if (type === EMPLOYEE_NOTIF.KUDOS_RECEIVED) return MOBILE_PUSH_DESTINATION.COMMUNITY;
  if (type === EMPLOYEE_NOTIF.FEEDBACK_REQUESTED) return MOBILE_PUSH_DESTINATION.FEEDBACK;
  if (type === EMPLOYEE_NOTIF.OKR_ACTIVITY_ASSIGNED) return MOBILE_PUSH_DESTINATION.OKRS;
  return MOBILE_PUSH_DESTINATION.TODAY;
}

export function validExpoPushToken(value) { return EXPO_TOKEN_PATTERN.test(String(value || '').trim()); }

export async function registerMobileEmployeePushToken(dbOrQuery, { candidateId, companyId, platform, pushToken }) {
  const db = asDb(dbOrQuery || query);
  const token = String(pushToken || '').trim();
  if (!validExpoPushToken(token) || !Object.values(MOBILE_PUSH_PLATFORM).includes(platform)) return { ok: false };
  await db.query(
    `INSERT INTO mobile_employee_push_tokens (candidate_id, company_id, expo_push_token, platform)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (expo_push_token) DO UPDATE SET candidate_id = EXCLUDED.candidate_id,
       company_id = EXCLUDED.company_id, platform = EXCLUDED.platform, active = TRUE,
       updated_at = NOW(), last_error = NULL`,
    [candidateId, companyId, token, platform]
  );
  return { ok: true };
}

export async function unregisterMobileEmployeePushToken(dbOrQuery, { candidateId, companyId, pushToken }) {
  const db = asDb(dbOrQuery || query);
  await db.query(
    `UPDATE mobile_employee_push_tokens SET active = FALSE, updated_at = NOW()
     WHERE candidate_id = $1 AND company_id = $2 AND expo_push_token = $3`,
    [candidateId, companyId, String(pushToken || '').trim()]
  );
  return { ok: true };
}

export async function sendMobileEmployeePush(dbOrQuery, { candidateId, companyId, destination, notificationId }) {
  const db = asDb(dbOrQuery || query);
  let tokens;
  try {
    const result = await db.query(
      `SELECT expo_push_token AS token FROM mobile_employee_push_tokens
       WHERE candidate_id = $1 AND company_id = $2 AND active = TRUE LIMIT 10`,
      [candidateId, companyId]
    );
    tokens = result.rows.map((row) => row.token);
  } catch (error) {
    if (error?.code === '42P01') return { sent: 0 };
    throw error;
  }
  if (!tokens.length) return { sent: 0 };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
  const reference = /^[1-9]\d{0,17}$/.test(String(notificationId ?? '')) ? String(notificationId) : null;
  const data = { destination, url: `team30://workspace?destination=${encodeURIComponent(destination)}`, ...(reference ? { notificationId: reference } : {}) };
  try {
    const response = await fetch(EXPO_PUSH_URL, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(tokens.map((to) => ({ to, title: '30 Grow', body: 'Você tem uma atualização no app.', sound: 'default', data }))), signal: controller.signal });
    if (!response.ok) throw new Error(`expo_push_${response.status}`);
    return { sent: tokens.length };
  } finally { clearTimeout(timeout); }
}
