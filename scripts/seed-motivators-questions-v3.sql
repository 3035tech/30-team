-- Publica Motivadores v3 (73 perguntas situacionais)
-- NÃO apaga perguntas antigas: só desativa e insere v3_*.
-- Preserva tentativas já feitas (scores, respostas, question_ids).
-- Equivalente a: npm run db:seed-motivators

BEGIN;

ALTER TABLE ae_questions DROP CONSTRAINT IF EXISTS ae_questions_question_type_check;
ALTER TABLE ae_questions
  ADD CONSTRAINT ae_questions_question_type_check
  CHECK (question_type IN ('forced_choice', 'likert', 'ranking'));

INSERT INTO ae_definitions (slug, name, description, version, active, config)
VALUES ('motivators', 'Motivadores Profissionais', 'Assessment situacional: identifica condições e experiências que tendem a influenciar satisfação, engajamento e escolhas no trabalho — não o que a pessoa acha que deveria responder.', 3, TRUE, '{"questions_per_session":30,"forced_choice_per_session":14,"ranking_per_session":4,"likert_per_session":12,"shuffle":true}'::jsonb)
ON CONFLICT DO NOTHING;

UPDATE ae_definitions SET
  name = 'Motivadores Profissionais',
  description = 'Assessment situacional: identifica condições e experiências que tendem a influenciar satisfação, engajamento e escolhas no trabalho — não o que a pessoa acha que deveria responder.',
  version = 3,
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

