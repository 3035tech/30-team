-- =============================================================================
-- Hotfix: restore development_plan_items.source CHECK after failed pendentes run
-- =============================================================================
-- Cause: scripts-banco-pendentes.sql DROPped the constraint then tried to ADD a
-- narrower list (without onboarding / performance_review). Prod already has rows
-- with those sources → ADD failed. If statements auto-commit (pgAdmin), the
-- constraint may be missing until this runs.
--
-- Safe: does not modify row data. Idempotent.
-- =============================================================================

-- Optional diagnostic (read-only):
-- SELECT source, COUNT(*) FROM development_plan_items GROUP BY source ORDER BY 1;

ALTER TABLE development_plan_items
  DROP CONSTRAINT IF EXISTS development_plan_items_source_chk;

ALTER TABLE development_plan_items
  ADD CONSTRAINT development_plan_items_source_chk
  CHECK (source IN (
    'manual',
    'synthesis',
    'one_on_one',
    'retention',
    'onboarding',
    'performance_review'
  ));

COMMENT ON COLUMN development_plan_items.source IS
  'manual | synthesis | one_on_one | retention | onboarding | performance_review.';

-- Confirm:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'development_plan_items_source_chk';
