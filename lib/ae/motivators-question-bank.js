/**
 * Gera o banco de ~200 perguntas do assessment de Motivadores.
 * Forced choice: templates × contextos. Likert: afirmações por dimensão.
 */

const CONTEXTS = [
  'Ao refletir sobre o que te mantém engajado no trabalho,',
  'Em um momento de decisão sobre sua trajetória na empresa,',
  'Quando pensa no que valoriza no dia a dia profissional,',
  'Considerando o que mais influencia sua satisfação no trabalho,',
  'Ao imaginar um cenário ideal de carreira nos próximos anos,',
  'Em uma conversa honesta sobre motivação profissional,',
  'Pensando no que faria você permanecer na organização,',
  'Ao avaliar o que realmente importa na sua rotina de trabalho,',
];

/** @type {Array<{ stem: string, category: string, options: Array<{ text: string, weights: Record<string, number> }> }>} */
const FORCED_TEMPLATES = [
  {
    stem: 'após concluir um grande projeto com sucesso, o que mais lhe deixaria satisfeito?',
    category: 'resultado',
    options: [
      { text: 'Receber um bônus ou aumento salarial', weights: { financeiro: 4, reconhecimento: 1 } },
      { text: 'Ser promovido ou assumir maior responsabilidade', weights: { crescimento: 4, lideranca: 2 } },
      { text: 'Receber reconhecimento público pela entrega', weights: { reconhecimento: 4, relacionamentos: 1 } },
      { text: 'Liderar um novo projeto desafiador', weights: { desafio: 4, autonomia: 2, lideranca: 2 } },
    ],
  },
  {
    stem: 'o que mais pesaria ao escolher permanecer na empresa?',
    category: 'retencao',
    options: [
      { text: 'Estabilidade e previsibilidade de longo prazo', weights: { seguranca: 4, financeiro: 2 } },
      { text: 'Cultura forte e boas relações com colegas', weights: { relacionamentos: 4, proposito: 1 } },
      { text: 'Oportunidades claras de crescimento', weights: { crescimento: 4, desenvolvimento: 2 } },
      { text: 'Liberdade para organizar como trabalho', weights: { autonomia: 4, flexibilidade: 3 } },
    ],
  },
  {
    stem: 'qual benefício teria maior impacto no seu engajamento?',
    category: 'beneficios',
    options: [
      { text: 'Plano de saúde e benefícios robustos', weights: { financeiro: 3, seguranca: 4 } },
      { text: 'Horário flexível e trabalho remoto', weights: { flexibilidade: 4, autonomia: 2 } },
      { text: 'Budget para cursos e certificações', weights: { desenvolvimento: 4, crescimento: 2 } },
      { text: 'Programa de reconhecimento e premiações', weights: { reconhecimento: 4, financeiro: 1 } },
    ],
  },
  {
    stem: 'o que mais te motivaria a aceitar um novo desafio interno?',
    category: 'desafio',
    options: [
      { text: 'Problema complexo que exige criatividade', weights: { desafio: 4, desenvolvimento: 2 } },
      { text: 'Chance de liderar pessoas e influenciar resultados', weights: { lideranca: 4, crescimento: 2 } },
      { text: 'Impacto visível na missão da empresa', weights: { proposito: 4, reconhecimento: 1 } },
      { text: 'Maior autonomia nas decisões do projeto', weights: { autonomia: 4, desafio: 2 } },
    ],
  },
  {
    stem: 'em um dia difícil, o que mais ajudaria a recuperar sua motivação?',
    category: 'engajamento',
    options: [
      { text: 'Um feedback positivo do gestor', weights: { reconhecimento: 4, relacionamentos: 2 } },
      { text: 'Conversar com colegas de confiança', weights: { relacionamentos: 4, seguranca: 1 } },
      { text: 'Lembrar do propósito do que faço', weights: { proposito: 4, desenvolvimento: 1 } },
      { text: 'Focar em uma meta pessoal de carreira', weights: { crescimento: 4, desafio: 2 } },
    ],
  },
  {
    stem: 'qual situação seria mais desmotivadora para você?',
    category: 'desmotivadores',
    options: [
      { text: 'Falta de perspectiva de crescimento', weights: { crescimento: 4, desenvolvimento: 2 } },
      { text: 'Microgerenciamento constante', weights: { autonomia: 4, lideranca: -1 } },
      { text: 'Remuneração abaixo do mercado', weights: { financeiro: 4, seguranca: 2 } },
      { text: 'Ambiente sem colaboração entre pessoas', weights: { relacionamentos: 4, proposito: 1 } },
    ],
  },
  {
    stem: 'ao receber feedback sobre seu desempenho, o que mais valoriza?',
    category: 'feedback',
    options: [
      { text: 'Reconhecimento explícito das conquistas', weights: { reconhecimento: 4, relacionamentos: 1 } },
      { text: 'Orientações claras para evoluir tecnicamente', weights: { desenvolvimento: 4, crescimento: 2 } },
      { text: 'Discussão sobre próximos passos de carreira', weights: { crescimento: 4, lideranca: 1 } },
      { text: 'Autonomia para definir como melhorar', weights: { autonomia: 4, desenvolvimento: 1 } },
    ],
  },
  {
    stem: 'qual formato de reconhecimento teria mais significado para você?',
    category: 'reconhecimento',
    options: [
      { text: 'Destaque em reunião ou comunicado da empresa', weights: { reconhecimento: 4, relacionamentos: 1 } },
      { text: 'Aumento salarial ou bônus vinculado ao resultado', weights: { financeiro: 4, reconhecimento: 2 } },
      { text: 'Nova oportunidade de projeto estratégico', weights: { desafio: 3, crescimento: 4 } },
      { text: 'Mentoria ou patrocínio de um líder sênior', weights: { desenvolvimento: 4, lideranca: 2 } },
    ],
  },
  {
    stem: 'o que mais influenciaria sua decisão de pedir demissão?',
    category: 'turnover',
    options: [
      { text: 'Salário e benefícios insuficientes', weights: { financeiro: 4, seguranca: 2 } },
      { text: 'Falta de desafios e aprendizado', weights: { desafio: 4, desenvolvimento: 3 } },
      { text: 'Desalinhamento com os valores da empresa', weights: { proposito: 4, relacionamentos: 1 } },
      { text: 'Rotina rígida sem flexibilidade', weights: { flexibilidade: 4, autonomia: 2 } },
    ],
  },
  {
    stem: 'em uma promoção, o que mais te atrairia?',
    category: 'carreira',
    options: [
      { text: 'Maior remuneração e pacote de benefícios', weights: { financeiro: 4, seguranca: 2 } },
      { text: 'Cargo com mais influência e liderança', weights: { lideranca: 4, crescimento: 2 } },
      { text: 'Posição com projetos mais desafiadores', weights: { desafio: 4, autonomia: 2 } },
      { text: 'Função alinhada ao impacto que quero gerar', weights: { proposito: 4, crescimento: 1 } },
    ],
  },
  {
    stem: 'qual ambiente de trabalho prefere?',
    category: 'ambiente',
    options: [
      { text: 'Estruturado, com processos claros e previsíveis', weights: { seguranca: 4, flexibilidade: -1 } },
      { text: 'Colaborativo, com forte espírito de equipe', weights: { relacionamentos: 4, proposito: 1 } },
      { text: 'Dinâmico, com metas agressivas e pressão saudável', weights: { desafio: 4, crescimento: 2 } },
      { text: 'Flexível, com foco em resultados e não em horário', weights: { flexibilidade: 4, autonomia: 3 } },
    ],
  },
  {
    stem: 'como prefere desenvolver novas competências?',
    category: 'desenvolvimento',
    options: [
      { text: 'Cursos formais e certificações pagas pela empresa', weights: { desenvolvimento: 4, financeiro: 1 } },
      { text: 'Aprendendo na prática com projetos reais', weights: { desafio: 3, desenvolvimento: 4 } },
      { text: 'Mentoria com profissionais experientes', weights: { desenvolvimento: 4, relacionamentos: 2 } },
      { text: 'Estudo autônomo no meu próprio ritmo', weights: { autonomia: 4, desenvolvimento: 2 } },
    ],
  },
  {
    stem: 'o que mais valoriza em um gestor direto?',
    category: 'lideranca',
    options: [
      { text: 'Que reconheça e celebre minhas entregas', weights: { reconhecimento: 4, relacionamentos: 1 } },
      { text: 'Que me dê liberdade para decidir como executar', weights: { autonomia: 4, lideranca: 1 } },
      { text: 'Que invista no meu crescimento profissional', weights: { desenvolvimento: 4, crescimento: 3 } },
      { text: 'Que crie um ambiente seguro e estável', weights: { seguranca: 4, relacionamentos: 2 } },
    ],
  },
  {
    stem: 'ao equilibrar vida pessoal e profissional, o que pesa mais?',
    category: 'equilibrio',
    options: [
      { text: 'Horários previsíveis e limites claros', weights: { flexibilidade: 3, seguranca: 4 } },
      { text: 'Possibilidade de trabalhar de qualquer lugar', weights: { flexibilidade: 4, autonomia: 2 } },
      { text: 'Trabalho com propósito que justifique dedicação', weights: { proposito: 4, crescimento: 1 } },
      { text: 'Remuneração que compense a dedicação', weights: { financeiro: 4, seguranca: 2 } },
    ],
  },
  {
    stem: 'qual tipo de meta profissional mais te energiza?',
    category: 'metas',
    options: [
      { text: 'Bater metas financeiras ou de vendas', weights: { financeiro: 3, desafio: 4 } },
      { text: 'Construir relacionamentos duradouros com clientes ou colegas', weights: { relacionamentos: 4, proposito: 1 } },
      { text: 'Dominar uma nova área de conhecimento', weights: { desenvolvimento: 4, crescimento: 2 } },
      { text: 'Assumir posição de liderança formal', weights: { lideranca: 4, crescimento: 2 } },
    ],
  },
  {
    stem: 'em uma reestruturação da empresa, o que mais te preocuparia?',
    category: 'mudanca',
    options: [
      { text: 'Perder estabilidade e segurança no emprego', weights: { seguranca: 4, financeiro: 2 } },
      { text: 'Perder autonomia nas decisões do dia a dia', weights: { autonomia: 4, flexibilidade: 1 } },
      { text: 'Perder o senso de propósito do trabalho', weights: { proposito: 4, relacionamentos: 1 } },
      { text: 'Perder oportunidades de crescimento', weights: { crescimento: 4, desenvolvimento: 2 } },
    ],
  },
  {
    stem: 'qual recompensa por bom desempenho seria mais significativa?',
    category: 'recompensa',
    options: [
      { text: 'Viagem ou experiência especial', weights: { reconhecimento: 3, relacionamentos: 2, financeiro: 1 } },
      { text: 'Participação em projeto de alto impacto', weights: { desafio: 4, proposito: 2 } },
      { text: 'Aumento salarial imediato', weights: { financeiro: 4, seguranca: 1 } },
      { text: 'Título ou posição mais senior', weights: { crescimento: 4, lideranca: 2 } },
    ],
  },
  {
    stem: 'o que mais te atrai em uma nova função interna?',
    category: 'mobilidade',
    options: [
      { text: 'Aprender algo completamente novo', weights: { desenvolvimento: 4, desafio: 2 } },
      { text: 'Maior visibilidade perante a liderança', weights: { reconhecimento: 4, crescimento: 2 } },
      { text: 'Trabalhar com pessoas que admiro', weights: { relacionamentos: 4, proposito: 1 } },
      { text: 'Ter mais controle sobre entregas e prazos', weights: { autonomia: 4, flexibilidade: 2 } },
    ],
  },
  {
    stem: 'como mede o sucesso na sua carreira?',
    category: 'sucesso',
    options: [
      { text: 'Nível de remuneração e patrimônio acumulado', weights: { financeiro: 4, seguranca: 2 } },
      { text: 'Posição e influência que exerço', weights: { lideranca: 4, reconhecimento: 2 } },
      { text: 'Impacto positivo que gero nas pessoas', weights: { proposito: 4, relacionamentos: 3 } },
      { text: 'Quanto aprendi e evoluí profissionalmente', weights: { desenvolvimento: 4, crescimento: 3 } },
    ],
  },
  {
    stem: 'em um projeto em equipe, qual papel prefere assumir?',
    category: 'equipe',
    options: [
      { text: 'Liderar e coordenar as entregas', weights: { lideranca: 4, reconhecimento: 1 } },
      { text: 'Resolver os problemas mais difíceis', weights: { desafio: 4, desenvolvimento: 2 } },
      { text: 'Garantir harmonia e comunicação do grupo', weights: { relacionamentos: 4, proposito: 1 } },
      { text: 'Definir a abordagem com independência', weights: { autonomia: 4, desafio: 1 } },
    ],
  },
  {
    stem: 'qual investimento da empresa em você seria mais valorizado?',
    category: 'investimento',
    options: [
      { text: 'Programa de formação contínua', weights: { desenvolvimento: 4, crescimento: 2 } },
      { text: 'Plano de carreira estruturado', weights: { crescimento: 4, seguranca: 2 } },
      { text: 'Participação nos lucros ou equity', weights: { financeiro: 4, proposito: 1 } },
      { text: 'Flexibilidade de local e horário de trabalho', weights: { flexibilidade: 4, autonomia: 2 } },
    ],
  },
  {
    stem: 'ao comparar duas ofertas de trabalho equivalentes, o que desempata?',
    category: 'escolha',
    options: [
      { text: 'Pacote financeiro mais atrativo', weights: { financeiro: 4, seguranca: 1 } },
      { text: 'Cultura e propósito da organização', weights: { proposito: 4, relacionamentos: 2 } },
      { text: 'Desafios técnicos ou de negócio maiores', weights: { desafio: 4, desenvolvimento: 2 } },
      { text: 'Modelo de trabalho mais flexível', weights: { flexibilidade: 4, autonomia: 2 } },
    ],
  },
];

