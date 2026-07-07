import { NextResponse } from 'next/server';
import { queryRead } from '../../../../lib/db';
import { drawMotivatorsQuestions } from '../../../../lib/ae/draw-questions';
import { toPublicQuestions } from '../../../../lib/ae/to-public-questions';

/**
 * GET /api/ae/questions?definition=motivators
 *
 * Retorna subconjunto aleatório de perguntas do banco (padrão: 30 de ~68).
 * Peso/dimensões das opções não são expostos ao cliente (evita gaming do scoring).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const definition = (searchParams.get('definition') || 'motivators').trim();

    const result = await drawMotivatorsQuestions(queryRead, definition);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      definition: result.definition,
      questions: toPublicQuestions(result.questions),
      meta: result.meta,
    });
  } catch (err) {
    console.error('GET /api/ae/questions', err);
    return NextResponse.json({ error: 'Erro ao carregar perguntas.' }, { status: 500 });
  }
}
