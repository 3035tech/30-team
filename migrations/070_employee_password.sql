-- 070: Collaborator password on candidates (same UX as manager set-password invite).
-- Does NOT create a users row or grant /dashboard. Cookie remains team30_employee_session.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_setup_token TEXT,
  ADD COLUMN IF NOT EXISTS password_setup_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_invited_at TIMESTAMPTZ;

COMMENT ON COLUMN candidates.password_hash IS
  'bcrypt hash for /colaborador login; NULL until set-password invite completed';
COMMENT ON COLUMN candidates.password_setup_token IS
  'One-time token for /colaborador/cadastrar-senha; NULL when unused or consumed';
COMMENT ON COLUMN candidates.password_setup_expires_at IS
  'Validity of password_setup_token (default 72h)';
COMMENT ON COLUMN candidates.access_invited_at IS
  'First (or last) manager invite to collaborator access';

CREATE UNIQUE INDEX IF NOT EXISTS uq_candidates_password_setup_token
  ON candidates (password_setup_token)
  WHERE password_setup_token IS NOT NULL;
