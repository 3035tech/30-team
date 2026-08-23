-- 040: grupos salvos (squads) na aba Grupos — núcleo por empresa.

CREATE TABLE IF NOT EXISTS team_groups (
  id                     BIGSERIAL PRIMARY KEY,
  company_id             BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  base_assessment_id     BIGINT REFERENCES assessments(id) ON DELETE SET NULL,
  member_assessment_ids  BIGINT[] NOT NULL DEFAULT '{}',
  created_by_user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  deleted                BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_groups_name_len CHECK (char_length(btrim(name)) >= 1 AND char_length(name) <= 120),
  CONSTRAINT team_groups_members_cap CHECK (cardinality(member_assessment_ids) <= 40)
);

CREATE INDEX IF NOT EXISTS idx_team_groups_company_updated
  ON team_groups (company_id, updated_at DESC)
  WHERE deleted = FALSE;

COMMENT ON TABLE team_groups IS
  'Saved Group tab squads (base + members by assessment_id). Soft-deleted via deleted=TRUE.';

INSERT INTO schema_migrations (name) VALUES ('040_team_groups.sql')
ON CONFLICT (name) DO NOTHING;
