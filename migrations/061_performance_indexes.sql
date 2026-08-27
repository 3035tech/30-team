-- Migration 061: Índices críticos de performance
-- Performance optimization: índices para queries quentes identificadas

-- HR Scores: busca por candidate_id + ordenação por last_calculated_at
CREATE INDEX IF NOT EXISTS idx_hr_scores_candidate_recent 
  ON hr_scores(candidate_id, last_calculated_at DESC);

-- HR Scores: filtro por turnover_risk (radar de rotatividade)
CREATE INDEX IF NOT EXISTS idx_hr_scores_turnover_risk 
  ON hr_scores(turnover_risk) 
  WHERE turnover_risk IN ('medium', 'high');

-- Climate Surveys: busca por company_id + active + created_at
CREATE INDEX IF NOT EXISTS idx_climate_surveys_company_active 
  ON climate_surveys(company_id, created_at DESC) 
  WHERE active = TRUE AND deleted = FALSE;

-- Climate Responses: join com surveys + aggregação por dimension
CREATE INDEX IF NOT EXISTS idx_climate_responses_survey_dimension 
  ON climate_responses(survey_id, dimension_key);

-- Assessments: busca por company_id para analytics
CREATE INDEX IF NOT EXISTS idx_assessments_company 
  ON assessments(company_id) 
  WHERE top_type IS NOT NULL;

-- Candidates: hire_date para métricas de retenção
CREATE INDEX IF NOT EXISTS idx_candidates_hire_date 
  ON candidates(company_id, hire_date) 
  WHERE hire_date IS NOT NULL;

-- Candidates: exit_date para análise demissional
CREATE INDEX IF NOT EXISTS idx_candidates_exit_date 
  ON candidates(company_id, exit_date) 
  WHERE exit_date IS NOT NULL;

-- Development Plans: busca por candidate + status
CREATE INDEX IF NOT EXISTS idx_development_plans_candidate_status 
  ON development_plans(candidate_id, status);

-- Performance Reviews: busca por cycle + employee
CREATE INDEX IF NOT EXISTS idx_performance_reviews_cycle_employee 
  ON performance_reviews(cycle_id, employee_candidate_id);

-- One on Ones: busca por candidate + created_at desc
CREATE INDEX IF NOT EXISTS idx_one_on_ones_candidate_recent 
  ON one_on_ones(candidate_id, created_at DESC);

-- Manager Notifications: busca por user + unread + created_at
CREATE INDEX IF NOT EXISTS idx_manager_notifications_user_unread 
  ON manager_notifications(user_id, created_at DESC) 
  WHERE read = FALSE;

-- Exit Records: busca por company para insights
CREATE INDEX IF NOT EXISTS idx_exit_records_company 
  ON exit_records(company_id) 
  WHERE candidate_id IS NOT NULL;

-- Learning Resources: busca por company + active + resource_type
CREATE INDEX IF NOT EXISTS idx_learning_resources_company_type 
  ON learning_resources(company_id, resource_type) 
  WHERE active = TRUE;

-- Succession Plans: busca por critical_role
CREATE INDEX IF NOT EXISTS idx_succession_plans_role 
  ON succession_plans(critical_role_id);

-- COMMENT: Rationale de cada índice
COMMENT ON INDEX idx_hr_scores_candidate_recent IS 
  'Otimiza getHrScore() - query mais frequente do sistema após cache miss';

COMMENT ON INDEX idx_hr_scores_turnover_risk IS 
  'Otimiza radar de rotatividade - filtro partial index em riscos críticos';

COMMENT ON INDEX idx_climate_surveys_company_active IS 
  'Otimiza listagem de surveys ativos por empresa';

COMMENT ON INDEX idx_climate_responses_survey_dimension IS 
  'Otimiza agregação de scores por dimensão (clima médio)';

COMMENT ON INDEX idx_assessments_company IS 
  'Otimiza analytics cross-vacancy (fit médio empresa, type mix)';

COMMENT ON INDEX idx_candidates_hire_date IS 
  'Otimiza time-to-hire e métricas de retenção (B-1101)';

COMMENT ON INDEX idx_candidates_exit_date IS 
  'Otimiza análise demissional e taxa de turnover';

COMMENT ON INDEX idx_development_plans_candidate_status IS 
  'Otimiza busca de PDIs ativos/completos por pessoa';

COMMENT ON INDEX idx_performance_reviews_cycle_employee IS 
  'Otimiza busca de reviews por ciclo e colaborador';

COMMENT ON INDEX idx_one_on_ones_candidate_recent IS 
  'Otimiza histórico de 1:1s na Equipe';

COMMENT ON INDEX idx_manager_notifications_user_unread IS 
  'Otimiza badge de notificações não lidas';

COMMENT ON INDEX idx_exit_records_company IS 
  'Otimiza insights de saída por empresa';

COMMENT ON INDEX idx_learning_resources_company_type IS 
  'Otimiza filtro de recursos por tipo (B-1008)';

COMMENT ON INDEX idx_succession_plans_role IS 
  'Otimiza listagem de sucessores por papel crítico';
