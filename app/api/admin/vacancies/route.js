import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../lib/auth';
import { query } from '../../../../lib/db';
import crypto from 'node:crypto';
import { parseVacanciesSort, sqlVacancyOrderBy } from '../../../../lib/assessment-filters';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

const VACANCY_PAGE_SIZES = new Set([10, 20, 30, 40, 50]);

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

async function ensureActiveLink(vacancyId) {
  const existing = await query(
    `SELECT token
     FROM vacancy_links
     WHERE vacancy_id = $1 AND active = TRUE AND expires_at > NOW()
     LIMIT 1`,
    [vacancyId]
  );
  if (existing.rowCount > 0) return existing.rows[0].token;
  const token = crypto.randomBytes(24).toString('hex');
  await query(
    `INSERT INTO vacancy_links (vacancy_id, token, active, expires_at)
     VALUES ($1, $2, TRUE, NOW() + INTERVAL '7 days')`,
    [vacancyId, token]
  );
  return token;
}

export async function GET(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireRole(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const whereParts = ['v.deleted = FALSE', 'c.deleted = FALSE'];
  const params = [];
  if (!isAdmin) {
    params.push(companyId);
    whereParts.push(`v.company_id = $${params.length}`);
  }
  const where = `WHERE ${whereParts.join(' AND ')}`;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const rawSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const pageSize = VACANCY_PAGE_SIZES.has(rawSize) ? rawSize : 20;

  const { sort: vacSortCol, dir: vacSortDir } = parseVacanciesSort(Object.fromEntries(url.searchParams.entries()), {
    isAdmin,
  });
  const vacancyOrderClause = sqlVacancyOrderBy(vacSortCol, vacSortDir);

  const countR = await query(
    `SELECT COUNT(*)::int AS n
     FROM vacancies v
     JOIN companies c ON c.id = v.company_id
     ${where}`,
    params
  );
  const total = countR.rows[0]?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const effectivePage = total === 0 ? 1 : Math.min(page, totalPages);
  const offset = (effectivePage - 1) * pageSize;

  const listParams = [...params];
  listParams.push(pageSize);
  const limI = listParams.length;
  listParams.push(offset);
  const offI = listParams.length;
  const r = await query(
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
     ${where}
     ${vacancyOrderClause}
     LIMIT $${limI} OFFSET $${offI}`,
    listParams
  );

  const out = [];
  for (const v of r.rows) {
    const t = await query(
      `SELECT token, expires_at AS "expiresAt"
       FROM vacancy_links
       WHERE vacancy_id = $1 AND active = TRUE
       LIMIT 1`,
      [v.id]
    );
    out.push({ ...v, activeToken: t.rows?.[0]?.token || null, activeTokenExpiresAt: t.rows?.[0]?.expiresAt || null });
  }
  return NextResponse.json({
    items: out,
    total,
    page: effectivePage,
    pageSize,
    totalPages,
  });
}

export async function POST(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireRole(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const isAdmin = payload?.role === 'admin';
  const sessionCompanyId = payload?.companyId ?? null;
  if (!isAdmin && !sessionCompanyId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const status = String(body.status || 'open').trim();

  const requestedCompanyId = body.companyId ?? null;
  const companyId = isAdmin ? (requestedCompanyId ?? sessionCompanyId) : sessionCompanyId;

  if (!companyId) return NextResponse.json({ error: 'Empresa obrigatória' }, { status: 400 });
  if (!title) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 });
  if (!['open', 'closed'].includes(status)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 });

  const slug = slugify(body.slug || title);
  if (!slug) return NextResponse.json({ error: 'Slug inválido' }, { status: 400 });

  const c = await query(`SELECT id, name FROM companies WHERE id = $1 AND deleted = FALSE LIMIT 1`, [companyId]);
  if (c.rowCount === 0) return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 });

  const ins = await query(
    `INSERT INTO vacancies (company_id, title, slug, status)
     VALUES ($1, $2, $3, $4)
     RETURNING id, company_id AS "companyId", title, slug, status, created_at AS "createdAt"`,
    [companyId, title, slug, status]
  );

  const linkToken = await ensureActiveLink(ins.rows[0].id);
  return NextResponse.json(
    { ...ins.rows[0], companyName: c.rows[0].name, activeToken: linkToken },
    { status: 201 }
  );
}

