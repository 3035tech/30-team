/**
 * Gera o banco de perguntas do assessment de Motivadores.
 *
 * Três formatos, todos com itens ÚNICOS (sem variedade fabricada):
 *  - forced_choice: escolha única entre 4 opções.
 *  - ranking: ordenar opções da mais para a menos importante.
 *  - likert: afirmação temática com posicionamento (discordo ↔ concordo).
 */

/** @type {Array<{ stem: string, category: string, options: Array<{ text: string, weights: Record<string, number> }> }>} */
const FORCED_TEMPLATES = [
  {
    stem: 'Após concluir um grande projeto com sucesso, o que mais lhe deixaria satisfeito?',
    category: 'resultado',
    options: [
      { text: 'Receber um bônus ou aumento salarial', weights: { financeiro: 4, reconhecimento: 1 } },
      { text: 'Ser promovido ou assumir maior responsabilidade', weights: { crescimento: 4, lideranca: 2 } },
      { text: 'Receber reconhecimento público pela entrega', weights: { reconhecimento: 4, relacionamentos: 1 } },
      { text: 'Liderar um novo projeto desafiador', weights: { desafio: 4, autonomia: 2, lideranca: 2 } },
    ],
  },
  {
    stem: 'O que mais pesaria ao escolher permanecer na empresa?',
    category: 'retencao',
    options: [
      { text: 'Estabilidade e previsibilidade de longo prazo', weights: { seguranca: 4, financeiro: 2 } },
      { text: 'Cultura forte e boas relações com colegas', weights: { relacionamentos: 4, proposito: 1 } },
      { text: 'Oportunidades claras de crescimento', weights: { crescimento: 4, desenvolvimento: 2 } },
      { text: 'Liberdade para organizar como trabalho', weights: { autonomia: 4, flexibilidade: 3 } },
    ],
  },
  {
    stem: 'Qual benefício teria maior impacto no seu engajamento?',
    category: 'beneficios',
    options: [
      { text: 'Plano de saúde e benefícios robustos', weights: { financeiro: 3, seguranca: 4 } },
      { text: 'Horário flexível e trabalho remoto', weights: { flexibilidade: 4, autonomia: 2 } },
      { text: 'Budget para cursos e certificações', weights: { desenvolvimento: 4, crescimento: 2 } },
      { text: 'Programa de reconhecimento e premiações', weights: { reconhecimento: 4, financeiro: 1 } },
    ],
  },
  {
    stem: 'O que mais te motivaria a aceitar um novo desafio interno?',
    category: 'desafio',
    options: [
      { text: 'Problema complexo que exige criatividade', weights: { desafio: 4, criatividade: 3 } },
      { text: 'Chance de liderar pessoas e influenciar resultados', weights: { lideranca: 4, crescimento: 2 } },
      { text: 'Impacto visível na missão da empresa', weights: { proposito: 4, reconhecimento: 1 } },
      { text: 'Maior autonomia nas decisões do projeto', weights: { autonomia: 4, desafio: 2 } },
    ],
  },
  {
    stem: 'Em um dia difícil, o que mais ajudaria a recuperar sua motivação?',
    category: 'engajamento',
    options: [
      { text: 'Um feedback positivo do gestor', weights: { reconhecimento: 4, relacionamentos: 2 } },
      { text: 'Conversar com colegas de confiança', weights: { relacionamentos: 4, seguranca: 1 } },
      { text: 'Lembrar do propósito do que faço', weights: { proposito: 4, desenvolvimento: 1 } },
      { text: 'Focar em uma meta pessoal de carreira', weights: { crescimento: 4, desafio: 2 } },
    ],
  },
  {
    stem: 'Qual situação seria mais desmotivadora para você?',
    category: 'desmotivadores',
    options: [
      { text: 'Falta de perspectiva de crescimento', weights: { crescimento: 4, desenvolvimento: 2 } },
      { text: 'Microgerenciamento constante', weights: { autonomia: 4, lideranca: -1 } },
      { text: 'Remuneração abaixo do mercado', weights: { financeiro: 4, seguranca: 2 } },
      { text: 'Ambiente sem colaboração entre pessoas', weights: { relacionamentos: 4, proposito: 1 } },
    ],
  },
  {
    stem: 'Ao receber feedback sobre seu desempenho, o que mais valoriza?',
    category: 'feedback',
    options: [
      { text: 'Reconhecimento explícito das conquistas', weights: { reconhecimento: 4, relacionamentos: 1 } },
      { text: 'Orientações claras para evoluir tecnicamente', weights: { desenvolvimento: 4, crescimento: 2 } },
      { text: 'Discussão sobre próximos passos de carreira', weights: { crescimento: 4, lideranca: 1 } },
      { text: 'Autonomia para definir como melhorar', weights: { autonomia: 4, desenvolvimento: 1 } },
    ],
  },
  {
    stem: 'Qual formato de reconhecimento teria mais significado para você?',
    category: 'reconhecimento',
    options: [
      { text: 'Destaque em reunião ou comunicado da empresa', weights: { reconhecimento: 4, relacionamentos: 1 } },
      { text: 'Aumento salarial ou bônus vinculado ao resultado', weights: { financeiro: 4, reconhecimento: 2 } },
      { text: 'Nova oportunidade de projeto estratégico', weights: { desafio: 3, crescimento: 4 } },
      { text: 'Mentoria ou patrocínio de um líder sênior', weights: { desenvolvimento: 4, lideranca: 2 } },
    ],
  },
  {
    stem: 'O que mais influenciaria sua decisão de pedir demissão?',
    category: 'turnover',
    options: [
      { text: 'Salário e benefícios insuficientes', weights: { financeiro: 4, seguranca: 2 } },
      { text: 'Falta de desafios e aprendizado', weights: { desafio: 4, desenvolvimento: 3 } },
      { text: 'Desalinhamento com os valores da empresa', weights: { proposito: 4, relacionamentos: 1 } },
      { text: 'Rotina rígida que atrapalha a vida pessoal', weights: { equilibrio: 4, flexibilidade: 2 } },
    ],
  },
  {
    stem: 'Em uma promoção, o que mais te atrairia?',
    category: 'carreira',
    options: [
      { text: 'Maior remuneração e pacote de benefícios', weights: { financeiro: 4, seguranca: 2 } },
      { text: 'Cargo com mais influência e liderança', weights: { lideranca: 4, crescimento: 2 } },
      { text: 'Posição com projetos mais desafiadores', weights: { desafio: 4, autonomia: 2 } },
      { text: 'Função alinhada ao impacto que quero gerar', weights: { proposito: 4, crescimento: 1 } },
    ],
  },
  {
    stem: 'Qual ambiente de trabalho prefere?',
    category: 'ambiente',
    options: [
      { text: 'Estruturado, com processos claros e previsíveis', weights: { seguranca: 4, flexibilidade: -1 } },
      { text: 'Colaborativo, com forte espírito de equipe', weights: { relacionamentos: 4, proposito: 1 } },
      { text: 'Dinâmico, com metas agressivas e pressão saudável', weights: { desafio: 4, crescimento: 2 } },
      { text: 'Aberto a experimentação e ideias novas', weights: { criatividade: 4, autonomia: 2 } },
    ],
  },
  {
    stem: 'Como prefere desenvolver novas competências?',
    category: 'desenvolvimento',
    options: [
      { text: 'Cursos formais e certificações pagas pela empresa', weights: { desenvolvimento: 4, financeiro: 1 } },
      { text: 'Aprendendo na prática com projetos reais', weights: { desafio: 3, desenvolvimento: 4 } },
      { text: 'Mentoria com profissionais experientes', weights: { desenvolvimento: 4, relacionamentos: 2 } },
      { text: 'Estudo autônomo no meu próprio ritmo', weights: { autonomia: 4, desenvolvimento: 2 } },
    ],
  },
  {
    stem: 'O que mais valoriza em um gestor direto?',
    category: 'lideranca',
    options: [
      { text: 'Que reconheça e celebre minhas entregas', weights: { reconhecimento: 4, relacionamentos: 1 } },
      { text: 'Que me dê liberdade para decidir como executar', weights: { autonomia: 4, lideranca: 1 } },
      { text: 'Que invista no meu crescimento profissional', weights: { desenvolvimento: 4, crescimento: 3 } },
      { text: 'Que respeite meus limites e vida pessoal', weights: { equilibrio: 4, relacionamentos: 1 } },
    ],
  },
  {
    stem: 'Ao equilibrar vida pessoal e profissional, o que pesa mais?',
    category: 'equilibrio',
    options: [
      { text: 'Horários previsíveis e limites claros', weights: { equilibrio: 4, seguranca: 2 } },
      { text: 'Possibilidade de trabalhar de qualquer lugar', weights: { flexibilidade: 4, autonomia: 2 } },
      { text: 'Trabalho com propósito que justifique dedicação', weights: { proposito: 4, crescimento: 1 } },
      { text: 'Remuneração que compense a dedicação', weights: { financeiro: 4, seguranca: 2 } },
    ],
  },
  {
    stem: 'Qual tipo de meta profissional mais te energiza?',
    category: 'metas',
    options: [
      { text: 'Bater metas financeiras ou de vendas', weights: { financeiro: 3, desafio: 4 } },
      { text: 'Construir relacionamentos duradouros com clientes ou colegas', weights: { relacionamentos: 4, proposito: 1 } },
      { text: 'Dominar uma nova área de conhecimento', weights: { desenvolvimento: 4, crescimento: 2 } },
      { text: 'Criar algo original ou inovador', weights: { criatividade: 4, desafio: 1 } },
    ],
  },
  {
    stem: 'Em uma reestruturação da empresa, o que mais te preocuparia?',
    category: 'mudanca',
    options: [
      { text: 'Perder estabilidade e segurança no emprego', weights: { seguranca: 4, financeiro: 2 } },
      { text: 'Perder autonomia nas decisões do dia a dia', weights: { autonomia: 4, flexibilidade: 1 } },
      { text: 'Perder o senso de propósito do trabalho', weights: { proposito: 4, relacionamentos: 1 } },
      { text: 'Perder oportunidades de crescimento', weights: { crescimento: 4, desenvolvimento: 2 } },
    ],
  },
  {
    stem: 'Qual recompensa por bom desempenho seria mais significativa?',
    category: 'recompensa',
    options: [
      { text: 'Viagem ou experiência especial', weights: { reconhecimento: 3, equilibrio: 2, financeiro: 1 } },
      { text: 'Participação em projeto de alto impacto', weights: { desafio: 4, proposito: 2 } },
      { text: 'Aumento salarial imediato', weights: { financeiro: 4, seguranca: 1 } },
      { text: 'Título ou posição mais senior', weights: { crescimento: 4, lideranca: 2 } },
    ],
  },
  {
    stem: 'O que mais te atrai em uma nova função interna?',
    category: 'mobilidade',
    options: [
      { text: 'Aprender algo completamente novo', weights: { desenvolvimento: 4, desafio: 2 } },
      { text: 'Maior visibilidade perante a liderança', weights: { reconhecimento: 4, crescimento: 2 } },
      { text: 'Trabalhar com pessoas que admiro', weights: { relacionamentos: 4, proposito: 1 } },
      { text: 'Ter mais espaço para propor e criar', weights: { criatividade: 4, autonomia: 2 } },
    ],
  },
  {
    stem: 'Como mede o sucesso na sua carreira?',
    category: 'sucesso',
    options: [
      { text: 'Nível de remuneração e patrimônio acumulado', weights: { financeiro: 4, seguranca: 2 } },
      { text: 'Posição e influência que exerço', weights: { lideranca: 4, reconhecimento: 2 } },
      { text: 'Impacto positivo que gero nas pessoas', weights: { proposito: 4, relacionamentos: 3 } },
      { text: 'Quanto aprendi e evoluí profissionalmente', weights: { desenvolvimento: 4, crescimento: 3 } },
    ],
  },
  {
    stem: 'Em um projeto em equipe, qual papel prefere assumir?',
    category: 'equipe',
    options: [
      { text: 'Liderar e coordenar as entregas', weights: { lideranca: 4, reconhecimento: 1 } },
      { text: 'Resolver os problemas mais difíceis', weights: { desafio: 4, desenvolvimento: 2 } },
      { text: 'Garantir harmonia e comunicação do grupo', weights: { relacionamentos: 4, proposito: 1 } },
      { text: 'Propor a abordagem e as ideias do projeto', weights: { criatividade: 4, autonomia: 2 } },
    ],
  },
  {
    stem: 'Qual investimento da empresa em você seria mais valorizado?',
    category: 'investimento',
    options: [
      { text: 'Programa de formação contínua', weights: { desenvolvimento: 4, crescimento: 2 } },
      { text: 'Plano de carreira estruturado', weights: { crescimento: 4, seguranca: 2 } },
      { text: 'Participação nos lucros ou equity', weights: { financeiro: 4, proposito: 1 } },
      { text: 'Flexibilidade de local e horário de trabalho', weights: { flexibilidade: 4, equilibrio: 2 } },
    ],
  },
  {
    stem: 'Ao comparar duas ofertas de trabalho equivalentes, o que desempata?',
    category: 'escolha',
    options: [
      { text: 'Pacote financeiro mais atrativo', weights: { financeiro: 4, seguranca: 1 } },
      { text: 'Cultura e propósito da organização', weights: { proposito: 4, relacionamentos: 2 } },
      { text: 'Desafios técnicos ou de negócio maiores', weights: { desafio: 4, desenvolvimento: 2 } },
      { text: 'Modelo de trabalho que respeite minha vida pessoal', weights: { equilibrio: 4, flexibilidade: 2 } },
    ],
  },
];

