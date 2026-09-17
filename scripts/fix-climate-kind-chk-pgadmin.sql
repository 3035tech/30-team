-- =============================================================================
-- Hotfix: restore climate_survey_questions.question_kind CHECK
-- =============================================================================
-- Cause: scripts-banco-pendentes.sql DROPped the constraint then tried to ADD
-- only ('likert','text'). Prod already has question_kind = 'enps' → ADD failed.
-- If statements auto-commit, the constraint may be missing until this runs.
--
-- Safe: does not modify row data. Idempotent.
-- =============================================================================

-- Optional diagnostic:
-- SELECT question_kind, COUNT(*) FROM climate_survey_questions GROUP BY 1 ORDER BY 1;

ALTER TABLE climate_survey_questions
  DROP CONSTRAINT IF EXISTS climate_survey_questions_kind_chk;

ALTER TABLE climate_survey_questions
  ADD CONSTRAINT climate_survey_questions_kind_chk
  CHECK (question_kind IN ('likert', 'text', 'enps'));

COMMENT ON COLUMN climate_survey_questions.question_kind IS
  'likert | text | enps';

-- Confirm:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'climate_survey_questions_kind_chk';
