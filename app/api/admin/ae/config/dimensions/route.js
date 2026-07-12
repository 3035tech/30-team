import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import { getSessionPayload, requireAdminRole } from '../../../../../../lib/ae/require-admin';
import { apiError } from '../../../../../../lib/api-error';

/** GET /api/admin/ae/config/dimensions */
export async function GET(request) {
  try {
    const payload = getSessionPayload();
    if (!requireAdminRole(payload)) {
      return apiError(request, 'ADMIN_ONLY', 401);
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
    return apiError(request, 'INTERNAL', 500);
  }
}

/** PATCH /api/admin/ae/config/dimensions — atualiza label, active, sort_order */
export async function PATCH(request) {
  try {
    const payload = getSessionPayload();
    if (!requireAdminRole(payload)) {
      return apiError(request, 'ADMIN_ONLY', 401);
    }

    const body = await request.json().catch(() => ({}));
    const id = Number(body.id);
    if (!Number.isFinite(id)) return apiError(request, 'INVALID_ID', 400);

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
    if (fields.length === 0) return apiError(request, 'NOTHING_TO_UPDATE', 400);

    await query(`UPDATE ae_dimensions SET ${fields.join(', ')} WHERE id = $1`, params);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return apiError(request, 'INTERNAL', 500);
  }
}
