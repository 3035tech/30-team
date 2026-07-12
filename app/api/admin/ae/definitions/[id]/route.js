import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import { getSessionPayload, requireAdminRole } from '../../../../../../lib/ae/require-admin';
import { apiError } from '../../../../../../lib/api-error';

/** DELETE /api/admin/ae/definitions/[id] — remove assessment e dados relacionados (CASCADE) */
export async function DELETE(request, { params }) {
  try {
    const payload = getSessionPayload();
    if (!requireAdminRole(payload)) {
      return apiError(request, 'ADMIN_ONLY', 401);
    }

    const definitionId = Number(params.id);
    if (!Number.isFinite(definitionId)) {
      return apiError(request, 'INVALID_ID', 400);
    }

    const row = await query(
      `SELECT id, slug, name FROM ae_definitions WHERE id = $1 LIMIT 1`,
      [definitionId]
    );
    if (row.rowCount === 0) {
      return apiError(request, 'ASSESSMENT_NOT_FOUND', 404);
    }

    const def = row.rows[0];

    await query(`DELETE FROM ae_definitions WHERE id = $1`, [definitionId]);

    return NextResponse.json({
      ok: true,
      deleted: { id: def.id, slug: def.slug, name: def.name },
    });
  } catch (err) {
    console.error('DELETE /api/admin/ae/definitions/[id]', err);
    return apiError(request, 'INTERNAL', 500);
  }
}
