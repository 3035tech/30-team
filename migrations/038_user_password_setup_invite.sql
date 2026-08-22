-- Convite para definir senha (sem senha temporária no e-mail)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_setup_token TEXT,
  ADD COLUMN IF NOT EXISTS password_setup_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN users.password_setup_token IS
  'Token de uso único para /a/set-password; NULL = senha já definida';
COMMENT ON COLUMN users.password_setup_expires_at IS
  'Validade do token de convite de senha (padrão 72h)';

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_password_setup_token
  ON users (password_setup_token)
  WHERE password_setup_token IS NOT NULL;