-- Desativa o banco anterior. NÃO apaga perguntas (preserva tentativas já feitas).
UPDATE ae_questions
SET active = FALSE
WHERE definition_id = (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1)
  AND active = TRUE
  AND NOT (key = ANY(ARRAY['v3_fc_01', 'v3_fc_02', 'v3_fc_03', 'v3_fc_04', 'v3_fc_05', 'v3_fc_06', 'v3_fc_07', 'v3_fc_08', 'v3_fc_09', 'v3_fc_10', 'v3_fc_11', 'v3_fc_12', 'v3_fc_13', 'v3_fc_14', 'v3_fc_15', 'v3_fc_16', 'v3_fc_17', 'v3_fc_18', 'v3_fc_19', 'v3_fc_20', 'v3_fc_21', 'v3_fc_22', 'v3_fc_23', 'v3_fc_24', 'v3_fc_25', 'v3_fc_26', 'v3_rank_01', 'v3_rank_02', 'v3_rank_03', 'v3_rank_04', 'v3_rank_05', 'v3_rank_06', 'v3_rank_07', 'v3_rank_08', 'v3_lk_001', 'v3_lk_002', 'v3_lk_003', 'v3_lk_004', 'v3_lk_005', 'v3_lk_006', 'v3_lk_007', 'v3_lk_008', 'v3_lk_009', 'v3_lk_010', 'v3_lk_011', 'v3_lk_012', 'v3_lk_013', 'v3_lk_014', 'v3_lk_015', 'v3_lk_016', 'v3_lk_017', 'v3_lk_018', 'v3_lk_019', 'v3_lk_020', 'v3_lk_021', 'v3_lk_022', 'v3_lk_023', 'v3_lk_024', 'v3_lk_025', 'v3_lk_026', 'v3_lk_027', 'v3_lk_028', 'v3_lk_029', 'v3_lk_030', 'v3_lk_031', 'v3_lk_032', 'v3_lk_033', 'v3_lk_034', 'v3_lk_035', 'v3_lk_036', 'v3_lk_037', 'v3_lk_038', 'v3_lk_039']::text[]));

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_01', 'Ao encerrar um projeto que deu certo, o que mais faria a experiência valer a pena para você?', 'forced_choice', 'fechamento', 1, 0, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Ver o efeito concreto no bolso — um extra alinhado ao resultado.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_01'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_01' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_01' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Assumir na sequência algo com mais alcance e responsabilidade.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_01'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_01' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_01' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Alguém do time ou da gestão nomear, com clareza, o que você entregou.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_01'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_01' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_01' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Já ter na mesa um problema novo, mais difícil que o anterior.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_01'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_01' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_01' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_02', 'Duas rotinas possíveis no mesmo cargo. Qual tende a ser mais sustentável para você no dia a dia?', 'forced_choice', 'rotina', 1, 1, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Saber com antecedência o que vem pela frente e poucos sustos de última hora.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_02'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_02' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_02' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Combinar o trabalho com compromissos pessoais sem precisar estar sempre à disposição.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_02'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_02' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_02' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Poder ajustar horário e lugar conforme a semana, desde que a entrega saia.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_02'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_02' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_02' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Ter margem para decidir o caminho, desde que o resultado combinado aconteça.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_02'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_02' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_02' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_03', 'Você recebeu uma atividade nova. O que mais ajuda a entrar nela com disposição?', 'forced_choice', 'inicio', 1, 2, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Entender o resultado esperado e escolher como chegar lá.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_03'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_03' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_03' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Ter alguém do time para alinhar no começo e não ficar isolado.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_03'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_03' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_03' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Ver que a atividade serve para alguém de verdade, não só para um relatório.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_03'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_03' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_03' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Haver espaço para testar um jeito que ainda não foi usado aqui.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_03'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_03' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_03' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_04', 'Qual dessas situações tende a deixar uma semana de trabalho menos satisfatória?', 'forced_choice', 'frustracao', 1, 3, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Cada passo vir prescrito, com pouco espaço para julgar o caminho.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_04'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_04' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_04' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Entregar bem e ninguém registrar que aquilo fez diferença.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_04'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_04' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_04' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'A remuneração ficar claramente atrás do que o mercado pratica para o mesmo esforço.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_04'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_04' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_04' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'A agenda invadir noites e fins de semana sem necessidade real.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_04'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_04' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_04' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_05', 'Duas oportunidades internas, mesmo salário. O que mais pesaria na sua escolha?', 'forced_choice', 'escolha', 1, 4, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Uma pede algo que pouca gente no time consegue fazer.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_05'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_05' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_05' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Uma deixa mais claro o próximo passo de cargo daqui a um ou dois anos.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_05'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_05' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_05' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Uma aproxima você de pessoas com quem já trabalha bem.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_05'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_05' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_05' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Uma permite montar a semana com mais folga entre trabalho e o resto da vida.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_05'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_05' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_05' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_06', 'Num dia em que tudo emperrou, o que mais ajudaria a retomar o ritmo?', 'forced_choice', 'recuperacao', 1, 5, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Alguém apontar, com precisão, o que você fez bem mesmo no meio do imprevisto.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_06'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_06' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_06' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Conversar com colegas de confiança e destrinchar junto.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_06'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_06' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_06' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Lembrar para quem ou para que aquela entrega existe.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_06'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_06' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_06' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Pegar um pedaço difícil e resolver, mesmo pequeno.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_06'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_06' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_06' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_07', 'Imagine que a empresa vai investir em você neste semestre. O que faria mais diferença na prática?', 'forced_choice', 'investimento', 1, 6, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Tempo e recurso para aprender algo que você ainda não domina, no trabalho real.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_07'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_07' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_07' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Um acordo claro de quanto entra na conta e o que vem junto de benefícios.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_07'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_07' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_07' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Combinar local e horário de um jeito que a semana feche melhor.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_07'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_07' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_07' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Um caminho visível para assumir mais alcance no que já faz.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_07'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_07' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_07' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_08', 'Ao comparar duas ofertas equivalentes, o que desempata com mais força?', 'forced_choice', 'oferta', 1, 7, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'O conjunto do que entra todo mês e o que cobre imprevisto.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_08'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_08' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_08' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Dá para ver, no dia a dia, para que o trabalho serve.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_08'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_08' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_08' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Há problemas densos, não só repetição do que já se sabe fazer.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_08'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_08' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_08' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'A rotina deixa espaço para vida fora do expediente sem culpa.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_08'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_08' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_08' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_09', 'Em um grupo, qual papel você tende a pegar sem que peçam?', 'forced_choice', 'equipe', 1, 8, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Puxar a decisão quando o assunto está parado.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_09'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_09' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_09' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Ficar com o nó técnico ou de processo que ninguém quer.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_09'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_09' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_09' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Manter o fio entre as pessoas para o trabalho não travar na conversa.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_09'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_09' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_09' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Sugerir um recorte diferente do que já estava no plano.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_09'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_09' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_09' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_10', 'Quando o gestor comenta seu desempenho, o que mais muda o dia seguinte?', 'forced_choice', 'retorno', 1, 9, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Ficar claro o que de fato foi notado na entrega.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_10'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_10' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_10' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Sair com um jeito concreto de fazer melhor da próxima vez.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_10'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_10' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_10' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Conversar o que isso abre (ou não) daqui a alguns meses.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_10'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_10' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_10' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Combinar o resultado e deixar o caminho com você.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_10'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_10' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_10' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_11', 'Se a área passar por uma reorganização, o que mais pesaria no seu ânimo?', 'forced_choice', 'mudanca', 1, 10, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Não saber se o contrato e a rotina continuam previsíveis.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_11'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_11' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_11' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Passar a ter menos margem para decidir o próprio trabalho.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_11'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_11' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_11' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'O trabalho deixar de fazer sentido para você.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_11'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_11' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_11' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Sumirem as chances de ampliar o que você já construiu.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_11'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_11' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_11' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_12', 'Qual dessas cenas descreve melhor um ambiente em que você rende?', 'forced_choice', 'ambiente', 1, 11, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Combinados claros, pouca surpresa de processo.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_12'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_12' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_12' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Pessoas acessíveis, fácil pedir e oferecer ajuda.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_12'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_12' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_12' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Metas apertadas, com pressão que ainda dá para respirar.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_12'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_12' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_12' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Dá para prototipar sem pedir autorização a cada detalhe.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_12'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_12' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_12' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_13', 'Você pode escolher como evoluir numa competência. O que encaixa melhor?', 'forced_choice', 'aprender', 1, 12, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Um curso ou certificação com tempo protegido na agenda.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_13'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_13' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_13' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Pegar um pedaço real do trabalho que ainda não fez.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_13'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_13' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_13' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Acompanhar alguém mais experiente por algumas semanas.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_13'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_13' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_13' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Estudar no seu ritmo, sem aula marcada.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_13'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_13' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_13' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_14', 'No fim de um trimestre, o que mais influencia a sensação de que valeu o esforço?', 'forced_choice', 'balanco', 1, 13, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'O que entrou na conta e o que ficou mais previsível no orçamento pessoal.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_14'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_14' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_14' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Ter puxado uma frente que outras pessoas passaram a seguir.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_14'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_14' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_14' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Alguém de fora do time ter notado o efeito do que você fez.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_14'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_14' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_14' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Sair sabendo fazer algo que no início do trimestre não sabia.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_14'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_14' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_14' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_15', 'Uma entrega importante foi bem. Qual gesto da empresa teria mais peso para você?', 'forced_choice', 'gesto', 1, 14, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Um extra financeiro ligado àquele resultado.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_15'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_15' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_15' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Entrar num tema que o time ainda não resolveu.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_15'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_15' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_15' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Tempo com alguém sênior para destrinchar o que vem depois.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_15'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_15' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_15' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Alguém nomear a entrega na frente de quem importa para o trabalho.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_15'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_15' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_15' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_16', 'O que mais te faria aceitar uma frente interna nova, mesmo cansado?', 'forced_choice', 'aceite', 1, 15, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'O problema é de verdade difícil — não é só volume.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_16'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_16' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_16' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Dá para coordenar pessoas e o rumo, não só executar.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_16'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_16' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_16' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Dá para ver o efeito em cliente, operação ou comunidade.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_16'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_16' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_16' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Você decide o método, não só cumpre o roteiro.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_16'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_16' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_16' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_17', 'Na hora de ficar ou sair, o que costuma pesar mais na sua conta interna?', 'forced_choice', 'permanencia', 1, 16, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Dá para planejar os próximos dois anos sem susto de contrato.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_17'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_17' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_17' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'O clima e as relações do dia a dia aguentam a pressão.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_17'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_17' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_17' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Ainda há para onde ampliar o que você já construiu.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_17'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_17' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_17' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Você organiza o próprio trabalho sem vigia a cada passo.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_17'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_17' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_17' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_18', 'Qual combinação de semana tende a te deixar mais inteiro na sexta?', 'forced_choice', 'semana', 1, 17, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Horários que se repetem e dá para marcar o resto da vida em volta.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_18'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_18' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_18' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Alguns dias em casa, outros no escritório, conforme a pauta.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_18'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_18' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_18' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'O trabalho puxa, mas você sabe por que aquilo existe.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_18'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_18' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_18' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'O esforço aparece de forma justa no que você recebe.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_18'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_18' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_18' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_19', 'Uma meta nova chegou. Qual formato te puxa para frente?', 'forced_choice', 'meta', 1, 18, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Número claro ligado a resultado que dá para converter em remuneração variável.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_19'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_19' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_19' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Construir relação estável com quem usa o que você entrega.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_19'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_19' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_19' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Dominar um campo que ainda é buraco no seu repertório.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_19'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_19' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_19' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Inventar uma solução que ainda não está no manual.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_19'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_19' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_19' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_20', 'O que mais te atrai numa função interna diferente da atual?', 'forced_choice', 'mobilidade', 1, 19, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Vai exigir um conjunto de habilidades que você ainda está formando.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_20'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_20' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_20' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Fica mais perto de quem decide o rumo da área.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_20'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_20' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_20' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'O time do destino é gente com quem você já rende.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_20'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_20' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_20' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Há folga para propor o formato, não só herdar o anterior.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_20'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_20' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_20' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_21', 'Quando olha para trás na carreira, o que mais usa para dizer “isso avançou”?', 'forced_choice', 'sucesso', 1, 20, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'A vida material ficou mais estável do que no capítulo anterior.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_21'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_21' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_21' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Você passou a influenciar o que outras pessoas fazem no trabalho.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_21'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_21' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_21' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Dá para apontar pessoas ou processos que ficaram melhores por causa do seu trabalho.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_21'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_21' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_21' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'O repertório de hoje não existia no início.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_21'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_21' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_21' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_22', 'Se o time pudesse mudar uma coisa na forma de trabalhar com você, o que ajudaria mais?', 'forced_choice', 'gestao', 1, 21, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Nomear entregas boas no momento em que acontecem, não só no fim do ano.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_22'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_22' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_22' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Combinar o “o quê” e soltar o “como”.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_22'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_22' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_22' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Abrir espaço real para você ampliar o que já faz bem.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_22'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_22' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 3
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_22' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Respeitar o fim do expediente quando a urgência é fabricada.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_22'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_22' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_22' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_23', 'Qual dessas restrições desgastaria mais se virasse regra o ano inteiro?', 'forced_choice', 'restricao', 1, 22, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Tudo precisa de visto antes de qualquer ajuste de método.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_23'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_23' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_23' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Ninguém comenta o que funcionou — só o que faltou.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_23'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_23' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_23' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'A mesma tarefa, o mesmo jeito, mês após mês.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_23'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_23' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_23' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Reunião e mensagem fora do combinado, como se fosse normal.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_23'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_23' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_23' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_24', 'Você vai puxar uma frente de três meses. O que mais te faria dizer sim com vontade?', 'forced_choice', 'frente', 1, 23, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Poder montar a abordagem e corrigir no caminho.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_24'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_24' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_24' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'O tema importa para quem usa o serviço, não só para o slide interno.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_24'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_24' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_24' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Há um nó que o time ainda não desatou.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_24'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_24' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_24' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Você coordena outras pessoas, não só a própria lista.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_24'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_24' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_24' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_25', 'Numa semana típica, o que mais protege sua disposição para continuar?', 'forced_choice', 'disposicao', 1, 24, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Saber que o combinado de horário e lugar aguenta imprevisto pequeno.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_25'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_25' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_25' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Ter com quem falar quando o trabalho emperra.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_25'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_25' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_25' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Ver que o esforço deste mês cabe no orçamento da vida.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_25'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_25' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_25' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Sentir que a semana acrescentou ferramenta nova, não só volume.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_25'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_25' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_25' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_fc_26', 'Qual destas cenas descreve melhor o tipo de confiança que te faz render?', 'forced_choice', 'confianca', 1, 25, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Combinaram o destino; o itinerário fica com você.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_26'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_26' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_26' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Dá para prever o mês com pouca inversão de prioridade.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_26'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_26' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_26' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Tem gente ao lado quando a pauta aperta.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_26'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_26' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_26' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Erro pontual de experimento não vira processo policial.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_26'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 4
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_26' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_fc_26' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_rank_01', 'Qual dessas situações mais influencia sua satisfação no trabalho — da que mais pesa para a que menos pesa?', 'ranking', 'satisfacao', 1, 26, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'O que entra na conta fecha o mês com folga, sem malabarismo.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_01'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_01' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Alguém que importa para o trabalho nota, com precisão, o que você fez.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_01'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_01' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Dá para ver o próximo degrau, não só mais do mesmo cargo.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_01'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_01' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Você escolhe o caminho depois que o resultado ficou claro.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_01'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_01' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_rank_02', 'Se pudesse ajustar só uma coisa no arranjo atual, o que viria primeiro — e o que ficaria por último?', 'ranking', 'arranjo', 1, 27, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'O valor e os benefícios acompanharem o esforço de fato.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_02'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_02' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Poder mudar horário ou lugar quando a semana pede.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_02'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_02' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Ter tempo protegido para aprender no próprio trabalho.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_02'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_02' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Saber, com antecedência, o que se espera daqui a seis meses.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_02'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_02' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_rank_03', 'O que mais faria você continuar neste time daqui a um ano — da influência maior para a menor?', 'ranking', 'permanecer', 1, 28, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'O trabalho ainda faz sentido para alguém além da planilha.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_03'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_03' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'As relações do dia a dia aguentam pressão sem virar briga permanente.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_03'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_03' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Ainda aparecem problemas que exigem mais do que o automático.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_03'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_03' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Há espaço para puxar rumo, não só executar lista.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_03'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_03' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_rank_04', 'No dia a dia, o que mais pesa para a semana “fechar bem” — do mais ao menos relevante?', 'ranking', 'semana', 1, 29, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Sobrou energia para o que não é trabalho.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_04'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_04' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Deu para testar um jeito que ainda não estava no processo.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_04'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_04' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Ficou visível que a sua parte moveu o resultado.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_04'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_04' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'A semana deixou um passo a mais na trajetória, não só volume.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_04'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_04' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_rank_05', 'Ao começar um projeto, o que mais te puxa para dentro — e o que menos?', 'ranking', 'projeto', 1, 30, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Dá para inventar o recorte, não só copiar o último.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_05'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_05' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Você articula pessoas e prazos, não só a sua fatia.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_05'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_05' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Vai sair sabendo fazer o que hoje ainda emperra.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_05'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_05' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'O efeito em quem usa o trabalho é fácil de apontar.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_05'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_05' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_rank_06', 'Se a empresa pudesse mudar um benefício prático, o que faria mais diferença — e o que faria menos?', 'ranking', 'beneficio', 1, 31, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Agenda que de fato respeita o fim do expediente.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_06'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_06' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Um caminho de cargo com critérios que dá para acompanhar.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_06'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_06' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'O valor mensal subir de forma alinhada ao mercado.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_06'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_06' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Um clima em que pedir ajuda não pesa.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_06'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_06' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_rank_07', 'Qual dessas condições mais protege seu engajamento numa fase puxada — da mais à menos importante?', 'ranking', 'fase_puxada', 1, 32, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Saber que a sobrecarga tem data para acabar.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_07'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_07' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 1
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_07' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Poder encaixar médico, escola ou descanso no meio da semana.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_07'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_07' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Alguém nomear o esforço enquanto ele acontece.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_07'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_07' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'O esforço difícil ensinar algo que fica com você depois.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_07'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_07' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_rank_08', 'Duas frentes pedem você ao mesmo tempo. O que mais decide a prioridade — e o que menos?', 'ranking', 'prioridade', 1, 33, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_1', 'Uma deixa você coordenar o rumo das outras pessoas.', 0, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_08'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_08' AND o.key = 'opt_1'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_2', 'Uma é o problema que o time ainda não sabe resolver.', 1, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_08'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_08' AND o.key = 'opt_2'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_3', 'Uma muda algo concreto para quem está do outro lado.', 2, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_08'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_08' AND o.key = 'opt_3'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;
INSERT INTO ae_question_options (question_id, key, text, sort_order, active)
SELECT q.id, 'opt_4', 'Uma você faz do seu jeito, com pouco roteiro imposto.', 3, TRUE
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_08'
ON CONFLICT (question_id, key) DO UPDATE
  SET text = EXCLUDED.text, sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_option_dimension_weights (option_id, dimension_id, weight)
