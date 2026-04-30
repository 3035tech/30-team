import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME, hashPassword } from '../../../../lib/auth';
import { query } from '../../../../lib/db';
import { PAGE_SIZE_OPTIONS, sqlUsersOrderBy } from '../../../../lib/assessment-filters';

function requireAdmin(payload) {
  return payload?.role === 'admin';
}

const USER_SORT_KEYS = new Set(['id', 'email', 'role', 'companyName', 'active', 'createdAt']);

export async function GET(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireAdmin(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const url = new URL(request.url);
  const pageRaw = parseInt(url.searchParams.get('page') || '1', 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const sizeRaw = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(sizeRaw) ? sizeRaw : 20;
  const sortRaw = url.searchParams.get('sort') || 'createdAt';
  const sort = USER_SORT_KEYS.has(sortRaw) ? sortRaw : 'createdAt';
  const dir = url.searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
  const orderSql = sqlUsersOrderBy(sort, dir);

  const cnt = await query(
    `SELECT COUNT(*)::int AS n
     FROM users u
     WHERE u.deleted = FALSE`
  );
  const total = cnt.rows[0]?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const offset = (effectivePage - 1) * pageSize;

  const r = await query(
    `SELECT
       u.id,
       u.email,
       u.role,
       u.active,
       u.company_id AS "companyId",
       c.name AS "companyName",
       u.last_login_at AS "lastLoginAt",
       u.created_at AS "createdAt"
     FROM users u
     LEFT JOIN companies c ON c.id = u.company_id
     WHERE u.deleted = FALSE
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
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '').trim();
  const role = String(body.role || '').trim();
  const companyId = body.companyId ?? null;

  if (!email || !password) return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 });
  if (!['hr', 'direction', 'admin'].includes(role)) return NextResponse.json({ error: 'Role inválida' }, { status: 400 });
  if (role !== 'admin' && !companyId) return NextResponse.json({ error: 'Empresa obrigatória' }, { status: 400 });

  if (companyId) {
    const c = await query(`SELECT id FROM companies WHERE id = $1 AND deleted = FALSE LIMIT 1`, [companyId]);
    if (c.rowCount === 0) return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 });
  }

  const hash = await hashPassword(password);
  const ins = await query(
    `INSERT INTO users (email, password_hash, role, active, company_id)
     VALUES ($1, $2, $3, TRUE, $4)
     RETURNING id, email, role, active, company_id AS "companyId", created_at AS "createdAt"`,
    [email, hash, role, companyId]
  );
  return NextResponse.json(ins.rows[0], { status: 201 });
}

