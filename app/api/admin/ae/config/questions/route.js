import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import { getSessionPayload, requireAdminRole } from '../../../../../../lib/ae/require-admin';

/** GET /api/admin/ae/config/questions */
export async function GET(request) {
  try {
    const payload = getSessionPayload();
    if (!requireAdminRole(payload)) {
      return NextResponse.json({ error: 'Apenas administradores.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('definition') || 'motivators';
    const activeOnly = searchParams.get('activeOnly') === '1';

    const res = await query(
      `SELECT q.id, q.key, q.text, q.question_type AS "questionType", q.category,
              q.weight, q.sort_order AS "sortOrder", q.active
       FROM ae_questions q
       JOIN ae_definitions d ON d.id = q.definition_id
       WHERE LOWER(d.slug) = LOWER($1) ${activeOnly ? 'AND q.active = TRUE' : ''}
       ORDER BY q.sort_order, q.id
       LIMIT 500`,
      [slug]
    );
    return NextResponse.json({ items: res.rows, total: res.rowCount });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/** PATCH /api/admin/ae/config/questions */
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
    if (body.text != null) {
      fields.push(`text = $${n++}`);
      params.push(String(body.text).trim());
    }
    if (body.active != null) {
      fields.push(`active = $${n++}`);
      params.push(Boolean(body.active));
    }
    if (body.weight != null) {
      fields.push(`weight = $${n++}`);
      params.push(Number(body.weight));
    }
    if (fields.length === 0) return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 });

    await query(`UPDATE ae_questions SET ${fields.join(', ')} WHERE id = $1`, params);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
