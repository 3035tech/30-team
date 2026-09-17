-- =============================================================================
-- RH2 schema only (105–107) — safe for production with existing Motivators data
-- =============================================================================
-- Run in pgAdmin against the target DB. Idempotent.
--
-- DOES NOT touch:
--   ae_attempts, ae_answers, ae_questions, ae_question_options,
--   ae_invites, ae_result_templates, ae_definitions, ae_dimensions
--
-- Motivators: leave as-is. No seed / no DELETE / no re-publish required for this
-- RH2 schema drop. Existing attempts and question IDs stay valid.
-- =============================================================================

BEGIN;

-- 105: candidates.created_by_user_id
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_created_by
  ON candidates (company_id, created_by_user_id)
  WHERE created_by_user_id IS NOT NULL;

INSERT INTO schema_migrations (name) VALUES ('105_candidates_created_by.sql')
ON CONFLICT (name) DO NOTHING;

-- 106: Climate survey archive + version lineage (B-RH2-16)
ALTER TABLE climate_surveys
  DROP CONSTRAINT IF EXISTS climate_surveys_status_chk;

ALTER TABLE climate_surveys
  ADD CONSTRAINT climate_surveys_status_chk
  CHECK (status IN ('draft', 'open', 'closed', 'archived'));

ALTER TABLE climate_surveys
  ADD COLUMN IF NOT EXISTS source_survey_id BIGINT REFERENCES climate_surveys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_climate_surveys_company_status
  ON climate_surveys (company_id, status, updated_at DESC)
  WHERE deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_climate_surveys_source
  ON climate_surveys (company_id, source_survey_id)
  WHERE source_survey_id IS NOT NULL AND deleted = FALSE;

INSERT INTO schema_migrations (name) VALUES ('106_climate_survey_archive.sql')
ON CONFLICT (name) DO NOTHING;

-- 107: Employee benefit assignments (B-RH2-14)
CREATE TABLE IF NOT EXISTS employee_benefit_assignments (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  benefit_id           BIGINT NOT NULL REFERENCES company_benefits(id) ON DELETE RESTRICT,
  value_note           TEXT NOT NULL DEFAULT '',
  starts_on            DATE NOT NULL DEFAULT (CURRENT_DATE),
  ends_on              DATE,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_benefit_assignments_value_note_len
    CHECK (char_length(value_note) <= 500),
  CONSTRAINT employee_benefit_assignments_dates_chk
    CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_benefit_active
  ON employee_benefit_assignments (company_id, candidate_id, benefit_id)
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_employee_benefit_candidate
  ON employee_benefit_assignments (company_id, candidate_id, active, starts_on DESC);

CREATE INDEX IF NOT EXISTS idx_employee_benefit_benefit
  ON employee_benefit_assignments (company_id, benefit_id, active)
  WHERE active = TRUE;

INSERT INTO schema_migrations (name) VALUES ('107_employee_benefit_assignments.sql')
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- Optional sanity checks (read-only):
-- SELECT name FROM schema_migrations WHERE name LIKE '10%_%.sql' ORDER BY name;
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'candidates' AND column_name = 'created_by_user_id';
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint WHERE conname = 'climate_surveys_status_chk';
-- SELECT to_regclass('public.employee_benefit_assignments');