SELECT o.id, dim.id, 2
FROM ae_question_options o
JOIN ae_questions q ON q.id = o.question_id
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_rank_08' AND o.key = 'opt_4'
ON CONFLICT (option_id, dimension_id) DO UPDATE SET weight = EXCLUDED.weight;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_001', 'Quando alguém descreve com precisão o que eu entreguei, minha disposição para o próximo ciclo sobe.', 'likert', 'entrega_notada', 1, 34, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 3
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_001'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_001'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_002', 'Sair de uma reunião sem ninguém ter notado a minha parte pesa mais do que o cansaço da própria tarefa.', 'likert', 'entrega_notada', 1, 35, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_002'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_003', 'Um comentário pontual no momento da entrega muda mais o meu dia do que um ritual genérico no fim do ano.', 'likert', 'entrega_notada', 1, 36, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 3
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_003'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_003'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_004', 'Quando o valor que entra não acompanha o esforço, a semana inteira fica mais pesada — mesmo com o resto em ordem.', 'likert', 'conta_do_mes', 1, 37, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_004'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_004'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_005', 'Comparo, de tempos em tempos, o que recebo com o que gente na mesma função recebe fora daqui.', 'likert', 'conta_do_mes', 1, 38, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_005'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_006', 'Um extra ligado a resultado concreto me puxa mais do que um elogio solto, sem consequência prática.', 'likert', 'conta_do_mes', 1, 39, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_006'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_006'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_007', 'Fico inquieto quando o próximo passo de cargo some do radar por muitos meses.', 'likert', 'trajeto', 1, 40, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_007'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_007'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_008', 'Uma semana mais cheia ainda vale a pena se, no fim, eu saio com um alcance que ainda não tinha.', 'likert', 'trajeto', 1, 41, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_008'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_008'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_009', 'Preciso ver, com alguma clareza, o que esta função pode virar daqui a um ou dois anos.', 'likert', 'trajeto', 1, 42, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 3
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_009'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 2
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_009'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_010', 'Semanas em que só repito o que já sei fazer me deixam mais opaco do que semanas puxadas com aprendizado.', 'likert', 'aprender', 1, 43, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_010'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_010'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_011', 'Quando aparece um jeito concreto de aprender no próprio trabalho, meu engajamento sobe.', 'likert', 'aprender', 1, 44, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_011'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_011'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_012', 'Fico frustrado se passo um trimestre sem sair sabendo fazer algo que no início eu não sabia.', 'likert', 'aprender', 1, 45, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desenvolvimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_012'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_012'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_013', 'Rendo mais quando combinamos o resultado e o caminho fica comigo.', 'likert', 'caminho', 1, 46, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_013'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_014', 'Ter cada passo já desenhado por outra pessoa tira o gosto da tarefa, mesmo quando o tema é interessante.', 'likert', 'caminho', 1, 47, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_014'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_014'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_015', 'Cobrança de método a cada hora reduz minha disposição mais do que uma meta apertada com folga de execução.', 'likert', 'caminho', 1, 48, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_015'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_016', 'Poder deslocar um bloco da agenda — horário ou lugar — quando a vida pede me deixa mais inteiro no trabalho.', 'likert', 'encaixe', 1, 49, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_016'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_016'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_017', 'Uma regra rígida de onde e quando trabalhar, sem espaço para ajuste, pesa mais do que um pico pontual de demanda.', 'likert', 'encaixe', 1, 50, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_017'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 2
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_017'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_018', 'Encaixar um compromisso pessoal no meio da semana sem pedir desculpas demais melhora o restante dos dias.', 'likert', 'encaixe', 1, 51, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_018'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 2
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_018'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_019', 'Quando não dá para apontar para quem aquilo serve, o esforço vira só cumprimento de lista.', 'likert', 'para_quem', 1, 52, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_019'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_019'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_020', 'Ver o efeito do trabalho em alguém concreto me puxa mais do que um indicador interno sem rosto.', 'likert', 'para_quem', 1, 53, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_020'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_021', 'Se a atividade parece existir só para o relatório, minha dedicação cai mesmo com prazo apertado.', 'likert', 'para_quem', 1, 54, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_021'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_022', 'Ter com quem destrinchar quando emperra pesa tanto quanto a própria dificuldade técnica.', 'likert', 'gente', 1, 55, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_022'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_022'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_023', 'Um clima em que pedir ajuda constrange me cansa mais rápido do que uma pauta densa com gente acessível.', 'likert', 'gente', 1, 56, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_023'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_024', 'Rendo melhor quando o time conversa de verdade, não só troca tarefa no recado.', 'likert', 'gente', 1, 57, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_024'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('proposito')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_024'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_025', 'Mudanças de rumo sem aviso prévio tiram mais o chão do que um trimestre puxado com combinado claro.', 'likert', 'previsao', 1, 58, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_025'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('financeiro')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_025'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_026', 'Saber o que esperar da rotina nas próximas semanas me deixa mais disponível para o difícil.', 'likert', 'previsao', 1, 59, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_026'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_027', 'Prefiro um mês previsível a um mês brilhante se o brilho vier com inversão constante de prioridade.', 'likert', 'previsao', 1, 60, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_027'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, -1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_027'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_028', 'Quando o assunto trava, tende a me caber puxar a decisão — e isso me energiza mais do que só opinar.', 'likert', 'puxar_rumo', 1, 61, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_028'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_028'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_029', 'Quando o time está parado, puxar até virar decisão me deixa mais disposto do que só aumentar a minha lista.', 'likert', 'puxar_rumo', 1, 62, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_029'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 2
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_029'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_030', 'Ajudar alguém do time a destravar o próprio trabalho me dá uma satisfação específica, diferente de fechar a minha parte.', 'likert', 'puxar_rumo', 1, 63, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 3
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('lideranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_030'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 2
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('relacionamentos')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_030'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_031', 'Um problema que ainda não tem receita pronta me tira do automático — e isso costuma valer o esforço extra.', 'likert', 'no_dificil', 1, 64, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_031'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('crescimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_031'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_032', 'Meta apertada com chance real de não bater me acende mais do que meta folgada que sempre se cumpre.', 'likert', 'no_dificil', 1, 65, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_032'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('reconhecimento')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_032'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_033', 'Semanas só de repetição conhecida me esvaziam mais do que semanas densas com nó novo.', 'likert', 'no_dificil', 1, 66, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_033'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_033'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_034', 'Quando dá para testar um recorte que ainda não está no processo, a tarefa ganha outro gosto.', 'likert', 'jeito_novo', 1, 67, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_034'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('autonomia')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_034'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_035', 'Seguir o manual à risca, sem espaço para um jeito diferente, reduz minha disposição mesmo com tema interessante.', 'likert', 'jeito_novo', 1, 68, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_035'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_035'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_036', 'Chegar a uma solução por um caminho que o time ainda não tinha tentado me deixa mais disposto a continuar.', 'likert', 'jeito_novo', 1, 69, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 3
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('criatividade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_036'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 2
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('desafio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_036'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_037', 'Uma rotina que deixa encaixar vida fora do trabalho sem negociar toda vez é mais sustentável para mim.', 'likert', 'vida_fora', 1, 70, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_037'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('flexibilidade')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_037'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_038', 'Abro mão de uma chance se ela exigir, de forma permanente, o horário que hoje é da vida pessoal.', 'likert', 'vida_fora', 1, 71, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_038'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 1
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('seguranca')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_038'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

INSERT INTO ae_questions (definition_id, key, text, question_type, category, weight, sort_order, active)
SELECT (SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1), 'v3_lk_039', 'Mensagem e reunião fora do combinado, como hábito, pesam mais do que um pico raro e explicado.', 'likert', 'vida_fora', 1, 72, TRUE
ON CONFLICT (definition_id, key) DO UPDATE
  SET text = EXCLUDED.text, question_type = EXCLUDED.question_type,
      category = EXCLUDED.category, weight = EXCLUDED.weight,
      sort_order = EXCLUDED.sort_order, active = TRUE;
INSERT INTO ae_question_dimension_weights (question_id, dimension_id, weight_per_point)
SELECT q.id, dim.id, 4
FROM ae_questions q
JOIN ae_definitions d ON d.id = q.definition_id
JOIN ae_dimensions dim ON dim.definition_id = d.id AND LOWER(dim.key) = LOWER('equilibrio')
WHERE LOWER(d.slug) = LOWER('motivators') AND q.key = 'v3_lk_039'
ON CONFLICT (question_id, dimension_id) DO UPDATE SET weight_per_point = EXCLUDED.weight_per_point;

COMMIT;

-- Validação (rode depois):
-- SELECT slug, version, config FROM ae_definitions WHERE LOWER(slug) = 'motivators';
-- SELECT question_type, active, COUNT(*)::int FROM ae_questions q JOIN ae_definitions d ON d.id = q.definition_id WHERE LOWER(d.slug) = 'motivators' GROUP BY 1, 2 ORDER BY 1, 2;
-- SELECT COUNT(*)::int AS attempts FROM ae_attempts;