-- 103: persist require_meet on D1 checklist instances (from company template)
ALTER TABLE employee_pre_onboarding_items
  ADD COLUMN IF NOT EXISTS require_meet BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN employee_pre_onboarding_items.require_meet IS
  'P0 polish: when true, RH UI offers Meet link even if owner is not rh/manager.';

INSERT INTO schema_migrations (name) VALUES ('103_pre_onboarding_require_meet.sql')
ON CONFLICT (name) DO NOTHING;
