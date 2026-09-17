-- 105: Who created/invited the person (discrete registration metadata).

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_created_by
  ON candidates (company_id, created_by_user_id)
  WHERE created_by_user_id IS NOT NULL;

COMMENT ON COLUMN candidates.created_by_user_id IS
  'Manager user who first registered/invited this person (panel). Null when self-registered via public link.';

INSERT INTO schema_migrations (name) VALUES ('105_candidates_created_by.sql')
ON CONFLICT (name) DO NOTHING;
