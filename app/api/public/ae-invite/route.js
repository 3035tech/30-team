import { NextResponse } from 'next/server';
import { queryRead } from '../../../../lib/db';

/** GET /api/public/ae-invite?token= — valida convite de motivadores. */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get('token') || '').trim();
    if (!token) {
      return NextResponse.json({ errorCode: 'INVALID_TOKEN', error: 'Link inválido.' }, { status: 400 });
    }

    const res = await queryRead(
      `SELECT i.id, i.candidate_name AS "candidateName", i.candidate_email AS "candidateEmail",
              i.status, i.expires_at AS "expiresAt",
              d.slug AS "definitionSlug", d.name AS "definitionName",
              c.name AS "companyName"
       FROM ae_invites i
       JOIN ae_definitions d ON d.id = i.definition_id
       JOIN companies c ON c.id = i.company_id
       WHERE i.token = $1 AND c.deleted = FALSE AND d.active = TRUE
       LIMIT 1`,
      [token]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ errorCode: 'INVITE_NOT_FOUND', error: 'Convite não encontrado.' }, { status: 404 });
    }

    const row = res.rows[0];
    if (new Date(row.expiresAt) < new Date()) {
      return NextResponse.json({ errorCode: 'INVITE_EXPIRED', error: 'Este convite expirou.' }, { status: 403 });
    }
    if (row.status === 'cancelled') {
      return NextResponse.json({ errorCode: 'INVITE_CANCELLED', error: 'Este convite foi cancelado.' }, { status: 403 });
    }
    if (row.status === 'completed') {
      return NextResponse.json(
        {
          errorCode: 'INVITE_COMPLETED',
          error: 'Este convite já foi utilizado. O RH pode enviar um novo convite para uma nova avaliação.',
          completed: true,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      inviteId: row.id,
      candidateName: row.candidateName,
      candidateEmail: row.candidateEmail,
      status: row.status,
      definitionSlug: row.definitionSlug,
      definitionName: row.definitionName,
      companyName: row.companyName,
      expiresAt: row.expiresAt,
    });
  } catch (err) {
    console.error('GET /api/public/ae-invite', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
