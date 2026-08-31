-- 099: B-2722 hour bank / compensatory time on top of digital time clock.
-- Company toggle + ledger (manual + derived from punches). Not payroll / eSocial.

ALTER TABLE company_time_schedules
  ADD COLUMN IF NOT EXISTS hour_bank_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE company_time_schedules
  ADD COLUMN IF NOT EXISTS hour_bank_max_minutes INT NOT NULL DEFAULT 2400;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_time_schedules_bank_max_chk'
  ) THEN
    ALTER TABLE company_time_schedules
      ADD CONSTRAINT company_time_schedules_bank_max_chk
      CHECK (hour_bank_max_minutes >= 0 AND hour_bank_max_minutes <= 20000);
  END IF;
END $$;

COMMENT ON COLUMN company_time_schedules.hour_bank_enabled IS
  'B-2722: when true, RH can post hour-bank entries and generate overtime from punches.';
COMMENT ON COLUMN company_time_schedules.hour_bank_max_minutes IS
  'Soft cap on approved balance minutes (default 2400 = 40h). Block credits that would exceed.';

CREATE TABLE IF NOT EXISTS employee_hour_bank_entries (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  entry_kind           TEXT NOT NULL,
  minutes              INT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending',
  source               TEXT NOT NULL DEFAULT 'manual',
  work_on              DATE NOT NULL,
  note                 TEXT NOT NULL DEFAULT '',
  dedupe_key           TEXT,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_by_candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL,
  decided_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  decided_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_hour_bank_kind_chk
    CHECK (entry_kind IN ('credit', 'debit')),
  CONSTRAINT employee_hour_bank_minutes_chk
    CHECK (minutes >= 1 AND minutes <= 1440),
  CONSTRAINT employee_hour_bank_status_chk
    CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT employee_hour_bank_source_chk
    CHECK (source IN ('manual', 'time_clock', 'employee')),
  CONSTRAINT employee_hour_bank_note_len
    CHECK (char_length(note) <= 500),
  CONSTRAINT employee_hour_bank_actor_chk
    CHECK (
      created_by_user_id IS NOT NULL
      OR created_by_candidate_id IS NOT NULL
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hour_bank_dedupe
  ON employee_hour_bank_entries (company_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hour_bank_company_status
  ON employee_hour_bank_entries (company_id, status, work_on DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_hour_bank_candidate
  ON employee_hour_bank_entries (company_id, candidate_id, work_on DESC, id DESC);

COMMENT ON TABLE employee_hour_bank_entries IS
  'B-2722: hour-bank ledger. Balance = approved credits − approved debits. Not payslip.';

INSERT INTO schema_migrations (name) VALUES ('099_hour_bank.sql')
ON CONFLICT (name) DO NOTHING;
