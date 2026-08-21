-- Pendências de banco (execute no pgAdmin / psql)
-- Fonte canônica: migrations/*.sql
-- 015 — perfil ampliado do candidato
-- 016 — descrição e faixa salarial da vaga
-- 017 — rejeição, contratação, timeline
-- 018 — índices overview / funil por vaga / busca por nome (pg_trgm)
-- 019 — notas de RH no candidato
-- 020 — posições e data-alvo da vaga
-- 021 — relatório público por vaga (link temporário)
-- 022 — registro de 1:1 (People)
-- 023 — notificações in-app + display_name
-- 024 — tipos genéricos de notificação + dedupe por time RH
-- 025 — índice unique e-mail candidatos + índices fan-out / prazo vaga
-- 026 — overrides de capability por usuário (visões do painel)

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS salary_expectation TEXT,
  ADD COLUMN IF NOT EXISTS availability TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS salary_min TEXT,
  ADD COLUMN IF NOT EXISTS salary_max TEXT;

-- 017
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

-- =============================================================================
-- 018 — performance indexes (safe to re-run)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_assessments_vacancy_created
  ON assessments (vacancy_id, created_at DESC)
  WHERE vacancy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_vacancy_pipeline
  ON assessments (vacancy_id, pipeline_stage)
  WHERE vacancy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidate_invites_company_status_sent
  ON candidate_invites (company_id, status, sent_at)
  WHERE status IN ('sent', 'opened');

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_candidates_fullname_trgm
  ON candidates USING gin (full_name gin_trgm_ops);

-- =============================================================================
-- 019 — HR notes on candidates
-- =============================================================================

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS hr_notes TEXT;

-- =============================================================================
-- 020 — vacancy planning (positions + target date)
-- =============================================================================

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS positions_count INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS target_date DATE;

-- =============================================================================
-- 021 — vacancy client report shares (public /r/<token>)
-- =============================================================================

CREATE TABLE IF NOT EXISTS vacancy_report_shares (
  id BIGSERIAL PRIMARY KEY,
  vacancy_id BIGINT NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  title TEXT,
  executive_note TEXT,
  snapshot JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vacancy_report_shares_token
  ON vacancy_report_shares (token);

CREATE INDEX IF NOT EXISTS idx_vacancy_report_shares_vacancy_created
  ON vacancy_report_shares (vacancy_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vacancy_report_shares_active
  ON vacancy_report_shares (vacancy_id, active)
  WHERE active = TRUE;

-- 022 — registro de 1:1 (People)
CREATE TABLE IF NOT EXISTS one_on_ones (
  id                  BIGSERIAL PRIMARY KEY,
  company_id          BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id        BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  meeting_date        DATE NOT NULL DEFAULT (CURRENT_DATE),
  notes               TEXT NOT NULL DEFAULT '',
  next_steps          TEXT,
  created_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_on_ones_notes_len CHECK (char_length(notes) <= 8000),
  CONSTRAINT one_on_ones_next_steps_len CHECK (next_steps IS NULL OR char_length(next_steps) <= 4000)
);

CREATE INDEX IF NOT EXISTS idx_one_on_ones_candidate_date
  ON one_on_ones (candidate_id, meeting_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_one_on_ones_company_date
  ON one_on_ones (company_id, meeting_date DESC);

-- 023 — notificações de gestores + display_name
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name TEXT;

CREATE TABLE IF NOT EXISTS manager_notifications (
  id                  BIGSERIAL PRIMARY KEY,
  company_id          BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recipient_user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                TEXT NOT NULL
    CHECK (type IN ('enneagram_completed', 'motivators_completed')),
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manager_notifications_recipient_created
  ON manager_notifications (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_manager_notifications_recipient_unread
  ON manager_notifications (recipient_user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_manager_notifications_company_created
  ON manager_notifications (company_id, created_at DESC);

-- 024 — notificações genéricas + dedupe (time RH)
ALTER TABLE manager_notifications
  DROP CONSTRAINT IF EXISTS manager_notifications_type_check;

ALTER TABLE manager_notifications
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id BIGINT,
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_manager_notifications_dedupe
  ON manager_notifications (recipient_user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_manager_notifications_entity
  ON manager_notifications (company_id, entity_type, entity_id)
  WHERE entity_type IS NOT NULL;

-- 025 — unique e-mail candidatos + índices fan-out / prazo
UPDATE candidates SET email = NULL WHERE email = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_company_email_lower_unique
  ON candidates (company_id, LOWER(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vacancies_open_target_date
  ON vacancies (target_date)
  WHERE deleted = FALSE AND status = 'open' AND target_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_company_active_managers
  ON users (company_id)
  WHERE deleted = FALSE AND active = TRUE AND role IN ('hr', 'direction', 'admin');

-- 026 — overrides de capability por usuário (módulos do painel)
CREATE TABLE IF NOT EXISTS user_capability_overrides (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  granted    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_user_capability_overrides_user
  ON user_capability_overrides (user_id);

