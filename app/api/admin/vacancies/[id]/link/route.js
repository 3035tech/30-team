import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../../lib/auth';
import { query } from '../../../../../../lib/db';
import crypto from 'node:crypto';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

async function authorizeVacancyLink(payload, vacancyId) {
  if (!vacancyId) return { error: 'Vaga inválida', status: 400 };

  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;

  if (!isAdmin && !companyId) return { error: 'Não autorizado', status: 401 };

  if (!isAdmin) {
    const owned = await query(
      `SELECT v.id FROM vacancies v
       JOIN companies c ON c.id = v.company_id
       WHERE v.id = $1 AND v.company_id = $2 AND v.deleted = FALSE AND c.deleted = FALSE
       LIMIT 1`,
      [vacancyId, companyId]
    );
    if (owned.rowCount === 0) return { error: 'Não autorizado', status: 401 };
  } else {
    const exists = await query(
      `SELECT v.id FROM vacancies v
       JOIN companies c ON c.id = v.company_id
       WHERE v.id = $1 AND v.deleted = FALSE AND c.deleted = FALSE
       LIMIT 1`,
      [vacancyId]
    );
    if (exists.rowCount === 0) return { error: 'Vaga não encontrada', status: 404 };
  }

  return { ok: true };
}

export async function POST(_request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireRole(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const vacancyId = params?.id;
  const auth = await authorizeVacancyLink(payload, vacancyId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

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

export async function PATCH(request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireRole(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const vacancyId = params?.id;
  const auth = await authorizeVacancyLink(payload, vacancyId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const expiresAtRaw = body?.expiresAt;
  if (expiresAtRaw == null || expiresAtRaw === '') {
    return NextResponse.json({ error: 'Informe expiresAt (ISO 8601).' }, { status: 400 });
  }

  const expiresAt = new Date(expiresAtRaw);
  if (Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
  }

  const r = await query(
    `UPDATE vacancy_links
     SET expires_at = $1
     WHERE vacancy_id = $2 AND active = TRUE
     RETURNING expires_at AS "expiresAt"`,
    [expiresAt, vacancyId]
  );

  if (r.rowCount === 0) {
    return NextResponse.json({ error: 'Nenhum link ativo para esta vaga.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, expiresAt: r.rows[0].expiresAt });
}
