import { NextResponse } from 'next/server';
import { query } from '../../../../../../../lib/db';
import {
  getManagerScope,
  getSessionPayload,
  publicAppUrl,
  requireManagerRole,
} from '../../../../../../../lib/ae/require-admin';
import { sendTransactionalMail } from '../../../../../../../lib/mail';
import { buildMotivatorsInviteMail } from '../../../../../../../lib/motivators-invite-mail';

async function loadInvite(id, { isAdmin, companyId }) {
  const params = [id];
  let scope = '';
  if (!isAdmin) {
    scope = 'AND i.company_id = $2';
    params.push(companyId);
  }
  const res = await query(
    `SELECT i.id, i.candidate_name AS "candidateName", i.candidate_email AS "candidateEmail",
            i.token, i.status, c.name AS "companyName"
     FROM ae_invites i
     JOIN companies c ON c.id = i.company_id
     WHERE i.id = $1 ${scope}
     LIMIT 1`,
    params
  );
  return res.rowCount > 0 ? res.rows[0] : null;
}

/** POST /api/admin/ae/invites/[id]/remind */
export async function POST(request, { params }) {
  try {
    const payload = getSessionPayload();
    if (!requireManagerRole(payload)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const scope = getManagerScope(payload);
    if (!scope.authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const invite = await loadInvite(params.id, scope);
    if (!invite) return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 });
    if (!['sent', 'opened'].includes(invite.status)) {
      return NextResponse.json({ error: 'Convite não pode ser reenviado.' }, { status: 400 });
    }

    const base = publicAppUrl(request);
    if (!base) return NextResponse.json({ error: 'URL pública não configurada.' }, { status: 500 });

    const assessmentUrl = `${base}/assessment/motivators/${invite.token}`;
    const { subject, text, html } = buildMotivatorsInviteMail({
      candidateFullName: invite.candidateName,
      companyName: invite.companyName,
      assessmentUrl,
    });

    await sendTransactionalMail({ to: invite.candidateEmail, subject, text, html });
    await query(
      `UPDATE ae_invites SET last_reminder_at = NOW(), reminder_count = reminder_count + 1 WHERE id = $1`,
      [invite.id]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/admin/ae/invites/[id]/remind', err);
    return NextResponse.json({ error: 'Falha ao reenviar.' }, { status: 502 });
  }
}
