-- 069: Collaborator (employee) passwordless session — magic-link tokens.
-- Identity remains candidates (employment_status = employee). Separate cookie from managers.
-- Does not create a users row or grant /dashboard access.

CREATE TABLE IF NOT EXISTS employee_login_tokens (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  token                TEXT NOT NULL,
  expires_at           TIMESTAMPTZ NOT NULL,
  used_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT employee_login_tokens_token_len CHECK (char_length(token) >= 20 AND char_length(token) <= 128)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_login_tokens_token
  ON employee_login_tokens (token)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_employee_login_tokens_candidate
  ON employee_login_tokens (company_id, candidate_id, created_at DESC);

COMMENT ON TABLE employee_login_tokens IS
  'One-time magic links for employee session (/colaborador). Not manager JWT.';
