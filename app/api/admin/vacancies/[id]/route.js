import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../lib/auth';
import { query } from '../../../../../lib/db';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

async function getVacancyOr404(vacancyId) {
  const v = await query(
    `SELECT
       v.id,
       v.company_id AS "companyId",
       c.name AS "companyName",
       v.title,
       v.slug,
       v.status,
       v.created_at AS "createdAt"
     FROM vacancies v
     JOIN companies c ON c.id = v.company_id
     WHERE v.id = $1
     LIMIT 1`,
    [vacancyId]
  );
  if (v.rowCount === 0) return null;
  return v.rows[0];
}

async function attachActiveToken(vacancy) {
  const t = await query(
    `SELECT token, expires_at AS "expiresAt", rotated_at AS "rotatedAt"
     FROM vacancy_links
     WHERE vacancy_id = $1 AND active = TRUE
     LIMIT 1`,
    [vacancy.id]
  );
  return { ...vacancy, activeToken: t.rows?.[0]?.token || null, activeTokenExpiresAt: t.rows?.[0]?.expiresAt || null };
}

export async function GET(_request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireRole(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Vaga inválida' }, { status: 400 });

  const v = await getVacancyOr404(id);
  if (!v) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  if (!isAdmin && String(v.companyId) !== String(companyId)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  return NextResponse.json(await attachActiveToken(v));
}

export async function PATCH(request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireRole(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Vaga inválida' }, { status: 400 });

  const current = await getVacancyOr404(id);
  if (!current) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  if (!isAdmin && String(current.companyId) !== String(companyId)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = body.title != null ? String(body.title || '').trim() : null;
  const status = body.status != null ? String(body.status || '').trim() : null;
  const slug = body.slug != null ? slugify(body.slug || '') : null;

  if (status !== null && !['open', 'closed'].includes(status)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
  if (slug !== null && !slug) return NextResponse.json({ error: 'Slug inválido' }, { status: 400 });

  const nextTitle = title !== null ? title : current.title;
  const nextStatus = status !== null ? status : current.status;
  const nextSlug = slug !== null ? slug : current.slug;
  if (!nextTitle) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 });

  const up = await query(
    `UPDATE vacancies
     SET title = $2, slug = $3, status = $4
     WHERE id = $1
     RETURNING id, company_id AS "companyId", title, slug, status, created_at AS "createdAt"`,
    [id, nextTitle, nextSlug, nextStatus]
  );
  return NextResponse.json(await attachActiveToken({ ...up.rows[0], companyName: current.companyName }));
}

export async function DELETE(_request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireRole(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Vaga inválida' }, { status: 400 });

  if (!isAdmin) {
    const owned = await query(`SELECT id FROM vacancies WHERE id = $1 AND company_id = $2 LIMIT 1`, [id, companyId]);
    if (owned.rowCount === 0) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const del = await query(`DELETE FROM vacancies WHERE id = $1 RETURNING id`, [id]);
  if (del.rowCount === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  return NextResponse.json({ ok: true });
}

