-- Migration 061: índices de performance (idempotente).
-- CREATE INDEX IF NOT EXISTS não basta se a tabela/coluna ainda não existir —
-- pula o índice nesse caso (NOTICE) em vez de falhar o arquivo.

CREATE OR REPLACE FUNCTION _mig_create_index_if_ready(
  p_index_name text,
  p_table_name text,
  p_create_sql text,
  p_columns text[] DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE
  missing text;
BEGIN
  IF to_regclass('public.' || p_table_name) IS NULL THEN
    RAISE NOTICE 'skip index %: table % missing', p_index_name, p_table_name;
    RETURN false;
  END IF;
  IF p_columns IS NOT NULL THEN
    SELECT c INTO missing
    FROM unnest(p_columns) AS c
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = p_table_name
        AND column_name = c
    )
    LIMIT 1;
    IF missing IS NOT NULL THEN
      RAISE NOTICE 'skip index %: column %.% missing', p_index_name, p_table_name, missing;
      RETURN false;
    END IF;
  END IF;
  EXECUTE p_create_sql;
  RETURN true;
END;
$$;

-- HR Scores: candidate + calculated_at (coluna real em 054; não last_calculated_at)
SELECT _mig_create_index_if_ready(
  'idx_hr_scores_candidate_recent',
  'hr_scores',
  'CREATE INDEX IF NOT EXISTS idx_hr_scores_candidate_recent ON hr_scores (candidate_id, calculated_at DESC)',
  ARRAY['candidate_id', 'calculated_at']
);

SELECT _mig_create_index_if_ready(
  'idx_hr_scores_turnover_risk',
  'hr_scores',
  $sql$CREATE INDEX IF NOT EXISTS idx_hr_scores_turnover_risk ON hr_scores (turnover_risk) WHERE turnover_risk IN ('medium', 'high')$sql$,
  ARRAY['turnover_risk']
);

-- Clima: tabela tem deleted + status (não active)
SELECT _mig_create_index_if_ready(
  'idx_climate_surveys_company_active',
  'climate_surveys',
  $sql$CREATE INDEX IF NOT EXISTS idx_climate_surveys_company_active ON climate_surveys (company_id, created_at DESC) WHERE deleted = FALSE$sql$,
  ARRAY['company_id', 'created_at', 'deleted']
);

-- Respostas de clima: climate_survey_responses (não climate_responses / dimension_key)
SELECT _mig_create_index_if_ready(
  'idx_climate_survey_responses_survey_dim',
  'climate_survey_responses',
  'CREATE INDEX IF NOT EXISTS idx_climate_survey_responses_survey_dim ON climate_survey_responses (survey_id, submitted_at DESC)',
  ARRAY['survey_id', 'submitted_at']
);

SELECT _mig_create_index_if_ready(
  'idx_assessments_company',
  'assessments',
  $sql$CREATE INDEX IF NOT EXISTS idx_assessments_company ON assessments (company_id) WHERE top_type IS NOT NULL$sql$,
  ARRAY['company_id', 'top_type']
);

SELECT _mig_create_index_if_ready(
  'idx_candidates_hire_date',
  'candidates',
  $sql$CREATE INDEX IF NOT EXISTS idx_candidates_hire_date ON candidates (company_id, hire_date) WHERE hire_date IS NOT NULL$sql$,
  ARRAY['company_id', 'hire_date']
);

SELECT _mig_create_index_if_ready(
  'idx_candidates_exit_date',
  'candidates',
  $sql$CREATE INDEX IF NOT EXISTS idx_candidates_exit_date ON candidates (company_id, exit_date) WHERE exit_date IS NOT NULL$sql$,
  ARRAY['company_id', 'exit_date']
);

SELECT _mig_create_index_if_ready(
  'idx_development_plans_candidate_status',
  'development_plans',
  'CREATE INDEX IF NOT EXISTS idx_development_plans_candidate_status ON development_plans (candidate_id, status)',
  ARRAY['candidate_id', 'status']
);

SELECT _mig_create_index_if_ready(
  'idx_performance_reviews_cycle_employee',
  'performance_reviews',
  'CREATE INDEX IF NOT EXISTS idx_performance_reviews_cycle_employee ON performance_reviews (cycle_id, employee_candidate_id)',
  ARRAY['cycle_id', 'employee_candidate_id']
);

SELECT _mig_create_index_if_ready(
  'idx_one_on_ones_candidate_recent',
  'one_on_ones',
  'CREATE INDEX IF NOT EXISTS idx_one_on_ones_candidate_recent ON one_on_ones (candidate_id, created_at DESC)',
  ARRAY['candidate_id', 'created_at']
);

