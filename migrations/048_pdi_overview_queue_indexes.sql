-- 048 — indexes for Overview PDI work queue (overdue / unlinked / no-plan)

CREATE INDEX IF NOT EXISTS idx_development_plan_items_company_due
  ON development_plan_items (company_id, due_date ASC, id ASC)
  WHERE status <> 'done' AND due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_development_plan_items_company_unlinked
  ON development_plan_items (company_id, updated_at DESC, id DESC)
  WHERE status <> 'done' AND one_on_one_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_company_employee
  ON candidates (company_id, full_name ASC NULLS LAST, id ASC)
  WHERE employment_status = 'employee';

COMMENT ON INDEX idx_development_plan_items_company_due IS
  'Overview PDI queue: overdue open items by company.';
COMMENT ON INDEX idx_development_plan_items_company_unlinked IS
  'Overview PDI queue: open items without 1:1 link.';
COMMENT ON INDEX idx_candidates_company_employee IS
  'Overview PDI queue: employees without active plan.';
