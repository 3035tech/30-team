import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME, hashPassword } from '../../../../lib/auth';
import { query } from '../../../../lib/db';

function requireAdmin(payload) {
  return payload?.role === 'admin';
}

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireAdmin(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

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
     ORDER BY u.created_at DESC`
  );
  return NextResponse.json(r.rows);
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
    const c = await query(`SELECT id FROM companies WHERE id = $1 LIMIT 1`, [companyId]);
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

