import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../../lib/auth';
import { query } from '../../../../../../lib/db';
import crypto from 'node:crypto';

function requireAdmin(payload) {
  return payload?.role === 'admin';
}

export async function POST(_request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireAdmin(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const companyId = params?.id;
  if (!companyId) return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 });

  const exists = await query(`SELECT id FROM companies WHERE id = $1 LIMIT 1`, [companyId]);
  if (exists.rowCount === 0) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  await query(
    `UPDATE company_links
     SET active = FALSE, rotated_at = NOW()
     WHERE company_id = $1 AND active = TRUE`,
    [companyId]
  );

  const newToken = crypto.randomBytes(24).toString('hex');
  await query(
    `INSERT INTO company_links (company_id, token, active, expires_at)
     VALUES ($1, $2, TRUE, NOW() + INTERVAL '7 days')`,
    [companyId, newToken]
  );
  return NextResponse.json({ ok: true, token: newToken });
}

