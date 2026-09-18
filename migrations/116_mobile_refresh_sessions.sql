-- 116: revocable, rotating mobile manager sessions. Only token hashes are persisted.
CREATE TABLE IF NOT EXISTS mobile_refresh_sessions (
  id BIGSERIAL PRIMARY KEY,
  family_id UUID NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_id BIGINT NOT NULL REFERENCES user_company_memberships(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL,
  session_version INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  replaced_by_id BIGINT REFERENCES mobile_refresh_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  CONSTRAINT mobile_refresh_sessions_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT mobile_refresh_sessions_lifecycle_check
    CHECK (NOT (rotated_at IS NOT NULL AND revoked_at IS NOT NULL))
);

COMMENT ON TABLE mobile_refresh_sessions IS
  'Hashed rotating refresh tokens for mobile manager sessions; family revocation detects replay.';

CREATE INDEX IF NOT EXISTS idx_mobile_refresh_sessions_family_active
  ON mobile_refresh_sessions (family_id, id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mobile_refresh_sessions_user_active
  ON mobile_refresh_sessions (user_id, expires_at)
  WHERE revoked_at IS NULL AND rotated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mobile_refresh_sessions_expiry
  ON mobile_refresh_sessions (expires_at)
  WHERE revoked_at IS NULL;

INSERT INTO schema_migrations (name) VALUES ('116_mobile_refresh_sessions.sql')
ON CONFLICT (name) DO NOTHING;
