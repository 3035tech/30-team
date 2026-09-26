-- P1: append-only organizational history. Application rollback keeps this table.
CREATE TABLE IF NOT EXISTS employee_work_format_history (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  previous_format TEXT,
  new_format TEXT,
  effective_date DATE NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_employee_work_format_history_person
  ON employee_work_format_history(company_id, candidate_id, changed_at DESC, id DESC);
