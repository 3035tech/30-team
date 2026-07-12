import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import { getSessionPayload, requireAdminRole } from '../../../../../../lib/ae/require-admin';
import { apiError } from '../../../../../../lib/api-error';

/** GET /api/admin/ae/config/templates */
export async function GET(request) {
  try {
    const payload = getSessionPayload();
    if (!requireAdminRole(payload)) {
      return apiError(request, 'ADMIN_ONLY', 401);
    }

    const res = await query(
      `SELECT t.id, t.template_type AS "templateType", t.condition, t.text_pt AS "textPt",
              t.text_en AS "textEn", t.sort_order AS "sortOrder", t.active,
              d.slug AS "definitionSlug"
       FROM ae_result_templates t
       JOIN ae_definitions d ON d.id = t.definition_id
       ORDER BY t.template_type, t.sort_order`
    );
    return NextResponse.json({ items: res.rows });
  } catch (err) {
    console.error(err);
    return apiError(request, 'INTERNAL', 500);
  }
}

/** PATCH /api/admin/ae/config/templates */
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
    if (body.textPt != null) {
      fields.push(`text_pt = $${n++}`);
      params.push(String(body.textPt).trim());
    }
    if (body.textEn != null) {
      fields.push(`text_en = $${n++}`);
      params.push(String(body.textEn).trim());
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

    await query(`UPDATE ae_result_templates SET ${fields.join(', ')} WHERE id = $1`, params);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return apiError(request, 'INTERNAL', 500);
  }
}
