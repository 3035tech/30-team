import { NextResponse } from 'next/server';
import { query, queryRead } from '../../../lib/db';
import { verifyToken, COOKIE_NAME } from '../../../lib/auth';
import { cookies } from 'next/headers';
import { computeAssessmentFromAnswers } from '../../../lib/assessment-score';
import { checkRateLimit, clientIpFromRequest } from '../../../lib/rate-limit';
import { apiError } from '../../../lib/api-error';
import { upsertCandidate } from '../../../lib/ae/candidate-upsert';
import { normalizeCandidateProfile } from '../../../lib/candidate-profile';

function normalizeEmail(email) {
  const e = (email || '').trim();
  return e.length ? e.toLowerCase() : null;
}

// POST /api/results — salva resultado de um candidato (com área)
export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request);
    const rl = checkRateLimit(`results:${ip}`, 40, 10 * 60 * 1000);
    if (!rl.ok) {
      return apiError(request, 'RATE_LIMIT', 429, {}, { headers: { 'Retry-After': String(rl.retryAfterSec) } });
    }

    const body = await request.json().catch(() => ({}));
    const { name, email, areaKey, consent, answers, companyToken, vacancyToken, inviteToken: rawInviteToken } = body;
    const inviteToken = String(rawInviteToken || '').trim();
    const safeEmail = normalizeEmail(email);

    // Telemetria soft (anti-IA / cópia): opcional, validada no servidor.
    const MAX_FILL_MS = 24 * 60 * 60 * 1000;
    let fillDurationMs = null;
    if (body.fillDurationMs != null && body.fillDurationMs !== '') {
      const n = Number(body.fillDurationMs);
      if (Number.isFinite(n) && n >= 0 && n <= MAX_FILL_MS) fillDurationMs = Math.round(n);
    }
    let copyEventCount = 0;
    if (body.copyEventCount != null && body.copyEventCount !== '') {
      const n = Number(body.copyEventCount);
      if (Number.isFinite(n) && n >= 0) copyEventCount = Math.min(9999, Math.round(n));
    }

    if ((!companyToken && !vacancyToken) || !name || !areaKey || consent !== true) {
      return apiError(request, 'INCOMPLETE_DATA', 400);
    }

    const scored = computeAssessmentFromAnswers(answers);
    if (!scored.ok) {
      return apiError(request, scored.errorCode, 400, scored.values);
    }
    const { topType, scores } = scored;

    let companyId = null;
    let resolvedVacancyId = null;
    let resolvedInviteId = null;

    if (vacancyToken) {
      const token = String(vacancyToken || '').trim();
      const link = await query(
        `SELECT v.id AS "vacancyId", v.company_id AS "companyId", v.status,
                COALESCE(l.require_candidate_email, FALSE) AS "requireCandidateEmail"
         FROM vacancy_links l
         JOIN vacancies v ON v.id = l.vacancy_id
         JOIN companies c ON c.id = v.company_id
         WHERE l.token = $1 AND l.active = TRUE AND l.expires_at > NOW()
           AND v.deleted = FALSE AND c.deleted = FALSE
         LIMIT 1`,
        [token]
      );
      if (link.rowCount === 0) {
        return apiError(request, 'EXPIRED_LINK', 403);
      }
      if (String(link.rows[0].status || '') === 'closed') {
        return apiError(request, 'CLOSED_VACANCY', 403);
      }
      companyId = link.rows[0].companyId;
      resolvedVacancyId = link.rows[0].vacancyId;
      if (!safeEmail) {
        return apiError(request, 'REQUIRED_VACANCY_EMAIL', 400);
      }

      if (inviteToken) {
        const inv = await query(
          `SELECT ci.id, ci.vacancy_id AS "vacancyId", LOWER(TRIM(ci.candidate_email)) AS "inviteEmail"
           FROM candidate_invites ci
           WHERE ci.token = $1 AND ci.status IN ('sent', 'opened')
           LIMIT 1`,
          [inviteToken]
        );
        if (inv.rowCount === 0) {
          return apiError(request, 'INVITE_INVALID', 400);
        }
        const invRow = inv.rows[0];
        if (Number(invRow.vacancyId) !== Number(resolvedVacancyId)) {
          return apiError(request, 'INVITE_INVALID', 400);
        }
        if (invRow.inviteEmail !== safeEmail) {
          return apiError(request, 'INVITE_EMAIL_MISMATCH', 400);
        }
        resolvedInviteId = invRow.id;
      }
    } else {
      const token = String(companyToken || '').trim();
      const link = await query(
        `SELECT l.company_id AS "companyId",
                COALESCE(l.require_candidate_email, FALSE) AS "requireCandidateEmail"
         FROM company_links l
         JOIN companies c ON c.id = l.company_id
         WHERE l.token = $1 AND l.active = TRUE AND l.expires_at > NOW()
           AND c.deleted = FALSE
         LIMIT 1`,
        [token]
      );
      if (link.rowCount === 0) {
        return apiError(request, 'EXPIRED_LINK', 403);
      }
      companyId = link.rows[0].companyId;
      if (!safeEmail) {
        return apiError(request, 'REQUIRED_CONTACT_EMAIL', 400);
      }
    }

    const safeName = name.trim();

    const areaRes = await query(`SELECT id FROM areas WHERE key = $1 LIMIT 1`, [areaKey]);
    if (areaRes.rowCount === 0) {
      return apiError(request, 'INVALID_AREA', 400);
    }
    const areaId = areaRes.rows[0].id;

    // Candidate upsert (prefer email; otherwise best-effort by name)
    const profile = normalizeCandidateProfile(body);
    const up = await upsertCandidate({
      companyId,
      fullName: safeName,
      email: safeEmail,
      profile,
    });
    if (!up.ok) return apiError(request, up.errorCode || 'INCOMPLETE_DATA', 400);
    const candidateId = up.candidateId;

    // Company link (/t/…) is for the internal team — mark as employee (not recruiting).
    if (!resolvedVacancyId) {
      await query(
        `UPDATE candidates
         SET employment_status = 'employee'
         WHERE id = $1
           AND employment_status = 'candidate'`,
        [candidateId]
      );
    }

    if (resolvedVacancyId) {
      const existingAssessment = await query(
        `SELECT 1
         FROM assessments
         WHERE candidate_id = $1 AND vacancy_id = $2
         LIMIT 1`,
        [candidateId, resolvedVacancyId]
      );
      if (existingAssessment.rowCount > 0) {
        return apiError(request, 'DUPLICATE_VACANCY_SUBMISSION', 409);
      }
    }

    const assessment = resolvedVacancyId
      ? await query(
          `INSERT INTO assessments (candidate_id, company_id, area_id, top_type, scores, vacancy_id, invite_id, pipeline_stage, fill_duration_ms, copy_event_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'test_completed', $8, $9)
           RETURNING id, created_at AS "createdAt"`,
          [candidateId, companyId, areaId, topType, JSON.stringify(scores), resolvedVacancyId, resolvedInviteId, fillDurationMs, copyEventCount]
        )
      : await query(
          `INSERT INTO assessments (candidate_id, company_id, area_id, top_type, scores, fill_duration_ms, copy_event_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, created_at AS "createdAt"`,
          [candidateId, companyId, areaId, topType, JSON.stringify(scores), fillDurationMs, copyEventCount]
        );

    if (resolvedInviteId) {
      await query(
        `UPDATE candidate_invites SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [resolvedInviteId]
      );
    }

    // Legado: `results` usa UNIQUE global em LOWER(name) — colide entre empresas/candidatos.
    // Mantido só se LEGACY_RESULTS_WRITE=true (scripts/dashboards antigos).
    if (process.env.LEGACY_RESULTS_WRITE === 'true') {
      await query(
        `INSERT INTO results (name, top_type, scores)
         VALUES ($1, $2, $3)
         ON CONFLICT (LOWER(name))
         DO UPDATE SET top_type = $2, scores = $3, created_at = NOW()`,
        [safeName, topType, JSON.stringify(scores)]
      );
    }

    return NextResponse.json(
      {
        ok: true,
        candidateId,
        assessmentId: assessment.rows[0].id,
        createdAt: assessment.rows[0].createdAt,
        ...(resolvedVacancyId != null ? { vacancyId: resolvedVacancyId } : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao salvar resultado:', error);
    return apiError(request, 'INTERNAL', 500);
  }
}

// GET /api/results — legado: tabela `results` (global por nome). Preferir dados do dashboard via assessments.
export async function GET(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload?.role !== 'admin') {
    return apiError(request, 'UNAUTHORIZED', 401);
  }

  try {
    const result = await queryRead(
      `SELECT id, name, top_type AS "topType", scores, created_at AS "createdAt"
       FROM results
       ORDER BY created_at DESC`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar resultados:', error);
    return apiError(request, 'INTERNAL', 500);
  }
}
