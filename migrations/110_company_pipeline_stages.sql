-- 110: Company-configurable recruiting pipeline (B-RH2-12).
-- Per-company stages (label + order + custom). Seed is lazy on first read.
-- Reports aggregate via canonical_key. Required stages cannot be deleted.

CREATE TABLE IF NOT EXISTS company_pipeline_stages (
  id             BIGSERIAL PRIMARY KEY,
  company_id     BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stage_key      TEXT NOT NULL,
  label_pt       TEXT NOT NULL,
  label_en       TEXT NOT NULL,
  sort_order     INT NOT NULL,
  canonical_key  TEXT NOT NULL,
  system         BOOLEAN NOT NULL DEFAULT FALSE,
  required       BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_pipeline_stages_stage_key_fmt
    CHECK (stage_key ~ '^[a-z][a-z0-9_]{0,63}$'),
  CONSTRAINT company_pipeline_stages_canonical_check
    CHECK (canonical_key IN (
      'new', 'interview', 'test_completed', 'screening',
      'approved', 'hired', 'rejected', 'archived'
    )),
  CONSTRAINT company_pipeline_stages_label_pt_len
    CHECK (char_length(btrim(label_pt)) BETWEEN 1 AND 60),
  CONSTRAINT company_pipeline_stages_label_en_len
    CHECK (char_length(btrim(label_en)) BETWEEN 1 AND 60)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_pipeline_stages_active_key
  ON company_pipeline_stages (company_id, stage_key)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_company_pipeline_stages_company_order
  ON company_pipeline_stages (company_id, sort_order ASC, id ASC)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE company_pipeline_stages IS
  'B-RH2-12: per-company recruiting pipeline stages. Seed lazy on first read.';
COMMENT ON COLUMN company_pipeline_stages.stage_key IS
  'Stable slug stored in vacancy_candidates.pipeline_stage / assessments.pipeline_stage. Seed stages reuse canonical keys; custom stages use c_<slug>.';
COMMENT ON COLUMN company_pipeline_stages.canonical_key IS
  'Bucket for reports/overview aggregation; also drives special actions (hired/rejected/archived).';
COMMENT ON COLUMN company_pipeline_stages.system IS
  'TRUE for seed stages (label/order editable; delete only if required=FALSE and count=0).';
COMMENT ON COLUMN company_pipeline_stages.required IS
  'TRUE for stages that must always exist (new, test_completed, hired, rejected, archived).';

-- Relax legacy CHECK constraints so custom stage_key slugs (c_*) are accepted.
-- Historic canonical values remain valid.
ALTER TABLE vacancy_candidates
  DROP CONSTRAINT IF EXISTS vacancy_candidates_pipeline_stage_check;
ALTER TABLE vacancy_candidates
  ADD CONSTRAINT vacancy_candidates_pipeline_stage_check
  CHECK (pipeline_stage IS NULL OR pipeline_stage ~ '^[a-z][a-z0-9_]{0,63}$');

ALTER TABLE assessments
  DROP CONSTRAINT IF EXISTS assessments_pipeline_stage_check;
ALTER TABLE assessments
  ADD CONSTRAINT assessments_pipeline_stage_check
  CHECK (pipeline_stage ~ '^[a-z][a-z0-9_]{0,63}$');

INSERT INTO schema_migrations (name) VALUES ('110_company_pipeline_stages.sql')
ON CONFLICT (name) DO NOTHING;
