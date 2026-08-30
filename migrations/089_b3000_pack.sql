-- 089 — Epic B-3000 pack (B-3001 calibration, B-3003 variable pay status, B-3004 light OKRs)
-- Idempotent. Salary map (B-3002) is read-only over existing job_roles + compensation.

-- B-3001: calibration fields on submitted reviews (overall + exploratory 9Box cell)
ALTER TABLE performance_reviews
  ADD COLUMN IF NOT EXISTS overall_score NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS nine_box_cell SMALLINT,
  ADD COLUMN IF NOT EXISTS calibrated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS calibrated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS calibration_notes TEXT NOT NULL DEFAULT '';

ALTER TABLE performance_reviews
  DROP CONSTRAINT IF EXISTS performance_reviews_overall_score_chk;
ALTER TABLE performance_reviews
  ADD CONSTRAINT performance_reviews_overall_score_chk
  CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100));

ALTER TABLE performance_reviews
  DROP CONSTRAINT IF EXISTS performance_reviews_nine_box_cell_chk;
ALTER TABLE performance_reviews
  ADD CONSTRAINT performance_reviews_nine_box_cell_chk
  CHECK (nine_box_cell IS NULL OR (nine_box_cell >= 1 AND nine_box_cell <= 9));

ALTER TABLE performance_reviews
  DROP CONSTRAINT IF EXISTS performance_reviews_calibration_notes_len;
ALTER TABLE performance_reviews
  ADD CONSTRAINT performance_reviews_calibration_notes_len
  CHECK (char_length(calibration_notes) <= 2000);

COMMENT ON COLUMN performance_reviews.overall_score IS
  'B-3001: overall 0–100 (derived on submit; RH may calibrate with audit).';
COMMENT ON COLUMN performance_reviews.nine_box_cell IS
  'B-3001: optional exploratory 9Box cell 1–9 from calibration (not a promotion label).';

-- B-3003: proposed/approved variable pay on compensation events
ALTER TABLE employee_compensation_events
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS source_review_id BIGINT REFERENCES performance_reviews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_cycle_id BIGINT REFERENCES performance_cycles(id) ON DELETE SET NULL;

ALTER TABLE employee_compensation_events
  DROP CONSTRAINT IF EXISTS employee_compensation_events_approval_chk;
ALTER TABLE employee_compensation_events
  ADD CONSTRAINT employee_compensation_events_approval_chk
  CHECK (approval_status IN ('proposed', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_compensation_approval_company
  ON employee_compensation_events (company_id, approval_status, effective_date DESC)
  WHERE approval_status = 'proposed';

COMMENT ON COLUMN employee_compensation_events.approval_status IS
  'B-3003: proposed (from review) | approved | rejected. Legacy rows default approved.';

-- B-3004: light OKR tree (company → team group → person)
CREATE TABLE IF NOT EXISTS okr_objectives (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_id            BIGINT REFERENCES okr_objectives(id) ON DELETE CASCADE,
  level                TEXT NOT NULL DEFAULT 'company',
  title                TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  team_group_id        BIGINT REFERENCES team_groups(id) ON DELETE SET NULL,
  candidate_id         BIGINT REFERENCES candidates(id) ON DELETE SET NULL,
  period_start         DATE,
  period_end           DATE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT okr_objectives_level_chk CHECK (level IN ('company', 'team', 'person')),
  CONSTRAINT okr_objectives_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 300),
  CONSTRAINT okr_objectives_description_len CHECK (char_length(description) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_okr_objectives_company
  ON okr_objectives (company_id, level, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_okr_objectives_parent
  ON okr_objectives (company_id, parent_id)
  WHERE parent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS okr_key_results (
  id                      BIGSERIAL PRIMARY KEY,
  company_id              BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  objective_id            BIGINT NOT NULL REFERENCES okr_objectives(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  unit                    TEXT NOT NULL DEFAULT '',
  target_value            NUMERIC(14, 2) NOT NULL DEFAULT 0,
  current_value           NUMERIC(14, 2) NOT NULL DEFAULT 0,
  performance_goal_id     BIGINT REFERENCES performance_goals(id) ON DELETE SET NULL,
  sort_order              INT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT okr_key_results_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 300),
  CONSTRAINT okr_key_results_unit_len CHECK (char_length(unit) <= 40)
);

CREATE INDEX IF NOT EXISTS idx_okr_key_results_objective
  ON okr_key_results (objective_id, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_okr_key_results_company
  ON okr_key_results (company_id, objective_id);

COMMENT ON TABLE okr_objectives IS
  'B-3004 light OKRs: company / team (saved group) / person. Cap enforced in lib.';
COMMENT ON TABLE okr_key_results IS
  'B-3004 numeric key results; optional link to performance_goals.';

INSERT INTO schema_migrations (name) VALUES ('089_b3000_pack.sql')
ON CONFLICT (name) DO NOTHING;
