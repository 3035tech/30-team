import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../lib/auth';
import { query } from '../../../../../lib/db';
import { audit } from '../../../../../lib/audit';
import { apiError } from '../../../../../lib/api-error';
import { normalizeCandidateProfile } from '../../../../../lib/candidate-profile';
import { titleCasePersonName } from '../../../../../lib/person-name';

function requireRole(payload) {
  const role = payload?.role;
  return role === 'admin' || role === 'direction' || role === 'hr';
}

export async function GET(request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

  const id = params?.id;
  const c = await query(
    `SELECT id, company_id AS "companyId", full_name AS "fullName", email, hr_notes AS "hrNotes",
            phone, linkedin_url AS "linkedinUrl", city, state,
            salary_expectation AS "salaryExpectation", availability, source,
            consent_at AS "consentAt", created_at AS "createdAt"
     FROM candidates WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (c.rowCount === 0) return apiError(request, 'NOT_FOUND', 404);
  if (!isAdmin && String(c.rows[0].companyId) !== String(companyId)) {
    return apiError(request, 'UNAUTHORIZED', 401);
  }

  const a = await query(
    `SELECT ass.id,
            ar.key AS "areaKey",
            ar.label AS "areaLabel",
            ass.top_type AS "topType",
            ass.scores,
            ass.created_at AS "createdAt",
            ass.source,
            ass.vacancy_id AS "vacancyId",
            v.title AS "vacancyTitle",
            ass.pipeline_stage AS "pipelineStage",
            ass.invite_id AS "inviteId",
            ass.fill_duration_ms AS "fillDurationMs",
            ass.copy_event_count AS "copyEventCount"
     FROM assessments ass
     JOIN areas ar ON ar.id = ass.area_id
     LEFT JOIN vacancies v ON v.id = ass.vacancy_id
     WHERE ass.candidate_id = $1
     ORDER BY ass.created_at DESC`,
    [id]
  );

  let historyByAssessment = {};
  if (a.rows.length > 0) {
    const assessmentIds = a.rows.map((r) => r.id);
    try {
      const h = await query(
        `SELECT assessment_id AS "assessmentId", from_stage AS "fromStage", to_stage AS "toStage",
                changed_at AS "changedAt"
         FROM assessment_pipeline_history
         WHERE assessment_id = ANY($1::bigint[])
         ORDER BY changed_at ASC`,
        [assessmentIds]
      );
      for (const row of h.rows) {
        const key = String(row.assessmentId);
        if (!historyByAssessment[key]) historyByAssessment[key] = [];
        historyByAssessment[key].push(row);
      }
    } catch {}
  }
  const assessmentsWithHistory = a.rows.map((row) => {
    const base = {
      ...row,
      pipelineHistory: historyByAssessment[String(row.id)] || [],
    };
    // Telemetria de integridade: apenas role admin
    if (!isAdmin) {
      delete base.fillDurationMs;
      delete base.copyEventCount;
    }
    return base;
  });

  await audit({
    actorUserId: payload.userId || null,
    action: 'candidate.export_json',
    targetType: 'candidate',
    targetId: id,
  });

  return NextResponse.json({ candidate: c.rows[0], assessments: assessmentsWithHistory });
}

export async function PATCH(request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

  const id = params?.id;
  if (!id) return apiError(request, 'INVALID_ID', 400);

  if (!isAdmin) {
    const owned = await query(`SELECT id FROM candidates WHERE id = $1 AND company_id = $2 LIMIT 1`, [id, companyId]);
    if (owned.rowCount === 0) return apiError(request, 'UNAUTHORIZED', 401);
  }

  const body = await request.json().catch(() => ({}));
  const profile = normalizeCandidateProfile(body);
  const hasHrNotes = body.hrNotes !== undefined;
  const hasProfile = Object.values(profile).some((v) => v != null);
  const hasName = body.fullName !== undefined || body.name !== undefined;

  if (!hasHrNotes && !hasProfile && !hasName) {
    return apiError(request, 'NO_FIELDS_TO_UPDATE', 400);
  }

  const sets = [];
  const sqlParams = [id];
  let n = 2;

  if (hasName) {
    const name = titleCasePersonName(body.fullName || body.name).slice(0, 200);
    if (!name) return apiError(request, 'CANDIDATE_NAME_REQUIRED', 400);
    sets.push(`full_name = $${n++}`);
    sqlParams.push(name);
  }
  if (hasHrNotes) {
    const notes = body.hrNotes !== null ? String(body.hrNotes).slice(0, 4000) : null;
    sets.push(`hr_notes = $${n++}`);
    sqlParams.push(notes || null);
  }
  if (body.phone !== undefined || body.telefone !== undefined) {
    sets.push(`phone = $${n++}`);
    sqlParams.push(profile.phone);
  }
  if (body.linkedinUrl !== undefined || body.linkedin !== undefined || body.linkedin_url !== undefined) {
    sets.push(`linkedin_url = $${n++}`);
    sqlParams.push(profile.linkedinUrl);
  }
  if (body.city !== undefined || body.cidade !== undefined) {
    sets.push(`city = $${n++}`);
    sqlParams.push(profile.city);
  }
  if (body.state !== undefined || body.uf !== undefined) {
    sets.push(`state = $${n++}`);
    sqlParams.push(profile.state);
  }
  if (body.salaryExpectation !== undefined || body.salary !== undefined || body.pretensao !== undefined) {
    sets.push(`salary_expectation = $${n++}`);
    sqlParams.push(profile.salaryExpectation);
  }
  if (body.availability !== undefined || body.disponibilidade !== undefined) {
    sets.push(`availability = $${n++}`);
    sqlParams.push(profile.availability);
  }
  if (body.source !== undefined || body.fonte !== undefined) {
    sets.push(`source = $${n++}`);
    sqlParams.push(profile.source);
  }

  if (sets.length === 0) return apiError(request, 'NO_FIELDS_TO_UPDATE', 400);

  const up = await query(
    `UPDATE candidates SET ${sets.join(', ')}
     WHERE id = $1
     RETURNING id, full_name AS "fullName", email, hr_notes AS "hrNotes",
               phone, linkedin_url AS "linkedinUrl", city, state,
               salary_expectation AS "salaryExpectation", availability, source`,
    sqlParams
  );
  if (up.rowCount === 0) return apiError(request, 'NOT_FOUND', 404);

  await audit({
    actorUserId: payload.userId || null,
    action: 'candidate.profile_update',
    targetType: 'candidate',
    targetId: String(id),
  });

  return NextResponse.json(up.rows[0]);
}

export async function DELETE(request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireRole(payload)) return apiError(request, 'UNAUTHORIZED', 401);
  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return apiError(request, 'UNAUTHORIZED', 401);

  const id = params?.id;
  if (!isAdmin) {
    const owned = await query(`SELECT id FROM candidates WHERE id = $1 AND company_id = $2 LIMIT 1`, [id, companyId]);
    if (owned.rowCount === 0) return apiError(request, 'UNAUTHORIZED', 401);
  }
  const cand = await query(`SELECT full_name AS "fullName" FROM candidates WHERE id = $1 LIMIT 1`, [id]);
  if (cand.rowCount === 0) return apiError(request, 'NOT_FOUND', 404);
  const fullName = cand.rows?.[0]?.fullName || null;

  const del = await query(`DELETE FROM candidates WHERE id = $1 RETURNING id`, [id]);
  if (del.rowCount === 0) return apiError(request, 'NOT_FOUND', 404);

  // Best-effort cleanup: legacy table used by /api/results
  if (fullName) {
    await query(`DELETE FROM results WHERE LOWER(name) = LOWER($1)`, [fullName]);
  }

  await audit({
    actorUserId: payload.userId || null,
    action: 'candidate.delete',
    targetType: 'candidate',
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
