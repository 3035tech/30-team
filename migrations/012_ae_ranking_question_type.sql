-- 012: adiciona o tipo de pergunta "ranking" (ordenar opções por importância).

ALTER TABLE ae_questions DROP CONSTRAINT IF EXISTS ae_questions_question_type_check;

ALTER TABLE ae_questions
  ADD CONSTRAINT ae_questions_question_type_check
  CHECK (question_type IN ('forced_choice', 'likert', 'ranking'));

INSERT INTO schema_migrations (name) VALUES ('012_ae_ranking_question_type.sql')
ON CONFLICT (name) DO NOTHING;
