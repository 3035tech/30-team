import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../../../../lib/auth';
import { query } from '../../../../../../../../lib/db';
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

/** Envia desafio de eneagrama para candidato já pré-cadastrado na vaga. */
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
    const candidateId = params?.candidateId;
    if (!vacancyId || !candidateId) return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });

    const ip = clientIpFromRequest(request);
    const uid = payload?.userId ?? '';
    const rl = checkRateLimit(`invite:${uid || ip}`, 40, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Muitos convites enviados nesta hora. Aguarde e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
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
    if (link.rowCount === 0) return NextResponse.json({ error: 'Candidato não encontrado nesta vaga' }, { status: 404 });
    const row = link.rows[0];
    if (!isAdmin && String(row.companyId) !== String(companyId)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (!row.email) {
      return NextResponse.json({ error: 'Candidato sem e-mail cadastrado.' }, { status: 400 });
    }
    if (String(row.status || '') === 'closed') {
      return NextResponse.json(
        { error: 'Esta vaga está encerrada. Reabra a vaga antes de enviar convites.' },
        { status: 400 }
      );
    }

    const existingDone = await query(
      `SELECT 1 FROM assessments WHERE candidate_id = $1 AND vacancy_id = $2 LIMIT 1`,
      [candidateId, vacancyId]
    );
    if (existingDone.rowCount > 0) {
      return NextResponse.json(
        { error: 'Este candidato já respondeu o teste desta vaga.' },
        { status: 409 }
      );
    }

    const base = publicAppUrl(request);
    if (!base) {
      return NextResponse.json(
        { error: 'URL pública do app não configurada. Defina NEXT_PUBLIC_APP_URL no servidor.' },
        { status: 500 }
      );
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

    const { subject, text, html } = buildCandidateChallengeInviteMail({
      candidateFullName: candidateName,
      vacancyTitle: row.title,
      companyName: row.companyName ?? null,
      challengeUrl,
    });

    try {
      await sendTransactionalMail({ to: candidateEmail, subject, text, html });
    } catch (e) {
      if (inviteId != null) {
        await query(`DELETE FROM candidate_invites WHERE id = $1`, [inviteId]).catch(() => {});
      }
      if (e?.code === 'MAIL_NOT_CONFIGURED') {
        return NextResponse.json({ error: e.message }, { status: 503 });
      }
      console.error('invite mail error', e);
      return NextResponse.json({ error: 'Falha ao enviar e-mail. Verifique a configuração SMTP no servidor.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, sentTo: candidateEmail, inviteId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
