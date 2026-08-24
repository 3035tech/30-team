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
  { key: 'equilibrio', label: 'Equilíbrio & vida pessoal', labelEn: 'Work–life balance', color: '#0d9488', sortOrder: 13 },
];

export function motivatorDimensionLabel(key, locale = 'pt-BR') {
  const d = MOTIVATORS_DIMENSIONS.find((x) => x.key === key);
  if (!d) return key;
  return locale === 'en' ? d.labelEn || d.label : d.label;
}

export const MOTIVATORS_DEFINITION = {
  slug: 'motivators',
  name: 'Motivadores Profissionais',
  description:
    'Assessment situacional: identifica condições e experiências que tendem a influenciar satisfação, engajamento e escolhas no trabalho — não o que a pessoa acha que deveria responder.',
  version: 4,
  config: {
    questions_per_session: 30,
    forced_choice_per_session: 14,
    ranking_per_session: 4,
    likert_per_session: 12,
    shuffle: true,
  },
};
