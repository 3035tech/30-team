-- =============================================================================
-- 30Team — bootstrap completo no PostgreSQL (RDS ou outro)
-- =============================================================================
-- Execute conectado ao DATABASE que você criou (não na instância “postgres”
-- template, a menos que esse seja o alvo).
--
-- Como rodar (exemplos):
--   psql "postgresql://USER:PASS@HOST:5432/SEU_DATABASE" -f scripts/rds-bootstrap-completo.sql
--
-- Antes de rodar:
--   1) Ajuste, se quiser, o bloco “ADMIN INICIAL” (email e senha).
--   2) O usuário precisa de permissão para CREATE EXTENSION pgcrypto (RDS:
--      normalmente permitido). Se falhar, comente o bloco do admin e crie o
--      usuário depois com outra ferramenta.
--
-- Este arquivo equivale às migrations 001–005 + registro em schema_migrations.
-- =============================================================================

-- Extensão para gerar hash bcrypt compatível com bcryptjs (login da app)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- ── 001_init.sql (schema base) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS companies (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug_unique ON companies (LOWER(slug));

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

CREATE TABLE IF NOT EXISTS results (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  top_type    INTEGER NOT NULL CHECK (top_type BETWEEN 1 AND 9),
  scores      JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_results_name ON results (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_results_created ON results (created_at DESC);

CREATE TABLE IF NOT EXISTS areas (
  id         SERIAL PRIMARY KEY,
  key        TEXT NOT NULL UNIQUE,
  label      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
  id          BIGSERIAL PRIMARY KEY,
  company_id  BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT,
  consent_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

UPDATE candidates SET email = NULL WHERE email = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_company_email_lower_unique
  ON candidates (company_id, LOWER(email))
  WHERE email IS NOT NULL;

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

INSERT INTO areas (key, label)
VALUES
  ('comercial',  'Comercial'),
  ('rh',         'RH'),
  ('financeiro', 'Financeiro'),
  ('tecnologia', 'Tecnologia'),
  ('outros',     'Outros')
ON CONFLICT (key) DO NOTHING;

INSERT INTO companies (name, slug)
VALUES ('Default', 'default')
ON CONFLICT ((LOWER(slug))) DO NOTHING;

-- ── 002_add_company_areas.sql ───────────────────────────────────────────────

INSERT INTO areas (key, label)
VALUES
  ('produto', 'Produto'),
  ('cs', 'Customer Success'),
  ('atendimento', 'Atendimento/Suporte'),
  ('marketing', 'Marketing'),
  ('operacoes', 'Operações/Projetos'),
  ('juridico', 'Jurídico/Compliance')
ON CONFLICT (key) DO NOTHING;

-- ── 003_seed_area_rubrics.sql ───────────────────────────────────────────────

INSERT INTO area_rubrics (area_id, desired_type_weights)
SELECT id, '{}'::jsonb
FROM areas
ON CONFLICT (area_id) DO NOTHING;

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '1', 0.7,
  '5', 1.0,
  '6', 0.8,
  '3', 0.5
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'tecnologia';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '3', 0.9,
  '7', 0.8,
  '8', 0.7,
  '2', 0.5
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'comercial';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '3', 0.7,
  '5', 0.8,
  '7', 0.7,
  '1', 0.6
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'produto';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '3', 0.8,
  '7', 0.9,
  '4', 0.7,
  '2', 0.5
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'marketing';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '2', 0.9,
  '6', 0.8,
  '9', 0.7,
  '7', 0.4
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'cs';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '2', 0.9,
  '6', 0.8,
  '9', 0.6
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'atendimento';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '1', 0.9,
  '6', 0.8,
  '3', 0.6,
  '9', 0.4
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'operacoes';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '1', 1.0,
  '5', 0.8,
  '6', 0.7
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'financeiro';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '2', 0.9,
  '9', 0.8,
  '6', 0.7,
  '1', 0.5
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'rh';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '1', 1.0,
  '6', 0.8,
  '9', 0.6,
  '5', 0.5
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'juridico';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '1', 0.5, '2', 0.5, '3', 0.5, '4', 0.5, '5', 0.5, '6', 0.5, '7', 0.5, '8', 0.5, '9', 0.5
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'outros';

-- ── 004_vacancies.sql ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vacancies (
  id         BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  slug       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vacancies_company_slug_unique
  ON vacancies (company_id, LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_vacancies_company_created
  ON vacancies (company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS vacancy_links (
  id          BIGSERIAL PRIMARY KEY,
  vacancy_id  BIGINT NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  rotated_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vacancy_links_token_unique ON vacancy_links (token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vacancy_links_vacancy_active_unique
  ON vacancy_links (vacancy_id)
  WHERE active = TRUE;

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS vacancy_id BIGINT REFERENCES vacancies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_vacancy_created
  ON assessments (vacancy_id, created_at DESC);

CREATE OR REPLACE FUNCTION trg_assessments_company_matches_vacancy()
RETURNS TRIGGER AS $$
DECLARE
  vac_company BIGINT;
BEGIN
  IF NEW.vacancy_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT company_id INTO vac_company FROM vacancies WHERE id = NEW.vacancy_id;
  IF vac_company IS NULL THEN
    RAISE EXCEPTION 'Vacancy % not found', NEW.vacancy_id;
  END IF;
  IF NEW.company_id IS DISTINCT FROM vac_company THEN
    RAISE EXCEPTION 'Assessment company_id (%) does not match vacancy company_id (%)', NEW.company_id, vac_company;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assessments_company_matches_vacancy ON assessments;
CREATE TRIGGER assessments_company_matches_vacancy
BEFORE INSERT OR UPDATE OF vacancy_id, company_id ON assessments
FOR EACH ROW EXECUTE FUNCTION trg_assessments_company_matches_vacancy();

-- ── 005_soft_delete_flags.sql ───────────────────────────────────────────────

ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;

DROP INDEX IF EXISTS idx_companies_slug_unique;
CREATE UNIQUE INDEX idx_companies_slug_unique ON companies (LOWER(slug)) WHERE deleted = FALSE;

DROP INDEX IF EXISTS idx_vacancies_company_slug_unique;
CREATE UNIQUE INDEX idx_vacancies_company_slug_unique ON vacancies (company_id, LOWER(slug)) WHERE deleted = FALSE;

DROP INDEX IF EXISTS idx_users_email_unique;
CREATE UNIQUE INDEX idx_users_email_unique ON users (LOWER(email)) WHERE deleted = FALSE;

-- ── 006_performance_indexes.sql ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_vacencies_company_created_active
  ON vacancies (company_id, created_at DESC)
  WHERE deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_assessments_company_top_created
  ON assessments (company_id, top_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_candidates_company_lower_name
  ON candidates (company_id, (LOWER(full_name)));

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_created
  ON audit_log (actor_user_id, created_at DESC)
  WHERE actor_user_id IS NOT NULL;

-- ── Controle de migrations (opcional, alinha com scripts/migrate.js) ─────────

CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (name) VALUES
  ('001_init.sql'),
  ('002_add_company_areas.sql'),
  ('003_seed_area_rubrics.sql'),
  ('004_vacancies.sql'),
  ('005_soft_delete_flags.sql'),
  ('006_performance_indexes.sql')
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- ── ADMIN INICIAL (fora da transação acima: extensão já habilitada) ─────────
-- Troque email e senha antes de usar em produção.
-- Senha abaixo: altere a string entre aspas simples.

INSERT INTO users (email, password_hash, role, active)
SELECT
  'admin@3035tech.com',
  crypt('TroqueEstaSenha123!', gen_salt('bf', 10)),
  'admin',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE LOWER(email) = LOWER('admin@3035tech.com')
);

-- Fim.
