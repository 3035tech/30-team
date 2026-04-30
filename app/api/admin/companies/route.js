import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../lib/auth';
import { query, queryRead } from '../../../../lib/db';
import crypto from 'node:crypto';
import { PAGE_SIZE_OPTIONS, sqlCompaniesOrderBy } from '../../../../lib/assessment-filters';

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

async function ensureActiveLink(companyId) {
  const existing = await queryRead(
    `SELECT token FROM company_links WHERE company_id = $1 AND active = TRUE AND expires_at > NOW() LIMIT 1`,
    [companyId]
  );
  if (existing.rowCount > 0) return existing.rows[0].token;
  const token = crypto.randomBytes(24).toString('hex');
  await query(
    `INSERT INTO company_links (company_id, token, active, expires_at)
     VALUES ($1, $2, TRUE, NOW() + INTERVAL '7 days')`,
    [companyId, token]
  );
  return token;
}

const COMPANY_SORT_KEYS = new Set(['id', 'name', 'slug', 'active', 'createdAt']);

export async function GET(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireAdmin(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const url = new URL(request.url);
  if (url.searchParams.get('forSelect') === '1') {
    const r = await queryRead(
      `SELECT id, name
       FROM companies
       WHERE deleted = FALSE
       ORDER BY LOWER(name) ASC`
    );
    return NextResponse.json(r.rows);
  }

  const pageRaw = parseInt(url.searchParams.get('page') || '1', 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const sizeRaw = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(sizeRaw) ? sizeRaw : 20;
  const sortRaw = url.searchParams.get('sort') || 'createdAt';
  const sort = COMPANY_SORT_KEYS.has(sortRaw) ? sortRaw : 'createdAt';
  const dir = url.searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
  const orderSql = sqlCompaniesOrderBy(sort, dir);

  const cnt = await queryRead(`SELECT COUNT(*)::int AS n FROM companies WHERE deleted = FALSE`);
  const total = cnt.rows[0]?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const offset = (effectivePage - 1) * pageSize;

  const r = await queryRead(
    `SELECT
       c.id,
       c.name,
       c.slug,
       c.active,
       c.created_at AS "createdAt",
       lk.token AS "activeToken",
       lk.expires_at AS "activeTokenExpiresAt"
     FROM companies c
     LEFT JOIN company_links lk ON lk.company_id = c.id AND lk.active = TRUE
     WHERE c.deleted = FALSE
     ${orderSql}
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );

  return NextResponse.json({
    items: r.rows,
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
  if (!requireAdmin(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const slug = slugify(body.slug || name);
  if (!name || !slug) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

  const ins = await query(
    `INSERT INTO companies (name, slug, active)
     VALUES ($1, $2, TRUE)
     RETURNING id, name, slug, active, created_at AS "createdAt"`,
    [name, slug]
  );

  const linkToken = await ensureActiveLink(ins.rows[0].id);
  return NextResponse.json({ ...ins.rows[0], activeToken: linkToken }, { status: 201 });
}

