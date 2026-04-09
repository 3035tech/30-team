-- 004_vacancies.sql
-- Add vacancies (jobs) and public links per vacancy; optionally link assessments to a vacancy.

BEGIN;

-- Vacancies (per company)
CREATE TABLE IF NOT EXISTS vacancies (
  id         BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  slug       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique slug per company for clean UI/URLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_vacancies_company_slug_unique
  ON vacancies (company_id, LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_vacancies_company_created
  ON vacancies (company_id, created_at DESC);

-- Public link/token per vacancy (candidate entry point)
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

-- Link assessments to a vacancy (nullable for backward compatibility)
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS vacancy_id BIGINT REFERENCES vacancies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_vacancy_created
  ON assessments (vacancy_id, created_at DESC);

-- Guard: assessment vacancy must match assessment company when vacancy_id is present
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

COMMIT;

