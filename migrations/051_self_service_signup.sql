-- Self-service signup: estado de ativação e metadata de origem

-- Estado de ativação do signup
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS signup_pending BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.signup_pending IS
  'TRUE = cadastro self-service aguardando confirmação de e-mail; FALSE = usuário já ativo ou criado por admin';

-- Metadata de origem do cadastro
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS signup_source TEXT,
  ADD COLUMN IF NOT EXISTS signup_metadata JSONB;

COMMENT ON COLUMN users.signup_source IS
  'early_access | paid | admin_invite | NULL (legado)';
COMMENT ON COLUMN users.signup_metadata IS
  'Dados do formulário de signup: { company_name, job_title, team_size, pain_points }';

-- Índice para buscar signups pendentes (admin pode listar/aprovar manualmente se quiser gate)
CREATE INDEX IF NOT EXISTS idx_users_signup_pending
  ON users (signup_pending)
  WHERE signup_pending = TRUE AND deleted = FALSE;

-- Companies auto-criadas no signup
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS signup_auto_created BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS signup_creator_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN companies.signup_auto_created IS
  'TRUE = empresa criada automaticamente no self-service signup';
COMMENT ON COLUMN companies.signup_creator_user_id IS
  'Usuário que cadastrou a empresa via signup (primeiro admin/direction da company)';

CREATE INDEX IF NOT EXISTS idx_companies_signup_auto
  ON companies (signup_auto_created)
  WHERE signup_auto_created = TRUE AND deleted = FALSE;
