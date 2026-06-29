import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { drawMotivatorsQuestions } from '../../../../lib/ae/draw-questions';
import { upsertCandidate, normalizeEmail } from '../../../../lib/ae/candidate-upsert';
import { toPublicQuestions } from '../../../../lib/ae/to-public-questions';
import { checkRateLimit, clientIpFromRequest } from '../../../../lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/ae/start
 * Inicia sessão: valida convite, sorteia perguntas, cria ae_attempts in_progress.
 */
export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request);
    const rl = checkRateLimit(`ae-start:${ip}`, 30, 10 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const inviteToken = String(body.inviteToken || '').trim();
    const name = String(body.name || '').trim();
    const email = normalizeEmail(body.email);
    const areaKey = String(body.areaKey || '').trim();
    const consent = body.consent === true;

    if (!inviteToken || !name || name.length > 200 || consent !== true) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'E-mail válido é obrigatório.' }, { status: 400 });
    }

    const inv = await query(
      `SELECT i.id, i.company_id AS "companyId", i.definition_id AS "definitionId",
              i.candidate_name AS "inviteName", LOWER(TRIM(i.candidate_email)) AS "inviteEmail",
              i.status, i.expires_at AS "expiresAt", d.slug AS "definitionSlug", d.version
       FROM ae_invites i
       JOIN ae_definitions d ON d.id = i.definition_id
       JOIN companies c ON c.id = i.company_id
       WHERE i.token = $1 AND c.deleted = FALSE AND d.active = TRUE
       LIMIT 1`,
      [inviteToken]
    );
    if (inv.rowCount === 0) {
      return NextResponse.json({ error: 'Convite inválido.' }, { status: 403 });
    }
    const invite = inv.rows[0];
    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Convite expirado.' }, { status: 403 });
    }
    if (invite.status === 'cancelled' || invite.status === 'completed') {
      return NextResponse.json({ error: 'Convite não está mais disponível.' }, { status: 403 });
    }
    if (invite.inviteEmail !== email) {
      return NextResponse.json({ error: 'Use o mesmo e-mail para o qual o convite foi enviado.' }, { status: 400 });
    }

    let areaId = null;
    if (areaKey) {
      const ar = await query(`SELECT id FROM areas WHERE key = $1 LIMIT 1`, [areaKey]);
      if (ar.rowCount > 0) areaId = ar.rows[0].id;
    }

    const cand = await upsertCandidate({
      companyId: invite.companyId,
      fullName: name || invite.inviteName,
      email,
    });
    if (!cand.ok) {
      return NextResponse.json({ error: cand.error }, { status: 400 });
    }

    const drawn = await drawMotivatorsQuestions(query, invite.definitionSlug);
    if (!drawn.ok) {
      return NextResponse.json({ error: drawn.error }, { status: 500 });
    }

    const questionIds = drawn.questions.map((q) => q.id);
    const attempt = await query(
      `INSERT INTO ae_attempts (
         invite_id, definition_id, company_id, candidate_id, area_id,
         status, question_ids, algorithm_version
       ) VALUES ($1, $2, $3, $4, $5, 'in_progress', $6, $7)
       RETURNING id, started_at AS "startedAt"`,
      [
        invite.id,
        invite.definitionId,
        invite.companyId,
        cand.candidateId,
        areaId,
        questionIds,
        String(invite.version || '1'),
      ]
    );

    await query(
      `UPDATE ae_invites SET candidate_id = $2, status = 'opened', opened_at = COALESCE(opened_at, NOW())
       WHERE id = $1`,
      [invite.id, cand.candidateId]
    );

    return NextResponse.json({
      ok: true,
      attemptId: attempt.rows[0].id,
      startedAt: attempt.rows[0].startedAt,
      definition: drawn.definition,
      questions: toPublicQuestions(drawn.questions),
      meta: drawn.meta,
    });
  } catch (err) {
    console.error('POST /api/ae/start', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
