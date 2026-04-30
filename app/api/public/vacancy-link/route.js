import { NextResponse } from 'next/server';
import { queryRead } from '../../../../lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = String(searchParams.get('token') || '').trim();
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 400 });

  const r = await queryRead(
    `SELECT
       v.id AS "vacancyId",
       v.title,
       v.status,
       v.company_id AS "companyId",
       l.expires_at AS "expiresAt"
     FROM vacancy_links l
     JOIN vacancies v ON v.id = l.vacancy_id
     JOIN companies c ON c.id = v.company_id
     WHERE l.token = $1 AND l.active = TRUE AND l.expires_at > NOW()
       AND v.deleted = FALSE AND c.deleted = FALSE
     LIMIT 1`,
    [token]
  );
  if (r.rowCount === 0) return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 });

  return NextResponse.json(r.rows[0]);
}

