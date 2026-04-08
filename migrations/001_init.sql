-- 001_init.sql
-- Base schema for strategic hiring use-case (companies, links, areas, candidates, assessments, users, audit, rubrics, stats)

BEGIN;

-- Companies (multi-tenant root)
CREATE TABLE IF NOT EXISTS companies (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug_unique ON companies (LOWER(slug));

-- Public link/token per company (candidate entry point)
CREATE TABLE IF NOT EXISTS company_links (
  id         BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  rotated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_links_token_unique ON company_links (token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_links_company_active_unique
  ON company_links (company_id)
  WHERE active = TRUE;

-- Legacy table (keep for backward compatibility / migration)
CREATE TABLE IF NOT EXISTS results (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  top_type    INTEGER NOT NULL CHECK (top_type BETWEEN 1 AND 9),
  scores      JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_results_name ON results (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_results_created ON results (created_at DESC);

-- Fixed areas (seeded)
CREATE TABLE IF NOT EXISTS areas (
  id         SERIAL PRIMARY KEY,
  key        TEXT NOT NULL UNIQUE,
  label      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Candidate entity
CREATE TABLE IF NOT EXISTS candidates (
  id          BIGSERIAL PRIMARY KEY,
  company_id  BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT,
  consent_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Normalize emails for uniqueness when present
UPDATE candidates SET email = NULL WHERE email = '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_company_email_lower_unique
  ON candidates (company_id, LOWER(email))
  WHERE email IS NOT NULL;

-- A candidate can have multiple assessments (e.g., re-test)
CREATE TABLE IF NOT EXISTS assessments (
  id           BIGSERIAL PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id   BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  area_id      INTEGER NOT NULL REFERENCES areas(id),
  top_type     INTEGER NOT NULL CHECK (top_type BETWEEN 1 AND 9),
  scores       JSONB NOT NULL,
  source       TEXT NOT NULL DEFAULT 'public_form',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guard: assessment company must match candidate company
CREATE OR REPLACE FUNCTION trg_assessments_company_matches_candidate()
RETURNS TRIGGER AS $$
DECLARE
  cand_company BIGINT;
BEGIN
  SELECT company_id INTO cand_company FROM candidates WHERE id = NEW.candidate_id;
  IF cand_company IS NULL THEN
    RAISE EXCEPTION 'Candidate % not found', NEW.candidate_id;
  END IF;
  IF NEW.company_id IS DISTINCT FROM cand_company THEN
    RAISE EXCEPTION 'Assessment company_id (%) does not match candidate company_id (%)', NEW.company_id, cand_company;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assessments_company_matches_candidate ON assessments;
CREATE TRIGGER assessments_company_matches_candidate
BEFORE INSERT OR UPDATE OF candidate_id, company_id ON assessments
FOR EACH ROW EXECUTE FUNCTION trg_assessments_company_matches_candidate();

CREATE INDEX IF NOT EXISTS idx_assessments_area_created ON assessments (area_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_candidate_created ON assessments (candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_company_created ON assessments (company_id, created_at DESC);

-- Users for RBAC (RH/Direção/Admin)
CREATE TABLE IF NOT EXISTS users (
  id             BIGSERIAL PRIMARY KEY,
  company_id     BIGINT REFERENCES companies(id) ON DELETE RESTRICT,
  email          TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('admin','direction','hr')),
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users (LOWER(email));

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id             BIGSERIAL PRIMARY KEY,
  actor_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  target_type    TEXT,
  target_id      TEXT,
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at DESC);

-- Rubrics and stats per area
CREATE TABLE IF NOT EXISTS area_rubrics (
  area_id              INTEGER PRIMARY KEY REFERENCES areas(id) ON DELETE CASCADE,
  desired_type_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes                TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS area_stats (
  area_id     INTEGER PRIMARY KEY REFERENCES areas(id) ON DELETE CASCADE,
  type_means  JSONB NOT NULL,
  type_stds   JSONB NOT NULL,
  n           INTEGER NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed fixed areas (id stable per key)
INSERT INTO areas (key, label)
VALUES
  ('comercial',  'Comercial'),
  ('rh',         'RH'),
  ('financeiro', 'Financeiro'),
  ('tecnologia', 'Tecnologia'),
  ('outros',     'Outros')
ON CONFLICT (key) DO NOTHING;

-- Seed a default company for initial setup
INSERT INTO companies (name, slug)
VALUES ('Default', 'default')
ON CONFLICT (LOWER(slug)) DO NOTHING;

COMMIT;

