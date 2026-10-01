-- Migration 138: índices para hot paths apontados na varredura de performance (idempotente).
-- Sem mudança de dados nem de contrato. Pula o índice (NOTICE) se tabela/coluna ainda não existir.

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

-- HR Score / weekly digest: type + entity_id (+ janela created_at). entity_id = candidates.id (global).
SELECT _mig_create_index_if_ready(
  'idx_manager_notifications_type_entity_created',
  'manager_notifications',
  $sql$CREATE INDEX IF NOT EXISTS idx_manager_notifications_type_entity_created
    ON manager_notifications (type, entity_id, created_at DESC)
    WHERE entity_id IS NOT NULL$sql$,
  ARRAY['type', 'entity_id', 'created_at']
);

-- Kanban de vaga: LATERAL motivadores (candidate_id OR e-mail) → BitmapOr com idx_ae_invites_email.
SELECT _mig_create_index_if_ready(
  'idx_ae_invites_company_candidate',
  'ae_invites',
  $sql$CREATE INDEX IF NOT EXISTS idx_ae_invites_company_candidate
    ON ae_invites (company_id, candidate_id)
    WHERE candidate_id IS NOT NULL$sql$,
  ARRAY['company_id', 'candidate_id']
);

-- Kanban de vaga: LATERAL convite (candidate_id OR e-mail) → BitmapOr com idx_candidate_invites_vacancy_email.
SELECT _mig_create_index_if_ready(
  'idx_candidate_invites_vacancy_candidate',
  'candidate_invites',
  $sql$CREATE INDEX IF NOT EXISTS idx_candidate_invites_vacancy_candidate
    ON candidate_invites (vacancy_id, candidate_id)
    WHERE candidate_id IS NOT NULL$sql$,
  ARRAY['vacancy_id', 'candidate_id']
);

-- Kanban de vaga: LATERAL última tentativa de motivadores por pessoa.
SELECT _mig_create_index_if_ready(
  'idx_ae_attempts_company_candidate_completed',
  'ae_attempts',
  $sql$CREATE INDEX IF NOT EXISTS idx_ae_attempts_company_candidate_completed
    ON ae_attempts (company_id, candidate_id, completed_at DESC)
    WHERE status = 'completed'$sql$,
  ARRAY['company_id', 'candidate_id', 'completed_at', 'status']
);

-- Clima: média Likert recente / tendência por empresa (hoje só existe (survey_id, submitted_at)).
SELECT _mig_create_index_if_ready(
  'idx_climate_survey_responses_company_submitted',
  'climate_survey_responses',
  $sql$CREATE INDEX IF NOT EXISTS idx_climate_survey_responses_company_submitted
    ON climate_survey_responses (company_id, submitted_at DESC)$sql$,
  ARRAY['company_id', 'submitted_at']
);

-- Etapas de pipeline: contagem de uso por empresa / por vaga.
SELECT _mig_create_index_if_ready(
  'idx_vacancy_candidates_company_stage',
  'vacancy_candidates',
  $sql$CREATE INDEX IF NOT EXISTS idx_vacancy_candidates_company_stage
    ON vacancy_candidates (company_id, pipeline_stage)$sql$,
  ARRAY['company_id', 'pipeline_stage']
);

SELECT _mig_create_index_if_ready(
  'idx_vacancy_candidates_vacancy_stage',
  'vacancy_candidates',
  $sql$CREATE INDEX IF NOT EXISTS idx_vacancy_candidates_vacancy_stage
    ON vacancy_candidates (vacancy_id, pipeline_stage)$sql$,
  ARRAY['vacancy_id', 'pipeline_stage']
);

-- Aba Equipe / ranking: última mudança de etapa (ORDER BY changed_at DESC NULLS LAST, id DESC).
SELECT _mig_create_index_if_ready(
  'idx_assessment_pipeline_history_assessment_latest',
  'assessment_pipeline_history',
  $sql$CREATE INDEX IF NOT EXISTS idx_assessment_pipeline_history_assessment_latest
    ON assessment_pipeline_history (assessment_id, changed_at DESC NULLS LAST, id DESC)$sql$,
  ARRAY['assessment_id', 'changed_at', 'id']
);

DROP FUNCTION IF EXISTS _mig_create_index_if_ready(text, text, text, text[]);
