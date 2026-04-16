import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME, hashPassword } from '../../../../../lib/auth';
import { query } from '../../../../../lib/db';

function requireAdmin(payload) {
  return payload?.role === 'admin';
}

export async function PATCH(request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireAdmin(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = params?.userId;
  const userId = id ? parseInt(String(id), 10) : NaN;
  if (!Number.isFinite(userId)) return NextResponse.json({ error: 'Usuário inválido' }, { status: 400 });

  const current = await query(
    `SELECT id, email, role, active, company_id AS "companyId"
     FROM users
     WHERE id = $1 AND deleted = FALSE
     LIMIT 1`,
    [userId]
  );
  if (current.rowCount === 0) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const email = body.email != null ? String(body.email || '').trim().toLowerCase() : null;
  const role = body.role != null ? String(body.role || '').trim() : null;
  const active = body.active != null ? Boolean(body.active) : null;
  const companyIdRaw = body.companyId != null ? body.companyId : null;
  const companyId = companyIdRaw === null ? null : parseInt(String(companyIdRaw), 10);
  const newPassword = body.password != null ? String(body.password || '') : null;

  if (email !== null && !email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
  if (role !== null && !['hr', 'direction', 'admin'].includes(role)) return NextResponse.json({ error: 'Role inválida' }, { status: 400 });
  if (companyIdRaw != null && companyIdRaw !== null && !Number.isFinite(companyId)) {
    return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 });
  }

  const nextRole = role !== null ? role : current.rows[0].role;
  const nextCompanyId = companyIdRaw != null ? companyId : current.rows[0].companyId;
  if (nextRole !== 'admin' && !nextCompanyId) {
    return NextResponse.json({ error: 'Empresa obrigatória para esse role' }, { status: 400 });
  }
  if (nextCompanyId) {
    const c = await query(`SELECT id FROM companies WHERE id = $1 AND deleted = FALSE LIMIT 1`, [nextCompanyId]);
    if (c.rowCount === 0) return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 });
  }

  const nextEmail = email !== null ? email : current.rows[0].email;
  const nextActive = active !== null ? active : current.rows[0].active;

  const nextHash = newPassword !== null && newPassword.trim()
    ? await hashPassword(newPassword.trim())
    : null;

  const up = await query(
    `UPDATE users
     SET email = $2,
         role = $3,
         active = $4,
         company_id = $5,
         password_hash = COALESCE($6, password_hash)
     WHERE id = $1 AND deleted = FALSE
     RETURNING id, email, role, active, company_id AS "companyId", created_at AS "createdAt", last_login_at AS "lastLoginAt"`,
    [userId, nextEmail, nextRole, nextActive, nextRole === 'admin' ? null : nextCompanyId, nextHash]
  );

  return NextResponse.json(up.rows[0]);
}

export async function DELETE(_request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireAdmin(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = params?.userId;
  const userId = id ? parseInt(String(id), 10) : NaN;
  if (!Number.isFinite(userId)) return NextResponse.json({ error: 'Usuário inválido' }, { status: 400 });

  // Evita deletar a própria conta por engano.
  if (payload?.userId && Number(payload.userId) === userId) {
    return NextResponse.json({ error: 'Você não pode excluir seu próprio usuário' }, { status: 400 });
  }

  const del = await query(
    `UPDATE users SET deleted = TRUE, active = FALSE WHERE id = $1 AND deleted = FALSE RETURNING id`,
    [userId]
  );
  if (del.rowCount === 0) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

