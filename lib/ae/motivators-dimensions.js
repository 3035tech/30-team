/** Dimensões do assessment de Motivadores Profissionais (seed / referência). */
export const MOTIVATORS_DIMENSIONS = [
  { key: 'reconhecimento', label: 'Reconhecimento', color: '#7c3aed', sortOrder: 1 },
  { key: 'financeiro', label: 'Financeiro', color: '#059669', sortOrder: 2 },
  { key: 'crescimento', label: 'Crescimento', color: '#2563eb', sortOrder: 3 },
  { key: 'desenvolvimento', label: 'Desenvolvimento', color: '#0891b2', sortOrder: 4 },
  { key: 'autonomia', label: 'Autonomia', color: '#d97706', sortOrder: 5 },
  { key: 'flexibilidade', label: 'Flexibilidade', color: '#65a30d', sortOrder: 6 },
  { key: 'proposito', label: 'Propósito', color: '#db2777', sortOrder: 7 },
  { key: 'relacionamentos', label: 'Relacionamentos', color: '#e11d48', sortOrder: 8 },
  { key: 'seguranca', label: 'Segurança', color: '#4b5563', sortOrder: 9 },
  { key: 'lideranca', label: 'Liderança', color: '#7c2d12', sortOrder: 10 },
  { key: 'desafio', label: 'Desafio', color: '#dc2626', sortOrder: 11 },
];

export const MOTIVATORS_DEFINITION = {
  slug: 'motivators',
  name: 'Motivadores Profissionais',
  description:
    'Assessment para identificar o que motiva colaboradores, como preferem ser reconhecidos e fatores de engajamento e retenção.',
  version: 1,
  config: {
    questions_per_session: 48,
    forced_choice_per_session: 42,
    likert_per_session: 6,
    shuffle: true,
  },
};
