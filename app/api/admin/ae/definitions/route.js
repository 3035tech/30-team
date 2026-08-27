import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { CAP, getSessionPayload, requireCapability } from '../../../../../lib/ae/require-admin';
import { apiError, ERR } from '../../../../../lib/api-error';

/** GET /api/admin/ae/definitions — lista assessments cadastrados */
export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.MOTIVATORS_CONFIG)) {
      return apiError(request, ERR.ADMIN_ONLY, 401);
    }

    const res = await query(
      `SELECT d.id, d.slug, d.name, d.description, d.version, d.active, d.config, d.created_at AS "createdAt",
              (SELECT COUNT(*)::int FROM ae_questions q WHERE q.definition_id = d.id AND q.active = TRUE) AS "questionsCount",
              (SELECT COUNT(*)::int FROM ae_invites i WHERE i.definition_id = d.id) AS "invitesCount",
              (SELECT COUNT(*)::int FROM ae_attempts a WHERE a.definition_id = d.id AND a.status = 'completed') AS "attemptsCount"
       FROM ae_definitions d
       ORDER BY d.created_at ASC, d.id ASC`
    );

    return NextResponse.json({ items: res.rows });
  } catch (err) {
    console.error('GET /api/admin/ae/definitions', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}
