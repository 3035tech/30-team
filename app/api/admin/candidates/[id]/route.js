import { NextResponse } from 'next/server';
import { verifySessionWithCapabilities } from '../../../../../lib/user-capabilities';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '../../../../../lib/auth';
import { query, queryRead } from '../../../../../lib/db';
import { audit } from '../../../../../lib/audit';
import { apiError, ERR } from '../../../../../lib/api-error';
import { normalizeCandidateProfile } from '../../../../../lib/candidate-profile';
import { titleCasePersonName } from '../../../../../lib/person-name';
import { buildCandidateTimeline } from '../../../../../lib/hire';
import { buildCandidatePeopleBrief } from '../../../../../lib/people/candidate-people-brief';
import { isRichTextEmpty, sanitizeRichTextHtml } from '../../../../../lib/sanitize-html';
import { canAccessCandidateRecord, isAdminRole } from '../../../../../lib/permissions';
import { listCandidateOverdueLms } from '../../../../../lib/lms.js';

export async function GET(request, props) {
  const params = await props.params;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!canAccessCandidateRecord(payload)) return apiError(request, ERR.UNAUTHORIZED, 401);
  const isAdmin = isAdminRole(payload);
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return apiError(request, ERR.UNAUTHORIZED, 401);

  const id = params?.id;
  const c = await queryRead(
    `SELECT c.id, c.company_id AS "companyId", c.full_name AS "fullName", c.email,
            c.personal_email AS "personalEmail", c.marital_status AS "maritalStatus",
            c.employee_number AS "employeeNumber", c.work_format AS "workFormat",
            c.work_history AS "workHistory", c.hr_notes AS "hrNotes",
            c.phone, c.linkedin_url AS "linkedinUrl", c.city, c.state,
            c.salary_expectation AS "salaryExpectation", c.availability, c.source,
            c.job_role_id AS "jobRoleId", jr.name AS "jobRoleName",
            c.employment_status AS "employmentStatus",
            c.hired_at AS "hiredAt", c.start_date AS "startDate",
            c.birth_date AS "birthDate",
            c.hired_vacancy_id AS "hiredVacancyId",
            c.consent_at AS "consentAt", c.created_at AS "createdAt",
            c.created_by_user_id AS "createdByUserId",
            u.display_name AS "createdByName",
            c.cv_url AS "cvUrl", c.cv_updated_at AS "cvUpdatedAt",
            (c.cv_extracted_text IS NOT NULL AND c.cv_extracted_text <> '') AS "hasCvText"
     FROM candidates c
     LEFT JOIN job_roles jr ON jr.id = c.job_role_id AND jr.company_id = c.company_id
     LEFT JOIN users u ON u.id = c.created_by_user_id AND u.deleted = FALSE
     WHERE c.id = $1
     LIMIT 1`,
    [id]
  );
  if (c.rowCount === 0) return apiError(request, ERR.NOT_FOUND, 404);
  if (!isAdmin && String(c.rows[0].companyId) !== String(companyId)) {
    return apiError(request, ERR.UNAUTHORIZED, 401);
  }

  const a = await queryRead(
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
            ass.rejection_reason AS "rejectionReason",
            ass.start_date AS "startDate",
            ass.hired_at AS "hiredAt",
            ass.invite_id AS "inviteId",
            ass.fill_duration_ms AS "fillDurationMs",
            ass.copy_event_count AS "copyEventCount"
     FROM assessments ass
     JOIN areas ar ON ar.id = ass.area_id
     LEFT JOIN vacancies v ON v.id = ass.vacancy_id
     WHERE ass.candidate_id = $1
     ORDER BY ass.created_at DESC
     LIMIT 30`,
    [id]
  );

  let historyByAssessment = {};
  if (a.rows.length > 0) {
    const assessmentIds = a.rows.map((r) => r.id);
    try {
      const h = await queryRead(
        `SELECT assessment_id AS "assessmentId", from_stage AS "fromStage", to_stage AS "toStage",
                reason, start_date AS "startDate", changed_at AS "changedAt"
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

  const { searchParams } = new URL(request.url);
  const loc = searchParams.get('locale') === 'en' ? 'en' : 'pt-BR';

  const [timeline, people, lmsOverdue] = await Promise.all([
    buildCandidateTimeline(id).catch((e) => {
      console.error('candidate timeline:', e);
      return [];
    }),
    buildCandidatePeopleBrief(query, {
      candidateId: id,
      companyId: c.rows[0].companyId,
      isAdmin,
      locale: loc,
      scores: assessmentsWithHistory[0]?.scores || null,
      topType: assessmentsWithHistory[0]?.topType ?? null,
    }).catch((e) => {
      console.error('candidate people brief:', e);
      return null;
    }),
    listCandidateOverdueLms(query, {
      companyId: c.rows[0].companyId,
      candidateId: id,
      limit: 5,
    }).catch(() => []),
  ]);

  return NextResponse.json({
    candidate: c.rows[0],
    assessments: assessmentsWithHistory,
    timeline,
    people,
    lmsOverdue,
  });
}

