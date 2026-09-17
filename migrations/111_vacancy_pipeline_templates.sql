-- 111: Reusable pipeline templates and per-vacancy stage snapshots.
-- Owned by the recruiting tenant (company_id); existing vacancies keep the
-- company pipeline fallback until explicitly assigned or recreated.

CREATE TABLE IF NOT EXISTS pipeline_templates (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pipeline_templates_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 80)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pipeline_templates_company_name
  ON pipeline_templates (company_id, lower(name)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pipeline_templates_company_default
  ON pipeline_templates (company_id) WHERE is_default = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_company
  ON pipeline_templates (company_id, created_at ASC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS pipeline_template_stages (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL REFERENCES pipeline_templates(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  label_pt TEXT NOT NULL,
  label_en TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  sort_order INT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (template_id, stage_key)
);
CREATE INDEX IF NOT EXISTS idx_pipeline_template_stages_order
  ON pipeline_template_stages (template_id, sort_order ASC, id ASC);

CREATE TABLE IF NOT EXISTS vacancy_pipeline_stages (
  id BIGSERIAL PRIMARY KEY,
  vacancy_id BIGINT NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  label_pt TEXT NOT NULL,
  label_en TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  sort_order INT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vacancy_id, stage_key)
);
CREATE INDEX IF NOT EXISTS idx_vacancy_pipeline_stages_order
  ON vacancy_pipeline_stages (vacancy_id, sort_order ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_vacancy_pipeline_stages_tenant
  ON vacancy_pipeline_stages (company_id, vacancy_id);

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS pipeline_template_id BIGINT REFERENCES pipeline_templates(id) ON DELETE SET NULL;

COMMENT ON TABLE pipeline_templates IS
  'Reusable recruiting pipeline models owned by the tenant company.';
COMMENT ON TABLE vacancy_pipeline_stages IS
  'Immutable-at-creation stage snapshot selected for a vacancy; later editable per vacancy.';

INSERT INTO schema_migrations (name) VALUES ('111_vacancy_pipeline_templates.sql')
ON CONFLICT (name) DO NOTHING;
