-- =============================================================================
-- Combined hotfixes after interrupted scripts-banco-pendentes.sql runs
-- =============================================================================
-- Safe / idempotent. Does not change row data. Does not touch Motivadores (ae_*).
-- Run this NOW, then run ONLY scripts/rh2-105-107-pgadmin.sql for RH2 schema.
-- Do NOT re-run the full scripts-banco-pendentes.sql on production.
-- =============================================================================

-- 1) PDI item source (may be missing after failed narrow ADD)
ALTER TABLE development_plan_items
  DROP CONSTRAINT IF EXISTS development_plan_items_source_chk;

ALTER TABLE development_plan_items
  ADD CONSTRAINT development_plan_items_source_chk
  CHECK (source IN (
    'manual', 'synthesis', 'one_on_one', 'retention',
    'onboarding', 'performance_review'
  ));

-- 2) Climate question kind (may be missing after failed narrow ADD)
ALTER TABLE climate_survey_questions
  DROP CONSTRAINT IF EXISTS climate_survey_questions_kind_chk;

ALTER TABLE climate_survey_questions
  ADD CONSTRAINT climate_survey_questions_kind_chk
  CHECK (question_kind IN ('likert', 'text', 'enps'));

-- Confirm:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname IN (
--   'development_plan_items_source_chk',
--   'climate_survey_questions_kind_chk'
-- )
-- ORDER BY 1;
