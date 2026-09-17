-- 106: Climate survey archive + version lineage (B-RH2-16)
-- After publish, questions stay frozen; changes = archive + new draft version.
-- Invite counts remain anonymous (no candidate linkage in aggregates).

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

COMMENT ON COLUMN climate_surveys.source_survey_id IS
  'B-RH2-16: when this draft was created as a new version, points at the archived/closed prior survey.';

COMMENT ON CONSTRAINT climate_surveys_status_chk ON climate_surveys IS
  'draft | open | closed | archived. Questions editable only while draft.';

INSERT INTO schema_migrations (name) VALUES ('106_climate_survey_archive.sql')
ON CONFLICT (name) DO NOTHING;
