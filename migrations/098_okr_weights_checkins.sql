-- 098: OKR activity weight + check-ins (phase 2 deepen).
-- Weighted rollup of area/cycle progress; check-in log updates progress_pct.
-- Not bonus-by-attainment.

ALTER TABLE okr_activities
  ADD COLUMN IF NOT EXISTS weight INT NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'okr_activities_weight_chk'
  ) THEN
    ALTER TABLE okr_activities
      ADD CONSTRAINT okr_activities_weight_chk
      CHECK (weight >= 1 AND weight <= 100);
  END IF;
END $$;

COMMENT ON COLUMN okr_activities.weight IS
  'Relative weight 1–100 for area/cycle rollup (default 1 = equal).';

CREATE TABLE IF NOT EXISTS okr_activity_checkins (
  id                         BIGSERIAL PRIMARY KEY,
  company_id                 BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  activity_id                BIGINT NOT NULL REFERENCES okr_activities(id) ON DELETE CASCADE,
  progress_pct               INT NOT NULL,
  note                       TEXT NOT NULL DEFAULT '',
  created_by_user_id         BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_by_candidate_id    BIGINT REFERENCES candidates(id) ON DELETE SET NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT okr_activity_checkins_pct_chk
    CHECK (progress_pct >= 0 AND progress_pct <= 100),
  CONSTRAINT okr_activity_checkins_note_len
    CHECK (char_length(note) <= 500),
  CONSTRAINT okr_activity_checkins_actor_chk
    CHECK (
      created_by_user_id IS NOT NULL
      OR created_by_candidate_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_okr_checkins_activity
  ON okr_activity_checkins (activity_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_okr_checkins_company
  ON okr_activity_checkins (company_id, created_at DESC);

COMMENT ON TABLE okr_activity_checkins IS
  'OKR: progress check-in log (manager or assignee). Updates activity progress_pct on insert.';

INSERT INTO schema_migrations (name) VALUES ('098_okr_weights_checkins.sql')
ON CONFLICT (name) DO NOTHING;
