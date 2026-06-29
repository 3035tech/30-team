import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import {
  getManagerScope,
  getSessionPayload,
  publicAppUrl,
  requireManagerRole,
} from '../../../../../lib/ae/require-admin';
import { sendTransactionalMail } from '../../../../../lib/mail';
import { buildMotivatorsInviteMail } from '../../../../../lib/motivators-invite-mail';
import { checkRateLimit, clientIpFromRequest } from '../../../../../lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_TTL_DAYS = 30;

/** GET /api/admin/ae/invites — lista convites */
export async function GET(request) {
  try {
    const payload = getSessionPayload();
    if (!requireManagerRole(payload)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const { isAdmin, companyId, authorized } = getManagerScope(payload);
    if (!authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = String(searchParams.get('status') || '').trim();
    const companyFilter = String(searchParams.get('company') || '').trim();
    const q = String(searchParams.get('q') || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(50, Math.max(10, parseInt(searchParams.get('pageSize') || '20', 10)));
    const offset = (page - 1) * pageSize;

    const where = [];
    const params = [];
    let n = 1;

    if (!isAdmin) {
      where.push(`i.company_id = $${n++}`);
      params.push(companyId);
    } else if (companyFilter && companyFilter !== 'all') {
      where.push(`i.company_id = $${n++}`);
      params.push(Number(companyFilter));
    }

    if (status && status !== 'all') {
      where.push(`i.status = $${n++}`);
      params.push(status);
    }
    if (q) {
      where.push(`(LOWER(i.candidate_name) LIKE $${n} OR LOWER(i.candidate_email) LIKE $${n})`);
      params.push(`%${q}%`);
      n += 1;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM ae_invites i ${whereSql}`,
      params
    );
    const total = countRes.rows[0].total;

    const listRes = await query(
      `SELECT i.id, i.candidate_name AS "candidateName", i.candidate_email AS "candidateEmail",
              i.status, i.token, i.sent_at AS "sentAt", i.opened_at AS "openedAt",
              i.completed_at AS "completedAt", i.expires_at AS "expiresAt",
              i.reminder_count AS "reminderCount",
              c.name AS "companyName", c.id AS "companyId",
              d.name AS "definitionName"
       FROM ae_invites i
       JOIN companies c ON c.id = i.company_id
       JOIN ae_definitions d ON d.id = i.definition_id
       ${whereSql}
       ORDER BY i.created_at DESC
       LIMIT $${n} OFFSET $${n + 1}`,
      [...params, pageSize, offset]
    );

    return NextResponse.json({ items: listRes.rows, total, page, pageSize });
  } catch (err) {
    console.error('GET /api/admin/ae/invites', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/** POST /api/admin/ae/invites — cria convite */
export async function POST(request) {
  try {
    const payload = getSessionPayload();
    if (!requireManagerRole(payload)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const { isAdmin, companyId, authorized } = getManagerScope(payload);
    if (!authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const ip = clientIpFromRequest(request);
    const rl = checkRateLimit(`ae-invite:${payload?.userId || ip}`, 40, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Muitos convites nesta hora.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const candidateName = String(body.candidateName || body.name || '').trim();
    const candidateEmail = String(body.candidateEmail || body.email || '')
      .trim()
      .toLowerCase();
    const definitionSlug = String(body.definitionSlug || 'motivators').trim();
    let targetCompanyId = isAdmin ? Number(body.companyId) : Number(companyId);

    if (!candidateName || candidateName.length > 200) {
      return NextResponse.json({ error: 'Nome obrigatório (máx. 200 caracteres).' }, { status: 400 });
    }
    if (!candidateEmail || !EMAIL_RE.test(candidateEmail)) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
    }
    if (!Number.isFinite(targetCompanyId)) {
      return NextResponse.json({ error: 'Empresa inválida.' }, { status: 400 });
    }

    const def = await query(
      `SELECT d.id, c.name AS "companyName"
       FROM ae_definitions d
       JOIN companies c ON c.id = $2
       WHERE LOWER(d.slug) = LOWER($1) AND d.active = TRUE AND c.deleted = FALSE
       LIMIT 1`,
      [definitionSlug, targetCompanyId]
    );
    if (def.rowCount === 0) {
      return NextResponse.json({ error: 'Assessment ou empresa não encontrados.' }, { status: 404 });
    }

    const base = publicAppUrl(request);
    if (!base) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL não configurada.' }, { status: 500 });
    }

    const inviteToken = crypto.randomBytes(24).toString('hex');
    const createdBy = Number.isFinite(Number(payload?.userId)) ? Number(payload.userId) : null;
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const ins = await query(
      `INSERT INTO ae_invites (
         definition_id, company_id, candidate_name, candidate_email, token,
         status, expires_at, created_by_user_id
       ) VALUES ($1, $2, $3, $4, $5, 'sent', $6, $7)
       RETURNING id`,
      [def.rows[0].id, targetCompanyId, candidateName, candidateEmail, inviteToken, expiresAt, createdBy]
    );
    const inviteId = ins.rows[0].id;
    const assessmentUrl = `${base}/assessment/motivators/${inviteToken}`;

    const { subject, text, html } = buildMotivatorsInviteMail({
      candidateFullName: candidateName,
      companyName: def.rows[0].companyName,
      assessmentUrl,
    });

    try {
      await sendTransactionalMail({ to: candidateEmail, subject, text, html });
    } catch (e) {
      await query(`DELETE FROM ae_invites WHERE id = $1`, [inviteId]).catch(() => {});
      if (e?.code === 'MAIL_NOT_CONFIGURED') {
        return NextResponse.json({ error: e.message }, { status: 503 });
      }
      return NextResponse.json({ error: 'Falha ao enviar e-mail.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, inviteId, sentTo: candidateEmail, assessmentUrl });
  } catch (err) {
    console.error('POST /api/admin/ae/invites', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