/**
 * Perguntas de ordenação: a pessoa ordena as opções da mais para a menos
 * importante. A pontuação distribui pontos conforme a posição escolhida.
 * @type {Array<{ stem: string, category: string, options: Array<{ text: string, weights: Record<string, number> }> }>}
 */
const RANKING_QUESTIONS = [
  {
    stem: 'Ordene, do mais importante para o menos importante, o que mais te motiva no trabalho hoje:',
    category: 'prioridades',
    options: [
      { text: 'Remuneração e benefícios', weights: { financeiro: 2 } },
      { text: 'Reconhecimento pelas entregas', weights: { reconhecimento: 2 } },
      { text: 'Oportunidades de crescimento', weights: { crescimento: 2 } },
      { text: 'Autonomia no dia a dia', weights: { autonomia: 2 } },
    ],
  },
  {
    stem: 'Coloque em ordem o que você mais valoriza em um pacote de trabalho:',
    category: 'pacote',
    options: [
      { text: 'Salário e bônus', weights: { financeiro: 2 } },
      { text: 'Flexibilidade de horário e local', weights: { flexibilidade: 2 } },
      { text: 'Budget para cursos e certificações', weights: { desenvolvimento: 2 } },
      { text: 'Estabilidade e segurança no emprego', weights: { seguranca: 2 } },
    ],
  },
  {
    stem: 'Priorize os fatores que mais te fariam permanecer na empresa:',
    category: 'retencao',
    options: [
      { text: 'Propósito e impacto do trabalho', weights: { proposito: 2 } },
      { text: 'Boas relações com o time', weights: { relacionamentos: 2 } },
      { text: 'Desafios e projetos estimulantes', weights: { desafio: 2 } },
      { text: 'Espaço para liderar e influenciar', weights: { lideranca: 2 } },
    ],
  },
  {
    stem: 'Ordene do mais ao menos importante no seu dia a dia profissional:',
    category: 'dia_a_dia',
    options: [
      { text: 'Equilíbrio com a vida pessoal', weights: { equilibrio: 2 } },
      { text: 'Liberdade para criar e inovar', weights: { criatividade: 2 } },
      { text: 'Ser reconhecido pelo que faço', weights: { reconhecimento: 2 } },
      { text: 'Evoluir na carreira', weights: { crescimento: 2 } },
    ],
  },
  {
    stem: 'Priorize o que mais te energiza ao começar um novo projeto:',
    category: 'projeto',
    options: [
      { text: 'Resolver algo criativo e inovador', weights: { criatividade: 2 } },
      { text: 'Liderar e coordenar pessoas', weights: { lideranca: 2 } },
      { text: 'Aprender e desenvolver competências', weights: { desenvolvimento: 2 } },
      { text: 'Gerar impacto com propósito', weights: { proposito: 2 } },
    ],
  },
  {
    stem: 'Ordene os benefícios que mais fariam diferença para você:',
    category: 'beneficios',
    options: [
      { text: 'Tempo livre e respeito à vida pessoal', weights: { equilibrio: 2 } },
      { text: 'Plano de carreira e promoções', weights: { crescimento: 2 } },
      { text: 'Remuneração acima do mercado', weights: { financeiro: 2 } },
      { text: 'Ambiente colaborativo e acolhedor', weights: { relacionamentos: 2 } },
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
  { text: 'Ter liberdade para propor ideias e soluções criativas me motiva.', category: 'criatividade', weights: { criatividade: 4, autonomia: 1 } },
  { text: 'Tarefas repetitivas e sem espaço para criar reduzem minha motivação.', category: 'criatividade', weights: { criatividade: 4, desafio: 1 } },
  { text: 'Gosto de experimentar novas formas de resolver problemas.', category: 'criatividade', weights: { criatividade: 3, desafio: 2 } },
  { text: 'Conseguir equilibrar trabalho e vida pessoal é decisivo para mim.', category: 'equilibrio', weights: { equilibrio: 4, flexibilidade: 1 } },
  { text: 'Abro mão de oportunidades se comprometerem demais minha vida pessoal.', category: 'equilibrio', weights: { equilibrio: 4, seguranca: 1 } },
  { text: 'Preservar tempo para família e interesses pessoais é uma prioridade.', category: 'equilibrio', weights: { equilibrio: 4 } },
  { text: 'Prefiro metas difíceis mesmo com risco de não atingi-las.', category: 'desafio', weights: { desafio: 4, crescimento: 1 } },
  { text: 'Preciso acreditar na causa da empresa para me dedicar de verdade.', category: 'proposito', weights: { proposito: 4, relacionamentos: 1 } },
  { text: 'Prefiro previsibilidade a grandes oscilações na minha rotina.', category: 'seguranca', weights: { seguranca: 4 } },
  { text: 'Um simples "obrigado" do gestor já faz diferença no meu dia.', category: 'reconhecimento', weights: { reconhecimento: 3, relacionamentos: 1 } },
  { text: 'Rendo mais quando confiam em mim sem cobrança constante.', category: 'autonomia', weights: { autonomia: 4 } },
  { text: 'Fico frustrado quando passo meses sem aprender nada novo.', category: 'desenvolvimento', weights: { desenvolvimento: 4, crescimento: 1 } },
  { text: 'Comparo com frequência meu salário ao praticado no mercado.', category: 'financeiro', weights: { financeiro: 4 } },
  { text: 'Quero assumir mais responsabilidades a cada ano.', category: 'crescimento', weights: { crescimento: 4, lideranca: 1 } },
  { text: 'Sinto-me realizado ao ajudar colegas a se desenvolverem.', category: 'lideranca', weights: { lideranca: 3, relacionamentos: 2 } },
  { text: 'Poder escolher meus horários me deixa mais produtivo.', category: 'flexibilidade', weights: { flexibilidade: 4, equilibrio: 1 } },
];

/**
 * @returns {Array<{
 *   key: string,
 *   text: string,
 *   questionType: 'forced_choice' | 'ranking' | 'likert',
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
    questions.push({
      key: `fc_${String(tIdx + 1).padStart(2, '0')}`,
      text: template.stem,
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

  RANKING_QUESTIONS.forEach((template, tIdx) => {
    questions.push({
      key: `rank_${String(tIdx + 1).padStart(2, '0')}`,
      text: template.stem,
      questionType: 'ranking',
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
  const ranking = bank.filter((q) => q.questionType === 'ranking').length;
  const likert = bank.filter((q) => q.questionType === 'likert').length;
  return { total: bank.length, forcedChoice: forced, ranking, likert };
}
