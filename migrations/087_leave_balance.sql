-- 087: Vacation leave balance (saldo) on top of light DP leave requests.
-- Used days are derived from approved/taken vacation rows; pending holds requested vacation.

CREATE TABLE IF NOT EXISTS employee_leave_balances (
  candidate_id         BIGINT PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entitlement_days     NUMERIC(6,1) NOT NULL DEFAULT 30,
  adjustment_days      NUMERIC(6,1) NOT NULL DEFAULT 0,
  notes                TEXT NOT NULL DEFAULT '',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT employee_leave_balances_entitlement_chk
    CHECK (entitlement_days >= 0 AND entitlement_days <= 365),
  CONSTRAINT employee_leave_balances_adjustment_chk
    CHECK (adjustment_days >= -365 AND adjustment_days <= 365),
  CONSTRAINT employee_leave_balances_notes_len CHECK (char_length(notes) <= 1000)
);

CREATE INDEX IF NOT EXISTS idx_employee_leave_balances_company
  ON employee_leave_balances (company_id);

COMMENT ON TABLE employee_leave_balances IS
  'Manual vacation entitlement + adjustment; used/pending derived from employee_leave_requests. Not payroll.';

INSERT INTO schema_migrations (name) VALUES ('087_leave_balance.sql')
ON CONFLICT (name) DO NOTHING;
