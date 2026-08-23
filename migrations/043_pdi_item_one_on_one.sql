-- 043 — B-502: PDI item may link to a 1:1 (same candidate/company).
ALTER TABLE development_plan_items
  ADD COLUMN IF NOT EXISTS one_on_one_id BIGINT REFERENCES one_on_ones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_development_plan_items_oo
  ON development_plan_items (one_on_one_id)
  WHERE one_on_one_id IS NOT NULL;

COMMENT ON COLUMN development_plan_items.one_on_one_id IS
  'Optional link to a 1:1 record for follow-up (B-502).';

INSERT INTO schema_migrations (name) VALUES ('043_pdi_item_one_on_one.sql')
ON CONFLICT (name) DO NOTHING;
