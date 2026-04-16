import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../lib/auth';
import { query } from '../../../../../lib/db';
import { audit } from '../../../../../lib/audit';

function requireAdmin(payload) {
  return payload?.role === 'admin';
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
