-- 119: canonical indexes for the HR analytics hot paths.
-- Replaces the skipped legacy hire_date / exit_date candidate indexes from 061.

CREATE INDEX IF NOT EXISTS idx_candidates_company_hired_at
  ON candidates (company_id, hired_at DESC)
  WHERE hired_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_company_hired_vacancy
  ON candidates (company_id, hired_vacancy_id, hired_at DESC)
  WHERE hired_vacancy_id IS NOT NULL AND hired_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hr_scores_company_calculated
  ON hr_scores (company_id, calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessments_company_created_vacancy
  ON assessments (company_id, created_at DESC, vacancy_id)
  WHERE vacancy_id IS NOT NULL;

COMMENT ON INDEX idx_candidates_company_hired_at IS
  'Analytics de contratações e retenção por empresa e período.';
COMMENT ON INDEX idx_candidates_company_hired_vacancy IS
  'Time-to-hire por empresa e vaga contratante.';
COMMENT ON INDEX idx_hr_scores_company_calculated IS
  'Tendências mensais de HR Score por empresa.';
COMMENT ON INDEX idx_assessments_company_created_vacancy IS
  'Amostra recente de fit com rubrica por empresa e vaga.';
