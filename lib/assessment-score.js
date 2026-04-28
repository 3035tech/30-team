import { QUESTION_BANK, QUESTIONS_PER_TYPE } from './data.js';

const ANSWER_MIN = 1;
const ANSWER_MAX = 5;
const EXPECTED_COUNT = 9 * QUESTIONS_PER_TYPE;

const byQuestionId = new Map(QUESTION_BANK.map((q) => [q.id, q]));

function toInt(n) {
  if (typeof n === 'number' && Number.isInteger(n)) return n;
  if (typeof n === 'string' && n.trim() !== '') {
    const x = parseInt(n, 10);
    if (Number.isInteger(x)) return x;
  }
  return NaN;
}

/**
 * Valida respostas (uma por questão do banco) e calcula scores + topType no servidor.
 * Mesma regra do cliente: soma dos valores por tipo; empate → menor número de tipo.
 */
export function computeAssessmentFromAnswers(answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return { ok: false, error: 'Formato de respostas inválido' };
  }

  const entries = [];
  for (const [key, raw] of Object.entries(answers)) {
    const qId = toInt(key);
    if (!Number.isInteger(qId) || qId < 1) {
      return { ok: false, error: 'Identificador de questão inválido' };
    }
    const val = toInt(raw);
    if (!Number.isInteger(val) || val < ANSWER_MIN || val > ANSWER_MAX) {
      return { ok: false, error: 'Valor de resposta inválido' };
    }
    const q = byQuestionId.get(qId);
    if (!q) {
      return { ok: false, error: 'Questão não reconhecida' };
    }
    entries.push({ qId, type: q.type, val });
  }

  if (entries.length !== EXPECTED_COUNT) {
    return { ok: false, error: `É necessário responder todas as questões (${EXPECTED_COUNT})` };
  }

  const seen = new Set();
  const perType = {};
  for (let t = 1; t <= 9; t++) perType[t] = 0;

  for (const e of entries) {
    if (seen.has(e.qId)) {
      return { ok: false, error: 'Resposta duplicada para a mesma questão' };
    }
    seen.add(e.qId);
    perType[e.type] += 1;
  }

  for (let t = 1; t <= 9; t++) {
    if (perType[t] !== QUESTIONS_PER_TYPE) {
      return { ok: false, error: 'Conjunto de questões inválido para o teste' };
    }
  }

  const scores = {};
  for (let t = 1; t <= 9; t++) scores[t] = 0;
  for (const e of entries) {
    scores[e.type] += e.val;
  }

  const topType = parseInt(
    Object.entries(scores)
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return parseInt(a[0], 10) - parseInt(b[0], 10);
      })[0][0],
    10
  );

  return { ok: true, scores, topType };
}