/** @type {Array<{ text: string, category: string, weights: Record<string, number> }>} */
const LIKERT_STATEMENTS = [
  { text: 'Feedback frequente do gestor aumenta meu engajamento no trabalho.', category: 'feedback', weights: { reconhecimento: 3, relacionamentos: 1 } },
  { text: 'Salário competitivo é essencial para eu me sentir valorizado.', category: 'financeiro', weights: { financeiro: 4, seguranca: 1 } },
  { text: 'Oportunidades de promoção são um fator decisivo na minha permanência.', category: 'carreira', weights: { crescimento: 4, lideranca: 1 } },
  { text: 'Aprender coisas novas regularmente me mantém motivado.', category: 'desenvolvimento', weights: { desenvolvimento: 4, desafio: 1 } },
  { text: 'Prefiro ter autonomia para decidir como realizar minhas tarefas.', category: 'autonomia', weights: { autonomia: 4, flexibilidade: 1 } },
  { text: 'Flexibilidade de horário é mais importante que outros benefícios.', category: 'flexibilidade', weights: { flexibilidade: 4, autonomia: 2 } },
  { text: 'Trabalhar em algo com propósito claro é fundamental para mim.', category: 'proposito', weights: { proposito: 4, relacionamentos: 1 } },
  { text: 'Boas relações com colegas impactam diretamente minha satisfação.', category: 'relacionamentos', weights: { relacionamentos: 4, seguranca: 1 } },
  { text: 'Estabilidade no emprego é uma prioridade na minha carreira.', category: 'seguranca', weights: { seguranca: 4, financeiro: 1 } },
  { text: 'Assumir posições de liderança é um objetivo importante para mim.', category: 'lideranca', weights: { lideranca: 4, crescimento: 2 } },
  { text: 'Projetos desafiadores me energizam mais que rotina previsível.', category: 'desafio', weights: { desafio: 4, crescimento: 1 } },
  { text: 'Reconhecimento público pelas minhas entregas me motiva bastante.', category: 'reconhecimento', weights: { reconhecimento: 4, relacionamentos: 1 } },
  { text: 'Benefícios como plano de saúde pesam muito na minha decisão de ficar.', category: 'beneficios', weights: { financeiro: 3, seguranca: 3 } },
  { text: 'Microgerenciamento reduz significativamente minha motivação.', category: 'autonomia', weights: { autonomia: 4, lideranca: -2 } },
  { text: 'Ver colegas crescendo me inspira a buscar minha própria evolução.', category: 'crescimento', weights: { crescimento: 3, relacionamentos: 2 } },
  { text: 'Trabalhar remotamente melhora minha produtividade e bem-estar.', category: 'flexibilidade', weights: { flexibilidade: 4, autonomia: 2 } },
  { text: 'Participar de decisões estratégicas me faz sentir mais engajado.', category: 'lideranca', weights: { lideranca: 3, autonomia: 2, proposito: 1 } },
  { text: 'Metas agressivas me motivam a dar o meu melhor.', category: 'desafio', weights: { desafio: 4, reconhecimento: 1 } },
  { text: 'Sentir que meu trabalho faz diferença para clientes ou sociedade é crucial.', category: 'proposito', weights: { proposito: 4, relacionamentos: 1 } },
  { text: 'Programas de capacitação da empresa influenciam minha lealdade.', category: 'desenvolvimento', weights: { desenvolvimento: 4, crescimento: 2 } },
  { text: 'Transparência sobre critérios de promoção é importante para mim.', category: 'crescimento', weights: { crescimento: 3, seguranca: 2, reconhecimento: 1 } },
  { text: 'Ambiente previsível e organizado me traz mais conforto para performar.', category: 'seguranca', weights: { seguranca: 4, flexibilidade: -1 } },
  { text: 'Bônus por desempenho me incentivam mais que elogios verbais.', category: 'financeiro', weights: { financeiro: 4, reconhecimento: 1 } },
  { text: 'Colaborar em equipe me dá mais satisfação que trabalhar sozinho.', category: 'relacionamentos', weights: { relacionamentos: 4, proposito: 1 } },
];

