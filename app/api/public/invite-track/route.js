import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

/** GET — marca convite como aberto (idempotente). Público, sem dados sensíveis na resposta. */
export async function GET(request) {
  try {
    const token = String(request.nextUrl.searchParams.get('token') || '').trim();
    if (!token) return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });

    const up = await query(
      `UPDATE candidate_invites ci
       SET opened_at = COALESCE(ci.opened_at, NOW()),
           status = CASE WHEN ci.status = 'sent' THEN 'opened' ELSE ci.status END
       FROM vacancies v
       JOIN companies c ON c.id = v.company_id
       WHERE ci.token = $1
         AND ci.vacancy_id = v.id
         AND v.deleted = FALSE
         AND c.deleted = FALSE
         AND ci.status IN ('sent', 'opened')
       RETURNING ci.id`,
      [token]
    );

    return NextResponse.json({ ok: true, tracked: up.rowCount > 0 });
  } catch (e) {
    console.error('invite-track', e);
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 });
  }
}
