-- 017: motivo de rejeição, contratação contratado, datas de contratação, timeline

-- Histórico de pipeline (assessments) — garante tabela + colunas extras
CREATE TABLE IF NOT EXISTS assessment_pipeline_history (
  id BIGSERIAL PRIMARY KEY,
  assessment_id BIGINT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  reason TEXT,
  start_date DATE,
  changed_by_user_id BIGINT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE assessment_pipeline_history
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE;

CREATE INDEX IF NOT EXISTS idx_assessment_pipeline_history_assessment
  ON assessment_pipeline_history (assessment_id, changed_at ASC);

-- Histórico de pipeline (pré-teste / vacancy_candidates)
CREATE TABLE IF NOT EXISTS vacancy_candidate_pipeline_history (
  id BIGSERIAL PRIMARY KEY,
  vacancy_candidate_id BIGINT NOT NULL REFERENCES vacancy_candidates(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  reason TEXT,
  start_date DATE,
  changed_by_user_id BIGINT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vc_pipeline_history_vc
  ON vacancy_candidate_pipeline_history (vacancy_candidate_id, changed_at ASC);

-- Ampliar estágios: + hired
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_pipeline_stage_check;
ALTER TABLE assessments ADD CONSTRAINT assessments_pipeline_stage_check CHECK (
  pipeline_stage IN (
    'new', 'test_completed', 'screening', 'interview',
    'approved', 'hired', 'rejected', 'archived'
  )
);

ALTER TABLE vacancy_candidates DROP CONSTRAINT IF EXISTS vacancy_candidates_pipeline_stage_check;
ALTER TABLE vacancy_candidates ADD CONSTRAINT vacancy_candidates_pipeline_stage_check CHECK (
  pipeline_stage IS NULL OR pipeline_stage IN (
    'new', 'test_completed', 'screening', 'interview',
    'approved', 'hired', 'rejected', 'archived'
  )
);

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS hired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE vacancy_candidates
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS hired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS employment_status TEXT NOT NULL DEFAULT 'candidate',
  ADD COLUMN IF NOT EXISTS hired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS hired_vacancy_id BIGINT REFERENCES vacancies(id) ON DELETE SET NULL;

ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_employment_status_check;
ALTER TABLE candidates ADD CONSTRAINT candidates_employment_status_check
  CHECK (employment_status IN ('candidate', 'employee', 'alumni'));

COMMENT ON COLUMN assessments.rejection_reason IS 'Motivo ao rejeitar: salary|profile_fit|experience|culture|timing|competition|no_show|withdrew|other';
COMMENT ON COLUMN assessments.start_date IS 'Data de início combinada ao marcar hired';
COMMENT ON COLUMN candidates.employment_status IS 'candidate | employee | alumni';
