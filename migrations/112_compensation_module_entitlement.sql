-- 112: isolate sensitive compensation data behind its own module/capabilities.
-- Compatibility: restricted tenants that previously received compensation through
-- core keep access. NULL remains the legacy unrestricted marker.

UPDATE companies
SET enabled_modules = array_append(enabled_modules, 'compensation')
WHERE enabled_modules IS NOT NULL
  AND 'core' = ANY(enabled_modules)
  AND NOT ('compensation' = ANY(enabled_modules));

COMMENT ON COLUMN companies.enabled_modules IS
  'Nullable legacy unrestricted marker. Non-null is an explicit module allow-list; empty input normalizes to core-only.';

INSERT INTO schema_migrations (name) VALUES ('112_compensation_module_entitlement.sql')
ON CONFLICT (name) DO NOTHING;