-- Notificações: recipient_user_id + read_at (não user_id / read)
SELECT _mig_create_index_if_ready(
  'idx_manager_notifications_user_unread',
  'manager_notifications',
  $sql$CREATE INDEX IF NOT EXISTS idx_manager_notifications_user_unread ON manager_notifications (recipient_user_id, created_at DESC) WHERE read_at IS NULL$sql$,
  ARRAY['recipient_user_id', 'created_at', 'read_at']
);

SELECT _mig_create_index_if_ready(
  'idx_exit_records_company',
  'exit_records',
  $sql$CREATE INDEX IF NOT EXISTS idx_exit_records_company ON exit_records (company_id) WHERE candidate_id IS NOT NULL$sql$,
  ARRAY['company_id', 'candidate_id']
);

SELECT _mig_create_index_if_ready(
  'idx_learning_resources_company_type',
  'learning_resources',
  $sql$CREATE INDEX IF NOT EXISTS idx_learning_resources_company_type ON learning_resources (company_id, resource_type) WHERE active = TRUE$sql$,
  ARRAY['company_id', 'resource_type', 'active']
);

SELECT _mig_create_index_if_ready(
  'idx_succession_plans_role',
  'succession_plans',
  'CREATE INDEX IF NOT EXISTS idx_succession_plans_role ON succession_plans (critical_role_id)',
  ARRAY['critical_role_id']
);

DO $$
BEGIN
  IF to_regclass('public.idx_hr_scores_candidate_recent') IS NOT NULL THEN
    COMMENT ON INDEX idx_hr_scores_candidate_recent IS
      'Otimiza getHrScore() após cache miss (calculated_at).';
  END IF;
  IF to_regclass('public.idx_hr_scores_turnover_risk') IS NOT NULL THEN
    COMMENT ON INDEX idx_hr_scores_turnover_risk IS
      'Radar de rotatividade — partial index em riscos médios/altos.';
  END IF;
  IF to_regclass('public.idx_climate_surveys_company_active') IS NOT NULL THEN
    COMMENT ON INDEX idx_climate_surveys_company_active IS
      'Listagem de surveys não excluídos por empresa.';
  END IF;
  IF to_regclass('public.idx_climate_survey_responses_survey_dim') IS NOT NULL THEN
    COMMENT ON INDEX idx_climate_survey_responses_survey_dim IS
      'Agregação de respostas de clima por survey.';
  END IF;
  IF to_regclass('public.idx_assessments_company') IS NOT NULL THEN
    COMMENT ON INDEX idx_assessments_company IS
      'Analytics cross-vacancy (fit médio, type mix).';
  END IF;
  IF to_regclass('public.idx_candidates_hire_date') IS NOT NULL THEN
    COMMENT ON INDEX idx_candidates_hire_date IS
      'Time-to-hire e retenção (quando hire_date existir).';
  END IF;
  IF to_regclass('public.idx_candidates_exit_date') IS NOT NULL THEN
    COMMENT ON INDEX idx_candidates_exit_date IS
      'Análise demissional e turnover (quando exit_date existir).';
  END IF;
  IF to_regclass('public.idx_development_plans_candidate_status') IS NOT NULL THEN
    COMMENT ON INDEX idx_development_plans_candidate_status IS
      'PDIs por pessoa e status.';
  END IF;
  IF to_regclass('public.idx_performance_reviews_cycle_employee') IS NOT NULL THEN
    COMMENT ON INDEX idx_performance_reviews_cycle_employee IS
      'Reviews por ciclo e colaborador.';
  END IF;
  IF to_regclass('public.idx_one_on_ones_candidate_recent') IS NOT NULL THEN
    COMMENT ON INDEX idx_one_on_ones_candidate_recent IS
      'Histórico de 1:1s na Equipe.';
  END IF;
  IF to_regclass('public.idx_manager_notifications_user_unread') IS NOT NULL THEN
    COMMENT ON INDEX idx_manager_notifications_user_unread IS
      'Inbox não lida (read_at IS NULL).';
  END IF;
  IF to_regclass('public.idx_exit_records_company') IS NOT NULL THEN
    COMMENT ON INDEX idx_exit_records_company IS
      'Insights de saída por empresa.';
  END IF;
  IF to_regclass('public.idx_learning_resources_company_type') IS NOT NULL THEN
    COMMENT ON INDEX idx_learning_resources_company_type IS
      'Filtro de recursos por tipo (B-1008).';
  END IF;
  IF to_regclass('public.idx_succession_plans_role') IS NOT NULL THEN
    COMMENT ON INDEX idx_succession_plans_role IS
      'Sucessores por papel crítico.';
  END IF;
END $$;

DROP FUNCTION IF EXISTS _mig_create_index_if_ready(text, text, text, text[]);
