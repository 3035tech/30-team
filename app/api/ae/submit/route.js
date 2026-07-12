import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { loadQuestionsForScoring } from '../../../../lib/ae/load-questions-for-scoring';
import { computeMotivatorScores } from '../../../../lib/ae/scoring';
import { resolveResultTextsFromDb } from '../../../../lib/ae/templates';
import { checkRateLimit, clientIpFromRequest } from '../../../../lib/rate-limit';
import { AE_SCORING_ENGINE_VERSION } from '../../../../lib/ae/ae-id';
import { bootstrapMotivators } from '../../../../lib/ae/bootstrap-motivators';
import { formatScoringFailure, summarizeScoringInput } from '../../../../lib/ae/scoring-diagnostics';
import { apiError } from '../../../../lib/api-error';

/**
 * POST /api/ae/submit
 * Finaliza tentativa: pontua, gera perfil e recomendações.
 */
export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request);
    const rl = checkRateLimit(`ae-submit:${ip}`, 30, 10 * 60 * 1000);
    if (!rl.ok) {
      return apiError(request, 'RATE_LIMIT_SHORT', 429);
    }

    const body = await request.json().catch(() => ({}));
    const attemptId = Number(body.attemptId);
    const answers = body.answers;
    const locale = body.locale === 'en' ? 'en' : 'pt-BR';

    if (!Number.isFinite(attemptId) || !Array.isArray(answers)) {
      return apiError(request, 'INVALID_DATA', 400);
    }

    const att = await query(
      `SELECT a.id, a.status, a.definition_id AS "definitionId", a.invite_id AS "inviteId",
              a.question_ids AS "questionIds", a.company_id AS "companyId"
       FROM ae_attempts a
       WHERE a.id = $1
       LIMIT 1`,
      [attemptId]
    );
    if (att.rowCount === 0) {
      return apiError(request, 'SESSION_NOT_FOUND', 404);
    }
    const attempt = att.rows[0];
    if (attempt.status !== 'in_progress') {
      return apiError(request, 'SESSION_DONE', 409);
    }

    let questions = await loadQuestionsForScoring(query, attempt.questionIds);
    let diagnostics = summarizeScoringInput(questions, answers);
    let scored = computeMotivatorScores({ questions, answers });

    if (!scored.ok || formatScoringFailure(scored, diagnostics)) {
      await bootstrapMotivators(query, { repairWeights: true });
      questions = await loadQuestionsForScoring(query, attempt.questionIds);
      diagnostics = summarizeScoringInput(questions, answers);
      scored = computeMotivatorScores({ questions, answers });
    }

    if (!scored.ok) {
      return NextResponse.json({ error: scored.error }, { status: 400 });
    }
    const scoringFailure = formatScoringFailure(scored, diagnostics);
    if (scoringFailure) {
      return NextResponse.json({ error: scoringFailure }, { status: 400 });
    }

    const texts = await resolveResultTextsFromDb(query, attempt.definitionId, scored, locale);

    await query(
      `UPDATE ae_attempts SET
         status = 'completed',
         completed_at = NOW(),
         dimension_scores = $2::jsonb,
         ranking = $3::jsonb,
         profile_summary = $4,
         manager_recommendations = $5::jsonb,
         answers = $6::jsonb,
         algorithm_version = $7
       WHERE id = $1`,
      [
        attemptId,
        JSON.stringify(scored.dimensionScores),
        JSON.stringify(scored.ranking),
        texts.profileSummary,
        JSON.stringify(texts.managerRecommendations),
        JSON.stringify(answers),
        AE_SCORING_ENGINE_VERSION,
      ]
    );

    if (attempt.inviteId) {
      await query(
        `UPDATE ae_invites SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [attempt.inviteId]
      );
    }

    return NextResponse.json({
      ok: true,
      attemptId,
    });
  } catch (err) {
    console.error('POST /api/ae/submit', err);
    return apiError(request, 'INTERNAL', 500);
  }
}
