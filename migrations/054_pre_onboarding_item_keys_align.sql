-- 054 — Align pre-onboarding item_key CHECK with app keys (welcome_kit…).
-- Prod may still have the original CHECK from 051 before keys were renamed in-place:
--   email_access | tools_access | equipment | d1_welcome
-- CREATE TABLE IF NOT EXISTS never refreshed that constraint.

ALTER TABLE employee_pre_onboarding_items
  DROP CONSTRAINT IF EXISTS employee_pre_onboarding_item_key_chk;

-- Drop obsolete keys; ensurePreOnboardingChecklist re-seeds the three current items.
DELETE FROM employee_pre_onboarding_items
WHERE item_key IN ('email_access', 'tools_access', 'equipment', 'd1_welcome');

ALTER TABLE employee_pre_onboarding_items
  ADD CONSTRAINT employee_pre_onboarding_item_key_chk
  CHECK (item_key IN ('welcome_kit', 'rh_onboarding_call', 'manager_onboarding'));

COMMENT ON CONSTRAINT employee_pre_onboarding_item_key_chk ON employee_pre_onboarding_items IS
  'B-702 keys: welcome_kit, rh_onboarding_call, manager_onboarding (aligned 054)';
