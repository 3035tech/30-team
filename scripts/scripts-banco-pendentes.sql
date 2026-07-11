-- Scripts de banco — fluxo "candidato na entrevista → notas → envio eneagrama"
-- Execute no pgAdmin / psql antes de usar a nova tela na vaga.

-- 1) Vínculo candidato ↔ vaga (pré-cadastro na entrevista) + notas ricas + pipeline pré-teste
CREATE TABLE IF NOT EXISTS vacancy_candidates (
  id                  BIGSERIAL PRIMARY KEY,
  vacancy_id          BIGINT NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  candidate_id        BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id          BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  interview_notes     TEXT,
  pipeline_stage      TEXT,
  created_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vacancy_id, candidate_id)
);

ALTER TABLE vacancy_candidates
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vacancy_candidates_pipeline_stage_check'
  ) THEN
    ALTER TABLE vacancy_candidates
      ADD CONSTRAINT vacancy_candidates_pipeline_stage_check
      CHECK (
        pipeline_stage IS NULL OR pipeline_stage IN (
          'new',
          'test_completed',
          'screening',
          'interview',
          'approved',
          'rejected',
          'archived'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vacancy_candidates_vacancy
  ON vacancy_candidates (vacancy_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vacancy_candidates_candidate
  ON vacancy_candidates (candidate_id);

CREATE INDEX IF NOT EXISTS idx_vacancy_candidates_company
  ON vacancy_candidates (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vacancy_candidates_pipeline
  ON vacancy_candidates (vacancy_id, pipeline_stage)
  WHERE pipeline_stage IS NOT NULL;

-- 2) Ligar convite de eneagrama ao candidato pré-cadastrado
ALTER TABLE candidate_invites
  ADD COLUMN IF NOT EXISTS candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_candidate_invites_candidate
  ON candidate_invites (candidate_id)
  WHERE candidate_id IS NOT NULL;

-- 3) Controle de migration (opcional, alinha com npm run db:migrate)
CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (name) VALUES ('014_vacancy_candidates.sql')
ON CONFLICT (name) DO NOTHING;
