import { NextResponse } from 'next/server';
import { query, queryRead } from '../../../lib/db';
import { verifyToken, COOKIE_NAME } from '../../../lib/auth';
import { cookies } from 'next/headers';
import { computeAssessmentFromAnswers } from '../../../lib/assessment-score';
import { checkRateLimit, clientIpFromRequest } from '../../../lib/rate-limit';

const DUPLICATE_VACANCY_MESSAGE =
  'Já existe um teste respondido com este e-mail para esta vaga. Para refazer, avise o RH para excluir o teste já feito.';

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
      return NextResponse.json(
        { errorCode: 'RATE_LIMIT', error: 'Muitas tentativas. Aguarde e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { name, email, areaKey, consent, answers, companyToken, vacancyToken, inviteToken: rawInviteToken } = body;
    const inviteToken = String(rawInviteToken || '').trim();
    const safeEmail = normalizeEmail(email);

    if ((!companyToken && !vacancyToken) || !name || !areaKey || consent !== true) {
      return NextResponse.json({ errorCode: 'INCOMPLETE_DATA', error: 'Dados incompletos' }, { status: 400 });
    }

    const scored = computeAssessmentFromAnswers(answers);
    if (!scored.ok) {
      return NextResponse.json({ error: scored.error }, { status: 400 });
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
        return NextResponse.json({ errorCode: 'EXPIRED_LINK', error: 'Link inválido ou expirado' }, { status: 403 });
      }
      if (String(link.rows[0].status || '') === 'closed') {
        return NextResponse.json({ errorCode: 'CLOSED_VACANCY', error: 'Essa vaga não está mais aberta' }, { status: 403 });
      }
      companyId = link.rows[0].companyId;
      resolvedVacancyId = link.rows[0].vacancyId;
      if (!safeEmail) {
        return NextResponse.json(
          { errorCode: 'REQUIRED_VACANCY_EMAIL', error: 'Este link exige e-mail para validar se já existe uma resposta para esta vaga.' },
          { status: 400 }
        );
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
          return NextResponse.json(
            { errorCode: 'INVITE_INVALID', error: 'Convite inválido ou já utilizado.' },
            { status: 400 }
          );
        }
        const invRow = inv.rows[0];
        if (Number(invRow.vacancyId) !== Number(resolvedVacancyId)) {
          return NextResponse.json(
            { errorCode: 'INVITE_INVALID', error: 'Este convite não corresponde a esta vaga.' },
            { status: 400 }
          );
        }
        if (invRow.inviteEmail !== safeEmail) {
          return NextResponse.json(
            { errorCode: 'INVITE_EMAIL_MISMATCH', error: 'Use o mesmo e-mail para o qual o convite foi enviado.' },
            { status: 400 }
          );
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
        return NextResponse.json({ errorCode: 'EXPIRED_LINK', error: 'Link inválido ou expirado' }, { status: 403 });
      }
      companyId = link.rows[0].companyId;
      if (link.rows[0].requireCandidateEmail && !safeEmail) {
        return NextResponse.json(
          { errorCode: 'REQUIRED_CONTACT_EMAIL', error: 'Este link exige e-mail para que o RH possa retornar o contato.' },
          { status: 400 }
        );
      }
    }

    const safeName = name.trim();

    const areaRes = await query(`SELECT id FROM areas WHERE key = $1 LIMIT 1`, [areaKey]);
    if (areaRes.rowCount === 0) {
      return NextResponse.json({ errorCode: 'INVALID_AREA', error: 'Área inválida' }, { status: 400 });
    }
    const areaId = areaRes.rows[0].id;

    // Candidate upsert (prefer email; otherwise best-effort by name)
    let candidateId = null;
    if (safeEmail) {
      const up = await query(
        `INSERT INTO candidates (company_id, full_name, email, consent_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (company_id, LOWER(email)) WHERE email IS NOT NULL
         DO UPDATE SET full_name = EXCLUDED.full_name, consent_at = NOW()
         RETURNING id`,
        [companyId, safeName, safeEmail]
      );
      candidateId = up.rows[0].id;
    } else {
      const existing = await query(
        `SELECT id
         FROM candidates
         WHERE company_id = $1 AND LOWER(full_name) = LOWER($2) AND (email IS NULL OR email = '')
         ORDER BY created_at DESC
         LIMIT 1`,
        [companyId, safeName]
      );
      if (existing.rowCount > 0) {
        candidateId = existing.rows[0].id;
      } else {
        const ins = await query(
          `INSERT INTO candidates (company_id, full_name, consent_at) VALUES ($1, $2, NOW()) RETURNING id`,
          [companyId, safeName]
        );
        candidateId = ins.rows[0].id;
      }
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
        return NextResponse.json({ errorCode: 'DUPLICATE_VACANCY_SUBMISSION', error: DUPLICATE_VACANCY_MESSAGE }, { status: 409 });
      }
    }

    const assessment = resolvedVacancyId
      ? await query(
          `INSERT INTO assessments (candidate_id, company_id, area_id, top_type, scores, vacancy_id, invite_id, pipeline_stage)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'test_completed')
           RETURNING id, created_at AS "createdAt"`,
          [candidateId, companyId, areaId, topType, JSON.stringify(scores), resolvedVacancyId, resolvedInviteId]
        )
      : await query(
          `INSERT INTO assessments (candidate_id, company_id, area_id, top_type, scores)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, created_at AS "createdAt"`,
          [candidateId, companyId, areaId, topType, JSON.stringify(scores)]
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
    return NextResponse.json({ errorCode: 'INTERNAL', error: 'Erro interno' }, { status: 500 });
  }
}

// GET /api/results — legado: tabela `results` (global por nome). Preferir dados do dashboard via assessments.
export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload?.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
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
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
