-- 039: logo da empresa (referência S3; arquivo fora do Postgres).

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_key TEXT;

COMMENT ON COLUMN companies.logo_url IS
  'URL pública https do logo (CDN/S3). Usado em /c, /j e JobPosting.hiringOrganization.logo.';
COMMENT ON COLUMN companies.logo_key IS
  'Object key no bucket S3 (companies/{id}/logo/…). NULL se sem logo ou só URL legada.';

INSERT INTO schema_migrations (name) VALUES ('039_company_logo.sql')
ON CONFLICT (name) DO NOTHING;
