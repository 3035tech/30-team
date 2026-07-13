import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../../../../lib/auth';
import { query } from '../../../../../../../../lib/db';
import { ensureActiveVacancyLinkToken } from '../../../../../../../../lib/vacancy-link';
import { enqueueTransactionalMail } from '../../../../../../../../lib/mail';
import { buildCandidateChallengeInviteMail } from '../../../../../../../../lib/candidate-challenge-invite-mail';
import { checkRateLimit, clientIpFromRequest } from '../../../../../../../../lib/rate-limit';
import { apiError, localeFromRequest } from '../../../../../../../../lib/api-error';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

function publicAppUrl(request) {
  const env = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (env) return env.replace(/\/$/, '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = (request.headers.get('x-forwarded-proto') || 'https').split(',')[0]?.trim() || 'https';
  if (host) return `${proto}://${host}`.replace(/\/$/, '');
  return '';
}

/** Envia desafio de eneagrama para candidato já pré-cadastrado na vaga. */
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
    const candidateId = params?.candidateId;
    if (!vacancyId || !candidateId) return apiError(request, 'INVALID_PARAMS', 400);

    const ip = clientIpFromRequest(request);
    const uid = payload?.userId ?? '';
    const rl = checkRateLimit(`invite:${uid || ip}`, 40, 60 * 60 * 1000);
    if (!rl.ok) {
      return apiError(request, 'RATE_LIMIT_INVITES', 429, {}, { headers: { 'Retry-After': String(rl.retryAfterSec) } });
    }

    const link = await query(
      `SELECT vc.id, vc.company_id AS "companyId",
              c.full_name AS "fullName", c.email,
              v.id AS "vacancyId", v.title, v.status,
              co.name AS "companyName"
       FROM vacancy_candidates vc
       JOIN candidates c ON c.id = vc.candidate_id
       JOIN vacancies v ON v.id = vc.vacancy_id
       JOIN companies co ON co.id = v.company_id
       WHERE vc.vacancy_id = $1 AND vc.candidate_id = $2
         AND v.deleted = FALSE AND co.deleted = FALSE
       LIMIT 1`,
      [vacancyId, candidateId]
    );
    if (link.rowCount === 0) return apiError(request, 'CANDIDATE_NOT_FOUND', 404);
    const row = link.rows[0];
    if (!isAdmin && String(row.companyId) !== String(companyId)) {
      return apiError(request, 'UNAUTHORIZED', 401);
    }
    if (!row.email) {
      return apiError(request, 'CANDIDATE_NO_EMAIL', 400);
    }
    if (String(row.status || '') === 'closed') {
      return apiError(request, 'VACANCY_CLOSED', 400);
    }

    const existingDone = await query(
      `SELECT 1 FROM assessments WHERE candidate_id = $1 AND vacancy_id = $2 LIMIT 1`,
      [candidateId, vacancyId]
    );
    if (existingDone.rowCount > 0) {
      return apiError(request, 'CANDIDATE_ALREADY_ANSWERED', 409);
    }

    const base = publicAppUrl(request);
    if (!base) {
      return apiError(request, 'APP_URL_MISSING', 500);
    }

    const linkToken = await ensureActiveVacancyLinkToken(row.vacancyId);
    const inviteToken = crypto.randomBytes(24).toString('hex');
    const createdBy = payload?.userId != null ? Number(payload.userId) : null;
    const createdBySql = Number.isFinite(createdBy) ? createdBy : null;
    const candidateEmail = String(row.email).trim().toLowerCase();
    const candidateName = String(row.fullName || '').trim();

    const ins = await query(
      `INSERT INTO candidate_invites (
         vacancy_id, company_id, candidate_id, candidate_name, candidate_email, token, status, created_by_user_id
       ) VALUES ($1, $2, $3, $4, $5, $6, 'sent', $7)
       RETURNING id`,
      [row.vacancyId, row.companyId, candidateId, candidateName, candidateEmail, inviteToken, createdBySql]
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
      enqueueTransactionalMail({ to: candidateEmail, subject, text, html });
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

    // Entrevista já aconteceu — entra no kanban em "Entrevista" até o teste ser concluído
    await query(
      `UPDATE vacancy_candidates
       SET pipeline_stage = 'interview', updated_at = NOW()
       WHERE vacancy_id = $1 AND candidate_id = $2`,
      [vacancyId, candidateId]
    );

    return NextResponse.json({ ok: true, sentTo: candidateEmail, inviteId, pipelineStage: 'interview', queued: true });
  } catch (error) {
    console.error(error);
    return apiError(request, 'INTERNAL', 500);
  }
}
