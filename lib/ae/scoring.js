/**
 * Algoritmo de pontuação parametrizável para Motivadores.
 * Normaliza cada dimensão para 0–100 com base no range teórico min/max.
 */
import { aeId } from './ae-id.js';
import { isForcedChoice, isLikert, isRanking } from './normalize-question-type.js';

function answerQuestionId(a) {
  return aeId(a.questionId ?? a.question_id);
}

function answerOptionId(a) {
  return aeId(a.optionId ?? a.option_id);
}

function answerLikertValue(a) {
  const v = a.likertValue ?? a.likert_value;
  return Number(v);
}

/** Ordem escolhida (do mais para o menos importante) em perguntas de ranking. */
function answerRanking(a) {
  const r = a.ranking ?? a.ranked ?? a.order;
  return Array.isArray(r) ? r.map(aeId) : [];
}

/** Pontos por posição: 1º lugar recebe (N-1), último recebe 0. */
function rankPointsFor(positionIndex, optionCount) {
  return Math.max(0, optionCount - 1 - positionIndex);
}

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

    if (isForcedChoice(q)) {
      const dimSet = new Set();
      for (const opt of q.options || []) {
        for (const dim of Object.keys(opt.weights || {})) dimSet.add(dim);
      }
      const dimAccum = {};
      for (const dim of dimSet) {
        let min = Infinity;
        let max = -Infinity;
        for (const opt of q.options || []) {
          const contrib = (parseFloat(opt.weights?.[dim]) || 0) * w;
          min = Math.min(min, contrib);
          max = Math.max(max, contrib);
        }
        if (Number.isFinite(min) && Number.isFinite(max)) {
          registerDim(dimKeys, dim);
          dimAccum[dim] = { min, max };
        }
      }
      qRanges.dims = dimAccum;
    } else if (isRanking(q)) {
      const options = q.options || [];
      const n = options.length;
      const dimAccum = {};
      for (const opt of options) {
        for (const [dim, wt] of Object.entries(opt.weights || {})) {
          const weight = (parseFloat(wt) || 0) * w;
          if (weight === 0) continue;
          registerDim(dimKeys, dim);
          if (!dimAccum[dim]) dimAccum[dim] = { min: 0, max: 0 };
          const contribMax = weight * rankPointsFor(0, n);
          dimAccum[dim].min += Math.min(0, contribMax);
          dimAccum[dim].max += Math.max(0, contribMax);
        }
      }
      qRanges.dims = dimAccum;
    } else if (isLikert(q)) {
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

  const expectedIds = new Set(questions.map((q) => aeId(q.id)));
  const answerByQ = new Map();

  for (const a of answers) {
    const qid = answerQuestionId(a);
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
    const answer = answerByQ.get(aeId(q.id));
    const w = q.weight || 1;

    if (isForcedChoice(q)) {
      const optionId = answerOptionId(answer);
      const opt = (q.options || []).find((o) => aeId(o.id) === optionId);
      if (!opt) return { ok: false, error: `Opção inválida na pergunta ${q.id}.` };
      const weights = opt.weights || {};
      if (Object.keys(weights).length === 0) {
        return { ok: false, error: `Pesos ausentes na opção ${optionId} (pergunta ${q.id}). Execute o seed.` };
      }
      for (const [dim, weight] of Object.entries(weights)) {
        registerDim(dimKeys, dim);
        scores[dim] = (scores[dim] || 0) + weight * w;
      }
    } else if (isRanking(q)) {
      const options = q.options || [];
      const n = options.length;
      const order = answerRanking(answer);
      if (order.length !== n) {
        return { ok: false, error: `Ordenação incompleta na pergunta ${q.id}.` };
      }
      const optById = new Map(options.map((o) => [aeId(o.id), o]));
      const seen = new Set();
      order.forEach((optId, position) => {
        const key = aeId(optId);
        seen.add(key);
        const opt = optById.get(key);
        if (!opt) return;
        const points = rankPointsFor(position, n);
        for (const [dim, wt] of Object.entries(opt.weights || {})) {
          registerDim(dimKeys, dim);
          scores[dim] = (scores[dim] || 0) + (parseFloat(wt) || 0) * w * points;
        }
      });
      if (seen.size !== n) {
        return { ok: false, error: `Ordenação inválida na pergunta ${q.id}.` };
      }
    } else if (isLikert(q)) {
      const val = answerLikertValue(answer);
      if (!Number.isFinite(val) || val < 1 || val > 5) {
        return { ok: false, error: `Valor Likert inválido na pergunta ${q.id}.` };
      }
      const dimensionWeights = q.dimensionWeights || {};
      if (Object.keys(dimensionWeights).length === 0) {
        return { ok: false, error: `Pesos Likert ausentes na pergunta ${q.id}. Execute o seed.` };
      }
      for (const [dim, wpp] of Object.entries(dimensionWeights)) {
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

  const maxNormalized = Math.max(0, ...Object.values(normalized));
  if (maxNormalized === 0 && dimKeys.size > 0) {
    const maxRaw = Math.max(0, ...Object.values(scores));
    if (maxRaw === 0) {
      return {
        ok: false,
        error: 'Não foi possível calcular o perfil: pesos das perguntas ausentes ou inválidos no banco.',
      };
    }
  }

  return {
    ok: true,
    dimensionScores: normalized,
    rawScores: scores,
    ranking,
    topDimensions: ranking.slice(0, 3),
  };
}
