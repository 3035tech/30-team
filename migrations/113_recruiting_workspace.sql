-- 113: Recruiting workspace ownership and per-user saved views.

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS owner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vacancies_company_owner_active
  ON vacancies (company_id, owner_user_id, status, created_at DESC)
  WHERE deleted = FALSE;

CREATE TABLE IF NOT EXISTS recruiting_candidate_assignments (
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vacancy_id BIGINT NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  candidate_id BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  owner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (vacancy_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_recruiting_candidate_assignments_owner
  ON recruiting_candidate_assignments (company_id, owner_user_id, vacancy_id)
  WHERE owner_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS recruiting_saved_views (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vacancy_id BIGINT REFERENCES vacancies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT recruiting_saved_views_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 60)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_recruiting_saved_views_scope_name
  ON recruiting_saved_views (company_id, user_id, COALESCE(vacancy_id, 0), lower(name));
CREATE INDEX IF NOT EXISTS idx_recruiting_saved_views_user
  ON recruiting_saved_views (company_id, user_id, updated_at DESC);

INSERT INTO schema_migrations (name) VALUES ('113_recruiting_workspace.sql')
ON CONFLICT (name) DO NOTHING;
