import { NextResponse } from 'next/server';
import { queryRead } from '../../../../lib/db';
import { drawMotivatorsQuestions } from '../../../../lib/ae/draw-questions';

/**
 * GET /api/ae/questions?definition=motivators
 *
 * Retorna subconjunto aleatório de perguntas do banco (padrão: 48 de ~200).
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

    const publicQuestions = result.questions.map((q, index) => {
      const base = {
        sessionIndex: index + 1,
        id: q.id,
        key: q.key,
        text: q.text,
        questionType: q.questionType,
        category: q.category,
      };
      if (q.questionType === 'forced_choice') {
        return {
          ...base,
          options: (q.options || []).map((o) => ({
            id: o.id,
            key: o.key,
            text: o.text,
          })),
        };
      }
      return {
        ...base,
        likertScale: { min: 1, max: 5, minLabel: 'Discordo totalmente', maxLabel: 'Concordo totalmente' },
      };
    });

    return NextResponse.json({
      definition: result.definition,
      questions: publicQuestions,
      meta: result.meta,
    });
  } catch (err) {
    console.error('GET /api/ae/questions', err);
    return NextResponse.json({ error: 'Erro ao carregar perguntas.' }, { status: 500 });
  }
}
