-- 045 — B-600 C: short contextual team pulse (scoped to saved team group)

CREATE TABLE IF NOT EXISTS team_pulses (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  team_group_id        BIGINT NOT NULL REFERENCES team_groups(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'draft',
  opens_at             TIMESTAMPTZ,
  closes_at            TIMESTAMPTZ,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  deleted              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_pulses_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 200),
  CONSTRAINT team_pulses_status_chk CHECK (status IN ('draft', 'open', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_team_pulses_group
  ON team_pulses (team_group_id, updated_at DESC)
  WHERE deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_team_pulses_company
  ON team_pulses (company_id, updated_at DESC)
  WHERE deleted = FALSE;

CREATE TABLE IF NOT EXISTS team_pulse_questions (
  id                   BIGSERIAL PRIMARY KEY,
  pulse_id             BIGINT NOT NULL REFERENCES team_pulses(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  prompt_key           TEXT NOT NULL,
  prompt               TEXT NOT NULL,
  sort_order           INT NOT NULL DEFAULT 0,
  scale_min            SMALLINT NOT NULL DEFAULT 1,
  scale_max            SMALLINT NOT NULL DEFAULT 5,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_pulse_questions_prompt_len CHECK (char_length(btrim(prompt)) >= 1 AND char_length(prompt) <= 500),
  CONSTRAINT team_pulse_questions_scale_chk CHECK (scale_min >= 1 AND scale_max <= 10 AND scale_min < scale_max)
);

CREATE INDEX IF NOT EXISTS idx_team_pulse_questions_pulse
  ON team_pulse_questions (pulse_id, sort_order ASC, id ASC)
  WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS team_pulse_invites (
  id                   BIGSERIAL PRIMARY KEY,
  pulse_id             BIGINT NOT NULL REFERENCES team_pulses(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token                TEXT NOT NULL UNIQUE,
  expires_at           TIMESTAMPTZ NOT NULL,
  used_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_pulse_invites_token_len CHECK (char_length(token) >= 16 AND char_length(token) <= 128)
);

CREATE INDEX IF NOT EXISTS idx_team_pulse_invites_pulse
  ON team_pulse_invites (pulse_id, created_at DESC);

CREATE TABLE IF NOT EXISTS team_pulse_responses (
  id                   BIGSERIAL PRIMARY KEY,
  pulse_id             BIGINT NOT NULL REFERENCES team_pulses(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invite_id            BIGINT REFERENCES team_pulse_invites(id) ON DELETE SET NULL,
  answers              JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_pulse_responses_invite_unique UNIQUE (invite_id)
);

CREATE INDEX IF NOT EXISTS idx_team_pulse_responses_pulse
  ON team_pulse_responses (pulse_id, submitted_at DESC);

COMMENT ON TABLE team_pulses IS
  'Short anonymous pulse scoped to a saved team group (B-603).';

INSERT INTO schema_migrations (name) VALUES ('045_team_pulse.sql')
ON CONFLICT (name) DO NOTHING;
