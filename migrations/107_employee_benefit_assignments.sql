-- 107: Employee benefit assignments (B-RH2-14)
-- Links catalog benefits to a collaborator with optional value note and history.
-- Not payroll / enrollment portal — RH tracking only.

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

-- At most one active assignment per person+benefit
CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_benefit_active
  ON employee_benefit_assignments (company_id, candidate_id, benefit_id)
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_employee_benefit_candidate
  ON employee_benefit_assignments (company_id, candidate_id, active, starts_on DESC);

CREATE INDEX IF NOT EXISTS idx_employee_benefit_benefit
  ON employee_benefit_assignments (company_id, benefit_id, active)
  WHERE active = TRUE;

COMMENT ON TABLE employee_benefit_assignments IS
  'B-RH2-14: which catalog benefits a collaborator receives. History via ends_on + active=false. Not payroll.';

COMMENT ON COLUMN employee_benefit_assignments.value_note IS
  'Free-text value/amount context (e.g. R$ 30/day). Not a ledger amount.';

INSERT INTO schema_migrations (name) VALUES ('107_employee_benefit_assignments.sql')
ON CONFLICT (name) DO NOTHING;
