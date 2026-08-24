-- 049 — B-701: check-ins leves de pós-hire (30/60/90) + fonte PDI onboarding

CREATE TABLE IF NOT EXISTS employee_onboarding_checkins (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  milestone_days       INT NOT NULL,
  due_date             DATE NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending',
  outcome              TEXT NOT NULL DEFAULT '',
  notes                TEXT NOT NULL DEFAULT '',
  completed_at         TIMESTAMPTZ,
  completed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_onboarding_checkins_milestone_chk
    CHECK (milestone_days IN (30, 60, 90)),
  CONSTRAINT employee_onboarding_checkins_status_chk
    CHECK (status IN ('pending', 'done', 'skipped')),
  CONSTRAINT employee_onboarding_checkins_outcome_chk
    CHECK (outcome IN ('', 'continue', 'develop', 'concern')),
  CONSTRAINT employee_onboarding_checkins_notes_len
    CHECK (char_length(notes) <= 4000),
  CONSTRAINT employee_onboarding_checkins_unique
    UNIQUE (candidate_id, milestone_days)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_checkins_company_due
  ON employee_onboarding_checkins (company_id, due_date ASC, id ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_onboarding_checkins_candidate
  ON employee_onboarding_checkins (candidate_id, milestone_days ASC);

COMMENT ON TABLE employee_onboarding_checkins IS
  'Light post-hire check-ins at 30/60/90 days from start_date (B-701). Not a full experience review suite.';

ALTER TABLE development_plan_items
  DROP CONSTRAINT IF EXISTS development_plan_items_source_chk;

ALTER TABLE development_plan_items
  ADD CONSTRAINT development_plan_items_source_chk
  CHECK (source IN ('manual', 'synthesis', 'one_on_one', 'retention', 'onboarding'));

COMMENT ON COLUMN development_plan_items.source IS
  'manual | synthesis | one_on_one | retention | onboarding (B-701).';
