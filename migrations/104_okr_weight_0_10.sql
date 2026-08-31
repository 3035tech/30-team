-- 104: OKR activity weight scale 0–10 (was 1–100).
-- 0 is skipped in area/cycle rollup; 10 pulls the total most. Existing values clamp to 10.

UPDATE okr_activities
   SET weight = LEAST(10, GREATEST(0, COALESCE(weight, 5)))
 WHERE weight < 0 OR weight > 10;

ALTER TABLE okr_activities DROP CONSTRAINT IF EXISTS okr_activities_weight_chk;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'okr_activities_weight_chk'
  ) THEN
    ALTER TABLE okr_activities
      ADD CONSTRAINT okr_activities_weight_chk
      CHECK (weight >= 0 AND weight <= 10);
  END IF;
END $$;

ALTER TABLE okr_activities ALTER COLUMN weight SET DEFAULT 5;

COMMENT ON COLUMN okr_activities.weight IS
  'Relative weight 0–10 for area/cycle rollup (0 skipped; 10 most important; default 5).';

INSERT INTO schema_migrations (name) VALUES ('104_okr_weight_0_10.sql')
ON CONFLICT (name) DO NOTHING;
