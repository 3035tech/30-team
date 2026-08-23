-- 046 — B-600 D: minimal employee view via token (no candidate account)

CREATE TABLE IF NOT EXISTS employee_portal_tokens (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  token                TEXT NOT NULL UNIQUE,
  expires_at           TIMESTAMPTZ NOT NULL,
  revoked_at           TIMESTAMPTZ,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at         TIMESTAMPTZ,
  CONSTRAINT employee_portal_tokens_token_len CHECK (char_length(token) >= 16 AND char_length(token) <= 128)
);

CREATE INDEX IF NOT EXISTS idx_employee_portal_candidate
  ON employee_portal_tokens (candidate_id, created_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_employee_portal_token_active
  ON employee_portal_tokens (token)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE employee_portal_tokens IS
  'Token link /e/{token} for hired people: PDI + 1:1 prep (no login). B-604.';

INSERT INTO schema_migrations (name) VALUES ('046_employee_portal.sql')
ON CONFLICT (name) DO NOTHING;
