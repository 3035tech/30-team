-- Cria (ou promove) um super admin: role=admin, company_id NULL.
-- Exige extensão pgcrypto (já usada no bootstrap).
--
-- 1) Ajuste e-mail e senha abaixo.
-- 2) Rode no pgAdmin / psql apontando para o banco desejado.
--
-- Alternativa Node (bcryptjs, alinhado ao login da app):
--   SUPER_ADMIN_EMAIL=... SUPER_ADMIN_PASSWORD=... npm run db:create-super-admin

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- >>> edite estes dois valores <<<
-- e-mail: admin@exemplo.com
-- senha:  TroqueEstaSenha123!

INSERT INTO users (
  company_id, email, password_hash, role, locale, display_name,
  active, deleted
)
SELECT
  NULL,
  'admin@exemplo.com',
  crypt('TroqueEstaSenha123!', gen_salt('bf', 10)),
  'admin',
  'pt-BR',
  'Super Admin',
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE LOWER(email) = LOWER('admin@exemplo.com')
);

-- Se o e-mail já existir: promover + resetar senha (descomente o bloco).
/*
UPDATE users SET
  company_id = NULL,
  password_hash = crypt('TroqueEstaSenha123!', gen_salt('bf', 10)),
  role = 'admin',
  active = TRUE,
  deleted = FALSE,
  must_change_password = FALSE,
  password_setup_token = NULL,
  password_setup_expires_at = NULL,
  display_name = COALESCE(NULLIF(display_name, ''), 'Super Admin')
WHERE LOWER(email) = LOWER('admin@exemplo.com');
*/
