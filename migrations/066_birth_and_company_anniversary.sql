-- 066: Birth date (employee) + company institutional anniversary.
-- Work anniversary for people = candidates.start_date (already set on hire) — not a new column.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS birth_date DATE;

COMMENT ON COLUMN candidates.birth_date IS
  'Date of birth (nullable). Day/month used for Overview birthday card. Not hire/start date.';

CREATE INDEX IF NOT EXISTS idx_candidates_company_birth_md
  ON candidates (
    company_id,
    (EXTRACT(MONTH FROM birth_date)::smallint),
    (EXTRACT(DAY FROM birth_date)::smallint)
  )
  WHERE birth_date IS NOT NULL;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS anniversary_date DATE;

COMMENT ON COLUMN companies.anniversary_date IS
  'Company founding / institutional anniversary (nullable). Day/month for Overview chip.';
