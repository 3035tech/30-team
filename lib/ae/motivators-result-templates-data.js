/** Templates parametrizáveis de perfil e recomendações ao gestor. */
export const MOTIVATORS_RESULT_TEMPLATES = [
  {
    templateType: 'profile_summary',
    condition: { top_dimensions: ['desafio', 'crescimento'], min_score: 65 },
    textPt:
      'Este colaborador é fortemente motivado por desafios e crescimento profissional. Busca metas ambiciosas e oportunidades de evoluir na carreira.',
    textEn:
      'This employee is strongly motivated by challenges and professional growth. They seek ambitious goals and opportunities to advance.',
    sortOrder: 1,
  },
  {
    templateType: 'profile_summary',
    condition: { top_dimensions: ['autonomia', 'flexibilidade'], min_score: 65 },
    textPt:
      'Valoriza autonomia e flexibilidade acima de recompensas formais. Performa melhor quando pode definir como e quando trabalhar.',
    textEn: 'Values autonomy and flexibility over formal rewards. Performs best when they can define how and when to work.',
    sortOrder: 2,
  },
  {
    templateType: 'profile_summary',
    condition: { top_dimensions: ['reconhecimento', 'relacionamentos'], min_score: 65 },
    textPt:
      'Motiva-se com reconhecimento e boas relações no trabalho. Feedback positivo e ambiente colaborativo são essenciais para seu engajamento.',
    textEn:
      'Motivated by recognition and strong workplace relationships. Positive feedback and a collaborative environment are essential.',
    sortOrder: 3,
  },
  {
    templateType: 'profile_summary',
    condition: { top_dimensions: ['financeiro', 'seguranca'], min_score: 65 },
    textPt:
      'Prioriza estabilidade financeira e segurança no emprego. Pacote de remuneração e benefícios são fatores decisivos de retenção.',
    textEn:
      'Prioritizes financial stability and job security. Compensation package and benefits are decisive retention factors.',
    sortOrder: 4,
  },
  {
    templateType: 'profile_summary',
    condition: { top_dimensions: ['proposito', 'desenvolvimento'], min_score: 65 },
    textPt:
      'Engaja-se quando percebe propósito no trabalho e espaço para desenvolver novas competências. Valoriza impacto e aprendizado contínuo.',
    textEn:
      'Engages when they perceive purpose in work and room to develop new skills. Values impact and continuous learning.',
    sortOrder: 5,
  },
  {
    templateType: 'profile_summary',
    condition: { top_dimensions: ['lideranca'], min_score: 60 },
    textPt:
      'Aspira a posições de influência e liderança. Motiva-se ao coordenar pessoas e participar de decisões estratégicas.',
    textEn: 'Aspires to positions of influence and leadership. Motivated by coordinating people and strategic decisions.',
    sortOrder: 6,
  },
  {
    templateType: 'profile_summary',
    condition: { top_dimensions: ['criatividade', 'desafio'], min_score: 60 },
    textPt:
      'Motiva-se com liberdade para criar, experimentar e resolver problemas de forma original. Rende mais quando tem espaço para inovar.',
    textEn:
      'Motivated by freedom to create, experiment, and solve problems in original ways. Performs best with room to innovate.',
    sortOrder: 7,
  },
  {
    templateType: 'profile_summary',
    condition: { top_dimensions: ['equilibrio', 'flexibilidade'], min_score: 60 },
    textPt:
      'Prioriza o equilíbrio entre trabalho e vida pessoal. Valoriza limites saudáveis, previsibilidade de rotina e respeito ao seu tempo.',
    textEn:
      'Prioritizes work-life balance. Values healthy boundaries, a predictable routine, and respect for their personal time.',
    sortOrder: 8,
  },
  {
    templateType: 'profile_summary',
    condition: { fallback: true },
    textPt:
      'Perfil equilibrado com motivadores distribuídos entre várias dimensões. Recomenda-se conversa individual para personalizar a abordagem de gestão.',
    textEn:
      'Balanced profile with motivators spread across several dimensions. An individual conversation is recommended to personalize management.',
    sortOrder: 99,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'autonomia', min_score: 70 },
    textPt: 'Delegue projetos e dê autonomia na execução, com metas claras.',
    sortOrder: 1,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'reconhecimento', min_score: 70 },
    textPt: 'Reconheça conquistas publicamente e de forma frequente.',
    sortOrder: 2,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'desenvolvimento', min_score: 70 },
    textPt: 'Ofereça treinamentos, mentorias e plano de desenvolvimento individual.',
    sortOrder: 3,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'desafio', min_score: 70 },
    textPt: 'Atribua projetos desafiadores com impacto visível.',
    sortOrder: 4,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'crescimento', min_score: 70 },
    textPt: 'Discuta plano de carreira e próximos passos com regularidade.',
    sortOrder: 5,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'relacionamentos', min_score: 70 },
    textPt: 'Promova trabalho em equipe e momentos de conexão entre colegas.',
    sortOrder: 6,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'flexibilidade', min_score: 70 },
    textPt: 'Ofereça flexibilidade de horário e local quando possível.',
    sortOrder: 7,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'proposito', min_score: 70 },
    textPt: 'Conecte as entregas ao impacto e à missão da empresa.',
    sortOrder: 8,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'criatividade', min_score: 70 },
    textPt: 'Dê espaço para propor ideias, experimentar e inovar nas soluções.',
    sortOrder: 9,
  },
  {
    templateType: 'manager_do',
    condition: { dimension: 'equilibrio', min_score: 70 },
    textPt: 'Respeite limites de horário e apoie o equilíbrio com a vida pessoal.',
    sortOrder: 10,
  },
  {
    templateType: 'manager_avoid',
    condition: { dimension: 'autonomia', min_score: 70 },
    textPt: 'Evite microgerenciamento e controle excessivo de tarefas.',
    sortOrder: 1,
  },
  {
    templateType: 'manager_avoid',
    condition: { dimension: 'reconhecimento', min_score: 70 },
    textPt: 'Evite falta de feedback e ignorar entregas de qualidade.',
    sortOrder: 2,
  },
  {
    templateType: 'manager_avoid',
    condition: { dimension: 'desafio', min_score: 70 },
    textPt: 'Evite rotina excessiva sem novos desafios.',
    sortOrder: 3,
  },
  {
    templateType: 'manager_avoid',
    condition: { dimension: 'seguranca', min_score: 70 },
    textPt: 'Evite mudanças bruscas sem comunicação e previsibilidade.',
    sortOrder: 4,
  },
  {
    templateType: 'manager_avoid',
    condition: { dimension: 'financeiro', min_score: 70 },
    textPt: 'Evite descompasso salarial em relação ao mercado.',
    sortOrder: 5,
  },
  {
    templateType: 'manager_avoid',
    condition: { dimension: 'relacionamentos', min_score: 70 },
    textPt: 'Evite ambiente isolado ou conflitos não mediados.',
    sortOrder: 6,
  },
  {
    templateType: 'manager_avoid',
    condition: { dimension: 'criatividade', min_score: 70 },
    textPt: 'Evite processos engessados e tarefas puramente repetitivas.',
    sortOrder: 7,
  },
  {
    templateType: 'manager_avoid',
    condition: { dimension: 'equilibrio', min_score: 70 },
    textPt: 'Evite sobrecarga contínua e demandas fora do horário sem necessidade.',
    sortOrder: 8,
  },
];
