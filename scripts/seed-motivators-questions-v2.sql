-- Re-seed Motivadores v2 (68 perguntas únicas)
-- Rode no pgAdmin. NÃO mexe em assessments (Eneagrama).
-- Equivalente a: FORCE=1 node scripts/seed-motivators-questions.js

BEGIN;

ALTER TABLE ae_questions DROP CONSTRAINT IF EXISTS ae_questions_question_type_check;
ALTER TABLE ae_questions
  ADD CONSTRAINT ae_questions_question_type_check
  CHECK (question_type IN ('forced_choice', 'likert', 'ranking'));

INSERT INTO ae_definitions (slug, name, description, version, active, config)
VALUES ('motivators', 'Motivadores Profissionais', 'Assessment para identificar o que motiva colaboradores, como preferem ser reconhecidos e fatores de engajamento e retenção.', 2, TRUE, '{"questions_per_session":30,"forced_choice_per_session":14,"ranking_per_session":4,"likert_per_session":12,"shuffle":true}'::jsonb)
ON CONFLICT DO NOTHING;

UPDATE ae_definitions SET
  name = 'Motivadores Profissionais',
  description = 'Assessment para identificar o que motiva colaboradores, como preferem ser reconhecidos e fatores de engajamento e retenção.',
  version = 2,
  config = '{"questions_per_session":30,"forced_choice_per_session":14,"ranking_per_session":4,"likert_per_session":12,"shuffle":true}'::jsonb,
  active = TRUE
WHERE LOWER(slug) = LOWER('motivators');

INSERT INTO ae_dimensions (definition_id, key, label, sort_order, active, color)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'reconhecimento', 'Reconhecimento', 1, TRUE, '#c026d3'
ON CONFLICT (definition_id, LOWER(key))
DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color, active = TRUE;
INSERT INTO ae_dimensions (definition_id, key, label, sort_order, active, color)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'financeiro', 'Financeiro', 2, TRUE, '#059669'
ON CONFLICT (definition_id, LOWER(key))
DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color, active = TRUE;
INSERT INTO ae_dimensions (definition_id, key, label, sort_order, active, color)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'crescimento', 'Crescimento', 3, TRUE, '#2563eb'
ON CONFLICT (definition_id, LOWER(key))
DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color, active = TRUE;
INSERT INTO ae_dimensions (definition_id, key, label, sort_order, active, color)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'desenvolvimento', 'Desenvolvimento', 4, TRUE, '#0891b2'
ON CONFLICT (definition_id, LOWER(key))
DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color, active = TRUE;
INSERT INTO ae_dimensions (definition_id, key, label, sort_order, active, color)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'autonomia', 'Autonomia', 5, TRUE, '#d97706'
ON CONFLICT (definition_id, LOWER(key))
DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color, active = TRUE;
INSERT INTO ae_dimensions (definition_id, key, label, sort_order, active, color)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'flexibilidade', 'Flexibilidade', 6, TRUE, '#65a30d'
ON CONFLICT (definition_id, LOWER(key))
DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color, active = TRUE;
INSERT INTO ae_dimensions (definition_id, key, label, sort_order, active, color)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'proposito', 'Propósito', 7, TRUE, '#db2777'
ON CONFLICT (definition_id, LOWER(key))
DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color, active = TRUE;
INSERT INTO ae_dimensions (definition_id, key, label, sort_order, active, color)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'relacionamentos', 'Relacionamentos', 8, TRUE, '#e11d48'
ON CONFLICT (definition_id, LOWER(key))
DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color, active = TRUE;
INSERT INTO ae_dimensions (definition_id, key, label, sort_order, active, color)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'seguranca', 'Segurança', 9, TRUE, '#4b5563'
ON CONFLICT (definition_id, LOWER(key))
DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color, active = TRUE;
INSERT INTO ae_dimensions (definition_id, key, label, sort_order, active, color)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lideranca', 'Liderança', 10, TRUE, '#7c2d12'
ON CONFLICT (definition_id, LOWER(key))
DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color, active = TRUE;
INSERT INTO ae_dimensions (definition_id, key, label, sort_order, active, color)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'desafio', 'Desafio', 11, TRUE, '#ea580c'
ON CONFLICT (definition_id, LOWER(key))
DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color, active = TRUE;
INSERT INTO ae_dimensions (definition_id, key, label, sort_order, active, color)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'criatividade', 'Criatividade', 12, TRUE, '#7e22ce'
ON CONFLICT (definition_id, LOWER(key))
DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color, active = TRUE;
INSERT INTO ae_dimensions (definition_id, key, label, sort_order, active, color)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'equilibrio', 'Equilíbrio & vida pessoal', 13, TRUE, '#0d9488'
ON CONFLICT (definition_id, LOWER(key))
DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color, active = TRUE;

