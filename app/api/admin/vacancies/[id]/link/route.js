import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../../lib/auth';
import { query } from '../../../../../../lib/db';
import crypto from 'node:crypto';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

export async function POST(_request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireRole(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const vacancyId = params?.id;
  if (!vacancyId) return NextResponse.json({ error: 'Vaga inválida' }, { status: 400 });

  if (!isAdmin) {
    const owned = await query(`SELECT id FROM vacancies WHERE id = $1 AND company_id = $2 LIMIT 1`, [vacancyId, companyId]);
    if (owned.rowCount === 0) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  } else {
    const exists = await query(`SELECT id FROM vacancies WHERE id = $1 LIMIT 1`, [vacancyId]);
    if (exists.rowCount === 0) return NextResponse.json({ error: 'Vaga não encontrada' }, { status: 404 });
  }

  await query(
    `UPDATE vacancy_links
     SET active = FALSE, rotated_at = NOW()
     WHERE vacancy_id = $1 AND active = TRUE`,
    [vacancyId]
  );

  const newToken = crypto.randomBytes(24).toString('hex');
  await query(
    `INSERT INTO vacancy_links (vacancy_id, token, active, expires_at)
     VALUES ($1, $2, TRUE, NOW() + INTERVAL '7 days')`,
    [vacancyId, newToken]
  );

  return NextResponse.json({ ok: true, token: newToken });
}

