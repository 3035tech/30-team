-- 050 — Climate open-text (descriptive) questions + answers in JSONB

ALTER TABLE climate_survey_questions
  ADD COLUMN IF NOT EXISTS question_kind TEXT NOT NULL DEFAULT 'likert';

ALTER TABLE climate_survey_questions
  DROP CONSTRAINT IF EXISTS climate_survey_questions_kind_chk;
ALTER TABLE climate_survey_questions
  ADD CONSTRAINT climate_survey_questions_kind_chk
  CHECK (question_kind IN ('likert', 'text'));

COMMENT ON COLUMN climate_survey_questions.question_kind IS
  'likert (1–5 scale) | text (anonymous open answer). B-704.';

COMMENT ON COLUMN climate_survey_responses.answers IS
  'JSONB map questionId → number (likert) or string (text). No candidate_id.';