export async function PATCH(request, props) {
  const params = await props.params;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!canAccessCandidateRecord(payload)) return apiError(request, ERR.UNAUTHORIZED, 401);
  const isAdmin = isAdminRole(payload);
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return apiError(request, ERR.UNAUTHORIZED, 401);

  const id = params?.id;
  if (!id) return apiError(request, ERR.INVALID_ID, 400);

  if (!isAdmin) {
    const owned = await query(`SELECT id FROM candidates WHERE id = $1 AND company_id = $2 LIMIT 1`, [id, companyId]);
    if (owned.rowCount === 0) return apiError(request, ERR.UNAUTHORIZED, 401);
  }

  const body = await request.json().catch(() => ({}));
  const profile = normalizeCandidateProfile(body);
  const hasHrNotes = body.hrNotes !== undefined;
  const hasProfile = Object.values(profile).some((v) => v != null);
  const hasName = body.fullName !== undefined || body.name !== undefined;
  const hasBirthDate = body.birthDate !== undefined || body.birth_date !== undefined;
  const hasExtendedProfile = [
    'personalEmail', 'personal_email', 'maritalStatus', 'marital_status',
    'employeeNumber', 'employee_number', 'workFormat', 'work_format',
    'workHistory', 'work_history',
  ].some((key) => body[key] !== undefined);

  if (!hasHrNotes && !hasProfile && !hasName && !hasBirthDate && !hasExtendedProfile) {
    return apiError(request, ERR.NO_FIELDS_TO_UPDATE, 400);
  }

  const sets = [];
  const sqlParams = [id];
  let n = 2;

  if (hasName) {
    const name = titleCasePersonName(body.fullName || body.name).slice(0, 200);
    if (!name) return apiError(request, ERR.CANDIDATE_NAME_REQUIRED, 400);
    sets.push(`full_name = $${n++}`);
    sqlParams.push(name);
  }
  if (hasHrNotes) {
    const notes =
      body.hrNotes == null || body.hrNotes === ''
        ? null
        : sanitizeRichTextHtml(body.hrNotes, 20_000);
    sets.push(`hr_notes = $${n++}`);
    sqlParams.push(notes && !isRichTextEmpty(notes) ? notes : null);
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
  if (body.birthDate !== undefined || body.birth_date !== undefined) {
    const raw = body.birthDate !== undefined ? body.birthDate : body.birth_date;
    let birthDate = null;
    if (raw != null && String(raw).trim() !== '') {
      const s = String(raw).trim().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return apiError(request, ERR.INVALID_DATE, 400);
      }
      birthDate = s;
    }
    sets.push(`birth_date = $${n++}`);
    sqlParams.push(birthDate);
  }
  if (body.personalEmail !== undefined || body.personal_email !== undefined) {
    const value = body.personalEmail !== undefined ? body.personalEmail : body.personal_email;
    sets.push(`personal_email = $${n++}`);
    sqlParams.push(value == null ? null : String(value).trim().slice(0, 240) || null);
  }
  if (body.maritalStatus !== undefined || body.marital_status !== undefined) {
    const value = body.maritalStatus !== undefined ? body.maritalStatus : body.marital_status;
    sets.push(`marital_status = $${n++}`);
    sqlParams.push(value == null ? null : String(value).trim().slice(0, 40) || null);
  }
  if (body.employeeNumber !== undefined || body.employee_number !== undefined) {
    const value = body.employeeNumber !== undefined ? body.employeeNumber : body.employee_number;
    sets.push(`employee_number = $${n++}`);
    sqlParams.push(value == null ? null : String(value).trim().slice(0, 80) || null);
  }
  if (body.workFormat !== undefined || body.work_format !== undefined) {
    const value = body.workFormat !== undefined ? body.workFormat : body.work_format;
    const allowed = new Set(['clt', 'intern', 'cooperative', 'pj']);
    const normalized = value == null ? null : String(value).trim().toLowerCase();
    if (normalized && !allowed.has(normalized)) return apiError(request, ERR.INVALID_DATA, 400);
    sets.push(`work_format = $${n++}`);
    sqlParams.push(normalized || null);
  }
  if (body.workHistory !== undefined || body.work_history !== undefined) {
    const value = body.workHistory !== undefined ? body.workHistory : body.work_history;
    sets.push(`work_history = $${n++}`);
    sqlParams.push(value == null ? null : String(value).trim().slice(0, 4000) || null);
  }

  if (sets.length === 0) return apiError(request, ERR.NO_FIELDS_TO_UPDATE, 400);

  const up = await query(
    `UPDATE candidates SET ${sets.join(', ')}
     WHERE id = $1
     RETURNING id, full_name AS "fullName", email,
               personal_email AS "personalEmail", marital_status AS "maritalStatus",
               employee_number AS "employeeNumber", work_format AS "workFormat",
               work_history AS "workHistory", hr_notes AS "hrNotes",
               phone, linkedin_url AS "linkedinUrl", city, state,
               salary_expectation AS "salaryExpectation", availability, source,
               birth_date AS "birthDate", start_date AS "startDate"`,
    sqlParams
  );
  if (up.rowCount === 0) return apiError(request, ERR.NOT_FOUND, 404);

  await audit({
    actorUserId: payload.userId || null,
    action: 'candidate.profile_update',
    targetType: 'candidate',
    targetId: String(id),
  });

  return NextResponse.json(up.rows[0]);
}

export async function DELETE(request, props) {
  const params = await props.params;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!canAccessCandidateRecord(payload)) return apiError(request, ERR.UNAUTHORIZED, 401);
  const isAdmin = isAdminRole(payload);
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return apiError(request, ERR.UNAUTHORIZED, 401);

  const id = params?.id;
  if (!isAdmin) {
    const owned = await query(`SELECT id FROM candidates WHERE id = $1 AND company_id = $2 LIMIT 1`, [id, companyId]);
    if (owned.rowCount === 0) return apiError(request, ERR.UNAUTHORIZED, 401);
  }
  const cand = await query(`SELECT full_name AS "fullName" FROM candidates WHERE id = $1 LIMIT 1`, [id]);
  if (cand.rowCount === 0) return apiError(request, ERR.NOT_FOUND, 404);
  const fullName = cand.rows?.[0]?.fullName || null;

  const del = await query(`DELETE FROM candidates WHERE id = $1 RETURNING id`, [id]);
  if (del.rowCount === 0) return apiError(request, ERR.NOT_FOUND, 404);

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