DELETE FROM ae_questions WHERE definition_id = (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1);

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_01', 'Após concluir um grande projeto com sucesso, o que mais lhe deixaria satisfeito?', 'forced_choice', 'resultado', 1, 0, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Receber um bônus ou aumento salarial', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_01';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_01' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_01' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Ser promovido ou assumir maior responsabilidade', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_01';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_01' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_01' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Receber reconhecimento público pela entrega', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_01';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_01' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_01' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Liderar um novo projeto desafiador', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_01';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_01' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_01' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_01' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_02', 'O que mais pesaria ao escolher permanecer na empresa?', 'forced_choice', 'retencao', 1, 1, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Estabilidade e previsibilidade de longo prazo', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_02';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_02' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_02' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Cultura forte e boas relações com colegas', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_02';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_02' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_02' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Oportunidades claras de crescimento', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_02';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_02' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_02' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Liberdade para organizar como trabalho', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_02';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_02' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_02' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_03', 'Qual benefício teria maior impacto no seu engajamento?', 'forced_choice', 'beneficios', 1, 2, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Plano de saúde e benefícios robustos', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_03';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_03' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_03' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Horário flexível e trabalho remoto', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_03';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_03' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_03' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Budget para cursos e certificações', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_03';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_03' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_03' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Programa de reconhecimento e premiações', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_03';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_03' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_03' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_04', 'O que mais te motivaria a aceitar um novo desafio interno?', 'forced_choice', 'desafio', 1, 3, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Problema complexo que exige criatividade', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_04';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_04' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_04' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Chance de liderar pessoas e influenciar resultados', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_04';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_04' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_04' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Impacto visível na missão da empresa', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_04';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_04' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_04' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Maior autonomia nas decisões do projeto', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_04';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_04' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_04' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_05', 'Em um dia difícil, o que mais ajudaria a recuperar sua motivação?', 'forced_choice', 'engajamento', 1, 4, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Um feedback positivo do gestor', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_05';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_05' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_05' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Conversar com colegas de confiança', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_05';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_05' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_05' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Lembrar do propósito do que faço', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_05';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_05' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_05' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Focar em uma meta pessoal de carreira', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_05';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_05' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_05' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_06', 'Qual situação seria mais desmotivadora para você?', 'forced_choice', 'desmotivadores', 1, 5, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Falta de perspectiva de crescimento', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_06';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_06' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_06' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Microgerenciamento constante', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_06';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_06' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, -1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_06' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Remuneração abaixo do mercado', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_06';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_06' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_06' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Ambiente sem colaboração entre pessoas', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_06';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_06' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_06' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_07', 'Ao receber feedback sobre seu desempenho, o que mais valoriza?', 'forced_choice', 'feedback', 1, 6, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Reconhecimento explícito das conquistas', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_07';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_07' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_07' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Orientações claras para evoluir tecnicamente', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_07';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_07' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_07' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Discussão sobre próximos passos de carreira', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_07';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_07' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_07' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Autonomia para definir como melhorar', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_07';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_07' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_07' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_08', 'Qual formato de reconhecimento teria mais significado para você?', 'forced_choice', 'reconhecimento', 1, 7, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Destaque em reunião ou comunicado da empresa', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_08';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_08' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_08' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Aumento salarial ou bônus vinculado ao resultado', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_08';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_08' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_08' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Nova oportunidade de projeto estratégico', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_08';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_08' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_08' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Mentoria ou patrocínio de um líder sênior', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_08';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_08' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_08' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_09', 'O que mais influenciaria sua decisão de pedir demissão?', 'forced_choice', 'turnover', 1, 8, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Salário e benefícios insuficientes', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_09';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_09' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_09' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Falta de desafios e aprendizado', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_09';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_09' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_09' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Desalinhamento com os valores da empresa', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_09';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_09' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_09' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Rotina rígida que atrapalha a vida pessoal', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_09';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_09' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_09' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_10', 'Em uma promoção, o que mais te atrairia?', 'forced_choice', 'carreira', 1, 9, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Maior remuneração e pacote de benefícios', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_10';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_10' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_10' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Cargo com mais influência e liderança', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_10';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_10' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_10' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Posição com projetos mais desafiadores', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_10';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_10' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_10' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Função alinhada ao impacto que quero gerar', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_10';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_10' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_10' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_11', 'Qual ambiente de trabalho prefere?', 'forced_choice', 'ambiente', 1, 10, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Estruturado, com processos claros e previsíveis', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_11';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_11' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, -1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_11' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Colaborativo, com forte espírito de equipe', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_11';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_11' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_11' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Dinâmico, com metas agressivas e pressão saudável', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_11';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_11' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_11' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Aberto a experimentação e ideias novas', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_11';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_11' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_11' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_12', 'Como prefere desenvolver novas competências?', 'forced_choice', 'desenvolvimento', 1, 11, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Cursos formais e certificações pagas pela empresa', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_12';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_12' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_12' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Aprendendo na prática com projetos reais', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_12';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_12' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_12' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Mentoria com profissionais experientes', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_12';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_12' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_12' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Estudo autônomo no meu próprio ritmo', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_12';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_12' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_12' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_13', 'O que mais valoriza em um gestor direto?', 'forced_choice', 'lideranca', 1, 12, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Que reconheça e celebre minhas entregas', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_13';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_13' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_13' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Que me dê liberdade para decidir como executar', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_13';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_13' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_13' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Que invista no meu crescimento profissional', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_13';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_13' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_13' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Que respeite meus limites e vida pessoal', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_13';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_13' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_13' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_14', 'Ao equilibrar vida pessoal e profissional, o que pesa mais?', 'forced_choice', 'equilibrio', 1, 13, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Horários previsíveis e limites claros', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_14';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_14' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_14' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Possibilidade de trabalhar de qualquer lugar', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_14';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_14' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_14' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Trabalho com propósito que justifique dedicação', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_14';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_14' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_14' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Remuneração que compense a dedicação', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_14';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_14' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_14' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_15', 'Qual tipo de meta profissional mais te energiza?', 'forced_choice', 'metas', 1, 14, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Bater metas financeiras ou de vendas', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_15';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_15' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_15' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Construir relacionamentos duradouros com clientes ou colegas', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_15';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_15' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_15' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Dominar uma nova área de conhecimento', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_15';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_15' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_15' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Criar algo original ou inovador', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_15';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_15' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_15' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_16', 'Em uma reestruturação da empresa, o que mais te preocuparia?', 'forced_choice', 'mudanca', 1, 15, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Perder estabilidade e segurança no emprego', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_16';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_16' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_16' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Perder autonomia nas decisões do dia a dia', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_16';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_16' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_16' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Perder o senso de propósito do trabalho', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_16';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_16' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_16' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Perder oportunidades de crescimento', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_16';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_16' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_16' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_17', 'Qual recompensa por bom desempenho seria mais significativa?', 'forced_choice', 'recompensa', 1, 16, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Viagem ou experiência especial', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_17';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_17' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_17' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_17' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Participação em projeto de alto impacto', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_17';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_17' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_17' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Aumento salarial imediato', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_17';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_17' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_17' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Título ou posição mais senior', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_17';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_17' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_17' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_18', 'O que mais te atrai em uma nova função interna?', 'forced_choice', 'mobilidade', 1, 17, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Aprender algo completamente novo', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_18';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_18' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_18' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Maior visibilidade perante a liderança', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_18';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_18' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_18' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Trabalhar com pessoas que admiro', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_18';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_18' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_18' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Ter mais espaço para propor e criar', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_18';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_18' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_18' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_19', 'Como mede o sucesso na sua carreira?', 'forced_choice', 'sucesso', 1, 18, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Nível de remuneração e patrimônio acumulado', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_19';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_19' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_19' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Posição e influência que exerço', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_19';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_19' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_19' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Impacto positivo que gero nas pessoas', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_19';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_19' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_19' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Quanto aprendi e evoluí profissionalmente', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_19';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_19' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_19' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_20', 'Em um projeto em equipe, qual papel prefere assumir?', 'forced_choice', 'equipe', 1, 19, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Liderar e coordenar as entregas', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_20';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_20' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_20' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Resolver os problemas mais difíceis', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_20';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_20' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_20' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Garantir harmonia e comunicação do grupo', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_20';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_20' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_20' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Propor a abordagem e as ideias do projeto', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_20';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_20' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_20' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_21', 'Qual investimento da empresa em você seria mais valorizado?', 'forced_choice', 'investimento', 1, 20, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Programa de formação contínua', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_21';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_21' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_21' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Plano de carreira estruturado', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_21';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_21' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_21' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Participação nos lucros ou equity', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_21';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_21' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_21' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Flexibilidade de local e horário de trabalho', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_21';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_21' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_21' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'fc_22', 'Ao comparar duas ofertas de trabalho equivalentes, o que desempata?', 'forced_choice', 'escolha', 1, 21, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Pacote financeiro mais atrativo', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_22';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_22' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_22' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Cultura e propósito da organização', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_22';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_22' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_22' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Desafios técnicos ou de negócio maiores', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_22';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_22' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_22' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Modelo de trabalho que respeite minha vida pessoal', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_22';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_22' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'fc_22' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'rank_01', 'Ordene, do mais importante para o menos importante, o que mais te motiva no trabalho hoje:', 'ranking', 'prioridades', 1, 22, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Remuneração e benefícios', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_01';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_01' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Reconhecimento pelas entregas', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_01';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_01' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Oportunidades de crescimento', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_01';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_01' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Autonomia no dia a dia', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_01';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_01' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'rank_02', 'Coloque em ordem o que você mais valoriza em um pacote de trabalho:', 'ranking', 'pacote', 1, 23, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Salário e bônus', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_02';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_02' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Flexibilidade de horário e local', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_02';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_02' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Budget para cursos e certificações', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_02';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_02' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Estabilidade e segurança no emprego', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_02';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_02' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'rank_03', 'Priorize os fatores que mais te fariam permanecer na empresa:', 'ranking', 'retencao', 1, 24, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Propósito e impacto do trabalho', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_03';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_03' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Boas relações com o time', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_03';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_03' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Desafios e projetos estimulantes', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_03';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_03' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Espaço para liderar e influenciar', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_03';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_03' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'rank_04', 'Ordene do mais ao menos importante no seu dia a dia profissional:', 'ranking', 'dia_a_dia', 1, 25, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Equilíbrio com a vida pessoal', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_04';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_04' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Liberdade para criar e inovar', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_04';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_04' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Ser reconhecido pelo que faço', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_04';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_04' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Evoluir na carreira', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_04';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_04' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'rank_05', 'Priorize o que mais te energiza ao começar um novo projeto:', 'ranking', 'projeto', 1, 26, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Resolver algo criativo e inovador', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_05';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_05' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Liderar e coordenar pessoas', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_05';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_05' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Aprender e desenvolver competências', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_05';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_05' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Gerar impacto com propósito', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_05';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_05' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'rank_06', 'Ordene os benefícios que mais fariam diferença para você:', 'ranking', 'beneficios', 1, 27, TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Tempo livre e respeito à vida pessoal', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_06';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_06' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Plano de carreira e promoções', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_06';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_06' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Remuneração acima do mercado', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_06';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_06' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Ambiente colaborativo e acolhedor', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_06';
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'rank_06' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_001', 'Feedback frequente do gestor aumenta meu engajamento no trabalho.', 'likert', 'feedback', 1, 28, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 3
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_001'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_001'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_002', 'Salário competitivo é essencial para eu me sentir valorizado.', 'likert', 'financeiro', 1, 29, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_002'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_002'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_003', 'Oportunidades de promoção são um fator decisivo na minha permanência.', 'likert', 'carreira', 1, 30, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_003'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_003'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_004', 'Aprender coisas novas regularmente me mantém motivado.', 'likert', 'desenvolvimento', 1, 31, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_004'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_004'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_005', 'Prefiro ter autonomia para decidir como realizar minhas tarefas.', 'likert', 'autonomia', 1, 32, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_005'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_005'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_006', 'Flexibilidade de horário é mais importante que outros benefícios.', 'likert', 'flexibilidade', 1, 33, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_006'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 2
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_006'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_007', 'Trabalhar em algo com propósito claro é fundamental para mim.', 'likert', 'proposito', 1, 34, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_007'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_007'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_008', 'Boas relações com colegas impactam diretamente minha satisfação.', 'likert', 'relacionamentos', 1, 35, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_008'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_008'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_009', 'Estabilidade no emprego é uma prioridade na minha carreira.', 'likert', 'seguranca', 1, 36, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_009'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_009'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_010', 'Assumir posições de liderança é um objetivo importante para mim.', 'likert', 'lideranca', 1, 37, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_010'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 2
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_010'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_011', 'Projetos desafiadores me energizam mais que rotina previsível.', 'likert', 'desafio', 1, 38, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_011'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_011'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_012', 'Reconhecimento público pelas minhas entregas me motiva bastante.', 'likert', 'reconhecimento', 1, 39, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_012'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_012'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_013', 'Benefícios como plano de saúde pesam muito na minha decisão de ficar.', 'likert', 'beneficios', 1, 40, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 3
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_013'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 3
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_013'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_014', 'Microgerenciamento reduz significativamente minha motivação.', 'likert', 'autonomia', 1, 41, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_014'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, -2
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_014'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_015', 'Ver colegas crescendo me inspira a buscar minha própria evolução.', 'likert', 'crescimento', 1, 42, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 3
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_015'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 2
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_015'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_016', 'Trabalhar remotamente melhora minha produtividade e bem-estar.', 'likert', 'flexibilidade', 1, 43, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_016'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 2
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_016'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_017', 'Participar de decisões estratégicas me faz sentir mais engajado.', 'likert', 'lideranca', 1, 44, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 3
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_017'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 2
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_017'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_017'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_018', 'Metas agressivas me motivam a dar o meu melhor.', 'likert', 'desafio', 1, 45, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_018'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_018'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_019', 'Sentir que meu trabalho faz diferença para clientes ou sociedade é crucial.', 'likert', 'proposito', 1, 46, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_019'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_019'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_020', 'Programas de capacitação da empresa influenciam minha lealdade.', 'likert', 'desenvolvimento', 1, 47, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_020'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 2
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_020'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_021', 'Transparência sobre critérios de promoção é importante para mim.', 'likert', 'crescimento', 1, 48, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 3
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_021'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 2
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_021'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_021'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_022', 'Ambiente previsível e organizado me traz mais conforto para performar.', 'likert', 'seguranca', 1, 49, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_022'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, -1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_022'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_023', 'Bônus por desempenho me incentivam mais que elogios verbais.', 'likert', 'financeiro', 1, 50, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_023'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_023'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_024', 'Colaborar em equipe me dá mais satisfação que trabalhar sozinho.', 'likert', 'relacionamentos', 1, 51, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_024'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_024'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_025', 'Ter liberdade para propor ideias e soluções criativas me motiva.', 'likert', 'criatividade', 1, 52, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_025'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_025'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_026', 'Tarefas repetitivas e sem espaço para criar reduzem minha motivação.', 'likert', 'criatividade', 1, 53, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_026'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_026'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_027', 'Gosto de experimentar novas formas de resolver problemas.', 'likert', 'criatividade', 1, 54, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 3
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_027'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 2
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_027'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_028', 'Conseguir equilibrar trabalho e vida pessoal é decisivo para mim.', 'likert', 'equilibrio', 1, 55, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_028'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_028'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_029', 'Abro mão de oportunidades se comprometerem demais minha vida pessoal.', 'likert', 'equilibrio', 1, 56, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_029'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_029'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_030', 'Preservar tempo para família e interesses pessoais é uma prioridade.', 'likert', 'equilibrio', 1, 57, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_030'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_031', 'Prefiro metas difíceis mesmo com risco de não atingi-las.', 'likert', 'desafio', 1, 58, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_031'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_031'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_032', 'Preciso acreditar na causa da empresa para me dedicar de verdade.', 'likert', 'proposito', 1, 59, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_032'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_032'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_033', 'Prefiro previsibilidade a grandes oscilações na minha rotina.', 'likert', 'seguranca', 1, 60, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_033'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_034', 'Um simples "obrigado" do gestor já faz diferença no meu dia.', 'likert', 'reconhecimento', 1, 61, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 3
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_034'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_034'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_035', 'Rendo mais quando confiam em mim sem cobrança constante.', 'likert', 'autonomia', 1, 62, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_035'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_036', 'Fico frustrado quando passo meses sem aprender nada novo.', 'likert', 'desenvolvimento', 1, 63, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_036'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_036'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_037', 'Comparo com frequência meu salário ao praticado no mercado.', 'likert', 'financeiro', 1, 64, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_037'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_038', 'Quero assumir mais responsabilidades a cada ano.', 'likert', 'crescimento', 1, 65, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_038'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_038'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_039', 'Sinto-me realizado ao ajudar colegas a se desenvolverem.', 'likert', 'lideranca', 1, 66, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 3
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_039'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 2
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_039'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'lk_040', 'Poder escolher meus horários me deixa mais produtivo.', 'likert', 'flexibilidade', 1, 67, TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_040'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'lk_040'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

COMMIT;

-- Validação (rode depois):
-- SELECT slug, version, config FROM ae_definitions WHERE LOWER(slug) = 'motivators';
-- SELECT question_type, COUNT(*)::int FROM ae_questions q JOIN ae_definitions d ON d.id = q.definition_id WHERE LOWER(d.slug) = 'motivators' AND q.active GROUP BY 1 ORDER BY 1;