import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../lib/auth';
import { query } from '../../../../../lib/db';

function requireAdmin(payload) {
  return payload?.role === 'admin';
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

