import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../../../../lib/auth';
import { query, queryRead } from '../../../../../../../../lib/db';
import { ensureActiveVacancyLinkToken } from '../../../../../../../../lib/vacancy-link';
import { sendTransactionalMail } from '../../../../../../../../lib/mail';
import { buildCandidateChallengeInviteMail } from '../../../../../../../../lib/candidate-challenge-invite-mail';
import { checkRateLimit, clientIpFromRequest } from '../../../../../../../../lib/rate-limit';

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

export async function POST(request, { params }) {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value;
    const payload = session ? verifyToken(session) : null;
    if (!requireRole(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const isAdmin = payload?.role === 'admin';
    const companyId = payload?.companyId ?? null;
    if (!isAdmin && !companyId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const vacancyId = params?.id;
    const inviteId = params?.inviteId;
    if (!vacancyId || !inviteId) return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });

    const ip = clientIpFromRequest(request);
    const uid = payload?.userId ?? '';
    const rl = checkRateLimit(`invite-remind:${uid || ip}`, 60, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Muitos lembretes nesta hora. Aguarde e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const inv = await queryRead(
      `SELECT ci.id, ci.token, ci.candidate_name AS "candidateName", ci.candidate_email AS "candidateEmail",
              ci.status, ci.reminder_count AS "reminderCount",
              v.id AS "vacancyId", v.title AS "vacancyTitle", v.status AS "vacancyStatus", v.company_id AS "companyId",
              c.name AS "companyName"
       FROM candidate_invites ci
       JOIN vacancies v ON v.id = ci.vacancy_id AND v.deleted = FALSE
       JOIN companies c ON c.id = v.company_id AND c.deleted = FALSE
       WHERE ci.id = $1 AND ci.vacancy_id = $2
       LIMIT 1`,
      [inviteId, vacancyId]
    );
    if (inv.rowCount === 0) return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 });

    const row = inv.rows[0];
    if (!isAdmin && String(row.companyId) !== String(companyId)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (String(row.vacancyStatus || '') === 'closed') {
      return NextResponse.json({ error: 'Vaga encerrada — não é possível lembrar.' }, { status: 400 });
    }
    if (!['sent', 'opened'].includes(String(row.status || ''))) {
      return NextResponse.json({ error: 'Este convite não está pendente.' }, { status: 400 });
    }

    const base = publicAppUrl(request);
    if (!base) {
      return NextResponse.json(
        { error: 'URL pública do app não configurada (NEXT_PUBLIC_APP_URL).' },
        { status: 500 }
      );
    }

    const linkToken = await ensureActiveVacancyLinkToken(row.vacancyId);
    const challengeUrl = `${base}/v/${linkToken}?invite=${encodeURIComponent(row.token)}`;
    const { subject, text, html } = buildCandidateChallengeInviteMail({
      candidateFullName: row.candidateName,
      vacancyTitle: row.vacancyTitle,
      companyName: row.companyName ?? null,
      challengeUrl,
    });

    try {
      await sendTransactionalMail({ to: row.candidateEmail, subject, text, html });
    } catch (e) {
      if (e?.code === 'MAIL_NOT_CONFIGURED') {
        return NextResponse.json({ error: e.message }, { status: 503 });
      }
      console.error('remind mail error', e);
      return NextResponse.json({ error: 'Falha ao enviar e-mail.' }, { status: 502 });
    }

    const up = await query(
      `UPDATE candidate_invites
       SET last_reminder_at = NOW(), reminder_count = reminder_count + 1
       WHERE id = $1
       RETURNING last_reminder_at AS "lastReminderAt", reminder_count AS "reminderCount"`,
      [inviteId]
    );

    return NextResponse.json({ ok: true, ...up.rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
