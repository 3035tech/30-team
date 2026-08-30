-- 088: DP leave polish — period-scoped vacation balance + optional leave attachment (atestado).

ALTER TABLE employee_leave_balances
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE;

COMMENT ON COLUMN employee_leave_balances.period_start IS
  'Start of vacation entitlement window (aquisitivo). NULL = calendar year of today.';
COMMENT ON COLUMN employee_leave_balances.period_end IS
  'End of vacation entitlement window. NULL = calendar year of today.';

ALTER TABLE employee_leave_requests
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_key TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN employee_leave_requests.file_url IS
  'Optional attachment (e.g. sick-leave medical certificate). Not GED.';

INSERT INTO schema_migrations (name) VALUES ('088_dp_leave_polish.sql')
ON CONFLICT (name) DO NOTHING;
