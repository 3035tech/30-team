-- Migration 084: Market salary bands on job roles + employee role link (B-2711)
-- Manual market min/max on cargo; candidates.job_role_id for compare vs current pay.
-- Not payroll / eSocial / marketplace.

ALTER TABLE job_roles
  ADD COLUMN IF NOT EXISTS market_salary_min TEXT,
  ADD COLUMN IF NOT EXISTS market_salary_max TEXT;

COMMENT ON COLUMN job_roles.market_salary_min IS
  'Optional market floor (same TEXT salary shape as vacancies/compensation). Manual entry; not live survey.';
COMMENT ON COLUMN job_roles.market_salary_max IS
  'Optional market ceiling (same TEXT salary shape). Manual entry; not live survey.';

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS job_role_id BIGINT REFERENCES job_roles(id) ON DELETE SET NULL;

COMMENT ON COLUMN candidates.job_role_id IS
  'Optional job role for the person (employees). Used to compare current pay to role market band.';

CREATE INDEX IF NOT EXISTS idx_candidates_company_job_role
  ON candidates (company_id, job_role_id)
  WHERE job_role_id IS NOT NULL;
