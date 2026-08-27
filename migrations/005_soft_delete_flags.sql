-- 005: exclusão lógica (flag `deleted`) em empresas, vagas e usuários.
-- Rodar uma vez no Postgres alvo (ex.: após 001–004).

ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Slug único apenas entre registros não excluídos
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug_unique ON companies (LOWER(slug)) WHERE deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vacancies_company_slug_unique ON vacancies (company_id, LOWER(slug)) WHERE deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users (LOWER(email)) WHERE deleted = FALSE;