/**
 * @returns {Array<{
 *   key: string,
 *   text: string,
 *   questionType: 'forced_choice' | 'likert',
 *   category: string,
 *   weight: number,
 *   sortOrder: number,
 *   options?: Array<{ key: string, text: string, sortOrder: number, weights: Record<string, number> }>,
 *   dimensionWeights?: Record<string, number>,
 * }>}
 */
export function generateMotivatorsQuestionBank() {
  const questions = [];
  let sortOrder = 0;

  FORCED_TEMPLATES.forEach((template, tIdx) => {
    CONTEXTS.forEach((prefix, cIdx) => {
      const key = `fc_${String(tIdx + 1).padStart(2, '0')}_${String(cIdx + 1).padStart(2, '0')}`;
      const text = `${prefix} ${template.stem}`;
      questions.push({
        key,
        text: text.charAt(0).toUpperCase() + text.slice(1),
        questionType: 'forced_choice',
        category: template.category,
        weight: 1,
        sortOrder: sortOrder++,
        options: template.options.map((opt, oIdx) => ({
          key: `opt_${oIdx + 1}`,
          text: opt.text,
          sortOrder: oIdx,
          weights: opt.weights,
        })),
      });
    });
  });

  LIKERT_STATEMENTS.forEach((stmt, idx) => {
    questions.push({
      key: `lk_${String(idx + 1).padStart(3, '0')}`,
      text: stmt.text,
      questionType: 'likert',
      category: stmt.category,
      weight: 1,
      sortOrder: sortOrder++,
      dimensionWeights: stmt.weights,
    });
  });

  return questions;
}

export function getQuestionBankStats() {
  const bank = generateMotivatorsQuestionBank();
  const forced = bank.filter((q) => q.questionType === 'forced_choice').length;
  const likert = bank.filter((q) => q.questionType === 'likert').length;
  return { total: bank.length, forcedChoice: forced, likert };
}
