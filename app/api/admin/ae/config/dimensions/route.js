import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import { getSessionPayload, requireAdminRole } from '../../../../../../lib/ae/require-admin';

/** GET /api/admin/ae/config/dimensions */
export async function GET() {
  try {
    const payload = getSessionPayload();
    if (!requireAdminRole(payload)) {
      return NextResponse.json({ error: 'Apenas administradores.' }, { status: 401 });
    }

    const res = await query(
      `SELECT d.id, d.key, d.label, d.description, d.sort_order AS "sortOrder", d.active, d.color,
              def.slug AS "definitionSlug"
       FROM ae_dimensions d
       JOIN ae_definitions def ON def.id = d.definition_id
       ORDER BY def.slug, d.sort_order`
    );
    return NextResponse.json({ items: res.rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/** PATCH /api/admin/ae/config/dimensions — atualiza label, active, sort_order */
export async function PATCH(request) {
  try {
    const payload = getSessionPayload();
    if (!requireAdminRole(payload)) {
      return NextResponse.json({ error: 'Apenas administradores.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const id = Number(body.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

    const fields = [];
    const params = [id];
    let n = 2;
    if (body.label != null) {
      fields.push(`label = $${n++}`);
      params.push(String(body.label).trim());
    }
    if (body.active != null) {
      fields.push(`active = $${n++}`);
      params.push(Boolean(body.active));
    }
    if (body.sortOrder != null) {
      fields.push(`sort_order = $${n++}`);
      params.push(Number(body.sortOrder));
    }
    if (fields.length === 0) return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 });

    await query(`UPDATE ae_dimensions SET ${fields.join(', ')} WHERE id = $1`, params);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
