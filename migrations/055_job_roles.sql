-- Migration 055: Job Roles (Engenharia de Cargos Leve — B-1003)
-- Cargos/papéis da empresa com competências T1–T9 (rubrica).
-- Vagas podem herdar cargo (job_role_id FK opcional).

CREATE TABLE IF NOT EXISTS job_roles (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rubric JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(company_id, name)
);

COMMENT ON TABLE job_roles IS
  'Cargos/papéis da empresa com competências T1–T9 (rubrica). Vagas podem herdar o cargo para simplificar cadastro e garantir consistência.';

COMMENT ON COLUMN job_roles.rubric IS
  'JSONB com pesos T1–T9, ex: {"T1": 20, "T2": 30, ...}. Formato compatível com vacancies.rubric.';

COMMENT ON COLUMN job_roles.active IS
  'TRUE = cargo ativo (disponível para novas vagas); FALSE = desativado (soft delete).';

-- Índices
-- Soft delete desta tabela é `active` (não há coluna `deleted`).
CREATE INDEX IF NOT EXISTS idx_job_roles_company
  ON job_roles (company_id, active)
  WHERE active = TRUE;

-- FK na vaga para herdar cargo
ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS job_role_id BIGINT REFERENCES job_roles(id) ON DELETE SET NULL;

COMMENT ON COLUMN vacancies.job_role_id IS
  'FK opcional para cargo base. Quando presente, a vaga pode herdar rubrica do cargo (vacancy.rubric override se diferente).';

CREATE INDEX IF NOT EXISTS idx_vacancies_job_role
  ON vacancies (job_role_id)
  WHERE job_role_id IS NOT NULL;
