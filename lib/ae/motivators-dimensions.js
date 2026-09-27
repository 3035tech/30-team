/** Dimensões do assessment de Motivadores Profissionais (seed / referência).
 * Colors avoid brand violet (#8930B8), status danger (#dc2626), and pipeline indigo (#6366F1).
 */
export const MOTIVATORS_DIMENSIONS = [
  { key: 'reconhecimento', label: 'Reconhecimento', labelEn: 'Recognition', color: '#9D174D', sortOrder: 1 },
  { key: 'financeiro', label: 'Financeiro', labelEn: 'Financial', color: '#059669', sortOrder: 2 },
  { key: 'crescimento', label: 'Crescimento', labelEn: 'Growth', color: '#2563eb', sortOrder: 3 },
  { key: 'desenvolvimento', label: 'Desenvolvimento', labelEn: 'Development', color: '#0891b2', sortOrder: 4 },
  { key: 'autonomia', label: 'Autonomia', labelEn: 'Autonomy', color: '#d97706', sortOrder: 5 },
  { key: 'flexibilidade', label: 'Flexibilidade', labelEn: 'Flexibility', color: '#65a30d', sortOrder: 6 },
  { key: 'proposito', label: 'Propósito', labelEn: 'Purpose', color: '#db2777', sortOrder: 7 },
  { key: 'relacionamentos', label: 'Relacionamentos', labelEn: 'Relationships', color: '#e11d48', sortOrder: 8 },
  { key: 'seguranca', label: 'Segurança', labelEn: 'Security', color: '#4b5563', sortOrder: 9 },
  { key: 'lideranca', label: 'Liderança', labelEn: 'Leadership', color: '#7c2d12', sortOrder: 10 },
  { key: 'desafio', label: 'Desafio', labelEn: 'Challenge', color: '#ea580c', sortOrder: 11 },
  { key: 'criatividade', label: 'Criatividade', labelEn: 'Creativity', color: '#0e7490', sortOrder: 12 },
  { key: 'equilibrio', label: 'Equilíbrio vida pessoal & profissional', labelEn: 'Personal & professional balance', color: '#0d9488', sortOrder: 13 },
];

export function motivatorDimensionLabel(key, locale = 'pt-BR') {
  const d = MOTIVATORS_DIMENSIONS.find((x) => x.key === key);
  if (!d) return key;
  return locale === 'en' ? d.labelEn || d.label : d.label;
}

// Stable explanatory copy, not a new assessment score or interpretation engine.
const WORK_MEANINGS = Object.freeze({
  reconhecimento: ['Ter as contribuições reconhecidas e receber feedback sobre as entregas tende a estimular o envolvimento.', 'Recognition of contributions and feedback on delivery may encourage engagement.'],
  financeiro: ['Remuneração e benefícios compatíveis com as contribuições tendem a ter importância nas escolhas profissionais.', 'Pay and benefits aligned with contributions may matter in professional choices.'],
  crescimento: ['Perspectivas de carreira e oportunidades de assumir novas responsabilidades tendem a estimular o trabalho.', 'Career prospects and opportunities for new responsibilities may encourage engagement.'],
  desenvolvimento: ['Aprender, receber orientação e ampliar competências tende a tornar o trabalho mais estimulante.', 'Learning, guidance and building skills may make work more engaging.'],
  autonomia: ['Ter espaço para decidir como executar o trabalho, com objetivos claros, tende a favorecer o envolvimento.', 'Room to decide how to work, with clear goals, may support engagement.'],
  flexibilidade: ['Poder ajustar horários e formas de trabalho às necessidades do contexto tende a ser valorizado.', 'Being able to adapt schedules and working arrangements to the context may be valued.'],
  proposito: ['Compreender o impacto das entregas e sua relação com valores e objetivos tende a dar sentido ao trabalho.', 'Understanding the impact of work and its connection to values and goals may make it more meaningful.'],
  relacionamentos: ['Vínculos de confiança, colaboração e pertencimento tendem a tornar o ambiente mais estimulante.', 'Trust, collaboration and belonging may make the work environment more engaging.'],
  seguranca: ['Previsibilidade, clareza de expectativas e comunicação sobre mudanças tendem a favorecer a tranquilidade para trabalhar.', 'Predictability, clear expectations and communication about change may support confidence at work.'],
  lideranca: ['Oportunidades de orientar pessoas e participar de decisões tendem a estimular o envolvimento.', 'Opportunities to guide people and participate in decisions may encourage engagement.'],
  desafio: ['Resolver problemas exigentes e superar objetivos alcançáveis tende a tornar o trabalho estimulante.', 'Solving demanding problems and achieving challenging, attainable goals may make work engaging.'],
  criatividade: ['Espaço para propor ideias, experimentar e construir novas soluções tende a favorecer o envolvimento.', 'Room to propose ideas, experiment and develop new solutions may support engagement.'],
  equilibrio: ['Conciliar demandas profissionais com descanso e vida pessoal tende a ser importante para o envolvimento sustentável.', 'Balancing work demands with rest and personal life may matter for sustainable engagement.'],
});

export function motivatorWorkMeaning(key, locale = 'pt-BR') {
  return WORK_MEANINGS[key]?.[locale.startsWith('en') ? 1 : 0] || '';
}

export const MOTIVATORS_DEFINITION = {
  slug: 'motivators',
  name: 'Motivadores Profissionais',
  description:
    'Assessment situacional: situações de trabalho em linguagem clara. Identifica condições que tendem a influenciar satisfação e engajamento. Não é o que a pessoa “deveria” responder, nem diagnóstico clínico.',
  version: 4,
  config: {
    questions_per_session: 30,
    forced_choice_per_session: 14,
    ranking_per_session: 4,
    likert_per_session: 12,
    shuffle: true,
  },
};
