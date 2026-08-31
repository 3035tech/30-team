-- 091: B-2721 digital time clock MVP (web punches + day mirror). Not payroll / eSocial / facial.

CREATE TABLE IF NOT EXISTS company_time_schedules (
  company_id           BIGINT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  workday_start        TIME NOT NULL DEFAULT '09:00',
  workday_end          TIME NOT NULL DEFAULT '18:00',
  break_minutes        INT NOT NULL DEFAULT 60,
  timezone             TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  late_grace_minutes   INT NOT NULL DEFAULT 10,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT company_time_schedules_break_chk
    CHECK (break_minutes >= 0 AND break_minutes <= 240),
  CONSTRAINT company_time_schedules_grace_chk
    CHECK (late_grace_minutes >= 0 AND late_grace_minutes <= 120),
  CONSTRAINT company_time_schedules_tz_len
    CHECK (char_length(timezone) >= 3 AND char_length(timezone) <= 64)
);

COMMENT ON TABLE company_time_schedules IS
  'B-2721: simple fixed shift per company for late/missing hints. Not a full rota engine.';

CREATE TABLE IF NOT EXISTS employee_time_punches (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  punched_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  punch_kind           TEXT NOT NULL,
  source               TEXT NOT NULL DEFAULT 'web',
  latitude             NUMERIC(9, 6),
  longitude            NUMERIC(9, 6),
  notes                TEXT NOT NULL DEFAULT '',
  flag                 TEXT,
  review_status        TEXT NOT NULL DEFAULT 'none',
  reviewed_at          TIMESTAMPTZ,
  reviewed_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_time_punches_kind_chk
    CHECK (punch_kind IN ('in', 'out')),
  CONSTRAINT employee_time_punches_source_chk
    CHECK (source IN ('web', 'manager')),
  CONSTRAINT employee_time_punches_flag_chk
    CHECK (flag IS NULL OR flag IN ('late', 'early_out', 'odd_pair', 'manual')),
  CONSTRAINT employee_time_punches_review_chk
    CHECK (review_status IN ('none', 'ok', 'flagged', 'adjusted')),
  CONSTRAINT employee_time_punches_notes_len
    CHECK (char_length(notes) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_time_punches_company_day
  ON employee_time_punches (company_id, punched_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_punches_candidate_day
  ON employee_time_punches (candidate_id, punched_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_punches_company_review
  ON employee_time_punches (company_id, review_status, punched_at DESC)
  WHERE review_status IN ('flagged', 'none');

COMMENT ON TABLE employee_time_punches IS
  'B-2721 MVP web/manager punches. Not facial, offline, or WhatsApp time clock.';

INSERT INTO schema_migrations (name) VALUES ('091_time_clock.sql')
ON CONFLICT (name) DO NOTHING;
