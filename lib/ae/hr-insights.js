/**
 * Insights e sugestões de ação para RH/gestor (painel admin).
 * Usa ranking relativo — não exige score ≥ 70 como os templates salvos no banco.
 */

const ACTIONS_BY_DIMENSION = {
  autonomia: {
    do: 'Delegue projetos e dê autonomia na execução, com metas claras.',
    avoid: 'Evite microgerenciamento e controle excessivo de tarefas.',
  },
  reconhecimento: {
    do: 'Reconheça conquistas publicamente e de forma frequente.',
    avoid: 'Evite falta de feedback e ignorar entregas de qualidade.',
  },
  desenvolvimento: {
    do: 'Ofereça treinamentos, mentorias e plano de desenvolvimento individual.',
    avoid: 'Evite estagnação sem oportunidades de aprendizado.',
  },
  desafio: {
    do: 'Atribua projetos desafiadores com impacto visível.',
    avoid: 'Evite rotina excessiva sem novos desafios.',
  },
  crescimento: {
    do: 'Discuta plano de carreira e próximos passos com regularidade.',
    avoid: 'Evite bloquear promoções sem explicar critérios.',
  },
  relacionamentos: {
    do: 'Promova trabalho em equipe e momentos de conexão entre colegas.',
    avoid: 'Evite ambiente isolado ou conflitos não mediados.',
  },
  flexibilidade: {
    do: 'Ofereça flexibilidade de horário e local quando possível.',
    avoid: 'Evite políticas rígidas sem necessidade operacional.',
  },
  proposito: {
    do: 'Conecte as entregas ao impacto e à missão da empresa.',
    avoid: 'Evite tarefas desconectadas do propósito maior.',
  },
  seguranca: {
    do: 'Comunique mudanças com antecedência e mantenha previsibilidade.',
    avoid: 'Evite mudanças bruscas sem comunicação e contexto.',
  },
  financeiro: {
    do: 'Revise remuneração e benefícios em relação ao mercado periodicamente.',
    avoid: 'Evite descompasso salarial sem transparência.',
  },
  lideranca: {
    do: 'Ofereça oportunidades de liderar iniciativas ou mentorar colegas.',
    avoid: 'Evite limitar participação em decisões sem justificativa.',
  },
  criatividade: {
    do: 'Dê espaço para propor ideias, experimentar e inovar nas soluções.',
    avoid: 'Evite processos engessados e tarefas puramente repetitivas.',
  },
  equilibrio: {
    do: 'Respeite limites de horário e apoie o equilíbrio com a vida pessoal.',
    avoid: 'Evite sobrecarga contínua e demandas fora do horário sem necessidade.',
  },
};

function labelFor(key, dimensions = []) {
  return dimensions.find((d) => d.key === key)?.label || key;
}

/**
 * @param {{ ranking?: string[], dimensionScores?: Record<string, number>, dimensions?: Array<{ key: string, label: string, color?: string }> }} input
 */
export function buildHrInsights({ ranking = [], dimensionScores = {}, dimensions = [] }) {
  const ranked = (ranking.length ? ranking : Object.keys(dimensionScores))
    .map((key) => ({
      key,
      label: labelFor(key, dimensions),
      color: dimensions.find((d) => d.key === key)?.color,
      score: dimensionScores[key] ?? 0,
    }))
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

  const topMotivators = ranked.filter((d) => d.score > 0).slice(0, 3);
  const maxScore = ranked[0]?.score ?? 0;

  const suggestedDo = [];
  const suggestedAvoid = [];
  for (const dim of topMotivators) {
    const actions = ACTIONS_BY_DIMENSION[dim.key];
    if (!actions) continue;
    suggestedDo.push({ dimension: dim.label, dimensionKey: dim.key, text: actions.do });
    suggestedAvoid.push({ dimension: dim.label, dimensionKey: dim.key, text: actions.avoid });
  }

  let summaryNote = '';
  if (topMotivators.length === 0) {
    summaryNote =
      'Scores baixos ou uniformes — vale uma conversa 1:1 para validar motivadores antes de definir ações.';
  } else if (maxScore < 40) {
    summaryNote = `Motivadores principais ainda moderados (máx. ${maxScore}/100). Use as sugestões abaixo como ponto de partida na conversa com o colaborador.`;
  } else if (topMotivators.length >= 2 && topMotivators[0].score - topMotivators[1].score <= 10) {
    summaryNote = `Perfil com destaque equilibrado entre ${topMotivators.map((d) => d.label).join(' e ')}. Combine abordagens nas duas frentes.`;
  } else {
    summaryNote = `Foco principal em ${topMotivators[0].label} (${topMotivators[0].score}/100). Priorize ações alinhadas a essa dimensão.`;
  }

  const lowDimensions = ranked.filter((d) => d.score === 0).slice(0, 3);

  return {
    topMotivators,
    lowDimensions,
    suggestedActions: { do: suggestedDo, avoid: suggestedAvoid },
    summaryNote,
    maxScore,
  };
}
