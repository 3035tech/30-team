-- Onboarding wizard tracking

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN users.onboarding_completed IS
  'TRUE = usuário completou (ou pulou) o wizard de onboarding no dashboard';
COMMENT ON COLUMN users.onboarding_completed_at IS
  'Timestamp de quando o onboarding foi concluído';

CREATE INDEX IF NOT EXISTS idx_users_onboarding_pending
  ON users (onboarding_completed)
  WHERE onboarding_completed = FALSE AND deleted = FALSE AND active = TRUE;
