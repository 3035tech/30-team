-- 025: DBA — upsert email unique + fan-out / deadline indexes
-- Safe to re-run (IF NOT EXISTS).

-- Paridade com scripts/rds-bootstrap-completo.sql (ON CONFLICT company_id, LOWER(email))
UPDATE candidates SET email = NULL WHERE email = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_company_email_lower_unique
  ON candidates (company_id, LOWER(email))
  WHERE email IS NOT NULL;

-- Cron deadline + overview: open vacancies with target_date
CREATE INDEX IF NOT EXISTS idx_vacancies_open_target_date
  ON vacancies (target_date)
  WHERE deleted = FALSE AND status = 'open' AND target_date IS NOT NULL;

-- notifyCompanyManagers: list managers by company
CREATE INDEX IF NOT EXISTS idx_users_company_active_managers
  ON users (company_id)
  WHERE deleted = FALSE AND active = TRUE AND role IN ('hr', 'direction', 'admin');

INSERT INTO schema_migrations (name) VALUES ('025_perf_indexes_notifications_email.sql')
ON CONFLICT (name) DO NOTHING;
