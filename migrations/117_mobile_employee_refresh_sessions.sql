-- 117: rotating mobile sessions for employees (candidate identity, multi-company context).
CREATE TABLE IF NOT EXISTS mobile_employee_refresh_sessions (
  id BIGSERIAL PRIMARY KEY,
  family_id UUID NOT NULL,
  candidate_id BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  session_version INTEGER NOT NULL,
  allowed_contexts JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  replaced_by_id BIGINT REFERENCES mobile_employee_refresh_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  CONSTRAINT mobile_employee_refresh_lifecycle_check
    CHECK (NOT (rotated_at IS NOT NULL AND revoked_at IS NOT NULL)),
  CONSTRAINT mobile_employee_refresh_contexts_check
    CHECK (jsonb_typeof(allowed_contexts) = 'array' AND jsonb_array_length(allowed_contexts) BETWEEN 1 AND 10)
);

COMMENT ON TABLE mobile_employee_refresh_sessions IS
  'Hashed rotating refresh tokens for native employee sessions; allowed contexts were password-proven at login.';

CREATE INDEX IF NOT EXISTS idx_mobile_employee_refresh_family_active
  ON mobile_employee_refresh_sessions (family_id, id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mobile_employee_refresh_candidate_active
  ON mobile_employee_refresh_sessions (candidate_id, expires_at)
  WHERE revoked_at IS NULL AND rotated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mobile_employee_refresh_expiry
  ON mobile_employee_refresh_sessions (expires_at)
  WHERE revoked_at IS NULL;

INSERT INTO schema_migrations (name) VALUES ('117_mobile_employee_refresh_sessions.sql')
ON CONFLICT (name) DO NOTHING;
