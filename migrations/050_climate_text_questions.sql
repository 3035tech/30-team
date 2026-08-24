-- 050 — Climate open-text (descriptive) questions + answers in JSONB

ALTER TABLE climate_survey_questions
  ADD COLUMN IF NOT EXISTS question_kind TEXT NOT NULL DEFAULT 'likert';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'climate_survey_questions_kind_chk'
  ) THEN
    ALTER TABLE climate_survey_questions DROP CONSTRAINT climate_survey_questions_kind_chk;
  END IF;
END $$;

ALTER TABLE climate_survey_questions
  ADD CONSTRAINT climate_survey_questions_kind_chk
  CHECK (question_kind IN ('likert', 'text'));

COMMENT ON COLUMN climate_survey_questions.question_kind IS
  'likert (1–5 scale) | text (anonymous open answer). B-704.';

COMMENT ON COLUMN climate_survey_responses.answers IS
  'JSONB map questionId → number (likert) or string (text). No candidate_id.';
