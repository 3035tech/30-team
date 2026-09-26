-- Additive: older clients retain the default 1–5 agreement scale.
-- Rollback application first; retain tables/columns to preserve collected answers.
ALTER TABLE formal_review_cycles
  ADD COLUMN IF NOT EXISTS response_scale TEXT NOT NULL DEFAULT 'agreement'
    CHECK (response_scale IN ('agreement', 'frequency'));

-- Questions have stable identity; answers reference that identity, not array positions.
CREATE TABLE IF NOT EXISTS formal_cycle_questions (
  id BIGSERIAL PRIMARY KEY,
  cycle_id BIGINT NOT NULL REFERENCES formal_review_cycles(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL CHECK (char_length(btrim(prompt)) BETWEEN 1 AND 1000),
  sort_order SMALLINT NOT NULL CHECK (sort_order BETWEEN 0 AND 9),
  UNIQUE (cycle_id, sort_order)
);
CREATE TABLE IF NOT EXISTS formal_review_open_answers (
  rater_id BIGINT NOT NULL REFERENCES formal_review_raters(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES formal_cycle_questions(id) ON DELETE RESTRICT,
  answer TEXT NOT NULL DEFAULT '' CHECK (char_length(answer) <= 4000),
  PRIMARY KEY (rater_id, question_id)
);
CREATE INDEX IF NOT EXISTS formal_review_open_answers_question_idx
  ON formal_review_open_answers(question_id);
