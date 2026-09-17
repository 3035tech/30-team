-- 109: Company module entitlements (commercial packs / early-adopter onboarding)
-- NULL enabled_modules = all modules (legacy tenants). Non-null = only listed keys (+ core forced in app).

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS enabled_modules TEXT[];

COMMENT ON COLUMN companies.enabled_modules IS
  'B-modules: nullable = all modules enabled (legacy). Non-null = allow-list of module keys (core always implied in app).';

CREATE INDEX IF NOT EXISTS idx_companies_enabled_modules_gin
  ON companies USING GIN (enabled_modules)
  WHERE enabled_modules IS NOT NULL AND deleted = FALSE;

INSERT INTO schema_migrations (name) VALUES ('109_company_module_entitlements.sql')
ON CONFLICT (name) DO NOTHING;
