-- 020: vacancy planning fields (headcount + target close date).
-- description / salary_* live in 016_vacancy_details.sql.

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS positions_count INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS target_date DATE;

COMMENT ON COLUMN vacancies.positions_count IS 'Number of openings to fill before auto-close';
COMMENT ON COLUMN vacancies.target_date IS 'Target date to fill / close the vacancy';
