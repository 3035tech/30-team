-- 096: OKR cycles → areas → activities (phase 1 operational OKR).
-- Named cycle with start/end; areas under cycle; activities with progress % + deadline.
-- Does not remove light OKR tables (okr_objectives / okr_key_results); UI prefers this model.
-- Not bonus-by-attainment (phase 3).

CREATE TABLE IF NOT EXISTS okr_cycles (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  starts_on            DATE NOT NULL,
  ends_on              DATE NOT NULL,
  status               TEXT NOT NULL DEFAULT 'active',
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT okr_cycles_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 200),
  CONSTRAINT okr_cycles_dates_chk CHECK (ends_on >= starts_on),
  CONSTRAINT okr_cycles_status_chk CHECK (status IN ('active', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_okr_cycles_company
  ON okr_cycles (company_id, status, starts_on DESC, id DESC);

CREATE TABLE IF NOT EXISTS okr_areas (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id             BIGINT NOT NULL REFERENCES okr_cycles(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  sort_order           INT NOT NULL DEFAULT 0,
  team_group_id        BIGINT REFERENCES team_groups(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT okr_areas_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 200)
);

CREATE INDEX IF NOT EXISTS idx_okr_areas_cycle
  ON okr_areas (cycle_id, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_okr_areas_company
  ON okr_areas (company_id, cycle_id);

CREATE TABLE IF NOT EXISTS okr_activities (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  area_id              BIGINT NOT NULL REFERENCES okr_areas(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  progress_pct         INT NOT NULL DEFAULT 0,
  deadline             DATE,
  sort_order           INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT okr_activities_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 300),
  CONSTRAINT okr_activities_pct_chk CHECK (progress_pct >= 0 AND progress_pct <= 100)
);

CREATE INDEX IF NOT EXISTS idx_okr_activities_area
  ON okr_activities (area_id, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_okr_activities_company
  ON okr_activities (company_id, area_id);

CREATE INDEX IF NOT EXISTS idx_okr_activities_deadline
  ON okr_activities (company_id, deadline)
  WHERE deadline IS NOT NULL;

COMMENT ON TABLE okr_cycles IS
  'OKR phase 1: named cycle (e.g. 2026 H1) with start/end. Areas+activities roll up progress.';
COMMENT ON TABLE okr_areas IS
  'OKR phase 1: area under a cycle. Progress = mean of activity progress_pct.';
COMMENT ON TABLE okr_activities IS
  'OKR phase 1: activity with 0–100% and optional deadline (urgency in UI).';
