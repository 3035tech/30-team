/**
 * Algoritmo de pontuação parametrizável para Motivadores.
 * Normaliza cada dimensão para 0–100 com base no range teórico min/max.
 */

function initRange(dimKeys) {
  const scores = {};
  const minPossible = {};
  const maxPossible = {};
  for (const k of dimKeys) {
    scores[k] = 0;
    minPossible[k] = 0;
    maxPossible[k] = 0;
  }
  return { scores, minPossible, maxPossible };
}

function registerDim(dimKeys, key) {
  if (!dimKeys.has(key)) dimKeys.add(key);
}

function addRange(minPossible, maxPossible, dim, minVal, maxVal) {
  if (minPossible[dim] === undefined) {
    minPossible[dim] = minVal;
    maxPossible[dim] = maxVal;
  } else {
    minPossible[dim] += minVal;
    maxPossible[dim] += maxVal;
  }
}

function buildQuestionRanges(questions) {
  const dimKeys = new Set();
  const perQuestion = [];

  for (const q of questions) {
    const w = q.weight || 1;
    const qRanges = { id: q.id, questionType: q.questionType, weight: w, dims: {} };

    if (q.questionType === 'forced_choice') {
      const dimAccum = {};
      for (const opt of q.options || []) {
        for (const [dim, weight] of Object.entries(opt.weights || {})) {
          registerDim(dimKeys, dim);
          const contrib = weight * w;
          if (!dimAccum[dim]) dimAccum[dim] = { min: contrib, max: contrib };
          else {
            dimAccum[dim].min = Math.min(dimAccum[dim].min, contrib);
            dimAccum[dim].max = Math.max(dimAccum[dim].max, contrib);
          }
        }
      }
      qRanges.dims = dimAccum;
    } else if (q.questionType === 'likert') {
      for (const [dim, wpp] of Object.entries(q.dimensionWeights || {})) {
        registerDim(dimKeys, dim);
        const minV = 1 * wpp * w;
        const maxV = 5 * wpp * w;
        qRanges.dims[dim] = {
          min: Math.min(minV, maxV),
          max: Math.max(minV, maxV),
        };
      }
    }
    perQuestion.push(qRanges);
  }

  const { minPossible, maxPossible } = initRange(dimKeys);
  for (const qr of perQuestion) {
    for (const [dim, range] of Object.entries(qr.dims)) {
      addRange(minPossible, maxPossible, dim, range.min, range.max);
    }
  }

  return { dimKeys, minPossible, maxPossible, perQuestion };
}

/**
 * @param {{ questions: object[], answers: Array<{ questionId: number, optionId?: number, likertValue?: number }> }} input
 */
export function computeMotivatorScores({ questions, answers }) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { ok: false, error: 'Nenhuma pergunta para pontuar.' };
  }
  if (!Array.isArray(answers) || answers.length === 0) {
    return { ok: false, error: 'Respostas ausentes.' };
  }

  const questionById = new Map(questions.map((q) => [Number(q.id), q]));
  const expectedIds = new Set(questions.map((q) => Number(q.id)));
  const answerByQ = new Map();

  for (const a of answers) {
    const qid = Number(a.questionId);
    if (!expectedIds.has(qid)) {
      return { ok: false, error: `Resposta inválida para pergunta ${qid}.` };
    }
    if (answerByQ.has(qid)) {
      return { ok: false, error: `Resposta duplicada para pergunta ${qid}.` };
    }
    answerByQ.set(qid, a);
  }

  if (answerByQ.size !== expectedIds.size) {
    return { ok: false, error: 'Responda todas as perguntas da sessão.' };
  }

  const { dimKeys, minPossible, maxPossible } = buildQuestionRanges(questions);
  const { scores } = initRange(dimKeys);

  for (const q of questions) {
    const answer = answerByQ.get(Number(q.id));
    const w = q.weight || 1;

    if (q.questionType === 'forced_choice') {
      const optionId = Number(answer.optionId);
      const opt = (q.options || []).find((o) => Number(o.id) === optionId);
      if (!opt) return { ok: false, error: `Opção inválida na pergunta ${q.id}.` };
      for (const [dim, weight] of Object.entries(opt.weights || {})) {
        registerDim(dimKeys, dim);
        scores[dim] = (scores[dim] || 0) + weight * w;
      }
    } else if (q.questionType === 'likert') {
      const val = Number(answer.likertValue);
      if (!Number.isFinite(val) || val < 1 || val > 5) {
        return { ok: false, error: `Valor Likert inválido na pergunta ${q.id}.` };
      }
      for (const [dim, wpp] of Object.entries(q.dimensionWeights || {})) {
        registerDim(dimKeys, dim);
        scores[dim] = (scores[dim] || 0) + val * wpp * w;
      }
    }
  }

  const normalized = {};
  for (const dim of dimKeys) {
    const min = minPossible[dim] ?? 0;
    const max = maxPossible[dim] ?? 0;
    const range = max - min;
    if (range <= 0) {
      normalized[dim] = 0;
    } else {
      normalized[dim] = Math.round(Math.max(0, Math.min(100, ((scores[dim] - min) / range) * 100)));
    }
  }

  const ranking = [...dimKeys].sort((a, b) => {
    const diff = (normalized[b] || 0) - (normalized[a] || 0);
    return diff !== 0 ? diff : a.localeCompare(b);
  });

  return {
    ok: true,
    dimensionScores: normalized,
    rawScores: scores,
    ranking,
    topDimensions: ranking.slice(0, 3),
  };
}
