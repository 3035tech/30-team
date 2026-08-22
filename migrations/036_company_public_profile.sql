-- 036: perfil público da empresa (opt-in). Default OFF na criação.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS public_profile_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN companies.public_profile_enabled IS
  'Se TRUE, /c/{slug} fica acessível (vagas públicas da empresa). Default FALSE na criação. Prefixo neutro (não /empresas).';

CREATE INDEX IF NOT EXISTS idx_companies_public_profile_slug
  ON companies (LOWER(slug))
  WHERE deleted = FALSE AND active = TRUE AND public_profile_enabled = TRUE;

INSERT INTO schema_migrations (name) VALUES ('036_company_public_profile.sql')
ON CONFLICT (name) DO NOTHING;
