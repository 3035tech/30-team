-- Candidate session_version for collaborator JWT revocation (parity with users.session_version).
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN candidates.session_version IS
  'Bumped on password change/reset/disable-2FA; JWT claim sv must match.';
