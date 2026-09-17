/** Templates parametrizáveis de perfil e recomendações ao gestor (B-RH2-20: tom hedged). */
export const MOTIVATORS_RESULT_TEMPLATES = [
  {
    templateType: 'profile_summary',
    condition: { top_dimensions: ['desafio', 'crescimento'], min_score: 65 },
    textPt:
      'Desafios e crescimento no trabalho tendem a engajar esta pessoa. Em conversa, explore metas ambiciosas e próximos passos de carreira.',
    textEn:
      'Challenge and growth at work tend to engage this person. In conversation, explore ambitious goals and career next steps.',
    sortOrder: 1,
  },
  {
    templateType: 'profile_summary',
    condition: { top_dimensions: ['autonomia', 'flexibilidade'], min_score: 65 },
    textPt:
      'Autonomia e flexibilidade tendem a pesar mais do que recompensas formais. Costuma render melhor quando pode definir como e quando trabalhar.',
    textEn:
      'Autonomy and flexibility tend to matter more than formal rewards. They often perform better when they can define how and when to work.',
    sortOrder: 2,
  },
  {
    templateType: 'profile_summary',
    condition: { top_dimensions: ['reconhecimento', 'relacionamentos'], min_score: 65 },
    textPt:
      'Há indícios de que reconhecimento e relações no trabalho sustentam o engajamento. Feedback específico e colaboração ajudam no dia a dia.',
    textEn:
      'There are signs that recognition and workplace relationships support engagement. Specific feedback and collaboration help day to day.',
    sortOrder: 3,
  },
  {
    templateType: 'profile_summary',
    condition: { top_dimensions: ['financeiro', 'seguranca'], min_score: 65 },
    textPt:
      'Estabilidade financeira e previsibilidade de vínculo tendem a pesar nas escolhas. Remuneração e benefícios são hipóteses de retenção, não veredito.',
    textEn:
      'Financial stability and role predictability tend to weigh on choices. Pay and benefits are retention hypotheses, not a verdict.',
    sortOrder: 4,
  },
  {
    templateType: 'profile_summary',
    condition: { top_dimensions: ['proposito', 'desenvolvimento'], min_score: 65 },
    textPt:
      'Propósito no trabalho e espaço para desenvolver competências tendem a engajar. Impacto visível e aprendizado contínuo são boas pistas para o 1:1.',
    textEn:
      'Purpose at work and room to develop skills tend to engage. Visible impact and continuous learning are useful prompts for a 1:1.',
    sortOrder: 5,
  },
  {
    templateType: 'profile_summary',
    condition: { top_dimensions: ['lideranca'], min_score: 60 },
    textPt:
      'Influenciar rumo e coordenar pessoas tende a energizar. Explore frentes com responsabilidade de coordenação, sem rotular prontidão.',
    textEn:
      'Influencing direction and coordinating people tends to energize. Explore fronts with coordination responsibility, without labeling readiness.',
    sortOrder: 6,
  },
  {
    templateType: 'profile_summary',
    condition: { top_dimensions: ['criatividade', 'desafio'], min_score: 60 },
    textPt:
      'Criar, experimentar e resolver de forma original tende a engajar. Espaço para testar abordagens novas pode ajudar.',
    textEn:
      'Creating, experimenting, and solving in original ways tends to engage. Room to try new approaches may help.',
    sortOrder: 7,
  },
  {
    templateType: 'profile_summary',
    condition: { top_dimensions: ['equilibrio', 'flexibilidade'], min_score: 60 },
    textPt:
      'Equilíbrio entre trabalho e vida pessoal tende a proteger a disposição. Limites de horário e rotina previsível são hipóteses úteis.',
    textEn:
      'Work-life balance tends to protect energy. Schedule boundaries and a predictable routine are useful hypotheses.',
    sortOrder: 8,
  },
  {
    templateType: 'profile_summary',
    condition: { fallback: true },
    textPt:
      'Motivadores distribuídos entre várias dimensões. Use como roteiro de conversa, não como rótulo. Combine com Eneagrama e o contexto do time.',
    textEn:
      'Motivators spread across several dimensions. Use as a conversation guide, not a label. Combine with Enneagram and team context.',
    sortOrder: 99,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'autonomia', min_score: 70 },
    textPt: 'Delegar com meta clara e deixar o método com a pessoa.',
    textEn: 'Delegate with a clear goal and leave the method to them.',
    sortOrder: 1,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'reconhecimento', min_score: 70 },
    textPt: 'Reconhecer entregas com precisão e na hora, não só no ritual anual.',
    textEn: 'Recognize deliveries specifically and in the moment, not only in yearly rituals.',
    sortOrder: 2,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'desenvolvimento', min_score: 70 },
    textPt: 'Abrir tempo protegido para aprender no próprio trabalho (curso, mentoria ou fatia nova).',
    textEn: 'Protect time to learn on the job (course, mentoring, or a new slice of work).',
    sortOrder: 3,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'desafio', min_score: 70 },
    textPt: 'Atribuir problemas reais, com impacto visível, não só volume.',
    textEn: 'Assign real problems with visible impact, not just volume.',
    sortOrder: 4,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'crescimento', min_score: 70 },
    textPt: 'Conversar próximos passos de cargo com regularidade e critérios claros.',
    textEn: 'Discuss role next steps regularly with clear criteria.',
    sortOrder: 5,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'relacionamentos', min_score: 70 },
    textPt: 'Facilitar colaboração e momentos em que pedir ajuda seja fácil.',
    textEn: 'Make collaboration easy and asking for help low-friction.',
    sortOrder: 6,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'flexibilidade', min_score: 70 },
    textPt: 'Oferecer ajuste de horário ou local quando a semana pedir, com entrega combinada.',
    textEn: 'Offer schedule or location flexibility when the week needs it, with agreed delivery.',
    sortOrder: 7,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'proposito', min_score: 70 },
    textPt: 'Conectar entregas a quem ou ao que aquilo serve, além do indicador interno.',
    textEn: 'Connect deliveries to who or what they serve, beyond internal metrics.',
    sortOrder: 8,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'criatividade', min_score: 70 },
    textPt: 'Abrir espaço para propor e testar um jeito ainda não no processo.',
    textEn: 'Leave room to propose and try an approach not yet in the process.',
    sortOrder: 9,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'equilibrio', min_score: 70 },
    textPt: 'Respeitar o fim do expediente quando a urgência não é real.',
    textEn: 'Respect end of day when urgency is not real.',
    sortOrder: 10,
  },
  {
    templateType: 'manager_avoid',
    condition: { dimension: 'autonomia', min_score: 70 },
    textPt: 'Evite microgerenciar o método quando o resultado já está combinado.',
    textEn: 'Avoid micromanaging the method when the outcome is already agreed.',
    sortOrder: 1,
  },
  {
    templateType: 'manager_avoid',
    condition: { dimension: 'reconhecimento', min_score: 70 },
    textPt: 'Evite deixar entregas boas sem retorno específico.',
    textEn: 'Avoid leaving strong deliveries without specific feedback.',
    sortOrder: 2,
  },
  {
    templateType: 'manager_avoid',
    condition: { dimension: 'desafio', min_score: 70 },
    textPt: 'Evite rotina só de repetição conhecida por longos períodos.',
    textEn: 'Avoid long stretches of only familiar repetition.',
    sortOrder: 3,
  },
  {
    templateType: 'manager_avoid',
    condition: { dimension: 'seguranca', min_score: 70 },
    textPt: 'Evite mudanças bruscas de rumo sem comunicação e previsibilidade.',
    textEn: 'Avoid abrupt direction changes without communication and predictability.',
    sortOrder: 4,
  },
  {
    templateType: 'manager_avoid',
    condition: { dimension: 'financeiro', min_score: 70 },
    textPt: 'Evite descompasso claro entre esforço e o que a pessoa recebe, sem conversa.',
    textEn: 'Avoid a clear gap between effort and pay with no conversation.',
    sortOrder: 5,
  },
  {
    templateType: 'manager_avoid',
    condition: { dimension: 'relacionamentos', min_score: 70 },
    textPt: 'Evite isolar a pessoa ou deixar conflito no time sem mediação.',
    textEn: 'Avoid isolating the person or leaving team conflict unmediated.',
    sortOrder: 6,
  },
  {
    templateType: 'manager_avoid',
    condition: { dimension: 'criatividade', min_score: 70 },
    textPt: 'Evite processos sem espaço para um ajuste de método.',
    textEn: 'Avoid processes with no room for a method tweak.',
    sortOrder: 7,
  },
  {
    templateType: 'manager_avoid',
    condition: { dimension: 'equilibrio', min_score: 70 },
    textPt: 'Evite sobrecarga contínua e demandas fora do horário como hábito.',
    textEn: 'Avoid ongoing overload and off-hours demands as a habit.',
    sortOrder: 8,
  },
];
