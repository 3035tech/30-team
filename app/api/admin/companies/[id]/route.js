import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../lib/auth';
import { query } from '../../../../../lib/db';
import { audit } from '../../../../../lib/audit';

function requireAdmin(payload) {
  return payload?.role === 'admin';
}

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export async function PATCH(request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireAdmin(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const raw = params?.id;
  const companyId = raw ? parseInt(String(raw), 10) : NaN;
  if (!Number.isFinite(companyId)) return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 });

  const current = await query(
    `SELECT id, name, slug, active FROM companies WHERE id = $1 AND deleted = FALSE LIMIT 1`,
    [companyId]
  );
  if (current.rowCount === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const name = body.name != null ? String(body.name || '').trim() : null;
  const slug = body.slug != null ? slugify(body.slug || '') : null;
  const active = body.active != null ? Boolean(body.active) : null;

  if (name !== null && !name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  if (slug !== null && !slug) return NextResponse.json({ error: 'Slug inválido' }, { status: 400 });

  const nextName = name !== null ? name : current.rows[0].name;
  const nextSlug = slug !== null ? slug : current.rows[0].slug;
  const nextActive = active !== null ? active : current.rows[0].active;

  const up = await query(
    `UPDATE companies
     SET name = $2, slug = $3, active = $4
     WHERE id = $1 AND deleted = FALSE
     RETURNING id, name, slug, active, created_at AS "createdAt"`,
    [companyId, nextName, nextSlug, nextActive]
  );

  await audit({
    actorUserId: payload.userId || null,
    action: 'company.update',
    targetType: 'company',
    targetId: String(companyId),
  });

  return NextResponse.json(up.rows[0]);
}

/** Exclusão lógica: empresa some das listagens; vagas somem; candidatos/avaliações permanecem. */
export async function DELETE(_request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireAdmin(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const raw = params?.id;
  const companyId = raw ? parseInt(String(raw), 10) : NaN;
  if (!Number.isFinite(companyId)) return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 });

  const cur = await query(`SELECT id FROM companies WHERE id = $1 AND deleted = FALSE LIMIT 1`, [companyId]);
  if (cur.rowCount === 0) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  await query(
    `UPDATE company_links SET active = FALSE, rotated_at = NOW() WHERE company_id = $1 AND active = TRUE`,
    [companyId]
  );
  await query(
    `UPDATE vacancy_links vl
     SET active = FALSE, rotated_at = NOW()
     FROM vacancies v
     WHERE vl.vacancy_id = v.id AND v.company_id = $1 AND vl.active = TRUE`,
    [companyId]
  );
  await query(`UPDATE vacancies SET deleted = TRUE WHERE company_id = $1 AND deleted = FALSE`, [companyId]);
  await query(
    `UPDATE companies SET deleted = TRUE, active = FALSE WHERE id = $1 AND deleted = FALSE RETURNING id`,
    [companyId]
  );

  await audit({
    actorUserId: payload.userId || null,
    action: 'company.soft_delete',
    targetType: 'company',
    targetId: String(companyId),
  });

  return NextResponse.json({ ok: true });
}
