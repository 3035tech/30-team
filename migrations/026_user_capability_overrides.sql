-- 026: per-user capability overrides (module views)
-- Empty rows for a user ⇒ role defaults (etapa 1–2 behavior).
-- Rows present ⇒ whitelist of assignable module capabilities (granted=TRUE).
-- Does NOT affect public assessment tokens (/t, /v, AE invites, vacancy_links).

CREATE TABLE IF NOT EXISTS user_capability_overrides (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  granted    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_user_capability_overrides_user
  ON user_capability_overrides (user_id);

INSERT INTO schema_migrations (name) VALUES ('026_user_capability_overrides.sql')
ON CONFLICT (name) DO NOTHING;
