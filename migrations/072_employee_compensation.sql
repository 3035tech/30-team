-- 072: Internal compensation timeline (RH) — not payroll / holerite.

CREATE TABLE IF NOT EXISTS employee_compensation_events (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  event_type           TEXT NOT NULL,
  amount               TEXT NOT NULL,
  effective_date       DATE NOT NULL,
  notes                TEXT NOT NULL DEFAULT '',
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_compensation_events_type_chk
    CHECK (event_type IN ('hire', 'raise', 'adjustment', 'bonus', 'other')),
  CONSTRAINT employee_compensation_events_amount_len
    CHECK (char_length(amount) <= 80),
  CONSTRAINT employee_compensation_events_notes_len
    CHECK (char_length(notes) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_compensation_company_candidate_date
  ON employee_compensation_events (company_id, candidate_id, effective_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_compensation_candidate_date
  ON employee_compensation_events (candidate_id, effective_date DESC, id DESC);

COMMENT ON TABLE employee_compensation_events IS
  'Light internal compensation log (salary + adjustments). Not payroll, not visible to collaborator by default.';

INSERT INTO schema_migrations (name) VALUES ('072_employee_compensation.sql')
ON CONFLICT (name) DO NOTHING;
