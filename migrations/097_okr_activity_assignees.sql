-- 097: OKR activity assignees (1..N people per activity).
-- Collaborator sees assigned activities on /employee; notify on new link.

CREATE TABLE IF NOT EXISTS okr_activity_assignees (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  activity_id          BIGINT NOT NULL REFERENCES okr_activities(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  assigned_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  assigned_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT okr_activity_assignees_uq UNIQUE (activity_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_okr_assignees_candidate
  ON okr_activity_assignees (company_id, candidate_id, assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_okr_assignees_activity
  ON okr_activity_assignees (activity_id, candidate_id);

COMMENT ON TABLE okr_activity_assignees IS
  'OKR: people linked to an activity. Employee hub lists by candidate_id; notify on insert.';
