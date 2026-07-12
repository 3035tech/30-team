import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../../lib/auth';
import { query } from '../../../../../../lib/db';
import { ensureActiveVacancyLinkToken } from '../../../../../../lib/vacancy-link';
import { sendTransactionalMail } from '../../../../../../lib/mail';
import { buildCandidateChallengeInviteMail } from '../../../../../../lib/candidate-challenge-invite-mail';
import { checkRateLimit, clientIpFromRequest } from '../../../../../../lib/rate-limit';
import { apiError, localeFromRequest } from '../../../../../../lib/api-error';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicAppUrl(request) {
  const env = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (env) return env.replace(/\/$/, '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = (request.headers.get('x-forwarded-proto') || 'https').split(',')[0]?.trim() || 'https';
  if (host) return `${proto}://${host}`.replace(/\/$/, '');
  return '';
}

export async function POST(request, { params }) {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value;
    const payload = session ? verifyToken(session) : null;
    if (!requireRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);

    const isAdmin = payload?.role === 'admin';
    const companyId = payload?.companyId ?? null;
    if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

    const vacancyId = params?.id;
    if (!vacancyId) return apiError(request, 'INVALID_VACANCY', 400);

    const ip = clientIpFromRequest(request);
    const uid = payload?.userId ?? '';
    const rlKey = `invite:${uid || ip}`;
    const rl = checkRateLimit(rlKey, 40, 60 * 60 * 1000);
    if (!rl.ok) {
      return apiError(request, 'RATE_LIMIT_INVITES', 429, {}, { headers: { 'Retry-After': String(rl.retryAfterSec) } });
    }

    const body = await request.json().catch(() => ({}));
    const candidateName = String(body.candidateName || body.name || '').trim();
    const candidateEmail = String(body.candidateEmail || body.email || '')
      .trim()
      .toLowerCase();

    if (!candidateName || candidateName.length > 200) {
      return apiError(request, 'CANDIDATE_NAME_REQUIRED', 400);
    }
    if (!candidateEmail || !EMAIL_RE.test(candidateEmail)) {
      return apiError(request, 'INVALID_CANDIDATE_EMAIL', 400);
    }

    let row;
    if (!isAdmin) {
      const owned = await query(
        `SELECT v.id, v.company_id AS "companyId", v.title, v.status, c.name AS "companyName"
         FROM vacancies v
         JOIN companies c ON c.id = v.company_id
         WHERE v.id = $1 AND v.company_id = $2 AND v.deleted = FALSE AND c.deleted = FALSE
         LIMIT 1`,
        [vacancyId, companyId]
      );
      if (owned.rowCount === 0) return apiError(request, 'UNAUTHORIZED', 401);
      row = owned.rows[0];
    } else {
      const exists = await query(
        `SELECT v.id, v.company_id AS "companyId", v.title, v.status, c.name AS "companyName"
         FROM vacancies v
         JOIN companies c ON c.id = v.company_id
         WHERE v.id = $1 AND v.deleted = FALSE AND c.deleted = FALSE
         LIMIT 1`,
        [vacancyId]
      );
      if (exists.rowCount === 0) return apiError(request, 'VACANCY_NOT_FOUND', 404);
      row = exists.rows[0];
    }

    if (String(row.status || '') === 'closed') {
      return apiError(request, 'VACANCY_CLOSED', 400);
    }

    const base = publicAppUrl(request);
    if (!base) {
      return apiError(request, 'APP_URL_MISSING', 500);
    }

    const linkToken = await ensureActiveVacancyLinkToken(row.id);
    const inviteToken = crypto.randomBytes(24).toString('hex');
    const createdBy = payload?.userId != null ? Number(payload.userId) : null;
    const createdBySql = Number.isFinite(createdBy) ? createdBy : null;

    const ins = await query(
      `INSERT INTO candidate_invites (
         vacancy_id, company_id, candidate_name, candidate_email, token, status, created_by_user_id
       ) VALUES ($1, $2, $3, $4, $5, 'sent', $6)
       RETURNING id`,
      [row.id, row.companyId, candidateName, candidateEmail, inviteToken, createdBySql]
    );
    const inviteId = ins.rows[0]?.id;
    const challengeUrl = `${base}/v/${linkToken}?invite=${encodeURIComponent(inviteToken)}`;

    const locale = localeFromRequest(request);
    const { subject, text, html } = buildCandidateChallengeInviteMail({
      candidateFullName: candidateName,
      vacancyTitle: row.title,
      companyName: row.companyName ?? null,
      challengeUrl,
      locale,
    });

    try {
      await sendTransactionalMail({ to: candidateEmail, subject, text, html });
    } catch (e) {
      if (inviteId != null) {
        await query(`DELETE FROM candidate_invites WHERE id = $1`, [inviteId]).catch(() => {});
      }
      if (e?.code === 'MAIL_NOT_CONFIGURED') {
        return apiError(request, 'SMTP_NOT_CONFIGURED', 503);
      }
      console.error('invite mail error', e);
      return apiError(request, 'MAIL_FAILED', 502);
    }

    return NextResponse.json({ ok: true, sentTo: candidateEmail, inviteId });
  } catch (error) {
    console.error(error);
    return apiError(request, 'INTERNAL', 500);
  }
}
