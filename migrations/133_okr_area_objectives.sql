-- Expand only: keep areas, activities and historical light OKRs unchanged.
CREATE UNIQUE INDEX IF NOT EXISTS okr_areas_tenant_identity ON okr_areas(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS okr_objectives_tenant_identity ON okr_objectives(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS okr_key_results_tenant_identity ON okr_key_results(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS candidates_okr_tenant_identity ON candidates(id, company_id);

ALTER TABLE okr_objectives ADD COLUMN IF NOT EXISTS area_id BIGINT;
ALTER TABLE okr_objectives ADD COLUMN IF NOT EXISTS owner_candidate_id BIGINT;
ALTER TABLE okr_key_results ADD COLUMN IF NOT EXISTS start_value NUMERIC(14,2);
ALTER TABLE okr_key_results ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE okr_key_results ADD COLUMN IF NOT EXISTS weight INT NOT NULL DEFAULT 1;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='okr_objectives_area_tenant_fk') THEN
    ALTER TABLE okr_objectives ADD CONSTRAINT okr_objectives_area_tenant_fk
      FOREIGN KEY(area_id,company_id) REFERENCES okr_areas(id,company_id) ON DELETE CASCADE;
    ALTER TABLE okr_objectives ADD CONSTRAINT okr_objectives_owner_tenant_fk
      FOREIGN KEY(owner_candidate_id,company_id) REFERENCES candidates(id,company_id);
    ALTER TABLE okr_key_results ADD CONSTRAINT okr_key_results_objective_tenant_fk
      FOREIGN KEY(objective_id,company_id) REFERENCES okr_objectives(id,company_id) ON DELETE CASCADE;
    ALTER TABLE okr_key_results ADD CONSTRAINT okr_key_results_metric_chk
      CHECK(start_value IS NULL OR (start_value <> target_value AND
        start_value BETWEEN -999999999999.99 AND 999999999999.99 AND
        target_value BETWEEN -999999999999.99 AND 999999999999.99 AND
        current_value BETWEEN -999999999999.99 AND 999999999999.99));
    ALTER TABLE okr_key_results ADD CONSTRAINT okr_key_results_weight_chk CHECK(weight BETWEEN 0 AND 10);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_okr_objectives_area ON okr_objectives(company_id,area_id,id);

CREATE TABLE IF NOT EXISTS okr_key_result_assignees (
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key_result_id BIGINT NOT NULL,
  candidate_id BIGINT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(key_result_id,candidate_id),
  FOREIGN KEY(key_result_id,company_id) REFERENCES okr_key_results(id,company_id) ON DELETE CASCADE,
  FOREIGN KEY(candidate_id,company_id) REFERENCES candidates(id,company_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_okr_kr_assignees_person ON okr_key_result_assignees(company_id,candidate_id);

CREATE TABLE IF NOT EXISTS okr_key_result_checkins (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key_result_id BIGINT NOT NULL,
  event_kind TEXT NOT NULL CHECK(event_kind IN ('created','configuration','checkin')),
  start_value NUMERIC(14,2) NOT NULL,
  target_value NUMERIC(14,2) NOT NULL,
  current_value NUMERIC(14,2) NOT NULL,
  unit TEXT NOT NULL CHECK(char_length(unit) BETWEEN 1 AND 40),
  progress_pct NUMERIC(5,2) NOT NULL CHECK(progress_pct BETWEEN 0 AND 100),
  note TEXT NOT NULL DEFAULT '' CHECK(char_length(note)<=500),
  created_by_user_id BIGINT REFERENCES users(id),
  created_by_candidate_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY(key_result_id,company_id) REFERENCES okr_key_results(id,company_id) ON DELETE CASCADE,
  FOREIGN KEY(created_by_candidate_id,company_id) REFERENCES candidates(id,company_id),
  CHECK(start_value<>target_value),
  CHECK(num_nonnulls(created_by_user_id,created_by_candidate_id)=1)
);
CREATE INDEX IF NOT EXISTS idx_okr_kr_checkins_history ON okr_key_result_checkins(company_id,key_result_id,created_at DESC,id DESC);

COMMENT ON COLUMN okr_objectives.area_id IS 'Canonical hierarchy: cycle -> area -> objective -> numeric key result. NULL denotes untouched legacy objectives.';
COMMENT ON COLUMN okr_key_results.start_value IS 'NULL only for legacy KRs. Numeric baseline supports increase and decrease targets.';
COMMENT ON TABLE okr_key_result_checkins IS 'Immutable relational measurement/configuration snapshots, not JSON. Target edits do not rewrite historical progress.';
