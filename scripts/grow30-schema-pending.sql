-- 30Grow: schema pendente para o banco grow30
-- Gerado a partir de migrations/*.sql
-- Somente executar conectado ao database grow30.
-- Snapshot do RDS recomendado antes da execução.
-- Não executar sem snapshot: migrations canônicas podem recriar constraints/triggers
-- e contêm uma limpeza de dados específica para normalização de schema.
-- Migrations 113/115 já aplicadas foram excluídas deste arquivo.

BEGIN;

-- ===== BEGIN 010_assessment_engine.sql =====
-- 010: Assessment Engine — banco de perguntas parametrizável (Motivadores Profissionais).

CREATE TABLE IF NOT EXISTS ae_definitions (
  id          BIGSERIAL PRIMARY KEY,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  version     INTEGER NOT NULL DEFAULT 1,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  config      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ae_definitions_slug_unique ON ae_definitions (LOWER(slug));

CREATE TABLE IF NOT EXISTS ae_dimensions (
  id            BIGSERIAL PRIMARY KEY,
  definition_id BIGINT NOT NULL REFERENCES ae_definitions(id) ON DELETE CASCADE,
  key           TEXT NOT NULL,
  label         TEXT NOT NULL,
  description   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  color         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ae_dimensions_definition_key
  ON ae_dimensions (definition_id, LOWER(key));

CREATE TABLE IF NOT EXISTS ae_questions (
  id             BIGSERIAL PRIMARY KEY,
  definition_id  BIGINT NOT NULL REFERENCES ae_definitions(id) ON DELETE CASCADE,
  key            TEXT NOT NULL,
  text           TEXT NOT NULL,
  question_type  TEXT NOT NULL CHECK (question_type IN ('forced_choice', 'likert')),
  category       TEXT,
  weight         NUMERIC(6, 2) NOT NULL DEFAULT 1.0,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ae_questions_definition_key
  ON ae_questions (definition_id, key);

CREATE INDEX IF NOT EXISTS idx_ae_questions_definition_active
  ON ae_questions (definition_id, active, question_type);

CREATE TABLE IF NOT EXISTS ae_question_options (
  id          BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES ae_questions(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  text        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ae_question_options_question_key
  ON ae_question_options (question_id, key);

CREATE TABLE IF NOT EXISTS ae_option_dimension_weights (
  option_id     BIGINT NOT NULL REFERENCES ae_question_options(id) ON DELETE CASCADE,
  dimension_id  BIGINT NOT NULL REFERENCES ae_dimensions(id) ON DELETE CASCADE,
  weight        NUMERIC(6, 2) NOT NULL DEFAULT 1.0,
  PRIMARY KEY (option_id, dimension_id)
);

CREATE TABLE IF NOT EXISTS ae_question_dimension_weights (
  question_id       BIGINT NOT NULL REFERENCES ae_questions(id) ON DELETE CASCADE,
  dimension_id      BIGINT NOT NULL REFERENCES ae_dimensions(id) ON DELETE CASCADE,
  weight_per_point  NUMERIC(6, 2) NOT NULL DEFAULT 1.0,
  PRIMARY KEY (question_id, dimension_id)
);

INSERT INTO schema_migrations (name) VALUES ('010_assessment_engine.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('010_assessment_engine.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 010_assessment_engine.sql =====

-- ===== BEGIN 011_ae_sessions.sql =====
-- 011: convites, tentativas e templates de resultado (Assessment Engine).

CREATE TABLE IF NOT EXISTS ae_invites (
  id                  BIGSERIAL PRIMARY KEY,
  definition_id       BIGINT NOT NULL REFERENCES ae_definitions(id) ON DELETE CASCADE,
  company_id          BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id        BIGINT REFERENCES candidates(id) ON DELETE SET NULL,
  candidate_name      TEXT NOT NULL,
  candidate_email     TEXT NOT NULL,
  token               TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'opened', 'completed', 'expired', 'cancelled')),
  expires_at          TIMESTAMPTZ NOT NULL,
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at           TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  last_reminder_at    TIMESTAMPTZ,
  reminder_count      INTEGER NOT NULL DEFAULT 0,
  created_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ae_invites_token_unique ON ae_invites (token);
CREATE INDEX IF NOT EXISTS idx_ae_invites_company_status ON ae_invites (company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_invites_email ON ae_invites (company_id, LOWER(candidate_email));

CREATE TABLE IF NOT EXISTS ae_attempts (
  id                       BIGSERIAL PRIMARY KEY,
  invite_id                BIGINT REFERENCES ae_invites(id) ON DELETE SET NULL,
  definition_id            BIGINT NOT NULL REFERENCES ae_definitions(id) ON DELETE CASCADE,
  company_id               BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id             BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  area_id                  INTEGER REFERENCES areas(id) ON DELETE SET NULL,
  status                   TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed')),
  started_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at             TIMESTAMPTZ,
  question_ids             BIGINT[] NOT NULL DEFAULT '{}',
  dimension_scores         JSONB,
  ranking                  JSONB,
  profile_summary          TEXT,
  manager_recommendations  JSONB,
  answers                  JSONB,
  algorithm_version        TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ae_attempts_company_created ON ae_attempts (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_attempts_candidate_created ON ae_attempts (candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_attempts_invite ON ae_attempts (invite_id) WHERE invite_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ae_attempts_status ON ae_attempts (company_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS ae_result_templates (
  id             BIGSERIAL PRIMARY KEY,
  definition_id  BIGINT NOT NULL REFERENCES ae_definitions(id) ON DELETE CASCADE,
  template_type  TEXT NOT NULL CHECK (template_type IN ('profile_summary', 'manager_do', 'manager_avoid')),
  condition      JSONB NOT NULL DEFAULT '{}'::jsonb,
  text_pt        TEXT NOT NULL,
  text_en        TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ae_result_templates_definition
  ON ae_result_templates (definition_id, template_type, active, sort_order);

INSERT INTO schema_migrations (name) VALUES ('011_ae_sessions.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('011_ae_sessions.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 011_ae_sessions.sql =====

-- ===== BEGIN 012_ae_ranking_question_type.sql =====
-- 012: adiciona o tipo de pergunta "ranking" (ordenar opções por importância).

ALTER TABLE ae_questions DROP CONSTRAINT IF EXISTS ae_questions_question_type_check;

ALTER TABLE ae_questions
  ADD CONSTRAINT ae_questions_question_type_check
  CHECK (question_type IN ('forced_choice', 'likert', 'ranking'));

INSERT INTO schema_migrations (name) VALUES ('012_ae_ranking_question_type.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('012_ae_ranking_question_type.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 012_ae_ranking_question_type.sql =====

-- ===== BEGIN 013_assessment_integrity.sql =====
-- Telemetria de integridade do teste de eneagrama (duração + cópias na tela).
-- Visível apenas para role admin na API/UI.

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS fill_duration_ms INTEGER
    CHECK (fill_duration_ms IS NULL OR fill_duration_ms >= 0),
  ADD COLUMN IF NOT EXISTS copy_event_count INTEGER NOT NULL DEFAULT 0
    CHECK (copy_event_count >= 0);

COMMENT ON COLUMN assessments.fill_duration_ms IS
  'Tempo (ms) entre início do teste e envio — sinal soft de preenchimento rápido/IA';
COMMENT ON COLUMN assessments.copy_event_count IS
  'Quantidade de eventos copy/cut na tela do teste (ex.: Ctrl+C nas perguntas)';

INSERT INTO schema_migrations (name) VALUES ('013_assessment_integrity.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 013_assessment_integrity.sql =====

-- ===== BEGIN 014_vacancy_candidates.sql =====
-- 014: candidatos pré-cadastrados na vaga (entrevista → notas → envio do desafio).
-- Email é a chave de união com eneagrama/motivadores.

CREATE TABLE IF NOT EXISTS vacancy_candidates (
  id                  BIGSERIAL PRIMARY KEY,
  vacancy_id          BIGINT NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  candidate_id        BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id          BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  interview_notes     TEXT,
  pipeline_stage      TEXT
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
    ),
  created_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vacancy_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_vacancy_candidates_vacancy
  ON vacancy_candidates (vacancy_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vacancy_candidates_candidate
  ON vacancy_candidates (candidate_id);

CREATE INDEX IF NOT EXISTS idx_vacancy_candidates_company
  ON vacancy_candidates (company_id, created_at DESC);

ALTER TABLE candidate_invites
  ADD COLUMN IF NOT EXISTS candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_candidate_invites_candidate
  ON candidate_invites (candidate_id)
  WHERE candidate_id IS NOT NULL;

COMMENT ON TABLE vacancy_candidates IS
  'Vínculo candidato↔vaga criado na entrevista (antes do teste). Notas ricas em interview_notes.';
COMMENT ON COLUMN vacancy_candidates.interview_notes IS
  'Anotações da entrevista (HTML sanitizado do editor rico).';
COMMENT ON COLUMN vacancy_candidates.pipeline_stage IS
  'Estágio no kanban antes do teste; preenchido ao enviar o eneagrama (ex.: new).';
COMMENT ON COLUMN candidate_invites.candidate_id IS
  'Candidato pré-cadastrado ao enviar o desafio de eneagrama.';

INSERT INTO schema_migrations (name) VALUES ('014_vacancy_candidates.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 014_vacancy_candidates.sql =====

-- ===== BEGIN 015_candidate_profile.sql =====
-- 015: perfil ampliado do candidato (contato + contexto RH)
-- Sem currículo. Campos opcionais; preenchimento principal na entrevista.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS salary_expectation TEXT,
  ADD COLUMN IF NOT EXISTS availability TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT;

COMMENT ON COLUMN candidates.phone IS 'Telefone / WhatsApp';
COMMENT ON COLUMN candidates.linkedin_url IS 'URL do perfil LinkedIn';
COMMENT ON COLUMN candidates.city IS 'Cidade';
COMMENT ON COLUMN candidates.state IS 'UF / estado (ex.: SP)';
COMMENT ON COLUMN candidates.salary_expectation IS 'Pretensão ou faixa salarial (texto livre)';
COMMENT ON COLUMN candidates.availability IS 'Disponibilidade: immediate | 15_days | 30_days | 60_days | other';
COMMENT ON COLUMN candidates.source IS 'Fonte: linkedin | referral | agency | job_board | other';

INSERT INTO schema_migrations (name) VALUES ('015_candidate_profile.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 015_candidate_profile.sql =====

-- ===== BEGIN 016_vacancy_details.sql =====
-- 016: descrição e faixa salarial da vaga (cadastro RH)

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS salary_min TEXT,
  ADD COLUMN IF NOT EXISTS salary_max TEXT;

COMMENT ON COLUMN vacancies.description IS 'Descrição / pontos importantes da vaga (HTML do editor rico)';
COMMENT ON COLUMN vacancies.salary_min IS 'Faixa salarial mínima (ex.: 3500.00, sem máscara)';
COMMENT ON COLUMN vacancies.salary_max IS 'Faixa salarial máxima (ex.: 8000.00, sem máscara)';

INSERT INTO schema_migrations (name) VALUES ('016_vacancy_details.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 016_vacancy_details.sql =====

-- ===== BEGIN 017_hire_reject_timeline.sql =====
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

INSERT INTO schema_migrations (name) VALUES ('017_hire_reject_timeline.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 017_hire_reject_timeline.sql =====

-- ===== BEGIN 018_overview_vacancy_indexes.sql =====
-- 018: performance indexes for vacancy funnel, overview, and invite attention.
-- Safe to re-run (IF NOT EXISTS).

-- Ranking / hire-close / overview vacancy aggregates
CREATE INDEX IF NOT EXISTS idx_assessments_vacancy_created
  ON assessments (vacancy_id, created_at DESC)
  WHERE vacancy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_vacancy_pipeline
  ON assessments (vacancy_id, pipeline_stage)
  WHERE vacancy_id IS NOT NULL;

-- Overview: pending enneagram invites by company
CREATE INDEX IF NOT EXISTS idx_candidate_invites_company_status_sent
  ON candidate_invites (company_id, status, sent_at)
  WHERE status IN ('sent', 'opened');

-- Optional: accelerate ILIKE '%name%' candidate search (requires pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_candidates_fullname_trgm
  ON candidates USING gin (full_name gin_trgm_ops);

INSERT INTO schema_migrations (name) VALUES ('018_overview_vacancy_indexes.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 018_overview_vacancy_indexes.sql =====

-- ===== BEGIN 019_candidate_hr_notes.sql =====
-- 019: HR notes on candidates (interview / screening free text).

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS hr_notes TEXT;

COMMENT ON COLUMN candidates.hr_notes IS 'Free-text notes from HR (screening / interview)';

INSERT INTO schema_migrations (name) VALUES ('019_candidate_hr_notes.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 019_candidate_hr_notes.sql =====

-- ===== BEGIN 020_vacancy_planning.sql =====
-- 020: vacancy planning fields (headcount + target close date).
-- description / salary_* live in 016_vacancy_details.sql.

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS positions_count INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS target_date DATE;

COMMENT ON COLUMN vacancies.positions_count IS 'Number of openings to fill before auto-close';
COMMENT ON COLUMN vacancies.target_date IS 'Target date to fill / close the vacancy';

INSERT INTO schema_migrations (name) VALUES ('020_vacancy_planning.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 020_vacancy_planning.sql =====

-- ===== BEGIN 021_vacancy_report_shares.sql =====
-- 021: public temporary client reports per vacancy (strong token + snapshot)

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

COMMENT ON TABLE vacancy_report_shares IS 'Client-facing vacancy shortlist reports; public /r/<token> until expiry or revoke';
COMMENT ON COLUMN vacancy_report_shares.snapshot IS 'Immutable JSON payload shown on the public page (no emails/phones)';

INSERT INTO schema_migrations (name) VALUES ('021_vacancy_report_shares.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 021_vacancy_report_shares.sql =====

-- ===== BEGIN 022_one_on_ones.sql =====
-- 022: registro de 1:1 (People) — ligado a candidates (company_id + candidate_id).
-- Eneagrama e Motivadores já compartilham o mesmo candidates.id (e-mail).

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

COMMENT ON TABLE one_on_ones IS
  '1:1 management notes for a person (candidate). Same identity key as assessments + ae_attempts.';

INSERT INTO schema_migrations (name) VALUES ('022_one_on_ones.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('022_one_on_ones.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 022_one_on_ones.sql =====

-- ===== BEGIN 023_manager_notifications.sql =====
-- 023: notificações in-app para gestores + display_name no usuário

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name TEXT;

COMMENT ON COLUMN users.display_name IS
  'Optional display name for the manager profile menu (not used as login identity).';

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

COMMENT ON TABLE manager_notifications IS
  'In-app inbox for hr/direction (and company-scoped managers) when assessments complete.';

INSERT INTO schema_migrations (name) VALUES ('023_manager_notifications.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('023_manager_notifications.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 023_manager_notifications.sql =====

-- ===== BEGIN 024_manager_notifications_generic.sql =====
-- 024: notificações genéricas (catálogo aberto) + dedupe por time RH

-- Remove CHECK restrito a assessments (tipos novos: prazo/fechamento de vaga, etc.)
ALTER TABLE manager_notifications
  DROP CONSTRAINT IF EXISTS manager_notifications_type_check;

ALTER TABLE manager_notifications
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id BIGINT,
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

COMMENT ON COLUMN manager_notifications.type IS
  'Catalog key (app-defined): enneagram_completed, motivators_completed, vacancy_deadline_approaching, vacancy_closed, …';
COMMENT ON COLUMN manager_notifications.entity_type IS
  'Optional entity kind: candidate | vacancy | assessment | attempt | …';
COMMENT ON COLUMN manager_notifications.entity_id IS
  'Optional entity id for deep-link / grouping';
COMMENT ON COLUMN manager_notifications.dedupe_key IS
  'Stable key per recipient to avoid duplicate team alerts (e.g. vacancy_deadline:123:2026-08-28)';

-- Uma notificação por destinatário + chave (time RH recebe 1 cada; cron não reenvia)
CREATE UNIQUE INDEX IF NOT EXISTS idx_manager_notifications_dedupe
  ON manager_notifications (recipient_user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_manager_notifications_entity
  ON manager_notifications (company_id, entity_type, entity_id)
  WHERE entity_type IS NOT NULL;

COMMENT ON TABLE manager_notifications IS
  'In-app inbox for company managers (hr/direction/admin with company_id). Generic event types; fan-out per user on the RH team.';

INSERT INTO schema_migrations (name) VALUES ('024_manager_notifications_generic.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('024_manager_notifications_generic.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 024_manager_notifications_generic.sql =====

-- ===== BEGIN 025_perf_indexes_notifications_email.sql =====
-- 025: DBA — upsert email unique + fan-out / deadline indexes
-- Safe to re-run (IF NOT EXISTS).

-- Paridade com scripts/rds-bootstrap-completo.sql (ON CONFLICT company_id, LOWER(email))
UPDATE candidates SET email = NULL WHERE email = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_company_email_lower_unique
  ON candidates (company_id, LOWER(email))
  WHERE email IS NOT NULL;

-- Cron deadline + overview: open vacancies with target_date
CREATE INDEX IF NOT EXISTS idx_vacancies_open_target_date
  ON vacancies (target_date)
  WHERE deleted = FALSE AND status = 'open' AND target_date IS NOT NULL;

-- notifyCompanyManagers: list managers by company
CREATE INDEX IF NOT EXISTS idx_users_company_active_managers
  ON users (company_id)
  WHERE deleted = FALSE AND active = TRUE AND role IN ('hr', 'direction', 'admin');

INSERT INTO schema_migrations (name) VALUES ('025_perf_indexes_notifications_email.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('025_perf_indexes_notifications_email.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 025_perf_indexes_notifications_email.sql =====

-- ===== BEGIN 026_user_capability_overrides.sql =====
-- 026: per-user capability overrides (module views)
-- Empty rows for a user ⇒ role defaults (etapa 1–2 behavior).
-- Rows present ⇒ whitelist of assignable module capabilities (granted=TRUE).
-- Does NOT affect public assessment tokens (/t, /v, AE invites, vacancy_links).

CREATE TABLE IF NOT EXISTS user_capability_overrides (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  granted    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_user_capability_overrides_user
  ON user_capability_overrides (user_id);

INSERT INTO schema_migrations (name) VALUES ('026_user_capability_overrides.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('026_user_capability_overrides.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 026_user_capability_overrides.sql =====

-- ===== BEGIN 027_manager_notifications_retention.sql =====
-- 027: index for notification retention purge (DELETE by created_at)

CREATE INDEX IF NOT EXISTS idx_manager_notifications_created_at
  ON manager_notifications (created_at ASC);

COMMENT ON INDEX idx_manager_notifications_created_at IS
  'Supports batched retention DELETE of old manager_notifications.';

INSERT INTO schema_migrations (name) VALUES ('027_manager_notifications_retention.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('027_manager_notifications_retention.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 027_manager_notifications_retention.sql =====

-- ===== BEGIN 028_vacancy_client_report_show_salary.sql =====
-- 028: flag por vaga — exibir pretensão salarial no relatório do cliente (/r)
-- Default FALSE: modelo outsourcing/consultoria não vaza pretensão do profissional ao cliente final.

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS client_report_show_salary BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN vacancies.client_report_show_salary IS
  'Se TRUE, o relatório público /r inclui pretensão salarial do candidato. FALSE = omitir (padrão, típico de outsourcing).';

INSERT INTO schema_migrations (name) VALUES ('028_vacancy_client_report_show_salary.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 028_vacancy_client_report_show_salary.sql =====

-- ===== BEGIN 029_vacancy_employment_type_user_temp_password.sql =====
-- Formato de contratação na vaga + flag de troca de senha no 1º acesso
ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS employment_type TEXT;

COMMENT ON COLUMN vacancies.employment_type IS
  'internship | clt | pj | cooperative | NULL';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.must_change_password IS
  'TRUE após criação com senha temporária — obriga troca no próximo login.';

INSERT INTO schema_migrations (name) VALUES ('029_vacancy_employment_type_user_temp_password.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 029_vacancy_employment_type_user_temp_password.sql =====

-- ===== BEGIN 030_company_profile_public_vacancy_page.sql =====
-- 030: perfil público da empresa + página indexável da vaga (/vaga/…)
-- URL estável por slug (não o token /v que expira) para SEO / Google for Jobs / crawlers de IA.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS about_html TEXT;

COMMENT ON COLUMN companies.website IS
  'URL do site institucional (https://…). Usada no hiringOrganization do JobPosting quando a vaga permite.';
COMMENT ON COLUMN companies.about_html IS
  'Texto institucional em HTML sanitizado para a página pública da vaga (quando public_show_company_info).';

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS public_page_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_allow_index BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_show_company_info BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_show_salary BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN vacancies.public_page_enabled IS
  'Se TRUE, a página pública /vaga/{companySlug}/{vacancySlug} fica acessível.';
COMMENT ON COLUMN vacancies.public_allow_index IS
  'Se TRUE (e página habilitada + vaga open), robots index/follow + JSON-LD JobPosting para buscadores/IA.';
COMMENT ON COLUMN vacancies.public_show_company_info IS
  'Se TRUE, a página pública exibe nome/site/sobre da empresa.';
COMMENT ON COLUMN vacancies.public_show_salary IS
  'Se TRUE, a página pública exibe a faixa salarial da vaga (não pretensão do candidato).';

-- Lookup estável company.slug + vacancy.slug (soft-delete filtrado na query)
CREATE INDEX IF NOT EXISTS idx_vacancies_company_slug_public
  ON vacancies (company_id, LOWER(slug))
  WHERE deleted = FALSE AND public_page_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_vacancies_public_open_created
  ON vacancies (created_at DESC)
  WHERE deleted = FALSE
    AND public_page_enabled = TRUE
    AND public_allow_index = TRUE
    AND status = 'open';

INSERT INTO schema_migrations (name) VALUES ('030_company_profile_public_vacancy_page.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 030_company_profile_public_vacancy_page.sql =====

-- ===== BEGIN 031_vacancy_public_allow_index_default.sql =====
-- 031: indexação pública da vaga ligada por padrão em novas vagas
-- (página pública ainda precisa de public_page_enabled = TRUE)

ALTER TABLE vacancies
  ALTER COLUMN public_allow_index SET DEFAULT TRUE;

COMMENT ON COLUMN vacancies.public_allow_index IS
  'Se TRUE (e página habilitada + vaga open), robots index/follow + JSON-LD JobPosting para buscadores/IA. Default TRUE em novas vagas; o gestor pode desligar.';

INSERT INTO schema_migrations (name) VALUES ('031_vacancy_public_allow_index_default.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 031_vacancy_public_allow_index_default.sql =====

-- ===== BEGIN 032_job_funnel_attribution.sql =====
-- 032 — atribuição UTM + eventos de funil de vagas públicas
-- Sem IP / PII nos eventos. Detalhe fino no assessment; candidates.source continua enum grosso.

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS attr_source TEXT,
  ADD COLUMN IF NOT EXISTS attr_medium TEXT,
  ADD COLUMN IF NOT EXISTS attr_campaign TEXT,
  ADD COLUMN IF NOT EXISTS attr_content TEXT,
  ADD COLUMN IF NOT EXISTS attr_term TEXT,
  ADD COLUMN IF NOT EXISTS attr_ref TEXT,
  ADD COLUMN IF NOT EXISTS attr_landing TEXT,
  ADD COLUMN IF NOT EXISTS attr_session_id TEXT;

COMMENT ON COLUMN assessments.attr_source IS 'utm_source na candidatura (sem PII)';
COMMENT ON COLUMN assessments.attr_medium IS 'utm_medium';
COMMENT ON COLUMN assessments.attr_campaign IS 'utm_campaign';
COMMENT ON COLUMN assessments.attr_content IS 'utm_content';
COMMENT ON COLUMN assessments.attr_term IS 'utm_term';
COMMENT ON COLUMN assessments.attr_ref IS 'Código referral ?ref=';
COMMENT ON COLUMN assessments.attr_landing IS 'Path de landing (ex. /vagas/…)';
COMMENT ON COLUMN assessments.attr_session_id IS 'Session id first-party (cookie), não PII';

CREATE TABLE IF NOT EXISTS job_funnel_events (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  vacancy_id BIGINT NOT NULL REFERENCES vacancies(id),
  candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  session_id TEXT,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  referral_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT job_funnel_events_type_check CHECK (
    event_type IN (
      'job_view',
      'apply_start',
      'apply_complete',
      'screening',
      'interview',
      'hired',
      'rejected'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_job_funnel_vacancy_created
  ON job_funnel_events (vacancy_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_funnel_company_type_created
  ON job_funnel_events (company_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_funnel_source
  ON job_funnel_events (vacancy_id, source)
  WHERE source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_funnel_session_view
  ON job_funnel_events (vacancy_id, session_id, event_type)
  WHERE event_type = 'job_view';

COMMENT ON TABLE job_funnel_events IS
  'Funil público da vaga (view → apply → pipeline). Sem IP; session_id opaco.';

INSERT INTO schema_migrations (name) VALUES ('032_job_funnel_attribution.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 032_job_funnel_attribution.sql =====

-- ===== BEGIN 033_referral_codes.sql =====
-- 033 — códigos de referral (?ref=) para vagas / empresa

CREATE TABLE IF NOT EXISTS referral_codes (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  vacancy_id BIGINT REFERENCES vacancies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  owner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  owner_candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referral_codes_code_format CHECK (
    char_length(code) BETWEEN 2 AND 64
    AND code ~ '^[A-Z0-9][A-Z0-9_-]*$'
  )
);

-- Código único global (lookup por ?ref= sem ambiguidade)
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_codes_code_lower
  ON referral_codes (LOWER(code));

CREATE INDEX IF NOT EXISTS idx_referral_codes_company_active
  ON referral_codes (company_id, active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_codes_vacancy
  ON referral_codes (vacancy_id)
  WHERE vacancy_id IS NOT NULL;

COMMENT ON TABLE referral_codes IS
  'Códigos ?ref= gerenciados. vacancy_id NULL = escopo empresa. Sem PII no código.';
COMMENT ON COLUMN referral_codes.code IS 'Código normalizado (A-Z0-9_-) único no sistema';
COMMENT ON COLUMN referral_codes.vacancy_id IS 'NULL = vale para qualquer vaga pública da empresa';

INSERT INTO schema_migrations (name) VALUES ('033_referral_codes.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 033_referral_codes.sql =====

-- ===== BEGIN 034_session_security.sql =====
-- 034: sessão revogável + expiração de convite Enneagrama por e-mail.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN users.session_version IS
  'Incrementado em logout, troca de senha, desativação ou mudança sensível — invalida JWTs antigos (claim sv).';

ALTER TABLE candidate_invites
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Convites existentes: 30 dias a partir do envio (ou agora se sent_at nulo).
UPDATE candidate_invites
SET expires_at = COALESCE(sent_at, NOW()) + INTERVAL '30 days'
WHERE expires_at IS NULL;

ALTER TABLE candidate_invites
  ALTER COLUMN expires_at SET NOT NULL;

ALTER TABLE candidate_invites
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '30 days');

CREATE INDEX IF NOT EXISTS idx_candidate_invites_expires
  ON candidate_invites (expires_at)
  WHERE status IN ('sent', 'opened');

INSERT INTO schema_migrations (name) VALUES ('034_session_security.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('034_session_security.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 034_session_security.sql =====

-- ===== BEGIN 035_job_alerts.sql =====
-- 035: job alerts (avisos de novas vagas por e-mail).

CREATE TABLE IF NOT EXISTS job_alerts (
  id                  BIGSERIAL PRIMARY KEY,
  email               TEXT NOT NULL,
  name                TEXT,
  filters             JSONB NOT NULL DEFAULT '{}'::jsonb,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribe_token   TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_alerts_email_lower
  ON job_alerts (LOWER(email));

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_alerts_unsubscribe_token
  ON job_alerts (unsubscribe_token);

CREATE INDEX IF NOT EXISTS idx_job_alerts_active_created
  ON job_alerts (active, created_at DESC)
  WHERE active = TRUE;

INSERT INTO schema_migrations (name) VALUES ('035_job_alerts.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('035_job_alerts.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 035_job_alerts.sql =====

-- ===== BEGIN 036_company_public_profile.sql =====
-- 036: perfil público da empresa (opt-in). Default OFF na criação.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS public_profile_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN companies.public_profile_enabled IS
  'Se TRUE, /c/{slug} fica acessível (vagas públicas da empresa). Default FALSE na criação. Prefixo neutro (não /empresas).';

CREATE INDEX IF NOT EXISTS idx_companies_public_profile_slug
  ON companies (LOWER(slug))
  WHERE deleted = FALSE AND active = TRUE AND public_profile_enabled = TRUE;

INSERT INTO schema_migrations (name) VALUES ('036_company_public_profile.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('036_company_public_profile.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 036_company_public_profile.sql =====

-- ===== BEGIN 037_vacancy_workplace.sql =====
-- Local / modalidade da vaga (base para agregadores SEO futuros — B-119)
ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS workplace_modality TEXT,
  ADD COLUMN IF NOT EXISTS workplace_city TEXT,
  ADD COLUMN IF NOT EXISTS workplace_state TEXT;

COMMENT ON COLUMN vacancies.workplace_modality IS
  'onsite | hybrid | remote | NULL';
COMMENT ON COLUMN vacancies.workplace_city IS
  'Cidade do local de trabalho (texto livre; opcional se remote)';
COMMENT ON COLUMN vacancies.workplace_state IS
  'UF brasileira (2 letras) do local; opcional';

CREATE INDEX IF NOT EXISTS idx_vacancies_public_workplace_modality
  ON vacancies (workplace_modality)
  WHERE deleted = FALSE
    AND public_page_enabled = TRUE
    AND status = 'open'
    AND workplace_modality IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vacancies_public_workplace_city
  ON vacancies (LOWER(workplace_city))
  WHERE deleted = FALSE
    AND public_page_enabled = TRUE
    AND status = 'open'
    AND workplace_city IS NOT NULL
    AND btrim(workplace_city) <> '';

INSERT INTO schema_migrations (name) VALUES ('037_vacancy_workplace.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 037_vacancy_workplace.sql =====

-- ===== BEGIN 038_user_password_setup_invite.sql =====
-- Convite para definir senha (sem senha temporária no e-mail)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_setup_token TEXT,
  ADD COLUMN IF NOT EXISTS password_setup_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN users.password_setup_token IS
  'Token de uso único para /a/set-password; NULL = senha já definida';
COMMENT ON COLUMN users.password_setup_expires_at IS
  'Validade do token de convite de senha (padrão 72h)';

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_password_setup_token
  ON users (password_setup_token)
  WHERE password_setup_token IS NOT NULL;

INSERT INTO schema_migrations (name) VALUES ('038_user_password_setup_invite.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 038_user_password_setup_invite.sql =====

-- ===== BEGIN 039_company_logo.sql =====
-- 039: logo da empresa (referência S3; arquivo fora do Postgres).

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_key TEXT;

COMMENT ON COLUMN companies.logo_url IS
  'URL pública https do logo (CDN/S3). Usado em /c, /j e JobPosting.hiringOrganization.logo.';
COMMENT ON COLUMN companies.logo_key IS
  'Object key no bucket S3 (companies/{id}/{uuid}.ext ou com S3_KEY_PREFIX). NULL se sem logo ou só URL legada.';

INSERT INTO schema_migrations (name) VALUES ('039_company_logo.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('039_company_logo.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 039_company_logo.sql =====

-- ===== BEGIN 040_team_groups.sql =====
-- 040: grupos salvos (squads) na aba Grupos — núcleo por empresa.

CREATE TABLE IF NOT EXISTS team_groups (
  id                     BIGSERIAL PRIMARY KEY,
  company_id             BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  base_assessment_id     BIGINT REFERENCES assessments(id) ON DELETE SET NULL,
  member_assessment_ids  BIGINT[] NOT NULL DEFAULT '{}',
  created_by_user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  deleted                BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_groups_name_len CHECK (char_length(btrim(name)) >= 1 AND char_length(name) <= 120),
  CONSTRAINT team_groups_members_cap CHECK (cardinality(member_assessment_ids) <= 40)
);

CREATE INDEX IF NOT EXISTS idx_team_groups_company_updated
  ON team_groups (company_id, updated_at DESC)
  WHERE deleted = FALSE;

COMMENT ON TABLE team_groups IS
  'Saved Group tab squads (base + members by assessment_id). Soft-deleted via deleted=TRUE.';

INSERT INTO schema_migrations (name) VALUES ('040_team_groups.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('040_team_groups.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 040_team_groups.sql =====

-- ===== BEGIN 041_interview_scorecards.sql =====
-- 041 — interview scorecards (B-407): structured 1–5 ratings vs briefing questions
CREATE TABLE IF NOT EXISTS interview_scorecards (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  vacancy_id BIGINT NOT NULL REFERENCES vacancies(id),
  candidate_id BIGINT NOT NULL REFERENCES candidates(id),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_user_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vacancy_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_scorecards_company
  ON interview_scorecards (company_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_interview_scorecards_candidate
  ON interview_scorecards (candidate_id, vacancy_id);

INSERT INTO schema_migrations (name) VALUES ('041_interview_scorecards.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 041_interview_scorecards.sql =====

-- ===== BEGIN 042_pdi_and_climate.sql =====
-- 042 — PDI (development plans) + pesquisa de clima (estrutura inicial, epic B-500)
-- Pessoa = candidates (company_id + e-mail). Respostas de clima são anônimas (sem candidate_id).

CREATE TABLE IF NOT EXISTS development_plans (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  objective            TEXT NOT NULL DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'draft',
  period_start         DATE,
  period_end           DATE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT development_plans_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 200),
  CONSTRAINT development_plans_objective_len CHECK (char_length(objective) <= 4000),
  CONSTRAINT development_plans_status_chk CHECK (status IN ('draft', 'active', 'completed', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_development_plans_candidate
  ON development_plans (candidate_id, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_development_plans_company
  ON development_plans (company_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS development_plan_items (
  id                   BIGSERIAL PRIMARY KEY,
  plan_id              BIGINT NOT NULL REFERENCES development_plans(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  notes                TEXT NOT NULL DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'todo',
  source               TEXT NOT NULL DEFAULT 'manual',
  sort_order           INT NOT NULL DEFAULT 0,
  due_date             DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT development_plan_items_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 300),
  CONSTRAINT development_plan_items_notes_len CHECK (char_length(notes) <= 4000),
  CONSTRAINT development_plan_items_status_chk CHECK (status IN ('todo', 'doing', 'done')),
  CONSTRAINT development_plan_items_source_chk CHECK (source IN ('manual', 'synthesis'))
);

CREATE INDEX IF NOT EXISTS idx_development_plan_items_plan
  ON development_plan_items (plan_id, sort_order ASC, id ASC);

-- Campanhas de clima (empresa). Respostas anônimas via token de convite.
CREATE TABLE IF NOT EXISTS climate_surveys (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'draft',
  opens_at             TIMESTAMPTZ,
  closes_at            TIMESTAMPTZ,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  deleted              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT climate_surveys_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 200),
  CONSTRAINT climate_surveys_description_len CHECK (char_length(description) <= 4000),
  CONSTRAINT climate_surveys_status_chk CHECK (status IN ('draft', 'open', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_climate_surveys_company
  ON climate_surveys (company_id, updated_at DESC)
  WHERE deleted = FALSE;

CREATE TABLE IF NOT EXISTS climate_survey_questions (
  id                   BIGSERIAL PRIMARY KEY,
  survey_id            BIGINT NOT NULL REFERENCES climate_surveys(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  prompt               TEXT NOT NULL,
  sort_order           INT NOT NULL DEFAULT 0,
  scale_min            SMALLINT NOT NULL DEFAULT 1,
  scale_max            SMALLINT NOT NULL DEFAULT 5,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT climate_survey_questions_prompt_len CHECK (char_length(btrim(prompt)) >= 1 AND char_length(prompt) <= 500),
  CONSTRAINT climate_survey_questions_scale_chk CHECK (scale_min >= 1 AND scale_max <= 10 AND scale_min < scale_max)
);

CREATE INDEX IF NOT EXISTS idx_climate_survey_questions_survey
  ON climate_survey_questions (survey_id, sort_order ASC, id ASC)
  WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS climate_survey_invites (
  id                   BIGSERIAL PRIMARY KEY,
  survey_id            BIGINT NOT NULL REFERENCES climate_surveys(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token                TEXT NOT NULL UNIQUE,
  expires_at           TIMESTAMPTZ NOT NULL,
  used_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT climate_survey_invites_token_len CHECK (char_length(token) >= 16 AND char_length(token) <= 128)
);

CREATE INDEX IF NOT EXISTS idx_climate_survey_invites_survey
  ON climate_survey_invites (survey_id, created_at DESC);

CREATE TABLE IF NOT EXISTS climate_survey_responses (
  id                   BIGSERIAL PRIMARY KEY,
  survey_id            BIGINT NOT NULL REFERENCES climate_surveys(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invite_id            BIGINT REFERENCES climate_survey_invites(id) ON DELETE SET NULL,
  answers              JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT climate_survey_responses_invite_unique UNIQUE (invite_id)
);

CREATE INDEX IF NOT EXISTS idx_climate_survey_responses_survey
  ON climate_survey_responses (survey_id, submitted_at DESC);

COMMENT ON TABLE development_plans IS
  'PDI — plano de desenvolvimento por pessoa (candidate_id).';
COMMENT ON TABLE climate_surveys IS
  'Pesquisa de clima — campanha por empresa; respostas anônimas (sem candidate_id).';

INSERT INTO schema_migrations (name) VALUES ('042_pdi_and_climate.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('042_pdi_and_climate.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 042_pdi_and_climate.sql =====

-- ===== BEGIN 043_pdi_item_one_on_one.sql =====
-- 043 — B-502: PDI item may link to a 1:1 (same candidate/company).
ALTER TABLE development_plan_items
  ADD COLUMN IF NOT EXISTS one_on_one_id BIGINT REFERENCES one_on_ones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_development_plan_items_oo
  ON development_plan_items (one_on_one_id)
  WHERE one_on_one_id IS NOT NULL;

COMMENT ON COLUMN development_plan_items.one_on_one_id IS
  'Optional link to a 1:1 record for follow-up (B-502).';

INSERT INTO schema_migrations (name) VALUES ('043_pdi_item_one_on_one.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('043_pdi_item_one_on_one.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 043_pdi_item_one_on_one.sql =====

-- ===== BEGIN 044_pdi_cycle_and_retention_action.sql =====
-- 044 — B-600 A/B: PDI ciclo (owner) + fontes one_on_one/retention; follow-up de retenção

ALTER TABLE development_plan_items
  ADD COLUMN IF NOT EXISTS owner_label TEXT NOT NULL DEFAULT '';

ALTER TABLE development_plan_items
  DROP CONSTRAINT IF EXISTS development_plan_items_owner_label_len;
ALTER TABLE development_plan_items
  ADD CONSTRAINT development_plan_items_owner_label_len
  CHECK (char_length(owner_label) <= 120);

ALTER TABLE development_plan_items
  DROP CONSTRAINT IF EXISTS development_plan_items_source_chk;

ALTER TABLE development_plan_items
  ADD CONSTRAINT development_plan_items_source_chk
  CHECK (source IN ('manual', 'synthesis', 'one_on_one', 'retention'));

COMMENT ON COLUMN development_plan_items.owner_label IS
  'Free-text owner / responsible for the item (B-601).';
COMMENT ON COLUMN development_plan_items.source IS
  'manual | synthesis | one_on_one | retention (B-601/B-602).';

CREATE TABLE IF NOT EXISTS retention_followups (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  plan_id              BIGINT REFERENCES development_plans(id) ON DELETE SET NULL,
  signal_keys          TEXT[] NOT NULL DEFAULT '{}',
  explanation          TEXT NOT NULL DEFAULT '',
  suggested_question   TEXT NOT NULL DEFAULT '',
  review_due           DATE,
  reviewed_at          TIMESTAMPTZ,
  review_notes         TEXT NOT NULL DEFAULT '',
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT retention_followups_explanation_len CHECK (char_length(explanation) <= 2000),
  CONSTRAINT retention_followups_question_len CHECK (char_length(suggested_question) <= 1000),
  CONSTRAINT retention_followups_notes_len CHECK (char_length(review_notes) <= 4000)
);

CREATE INDEX IF NOT EXISTS idx_retention_followups_candidate
  ON retention_followups (candidate_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_retention_followups_company_review
  ON retention_followups (company_id, review_due ASC NULLS LAST)
  WHERE reviewed_at IS NULL;

COMMENT ON TABLE retention_followups IS
  'Retention watch → actionable follow-up (signal + question + plan + review). B-602.';

INSERT INTO schema_migrations (name) VALUES ('044_pdi_cycle_and_retention_action.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('044_pdi_cycle_and_retention_action.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 044_pdi_cycle_and_retention_action.sql =====

-- ===== BEGIN 045_team_pulse.sql =====
-- 045 — B-600 C: short contextual team pulse (scoped to saved team group)

CREATE TABLE IF NOT EXISTS team_pulses (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  team_group_id        BIGINT NOT NULL REFERENCES team_groups(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'draft',
  opens_at             TIMESTAMPTZ,
  closes_at            TIMESTAMPTZ,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  deleted              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_pulses_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 200),
  CONSTRAINT team_pulses_status_chk CHECK (status IN ('draft', 'open', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_team_pulses_group
  ON team_pulses (team_group_id, updated_at DESC)
  WHERE deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_team_pulses_company
  ON team_pulses (company_id, updated_at DESC)
  WHERE deleted = FALSE;

CREATE TABLE IF NOT EXISTS team_pulse_questions (
  id                   BIGSERIAL PRIMARY KEY,
  pulse_id             BIGINT NOT NULL REFERENCES team_pulses(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  prompt_key           TEXT NOT NULL,
  prompt               TEXT NOT NULL,
  sort_order           INT NOT NULL DEFAULT 0,
  scale_min            SMALLINT NOT NULL DEFAULT 1,
  scale_max            SMALLINT NOT NULL DEFAULT 5,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_pulse_questions_prompt_len CHECK (char_length(btrim(prompt)) >= 1 AND char_length(prompt) <= 500),
  CONSTRAINT team_pulse_questions_scale_chk CHECK (scale_min >= 1 AND scale_max <= 10 AND scale_min < scale_max)
);

CREATE INDEX IF NOT EXISTS idx_team_pulse_questions_pulse
  ON team_pulse_questions (pulse_id, sort_order ASC, id ASC)
  WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS team_pulse_invites (
  id                   BIGSERIAL PRIMARY KEY,
  pulse_id             BIGINT NOT NULL REFERENCES team_pulses(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token                TEXT NOT NULL UNIQUE,
  expires_at           TIMESTAMPTZ NOT NULL,
  used_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_pulse_invites_token_len CHECK (char_length(token) >= 16 AND char_length(token) <= 128)
);

CREATE INDEX IF NOT EXISTS idx_team_pulse_invites_pulse
  ON team_pulse_invites (pulse_id, created_at DESC);

CREATE TABLE IF NOT EXISTS team_pulse_responses (
  id                   BIGSERIAL PRIMARY KEY,
  pulse_id             BIGINT NOT NULL REFERENCES team_pulses(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invite_id            BIGINT REFERENCES team_pulse_invites(id) ON DELETE SET NULL,
  answers              JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_pulse_responses_invite_unique UNIQUE (invite_id)
);

CREATE INDEX IF NOT EXISTS idx_team_pulse_responses_pulse
  ON team_pulse_responses (pulse_id, submitted_at DESC);

COMMENT ON TABLE team_pulses IS
  'Short anonymous pulse scoped to a saved team group (B-603).';

INSERT INTO schema_migrations (name) VALUES ('045_team_pulse.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('045_team_pulse.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 045_team_pulse.sql =====

-- ===== BEGIN 046_employee_portal.sql =====
-- 046 — B-600 D: minimal employee view via token (no candidate account)

CREATE TABLE IF NOT EXISTS employee_portal_tokens (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  token                TEXT NOT NULL UNIQUE,
  expires_at           TIMESTAMPTZ NOT NULL,
  revoked_at           TIMESTAMPTZ,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at         TIMESTAMPTZ,
  CONSTRAINT employee_portal_tokens_token_len CHECK (char_length(token) >= 16 AND char_length(token) <= 128)
);

CREATE INDEX IF NOT EXISTS idx_employee_portal_candidate
  ON employee_portal_tokens (candidate_id, created_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_employee_portal_token_active
  ON employee_portal_tokens (token)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE employee_portal_tokens IS
  'Token link /e/{token} for hired people: PDI + 1:1 prep (no login). B-604.';

INSERT INTO schema_migrations (name) VALUES ('046_employee_portal.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('046_employee_portal.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 046_employee_portal.sql =====

-- ===== BEGIN 047_employee_portal_prep.sql =====
-- 047 — B-600 polish: employee portal prep flag + note to manager

ALTER TABLE employee_portal_tokens
  ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS note_to_manager TEXT NOT NULL DEFAULT '';

ALTER TABLE employee_portal_tokens
  DROP CONSTRAINT IF EXISTS employee_portal_tokens_note_len;
ALTER TABLE employee_portal_tokens
  ADD CONSTRAINT employee_portal_tokens_note_len
  CHECK (char_length(note_to_manager) <= 2000);

COMMENT ON COLUMN employee_portal_tokens.prepared_at IS
  'Employee marked 1:1 prep done on /e/{token} (B-604 polish).';
COMMENT ON COLUMN employee_portal_tokens.note_to_manager IS
  'Optional short note from employee to manager via token link.';

INSERT INTO schema_migrations (name) VALUES ('047_employee_portal_prep.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('047_employee_portal_prep.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 047_employee_portal_prep.sql =====

-- ===== BEGIN 048_pdi_overview_queue_indexes.sql =====
-- 048 — indexes for Overview PDI work queue (overdue / unlinked / no-plan)

CREATE INDEX IF NOT EXISTS idx_development_plan_items_company_due
  ON development_plan_items (company_id, due_date ASC, id ASC)
  WHERE status <> 'done' AND due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_development_plan_items_company_unlinked
  ON development_plan_items (company_id, updated_at DESC, id DESC)
  WHERE status <> 'done' AND one_on_one_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_company_employee
  ON candidates (company_id, full_name ASC NULLS LAST, id ASC)
  WHERE employment_status = 'employee';

COMMENT ON INDEX idx_development_plan_items_company_due IS
  'Overview PDI queue: overdue open items by company.';
COMMENT ON INDEX idx_development_plan_items_company_unlinked IS
  'Overview PDI queue: open items without 1:1 link.';
COMMENT ON INDEX idx_candidates_company_employee IS
  'Overview PDI queue: employees without active plan.';

INSERT INTO schema_migrations (name) VALUES ('048_pdi_overview_queue_indexes.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 048_pdi_overview_queue_indexes.sql =====

-- ===== BEGIN 049_onboarding_checkins.sql =====
-- 049 — B-701: check-ins leves de pós-hire (30/60/90) + fonte PDI onboarding

CREATE TABLE IF NOT EXISTS employee_onboarding_checkins (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  milestone_days       INT NOT NULL,
  due_date             DATE NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending',
  outcome              TEXT NOT NULL DEFAULT '',
  notes                TEXT NOT NULL DEFAULT '',
  completed_at         TIMESTAMPTZ,
  completed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_onboarding_checkins_milestone_chk
    CHECK (milestone_days IN (30, 60, 90)),
  CONSTRAINT employee_onboarding_checkins_status_chk
    CHECK (status IN ('pending', 'done', 'skipped')),
  CONSTRAINT employee_onboarding_checkins_outcome_chk
    CHECK (outcome IN ('', 'continue', 'develop', 'concern')),
  CONSTRAINT employee_onboarding_checkins_notes_len
    CHECK (char_length(notes) <= 4000),
  CONSTRAINT employee_onboarding_checkins_unique
    UNIQUE (candidate_id, milestone_days)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_checkins_company_due
  ON employee_onboarding_checkins (company_id, due_date ASC, id ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_onboarding_checkins_candidate
  ON employee_onboarding_checkins (candidate_id, milestone_days ASC);

COMMENT ON TABLE employee_onboarding_checkins IS
  'Light post-hire check-ins at 30/60/90 days from start_date (B-701). Not a full experience review suite.';

ALTER TABLE development_plan_items
  DROP CONSTRAINT IF EXISTS development_plan_items_source_chk;

ALTER TABLE development_plan_items
  ADD CONSTRAINT development_plan_items_source_chk
  CHECK (source IN ('manual', 'synthesis', 'one_on_one', 'retention', 'onboarding'));

COMMENT ON COLUMN development_plan_items.source IS
  'manual | synthesis | one_on_one | retention | onboarding (B-701).';

INSERT INTO schema_migrations (name) VALUES ('049_onboarding_checkins.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 049_onboarding_checkins.sql =====

-- ===== BEGIN 050_climate_text_questions.sql =====
-- 050 — Climate open-text (descriptive) questions + answers in JSONB

ALTER TABLE climate_survey_questions
  ADD COLUMN IF NOT EXISTS question_kind TEXT NOT NULL DEFAULT 'likert';

ALTER TABLE climate_survey_questions
  DROP CONSTRAINT IF EXISTS climate_survey_questions_kind_chk;
ALTER TABLE climate_survey_questions
  ADD CONSTRAINT climate_survey_questions_kind_chk
  CHECK (question_kind IN ('likert', 'text'));

COMMENT ON COLUMN climate_survey_questions.question_kind IS
  'likert (1–5 scale) | text (anonymous open answer). B-704.';

COMMENT ON COLUMN climate_survey_responses.answers IS
  'JSONB map questionId → number (likert) or string (text). No candidate_id.';

INSERT INTO schema_migrations (name) VALUES ('050_climate_text_questions.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 050_climate_text_questions.sql =====

-- ===== BEGIN 051_pre_onboarding_and_offer.sql =====
-- 051 — B-702 pre-onboarding checklist + B-703 minimal offer/acceptance

-- ── B-702 ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_pre_onboarding_items (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  item_key             TEXT NOT NULL,
  due_date             DATE NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending',
  notes                TEXT NOT NULL DEFAULT '',
  completed_at         TIMESTAMPTZ,
  completed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_pre_onboarding_item_key_chk
    CHECK (item_key IN ('welcome_kit', 'rh_onboarding_call', 'manager_onboarding')),
  CONSTRAINT employee_pre_onboarding_status_chk
    CHECK (status IN ('pending', 'done', 'skipped')),
  CONSTRAINT employee_pre_onboarding_notes_len
    CHECK (char_length(notes) <= 2000),
  CONSTRAINT employee_pre_onboarding_unique
    UNIQUE (candidate_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_pre_onboarding_company_due
  ON employee_pre_onboarding_items (company_id, due_date ASC, id ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_pre_onboarding_candidate
  ON employee_pre_onboarding_items (candidate_id, item_key ASC);

COMMENT ON TABLE employee_pre_onboarding_items IS
  'Day-1 checklist: welcome kit + access sheet, RH Meet, manager onboarding (B-702).';

-- ── B-703 ──────────────────────────────────────────────────────────────────
ALTER TABLE vacancy_candidates
  ADD COLUMN IF NOT EXISTS offer_salary TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS offer_start_date DATE,
  ADD COLUMN IF NOT EXISTS offer_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS offer_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_notes TEXT NOT NULL DEFAULT '';

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS offer_salary TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS offer_start_date DATE,
  ADD COLUMN IF NOT EXISTS offer_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS offer_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_notes TEXT NOT NULL DEFAULT '';

ALTER TABLE vacancy_candidates
  DROP CONSTRAINT IF EXISTS vacancy_candidates_offer_status_chk;
ALTER TABLE vacancy_candidates
  ADD CONSTRAINT vacancy_candidates_offer_status_chk
  CHECK (offer_status IN ('none', 'proposed', 'accepted', 'declined'));

ALTER TABLE assessments
  DROP CONSTRAINT IF EXISTS assessments_offer_status_chk;
ALTER TABLE assessments
  ADD CONSTRAINT assessments_offer_status_chk
  CHECK (offer_status IN ('none', 'proposed', 'accepted', 'declined'));

COMMENT ON COLUMN vacancy_candidates.offer_status IS
  'B-703 minimal proposal/acceptance: none|proposed|accepted|declined';
COMMENT ON COLUMN assessments.offer_status IS
  'B-703 minimal proposal/acceptance: none|proposed|accepted|declined';

INSERT INTO schema_migrations (name) VALUES ('051_pre_onboarding_and_offer.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 051_pre_onboarding_and_offer.sql =====

-- ===== BEGIN 051_self_service_signup.sql =====
-- Self-service signup: estado de ativação e metadata de origem

-- Estado de ativação do signup
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS signup_pending BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.signup_pending IS
  'TRUE = cadastro self-service aguardando confirmação de e-mail; FALSE = usuário já ativo ou criado por admin';

-- Metadata de origem do cadastro
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS signup_source TEXT,
  ADD COLUMN IF NOT EXISTS signup_metadata JSONB;

COMMENT ON COLUMN users.signup_source IS
  'early_access | paid | admin_invite | NULL (legado)';
COMMENT ON COLUMN users.signup_metadata IS
  'Dados do formulário de signup: { company_name, job_title, team_size, pain_points }';

-- Índice para buscar signups pendentes (admin pode listar/aprovar manualmente se quiser gate)
CREATE INDEX IF NOT EXISTS idx_users_signup_pending
  ON users (signup_pending)
  WHERE signup_pending = TRUE AND deleted = FALSE;

-- Companies auto-criadas no signup
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS signup_auto_created BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS signup_creator_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN companies.signup_auto_created IS
  'TRUE = empresa criada automaticamente no self-service signup';
COMMENT ON COLUMN companies.signup_creator_user_id IS
  'Usuário que cadastrou a empresa via signup (primeiro admin/direction da company)';

CREATE INDEX IF NOT EXISTS idx_companies_signup_auto
  ON companies (signup_auto_created)
  WHERE signup_auto_created = TRUE AND deleted = FALSE;

INSERT INTO schema_migrations (name) VALUES ('051_self_service_signup.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 051_self_service_signup.sql =====

-- ===== BEGIN 052_analytics_tracking.sql =====
-- Landing page analytics tracking

CREATE TABLE IF NOT EXISTS landing_analytics (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL, -- pageview | cta_click | signup_start | signup_complete | login
  session_id TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  user_agent TEXT,
  ip_hash TEXT, -- SHA256(IP) para LGPD
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE landing_analytics IS
  'Eventos da landpage e signup funnel para análise de conversão';
COMMENT ON COLUMN landing_analytics.event_type IS
  'Tipo de evento: pageview, cta_click, signup_start, signup_complete, login';
COMMENT ON COLUMN landing_analytics.ip_hash IS
  'SHA256(IP address) para LGPD - não armazena IP real';

CREATE INDEX IF NOT EXISTS idx_landing_analytics_created
  ON landing_analytics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_analytics_event
  ON landing_analytics (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_analytics_session
  ON landing_analytics (session_id)
  WHERE session_id IS NOT NULL;

INSERT INTO schema_migrations (name) VALUES ('052_analytics_tracking.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 052_analytics_tracking.sql =====

-- ===== BEGIN 052_motivators_dimension_colors.sql =====
-- P2 palette: sync Motivadores dimension colors to lib/ae/motivators-dimensions.js
-- (avoid brand violet / pipeline purple clash on reconhecimento + criatividade).
-- Idempotent; does not touch questions or attempts.

UPDATE ae_dimensions d
SET color = v.color
FROM (
  VALUES
    ('reconhecimento', '#9D174D'),
    ('financeiro', '#059669'),
    ('crescimento', '#2563eb'),
    ('desenvolvimento', '#0891b2'),
    ('autonomia', '#d97706'),
    ('flexibilidade', '#65a30d'),
    ('proposito', '#db2777'),
    ('relacionamentos', '#e11d48'),
    ('seguranca', '#4b5563'),
    ('lideranca', '#7c2d12'),
    ('desafio', '#ea580c'),
    ('criatividade', '#0e7490'),
    ('equilibrio', '#0d9488')
) AS v(key, color)
WHERE d.definition_id = (SELECT id FROM ae_definitions WHERE LOWER(slug) = 'motivators' LIMIT 1)
  AND LOWER(d.key) = LOWER(v.key)
  AND (d.color IS DISTINCT FROM v.color);

INSERT INTO schema_migrations (name) VALUES ('052_motivators_dimension_colors.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 052_motivators_dimension_colors.sql =====

-- ===== BEGIN 053_onboarding_wizard.sql =====
-- Onboarding wizard tracking

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN users.onboarding_completed IS
  'TRUE = usuário completou (ou pulou) o wizard de onboarding no dashboard';
COMMENT ON COLUMN users.onboarding_completed_at IS
  'Timestamp de quando o onboarding foi concluído';

CREATE INDEX IF NOT EXISTS idx_users_onboarding_pending
  ON users (onboarding_completed)
  WHERE onboarding_completed = FALSE AND deleted = FALSE AND active = TRUE;

INSERT INTO schema_migrations (name) VALUES ('053_onboarding_wizard.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 053_onboarding_wizard.sql =====

-- ===== BEGIN 054_hr_score.sql =====
-- HR Score: núcleo de inteligência comportamental (B-1001)
-- Consolida sinais existentes em score 0-100 + predições

CREATE TABLE IF NOT EXISTS hr_scores (
  id BIGSERIAL PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Score final 0-100
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  
  -- Breakdown por sinal (componentes do score)
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Estrutura esperada:
  -- {
  --   "profile": { "score": 85, "weight": 0.15 },
  --   "motivators": { "score": 72, "weight": 0.20 },
  --   "fit": { "score": 90, "weight": 0.15 },
  --   "pdi": { "score": 65, "weight": 0.20 },
  --   "checkins": { "score": 80, "weight": 0.15 },
  --   "climate": { "score": 75, "weight": 0.10 },
  --   "retention": { "score": 60, "weight": 0.05 }
  -- }
  
  -- Predições
  turnover_risk TEXT CHECK (turnover_risk IN ('low', 'medium', 'high')),
  turnover_reasons JSONB DEFAULT '[]'::jsonb,
  -- Array de strings: ["climate_low", "retention_watch", "pdi_delayed", etc]
  
  pdi_gap_areas JSONB DEFAULT '[]'::jsonb,
  -- Array de áreas sugeridas: [{"area": "leadership", "priority": "high"}, ...]
  
  -- Metadata
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Um score por pessoa
  UNIQUE(candidate_id)
);

COMMENT ON TABLE hr_scores IS
  'HR Score 0-100: consolidação de sinais comportamentais (T1-T9, Motivadores, Fit, PDI, check-ins, clima, retenção) + predições de risco e gaps';

COMMENT ON COLUMN hr_scores.score IS
  'Score consolidado 0-100: engajamento, aderência e potencial';

COMMENT ON COLUMN hr_scores.signals IS
  'Breakdown do score por sinal (JSONB): profile, motivators, fit, pdi, checkins, climate, retention';

COMMENT ON COLUMN hr_scores.turnover_risk IS
  'Predição de risco de saída: low, medium, high';

COMMENT ON COLUMN hr_scores.turnover_reasons IS
  'Razões do risco (array): climate_low, retention_watch, pdi_delayed, concern_checkins, etc';

COMMENT ON COLUMN hr_scores.pdi_gap_areas IS
  'Áreas de desenvolvimento sugeridas com prioridade';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_hr_scores_company ON hr_scores(company_id);

CREATE INDEX IF NOT EXISTS idx_hr_scores_score_desc ON hr_scores(company_id, score DESC);

CREATE INDEX IF NOT EXISTS idx_hr_scores_candidate ON hr_scores(candidate_id);

CREATE INDEX IF NOT EXISTS idx_hr_scores_risk ON hr_scores(company_id, turnover_risk)
  WHERE turnover_risk IN ('medium', 'high');

CREATE INDEX IF NOT EXISTS idx_hr_scores_calculated ON hr_scores(calculated_at DESC);

INSERT INTO schema_migrations (name) VALUES ('054_hr_score.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 054_hr_score.sql =====

-- ===== BEGIN 054_pre_onboarding_item_keys_align.sql =====
-- 054 — Align pre-onboarding item_key CHECK with app keys (welcome_kit…).
-- Prod may still have the original CHECK from 051 before keys were renamed in-place:
--   email_access | tools_access | equipment | d1_welcome
-- CREATE TABLE IF NOT EXISTS never refreshed that constraint.

ALTER TABLE employee_pre_onboarding_items
  DROP CONSTRAINT IF EXISTS employee_pre_onboarding_item_key_chk;

-- Drop obsolete keys; ensurePreOnboardingChecklist re-seeds the three current items.
DELETE FROM employee_pre_onboarding_items
WHERE item_key IN ('email_access', 'tools_access', 'equipment', 'd1_welcome');

ALTER TABLE employee_pre_onboarding_items
  ADD CONSTRAINT employee_pre_onboarding_item_key_chk
  CHECK (item_key IN ('welcome_kit', 'rh_onboarding_call', 'manager_onboarding'));

COMMENT ON CONSTRAINT employee_pre_onboarding_item_key_chk ON employee_pre_onboarding_items IS
  'B-702 keys: welcome_kit, rh_onboarding_call, manager_onboarding (aligned 054)';

INSERT INTO schema_migrations (name) VALUES ('054_pre_onboarding_item_keys_align.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 054_pre_onboarding_item_keys_align.sql =====

-- ===== BEGIN 055_job_roles.sql =====
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

INSERT INTO schema_migrations (name) VALUES ('055_job_roles.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 055_job_roles.sql =====

-- ===== BEGIN 055_onboarding_wizard_panel_users.sql =====
-- Wizard “Primeiros passos” é só para cohort /signup (early access).
-- Usuários do painel / legado ficaram com onboarding_completed = FALSE após 053
-- e viam o modal de early access por engano.

UPDATE users
SET
  onboarding_completed = TRUE,
  onboarding_completed_at = COALESCE(onboarding_completed_at, NOW())
WHERE deleted = FALSE
  AND onboarding_completed = FALSE
  AND signup_source IS NULL
  AND signup_metadata IS NULL
  AND signup_pending = FALSE;

COMMENT ON COLUMN users.onboarding_completed IS
  'TRUE = concluiu/pulou o wizard OU nunca precisou (painel/legado). FALSE só faz sentido para self-service /signup ainda sem wizard.';

INSERT INTO schema_migrations (name) VALUES ('055_onboarding_wizard_panel_users.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 055_onboarding_wizard_panel_users.sql =====

-- ===== BEGIN 056_performance_reviews.sql =====
-- 056 — Performance reviews + goals → PDI (B-1004, Epic B-1000)
-- Ciclo leve (gestor → colaborador; não 360). Metas no ciclo.
-- Gap/outcome `develop` gera item PDI automaticamente.

-- Ciclos de avaliação (company-wide)
CREATE TABLE IF NOT EXISTS performance_cycles (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'draft',
  period_start         DATE,
  period_end           DATE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT performance_cycles_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 200),
  CONSTRAINT performance_cycles_description_len CHECK (char_length(description) <= 4000),
  CONSTRAINT performance_cycles_status_chk CHECK (status IN ('draft', 'active', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_performance_cycles_company
  ON performance_cycles (company_id, status, updated_at DESC);

COMMENT ON TABLE performance_cycles IS
  'Ciclos de avaliação de desempenho (company-wide). Ciclo leve: gestor → colaborador, não 360.';

-- Metas de desempenho para um candidato em um ciclo
CREATE TABLE IF NOT EXISTS performance_goals (
  id                   BIGSERIAL PRIMARY KEY,
  cycle_id             BIGINT NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  weight               INT NOT NULL DEFAULT 100,
  sort_order           INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT performance_goals_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 300),
  CONSTRAINT performance_goals_description_len CHECK (char_length(description) <= 2000),
  CONSTRAINT performance_goals_weight_chk CHECK (weight >= 0 AND weight <= 100)
);

CREATE INDEX IF NOT EXISTS idx_performance_goals_cycle_candidate
  ON performance_goals (cycle_id, candidate_id, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_performance_goals_candidate
  ON performance_goals (candidate_id, cycle_id);

COMMENT ON TABLE performance_goals IS
  'Metas de desempenho para um candidato em um ciclo. Weight = peso da meta no ciclo (soma pode ser != 100).';

-- Avaliações de desempenho (review) por candidato em um ciclo
CREATE TABLE IF NOT EXISTS performance_reviews (
  id                   BIGSERIAL PRIMARY KEY,
  cycle_id             BIGINT NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  reviewer_user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  outcomes             JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_notes        TEXT NOT NULL DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'draft',
  submitted_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cycle_id, candidate_id),
  CONSTRAINT performance_reviews_overall_notes_len CHECK (char_length(overall_notes) <= 4000),
  CONSTRAINT performance_reviews_status_chk CHECK (status IN ('draft', 'submitted'))
);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_cycle
  ON performance_reviews (cycle_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_candidate
  ON performance_reviews (candidate_id, cycle_id);

COMMENT ON TABLE performance_reviews IS
  'Avaliação de desempenho de um candidato em um ciclo. outcomes = { "goalId": { "outcome": "met|exceeded|develop|not_met", "notes": "..." }, ... }';

COMMENT ON COLUMN performance_reviews.outcomes IS
  'JSONB: { "<goal_id>": { "outcome": "met|exceeded|develop|not_met", "notes": "..." }, ... }. Outcome "develop" gera item PDI automaticamente.';

-- Estender constraint de source em development_plan_items para incluir performance_review
ALTER TABLE development_plan_items
  DROP CONSTRAINT IF EXISTS development_plan_items_source_chk;

ALTER TABLE development_plan_items
  ADD CONSTRAINT development_plan_items_source_chk
  CHECK (source IN ('manual', 'synthesis', 'one_on_one', 'retention', 'onboarding', 'performance_review'));

COMMENT ON COLUMN development_plan_items.source IS
  'Origem do item PDI: manual | synthesis | one_on_one | retention | onboarding | performance_review. Auto-gerado quando outcome é "develop".';

-- Adicionar goal_id ao item PDI para rastrear origem de performance_review
ALTER TABLE development_plan_items
  ADD COLUMN IF NOT EXISTS performance_goal_id BIGINT REFERENCES performance_goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_development_plan_items_goal
  ON development_plan_items (performance_goal_id)
  WHERE performance_goal_id IS NOT NULL;

COMMENT ON COLUMN development_plan_items.performance_goal_id IS
  'FK para performance_goals quando source = "performance_review". Rastreia meta que originou o item PDI.';

INSERT INTO schema_migrations (name) VALUES ('056_performance_reviews.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 056_performance_reviews.sql =====

-- ===== BEGIN 057_succession_plans.sql =====
-- 057 — Plano de sucessão (B-1005, Epic B-1000)
-- Papéis críticos + sucessor(es) + prontidão. Reusa HR Score e leadership potential.

-- Papéis críticos da empresa (company-scoped)
CREATE TABLE IF NOT EXISTS critical_roles (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  area_key             TEXT,
  impact_level         TEXT NOT NULL DEFAULT 'high',
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT critical_roles_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 200),
  CONSTRAINT critical_roles_description_len CHECK (char_length(description) <= 2000),
  CONSTRAINT critical_roles_impact_chk CHECK (impact_level IN ('high', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_critical_roles_company
  ON critical_roles (company_id, active, updated_at DESC);

COMMENT ON TABLE critical_roles IS
  'Papéis críticos da empresa para planejamento de sucessão (company-scoped). Não é org chart completo.';

COMMENT ON COLUMN critical_roles.impact_level IS
  'high = importante; critical = essencial para operação';

-- Planos de sucessão (sucessor por papel crítico)
CREATE TABLE IF NOT EXISTS succession_plans (
  id                   BIGSERIAL PRIMARY KEY,
  critical_role_id     BIGINT NOT NULL REFERENCES critical_roles(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  successor_candidate_id BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  readiness            TEXT NOT NULL DEFAULT 'developing',
  notes                TEXT NOT NULL DEFAULT '',
  target_date          DATE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (critical_role_id, successor_candidate_id),
  CONSTRAINT succession_plans_notes_len CHECK (char_length(notes) <= 4000),
  CONSTRAINT succession_plans_readiness_chk CHECK (readiness IN ('not_ready', 'developing', 'ready', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_succession_plans_role
  ON succession_plans (critical_role_id, readiness, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_succession_plans_successor
  ON succession_plans (successor_candidate_id, company_id);

COMMENT ON TABLE succession_plans IS
  'Sucessores para papéis críticos + prontidão. Um papel pode ter vários sucessores.';

COMMENT ON COLUMN succession_plans.readiness IS
  'not_ready = não pronto; developing = desenvolvendo; ready = pronto em 6-12m; now = pronto agora';

COMMENT ON COLUMN succession_plans.notes IS
  'Notas de desenvolvimento, gaps, ações. Hedging: "tende a precisar de...".';

INSERT INTO schema_migrations (name) VALUES ('057_succession_plans.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 057_succession_plans.sql =====

-- ===== BEGIN 058_exit_analysis.sql =====
-- 058 — Exit analysis (B-1006, Epic B-1000)
-- Registro de saída (motivo + texto) + agregação motivos × tipo/área.
-- Insights: o que corrigir na seleção (M1) e gestão (M3/M4).

-- Registros de saída (alumni)
CREATE TABLE IF NOT EXISTS exit_records (
  id                   BIGSERIAL PRIMARY KEY,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  exit_date            DATE NOT NULL,
  exit_type            TEXT NOT NULL,
  exit_reason          TEXT NOT NULL,
  notes                TEXT NOT NULL DEFAULT '',
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_id),
  CONSTRAINT exit_records_type_chk CHECK (exit_type IN ('voluntary', 'involuntary', 'mutual')),
  CONSTRAINT exit_records_reason_chk CHECK (
    exit_reason IN (
      -- Voluntary
      'better_offer', 'career_growth', 'compensation', 'work_life_balance', 
      'relocation', 'personal', 'study', 'entrepreneurship',
      -- Involuntary
      'performance', 'conduct', 'restructuring', 'position_eliminated',
      -- Both
      'culture_fit', 'manager_relationship', 'lack_of_challenge', 'other'
    )
  ),
  CONSTRAINT exit_records_notes_len CHECK (char_length(notes) <= 4000)
);

CREATE INDEX IF NOT EXISTS idx_exit_records_company_date
  ON exit_records (company_id, exit_date DESC);

CREATE INDEX IF NOT EXISTS idx_exit_records_candidate
  ON exit_records (candidate_id);

COMMENT ON TABLE exit_records IS
  'Registros de saída de colaboradores (alumni). Um registro por candidato. Usado para análise demissional.';

COMMENT ON COLUMN exit_records.exit_type IS
  'voluntary = pediu demissão; involuntary = dispensado; mutual = acordo';

COMMENT ON COLUMN exit_records.exit_reason IS
  'Motivo principal da saída. Ver constraint para taxonomia completa.';

COMMENT ON COLUMN exit_records.notes IS
  'Notas de saída: contexto, feedback, o que poderia ser diferente. Hedging: "tende a ter deixado por...".';

-- Índice para agregar motivos × tipo T1-T9
CREATE INDEX IF NOT EXISTS idx_exit_records_analysis
  ON exit_records (company_id, exit_type, exit_reason);

COMMENT ON INDEX idx_exit_records_analysis IS
  'Agregação: motivos × tipo × área. Join com assessments.top_type e candidates para análise.';

INSERT INTO schema_migrations (name) VALUES ('058_exit_analysis.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 058_exit_analysis.sql =====

-- ===== BEGIN 059_learning_resources.sql =====
-- 059 — Learning resources (B-1008, Epic B-1000)
-- Catálogo leve de ações/trilhas de desenvolvimento. Sem LMS, sem player, sem SCORM.
-- PDI pode apontar para recursos do catálogo.

-- Catálogo de recursos de aprendizagem (company-scoped)
CREATE TABLE IF NOT EXISTS learning_resources (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  theme                TEXT,
  resource_type        TEXT NOT NULL DEFAULT 'course',
  url                  TEXT,
  duration_hours       INT,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT learning_resources_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 300),
  CONSTRAINT learning_resources_description_len CHECK (char_length(description) <= 2000),
  CONSTRAINT learning_resources_theme_len CHECK (theme IS NULL OR char_length(theme) <= 100),
  CONSTRAINT learning_resources_type_chk CHECK (resource_type IN ('course', 'article', 'video', 'book', 'workshop', 'mentoring', 'other')),
  CONSTRAINT learning_resources_duration_chk CHECK (duration_hours IS NULL OR (duration_hours >= 1 AND duration_hours <= 1000))
);

CREATE INDEX IF NOT EXISTS idx_learning_resources_company
  ON learning_resources (company_id, active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_resources_theme
  ON learning_resources (company_id, theme)
  WHERE active = TRUE AND theme IS NOT NULL;

COMMENT ON TABLE learning_resources IS
  'Catálogo leve de recursos de aprendizagem (ações/trilhas) que o PDI pode apontar. Sem LMS, sem player, sem SCORM.';

COMMENT ON COLUMN learning_resources.theme IS
  'Tema/área do recurso (ex: Liderança, Comunicação, Técnico). Livre, sem taxonomia rígida.';

COMMENT ON COLUMN learning_resources.resource_type IS
  'course | article | video | book | workshop | mentoring | other. Indicativo, não gera comportamento diferente.';

COMMENT ON COLUMN learning_resources.url IS
  'URL externa do recurso (plataforma de curso, artigo, etc.). Opcional.';

COMMENT ON COLUMN learning_resources.duration_hours IS
  'Duração estimada em horas (1-1000). Opcional, só para contexto no PDI.';

-- Opcional: link explícito entre PDI item e recurso (muitos-para-muitos)
-- Se preferir simplicidade, PDI pode só referenciar no texto/notes
CREATE TABLE IF NOT EXISTS development_plan_resource_links (
  id                   BIGSERIAL PRIMARY KEY,
  plan_item_id         BIGINT NOT NULL REFERENCES development_plan_items(id) ON DELETE CASCADE,
  resource_id          BIGINT NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_item_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_dev_plan_resource_links_item
  ON development_plan_resource_links (plan_item_id);

CREATE INDEX IF NOT EXISTS idx_dev_plan_resource_links_resource
  ON development_plan_resource_links (resource_id);

COMMENT ON TABLE development_plan_resource_links IS
  'Link opcional PDI item → recurso de aprendizagem. Permite sugerir ações concretas no plano.';

INSERT INTO schema_migrations (name) VALUES ('059_learning_resources.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 059_learning_resources.sql =====

-- ===== BEGIN 060_company_benefits.sql =====
-- 060 — Company benefits catalog (B-1009, Epic B-1000)
-- Lista de benefícios da empresa para contexto de retenção/oferta.
-- Sem adesão, sem desconto em folha, sem "clube" — apenas catálogo informativo.

-- Catálogo de benefícios da empresa (company-scoped)
CREATE TABLE IF NOT EXISTS company_benefits (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  category             TEXT,
  benefit_type         TEXT NOT NULL DEFAULT 'other',
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_benefits_name_len CHECK (char_length(btrim(name)) >= 1 AND char_length(name) <= 200),
  CONSTRAINT company_benefits_description_len CHECK (char_length(description) <= 2000),
  CONSTRAINT company_benefits_category_len CHECK (category IS NULL OR char_length(category) <= 100),
  CONSTRAINT company_benefits_type_chk CHECK (benefit_type IN (
    'health', 'dental', 'vision', 'life_insurance', 'retirement',
    'vacation', 'flexible_hours', 'remote_work', 'gym', 'meal_voucher',
    'transport_voucher', 'education', 'daycare', 'other'
  ))
);

CREATE INDEX IF NOT EXISTS idx_company_benefits_company
  ON company_benefits (company_id, active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_benefits_category
  ON company_benefits (company_id, category)
  WHERE active = TRUE AND category IS NOT NULL;

COMMENT ON TABLE company_benefits IS
  'Catálogo de benefícios da empresa para contexto de retenção/oferta. Sem adesão, sem folha, sem clube — apenas lista informativa.';

COMMENT ON COLUMN company_benefits.category IS
  'Categoria livre do benefício (ex: Saúde, Financeiro, Qualidade de Vida). Sem taxonomia rígida.';

COMMENT ON COLUMN company_benefits.benefit_type IS
  'Tipo indicativo: health | dental | vision | life_insurance | retirement | vacation | flexible_hours | remote_work | gym | meal_voucher | transport_voucher | education | daycare | other. Não gera comportamento diferente.';

COMMENT ON COLUMN company_benefits.active IS
  'TRUE = benefício ativo/oferecido; FALSE = descontinuado. Soft delete para histórico.';

INSERT INTO schema_migrations (name) VALUES ('060_company_benefits.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 060_company_benefits.sql =====

-- ===== BEGIN 061_performance_indexes.sql =====
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
  'CREATE INDEX IF NOT EXISTS idx_performance_reviews_cycle_employee ON performance_reviews (cycle_id, candidate_id)',
  ARRAY['cycle_id', 'candidate_id']
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

INSERT INTO schema_migrations (name) VALUES ('061_performance_indexes.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 061_performance_indexes.sql =====

-- ===== BEGIN 062_benefit_categories.sql =====
-- 062 — Benefit categories catalog (company-scoped) + FK on company_benefits
-- Substitui category TEXT livre por vínculo a benefit_categories.
-- Backfill: cria categorias a partir de textos distintos já usados.

CREATE TABLE IF NOT EXISTS benefit_categories (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT benefit_categories_name_len
    CHECK (char_length(btrim(name)) >= 1 AND char_length(name) <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_benefit_categories_company_name_lower
  ON benefit_categories (company_id, LOWER(btrim(name)));

CREATE INDEX IF NOT EXISTS idx_benefit_categories_company_active
  ON benefit_categories (company_id, active, updated_at DESC)
  WHERE active = TRUE;

COMMENT ON TABLE benefit_categories IS
  'Catálogo de categorias de benefícios por empresa. Benefícios apontam via category_id.';

ALTER TABLE company_benefits
  ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES benefit_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_company_benefits_category_id
  ON company_benefits (company_id, category_id)
  WHERE category_id IS NOT NULL AND active = TRUE;

COMMENT ON COLUMN company_benefits.category_id IS
  'FK opcional para benefit_categories. Preferir em vez de category TEXT legado.';

-- Backfill: uma categoria por (company_id, category text) distinta
INSERT INTO benefit_categories (company_id, name, active)
SELECT DISTINCT b.company_id, btrim(b.category), TRUE
FROM company_benefits b
WHERE b.category IS NOT NULL
  AND btrim(b.category) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM benefit_categories c
    WHERE c.company_id = b.company_id
      AND LOWER(btrim(c.name)) = LOWER(btrim(b.category))
  );

UPDATE company_benefits b
SET category_id = c.id
FROM benefit_categories c
WHERE b.category_id IS NULL
  AND b.category IS NOT NULL
  AND btrim(b.category) <> ''
  AND c.company_id = b.company_id
  AND LOWER(btrim(c.name)) = LOWER(btrim(b.category));

INSERT INTO schema_migrations (name) VALUES ('062_benefit_categories.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 062_benefit_categories.sql =====

-- ===== BEGIN 063_learning_theme_tags.sql =====
-- 063 — learning_resources.theme supports multiple tags (comma-separated)
-- UI shows chips; storage remains TEXT. Bumps length for several tags.

ALTER TABLE learning_resources
  DROP CONSTRAINT IF EXISTS learning_resources_theme_len;

ALTER TABLE learning_resources
  ADD CONSTRAINT learning_resources_theme_len
  CHECK (theme IS NULL OR char_length(theme) <= 400);

COMMENT ON COLUMN learning_resources.theme IS
  'Temas/tags do recurso, separados por vírgula (ex: "Liderança, Comunicação"). UI: chips; filtro casa um token.';

INSERT INTO schema_migrations (name) VALUES ('063_learning_theme_tags.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 063_learning_theme_tags.sql =====

-- ===== BEGIN 064_analytics_report_prefs.sql =====
-- 064: preferências de relatório Analytics agendado (B-1107 polish)
-- Por empresa: frequência, destinatários opcionais, anexo PDF.

CREATE TABLE IF NOT EXISTS company_analytics_report_prefs (
  company_id BIGINT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL DEFAULT 'weekly'
    CHECK (frequency IN ('weekly', 'monthly', 'off')),
  -- user ids da mesma empresa; vazio = direction + admin (default)
  recipient_user_ids BIGINT[] NOT NULL DEFAULT '{}',
  attach_pdf BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE company_analytics_report_prefs IS
  'B-1107: frequência/destinatários/PDF do relatório Analytics agendado por empresa';

CREATE INDEX IF NOT EXISTS idx_analytics_report_prefs_freq
  ON company_analytics_report_prefs (frequency)
  WHERE frequency <> 'off';

INSERT INTO schema_migrations (name) VALUES ('064_analytics_report_prefs.sql')
ON CONFLICT DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('064_analytics_report_prefs.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 064_analytics_report_prefs.sql =====

-- ===== BEGIN 065_expand_exit_benefit_enums.sql =====
-- 065: Expand closed taxonomies for exit reasons + benefit types (multi-segment).
-- Still enums (not company-cadastral). Categories of benefits remain per-tenant.

ALTER TABLE exit_records DROP CONSTRAINT IF EXISTS exit_records_reason_chk;
ALTER TABLE exit_records ADD CONSTRAINT exit_records_reason_chk CHECK (
  exit_reason IN (
    'better_offer', 'career_growth', 'compensation', 'benefits',
    'work_life_balance', 'burnout', 'workload',
    'relocation', 'commute', 'schedule',
    'personal', 'family_care', 'health',
    'study', 'public_exam', 'entrepreneurship',
    'performance', 'conduct', 'harassment',
    'restructuring', 'layoff', 'position_eliminated',
    'contract_end', 'seasonal_end', 'retirement',
    'culture_fit', 'manager_relationship', 'recognition',
    'lack_of_challenge', 'targets_pressure', 'client_pressure',
    'tools_process', 'other'
  )
);

COMMENT ON COLUMN exit_records.exit_reason IS
  'Closed taxonomy (multi-segment). Keys in lib/domain-status.js EXIT_REASON. Not company-editable.';

ALTER TABLE company_benefits DROP CONSTRAINT IF EXISTS company_benefits_type_chk;
ALTER TABLE company_benefits ADD CONSTRAINT company_benefits_type_chk CHECK (
  benefit_type IN (
    'health', 'dental', 'vision', 'mental_health', 'life_insurance',
    'retirement', 'profit_sharing', 'equity',
    'vacation', 'parental_leave', 'sabbatical',
    'flexible_hours', 'remote_work', 'home_office_allowance',
    'gym', 'wellness',
    'meal_voucher', 'food_basket', 'transport_voucher', 'parking', 'mobility', 'phone',
    'education', 'language', 'daycare', 'legal_aid', 'uniform', 'pet',
    'other'
  )
);

COMMENT ON COLUMN company_benefits.benefit_type IS
  'Closed indicative type (multi-segment). Keys in lib/domain-status.js BENEFIT_TYPE. Categories stay cadastral per company.';

INSERT INTO schema_migrations (name) VALUES ('065_expand_exit_benefit_enums.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 065_expand_exit_benefit_enums.sql =====

-- ===== BEGIN 066_birth_and_company_anniversary.sql =====
-- 066: Birth date (employee) + company institutional anniversary.
-- Work anniversary for people = candidates.start_date (already set on hire) — not a new column.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS birth_date DATE;

COMMENT ON COLUMN candidates.birth_date IS
  'Date of birth (nullable). Day/month used for Overview birthday card. Not hire/start date.';

CREATE INDEX IF NOT EXISTS idx_candidates_company_birth_md
  ON candidates (
    company_id,
    (EXTRACT(MONTH FROM birth_date)::smallint),
    (EXTRACT(DAY FROM birth_date)::smallint)
  )
  WHERE birth_date IS NOT NULL;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS anniversary_date DATE;

COMMENT ON COLUMN companies.anniversary_date IS
  'Company founding / institutional anniversary (nullable). Day/month for Overview chip.';

INSERT INTO schema_migrations (name) VALUES ('066_birth_and_company_anniversary.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 066_birth_and_company_anniversary.sql =====

-- ===== BEGIN 067_lms_basic.sql =====
-- 067: Basic LMS — courses, ordered lessons (URL), enrollments, lesson completions.
-- No quiz, certificate, SCORM, or native video player. Collaborator consumes via /e token.
-- Academy (learning_resources) remains the PDI catalog — separate from this module.

CREATE TABLE IF NOT EXISTS lms_courses (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  completion_pct       SMALLINT NOT NULL DEFAULT 100,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lms_courses_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 300),
  CONSTRAINT lms_courses_description_len CHECK (char_length(description) <= 8000),
  CONSTRAINT lms_courses_completion_pct_chk CHECK (completion_pct >= 1 AND completion_pct <= 100)
);

CREATE INDEX IF NOT EXISTS idx_lms_courses_company
  ON lms_courses (company_id, active, updated_at DESC);

COMMENT ON TABLE lms_courses IS
  'Basic LMS courses (company-scoped). Lessons are URLs; progress via enrollments.';

CREATE TABLE IF NOT EXISTS lms_lessons (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id            BIGINT NOT NULL REFERENCES lms_courses(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  content_url          TEXT NOT NULL,
  content_kind         TEXT NOT NULL DEFAULT 'link',
  sort_order           INT NOT NULL DEFAULT 0,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lms_lessons_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 300),
  CONSTRAINT lms_lessons_url_len CHECK (char_length(btrim(content_url)) >= 1 AND char_length(content_url) <= 2000),
  CONSTRAINT lms_lessons_kind_chk CHECK (content_kind IN ('link', 'youtube', 'vimeo', 'pdf')),
  CONSTRAINT lms_lessons_sort_chk CHECK (sort_order >= 0 AND sort_order <= 10000)
);

CREATE INDEX IF NOT EXISTS idx_lms_lessons_course
  ON lms_lessons (course_id, active, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_lms_lessons_company
  ON lms_lessons (company_id, course_id);

COMMENT ON TABLE lms_lessons IS
  'Ordered lessons for an LMS course. content_url = external link / YouTube / Vimeo / PDF URL (e.g. S3).';

CREATE TABLE IF NOT EXISTS lms_enrollments (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id            BIGINT NOT NULL REFERENCES lms_courses(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  enrolled_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  enrolled_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ,
  UNIQUE (course_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_lms_enrollments_company_course
  ON lms_enrollments (company_id, course_id, enrolled_at DESC);

CREATE INDEX IF NOT EXISTS idx_lms_enrollments_candidate
  ON lms_enrollments (company_id, candidate_id, enrolled_at DESC);

COMMENT ON TABLE lms_enrollments IS
  'RH enrolls employees (candidates) on LMS courses. completed_at set when progress >= course.completion_pct.';

CREATE TABLE IF NOT EXISTS lms_lesson_completions (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  enrollment_id        BIGINT NOT NULL REFERENCES lms_enrollments(id) ON DELETE CASCADE,
  lesson_id            BIGINT NOT NULL REFERENCES lms_lessons(id) ON DELETE CASCADE,
  completed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (enrollment_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lms_lesson_completions_enrollment
  ON lms_lesson_completions (enrollment_id);

CREATE INDEX IF NOT EXISTS idx_lms_lesson_completions_company
  ON lms_lesson_completions (company_id, lesson_id);

COMMENT ON TABLE lms_lesson_completions IS
  'Lesson marked done for an enrollment. Progress derived from active lessons on the course.';

INSERT INTO schema_migrations (name) VALUES ('067_lms_basic.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 067_lms_basic.sql =====

-- ===== BEGIN 068_lms_cohorts_due_pdi.sql =====
-- 068: LMS next cut — cohorts (turmas), due/mandatory on enrollments, PDI↔ course links.
-- Complements 067 basic LMS (courses, lessons, enrollments, completions).

CREATE TABLE IF NOT EXISTS lms_cohorts (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id            BIGINT NOT NULL REFERENCES lms_courses(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  due_date             DATE,
  mandatory            BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lms_cohorts_name_len CHECK (char_length(btrim(name)) >= 1 AND char_length(name) <= 200)
);

CREATE INDEX IF NOT EXISTS idx_lms_cohorts_course
  ON lms_cohorts (company_id, course_id, created_at DESC);

COMMENT ON TABLE lms_cohorts IS
  'Simple LMS cohorts (turmas): named group on a course with optional shared due_date / mandatory.';

ALTER TABLE lms_enrollments
  ADD COLUMN IF NOT EXISTS cohort_id BIGINT REFERENCES lms_cohorts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS mandatory BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_lms_enrollments_due
  ON lms_enrollments (company_id, due_date)
  WHERE due_date IS NOT NULL AND completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lms_enrollments_cohort
  ON lms_enrollments (cohort_id)
  WHERE cohort_id IS NOT NULL;

COMMENT ON COLUMN lms_enrollments.due_date IS
  'Complete-by date (nullable). Used for Overview overdue + cron notifs.';
COMMENT ON COLUMN lms_enrollments.mandatory IS
  'When true, overdue enrollments surface as attention signals.';

CREATE TABLE IF NOT EXISTS development_plan_lms_links (
  id                   BIGSERIAL PRIMARY KEY,
  plan_item_id         BIGINT NOT NULL REFERENCES development_plan_items(id) ON DELETE CASCADE,
  course_id            BIGINT NOT NULL REFERENCES lms_courses(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_item_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_dev_plan_lms_links_item
  ON development_plan_lms_links (plan_item_id);

CREATE INDEX IF NOT EXISTS idx_dev_plan_lms_links_course
  ON development_plan_lms_links (course_id);

COMMENT ON TABLE development_plan_lms_links IS
  'Optional PDI item → LMS course link (progress lives on lms_enrollments, not Academy catalog).';

INSERT INTO schema_migrations (name) VALUES ('068_lms_cohorts_due_pdi.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 068_lms_cohorts_due_pdi.sql =====

-- ===== BEGIN 069_employee_login.sql =====
-- 069: Collaborator (employee) passwordless session — magic-link tokens.
-- Identity remains candidates (employment_status = employee). Separate cookie from managers.
-- Does not create a users row or grant /dashboard access.

CREATE TABLE IF NOT EXISTS employee_login_tokens (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  token                TEXT NOT NULL,
  expires_at           TIMESTAMPTZ NOT NULL,
  used_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT employee_login_tokens_token_len CHECK (char_length(token) >= 20 AND char_length(token) <= 128)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_login_tokens_token
  ON employee_login_tokens (token)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_employee_login_tokens_candidate
  ON employee_login_tokens (company_id, candidate_id, created_at DESC);

COMMENT ON TABLE employee_login_tokens IS
  'One-time magic links for employee session (/employee). Not manager JWT.';

INSERT INTO schema_migrations (name) VALUES ('069_employee_login.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 069_employee_login.sql =====

-- ===== BEGIN 070_employee_password.sql =====
-- 070: Collaborator password on candidates (same UX as manager set-password invite).
-- Does NOT create a users row or grant /dashboard. Cookie remains team30_employee_session.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_setup_token TEXT,
  ADD COLUMN IF NOT EXISTS password_setup_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_invited_at TIMESTAMPTZ;

COMMENT ON COLUMN candidates.password_hash IS
  'bcrypt hash for /employee login; NULL until set-password invite completed';
COMMENT ON COLUMN candidates.password_setup_token IS
  'One-time token for /employee/set-password; NULL when unused or consumed';
COMMENT ON COLUMN candidates.password_setup_expires_at IS
  'Validity of password_setup_token (default 72h)';
COMMENT ON COLUMN candidates.access_invited_at IS
  'First (or last) manager invite to collaborator access';

CREATE UNIQUE INDEX IF NOT EXISTS uq_candidates_password_setup_token
  ON candidates (password_setup_token)
  WHERE password_setup_token IS NOT NULL;

INSERT INTO schema_migrations (name) VALUES ('070_employee_password.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 070_employee_password.sql =====

-- ===== BEGIN 071_candidate_notifications.sql =====
-- 071: Collaborator in-app notifications + preferred locale on candidates.
-- Separate from manager_notifications (recipient = candidate, not users).

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT;

COMMENT ON COLUMN candidates.preferred_locale IS
  'UI locale for /employee (pt-BR|en); cookie also set client-side';

CREATE TABLE IF NOT EXISTS candidate_notifications (
  id                       BIGSERIAL PRIMARY KEY,
  company_id               BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recipient_candidate_id   BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  type                     TEXT NOT NULL,
  payload                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  entity_type              TEXT,
  entity_id                BIGINT,
  dedupe_key               TEXT,
  read_at                  TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_notifications_recipient_created
  ON candidate_notifications (recipient_candidate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_candidate_notifications_recipient_unread
  ON candidate_notifications (recipient_candidate_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_notifications_dedupe
  ON candidate_notifications (recipient_candidate_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidate_notifications_company_created
  ON candidate_notifications (company_id, created_at DESC);

COMMENT ON TABLE candidate_notifications IS
  'In-app inbox for collaborators (/employee). Fan-out by candidate_id within company.';

INSERT INTO schema_migrations (name) VALUES ('071_candidate_notifications.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 071_candidate_notifications.sql =====

-- ===== BEGIN 072_employee_compensation.sql =====
-- 072: Internal compensation timeline (RH) — not payroll / holerite.

CREATE TABLE IF NOT EXISTS employee_compensation_events (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  event_type           TEXT NOT NULL,
  amount               TEXT NOT NULL,
  effective_date       DATE NOT NULL,
  notes                TEXT NOT NULL DEFAULT '',
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_compensation_events_type_chk
    CHECK (event_type IN ('hire', 'raise', 'adjustment', 'bonus', 'other')),
  CONSTRAINT employee_compensation_events_amount_len
    CHECK (char_length(amount) <= 80),
  CONSTRAINT employee_compensation_events_notes_len
    CHECK (char_length(notes) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_compensation_company_candidate_date
  ON employee_compensation_events (company_id, candidate_id, effective_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_compensation_candidate_date
  ON employee_compensation_events (candidate_id, effective_date DESC, id DESC);

COMMENT ON TABLE employee_compensation_events IS
  'Light internal compensation log (salary + adjustments). Not payroll, not visible to collaborator by default.';

INSERT INTO schema_migrations (name) VALUES ('072_employee_compensation.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('072_employee_compensation.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 072_employee_compensation.sql =====

-- ===== BEGIN 073_user_totp_2fa.sql =====
-- 2FA TOTP opcional para gestores (admin/direction/hr) — lib/manager-2fa.js.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMPTZ;

COMMENT ON COLUMN users.totp_secret IS 'Secret Base32 TOTP; preenchido no setup, limpo ao desativar 2FA';
COMMENT ON COLUMN users.totp_enabled_at IS 'Quando NULL, 2FA inativo; senão login exige código TOTP (admin/direction)';

INSERT INTO schema_migrations (name) VALUES ('073_user_totp_2fa.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 073_user_totp_2fa.sql =====

-- ===== BEGIN 074_candidate_totp_2fa.sql =====
-- 2FA TOTP opcional para colaboradores (candidates com employment_status = employee) — lib/employee-2fa.js.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMPTZ;

COMMENT ON COLUMN candidates.totp_secret IS 'Secret Base32 TOTP; preenchido no setup, limpo ao desativar 2FA';
COMMENT ON COLUMN candidates.totp_enabled_at IS 'Quando NULL, 2FA inativo; senão login exige código TOTP (colaborador)';

INSERT INTO schema_migrations (name) VALUES ('074_candidate_totp_2fa.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 074_candidate_totp_2fa.sql =====

-- ===== BEGIN 075_audit_log_enrich.sql =====
-- Enriquece audit_log: ator colaborador, tenant, contexto HTTP (lib/audit.js).

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS actor_kind TEXT NOT NULL DEFAULT 'manager',
  ADD COLUMN IF NOT EXISTS actor_candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS request_path TEXT,
  ADD COLUMN IF NOT EXISTS request_ip TEXT;

COMMENT ON COLUMN audit_log.actor_kind IS 'manager | employee | system | public';
COMMENT ON COLUMN audit_log.actor_candidate_id IS 'Colaborador quando actor_kind = employee';
COMMENT ON COLUMN audit_log.company_id IS 'Tenant quando aplicável; NULL = ação global';
COMMENT ON COLUMN audit_log.request_path IS 'Path da API/rota no momento do evento';
COMMENT ON COLUMN audit_log.request_ip IS 'IP do cliente (best-effort)';

CREATE INDEX IF NOT EXISTS idx_audit_log_company_created
  ON audit_log (company_id, created_at DESC)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_action_created
  ON audit_log (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_kind_created
  ON audit_log (actor_kind, created_at DESC);

INSERT INTO schema_migrations (name) VALUES ('075_audit_log_enrich.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 075_audit_log_enrich.sql =====

-- ===== BEGIN 076_employee_onboarding_journey.sql =====
-- Jornada de chegada visível ao colaborador: folha de acessos, link Meet, confirmação do colaborador.

ALTER TABLE employee_pre_onboarding_items
  DROP CONSTRAINT IF EXISTS employee_pre_onboarding_item_key_chk;

ALTER TABLE employee_pre_onboarding_items
  ADD CONSTRAINT employee_pre_onboarding_item_key_chk
  CHECK (item_key IN ('welcome_kit', 'access_sheet', 'rh_onboarding_call', 'manager_onboarding'));

ALTER TABLE employee_pre_onboarding_items
  ADD COLUMN IF NOT EXISTS meet_url TEXT,
  ADD COLUMN IF NOT EXISTS employee_ack_at TIMESTAMPTZ;

ALTER TABLE employee_onboarding_checkins
  ADD COLUMN IF NOT EXISTS meet_url TEXT,
  ADD COLUMN IF NOT EXISTS employee_ack_at TIMESTAMPTZ;

COMMENT ON COLUMN employee_pre_onboarding_items.meet_url IS 'Link Meet (calls RH/gestor); opcional';
COMMENT ON COLUMN employee_pre_onboarding_items.employee_ack_at IS 'Colaborador confirmou recebimento/ciente';
COMMENT ON COLUMN employee_onboarding_checkins.meet_url IS 'Link Meet do check-in D30/D60/D90';
COMMENT ON COLUMN employee_onboarding_checkins.employee_ack_at IS 'Colaborador confirmou presença/ciente';

INSERT INTO schema_migrations (name) VALUES ('076_employee_onboarding_journey.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 076_employee_onboarding_journey.sql =====

-- ===== BEGIN 077_employee_prep_surveys.sql =====
-- B-2501 — prep 1:1 na sessão colaborador + convites pessoais clima/pulso

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS one_on_one_prep_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS one_on_one_prep_note TEXT NOT NULL DEFAULT '';

ALTER TABLE candidates
  DROP CONSTRAINT IF EXISTS candidates_one_on_one_prep_note_len;
ALTER TABLE candidates
  ADD CONSTRAINT candidates_one_on_one_prep_note_len
  CHECK (char_length(one_on_one_prep_note) <= 2000);

COMMENT ON COLUMN candidates.one_on_one_prep_at IS
  'Colaborador marcou prep do próximo 1:1 em /employee (nota visível ao gestor na Equipe).';
COMMENT ON COLUMN candidates.one_on_one_prep_note IS
  'Nota opcional ao gestor sobre o próximo 1:1 (sessão autenticada).';

ALTER TABLE climate_survey_invites
  ADD COLUMN IF NOT EXISTS candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL;

ALTER TABLE team_pulse_invites
  ADD COLUMN IF NOT EXISTS candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_climate_invites_survey_candidate
  ON climate_survey_invites (survey_id, candidate_id)
  WHERE candidate_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_pulse_invites_pulse_candidate
  ON team_pulse_invites (pulse_id, candidate_id)
  WHERE candidate_id IS NOT NULL;

INSERT INTO schema_migrations (name) VALUES ('077_employee_prep_surveys.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 077_employee_prep_surveys.sql =====

-- ===== BEGIN 078_compensation_notes_rich.sql =====
-- Bump compensation event notes for rich text (same cap as onboarding check-ins).
ALTER TABLE employee_compensation_events
  DROP CONSTRAINT IF EXISTS employee_compensation_events_notes_len;

ALTER TABLE employee_compensation_events
  ADD CONSTRAINT employee_compensation_events_notes_len
    CHECK (char_length(notes) <= 4000);

INSERT INTO schema_migrations (name) VALUES ('078_compensation_notes_rich.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 078_compensation_notes_rich.sql =====

-- ===== BEGIN 079_candidates_name_trgm.sql =====
-- Migration 079: trigram index for employee name search (ILIKE %needle%).
-- Requires pg_trgm (usually available on RDS / local Postgres).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_candidates_full_name_trgm
  ON candidates USING gin (full_name gin_trgm_ops);

INSERT INTO schema_migrations (name) VALUES ('079_candidates_name_trgm.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 079_candidates_name_trgm.sql =====

-- ===== BEGIN 080_solides_gaps_2702_2707.sql =====
-- 080 — B-2702…B-2707: eNPS, 9Box data hooks, 180/360 side reviews,
-- experience outcomes, CV fields, interview slots.

-- B-2702: question_kind enps (0–10 classic)
ALTER TABLE climate_survey_questions
  DROP CONSTRAINT IF EXISTS climate_survey_questions_kind_chk;

ALTER TABLE climate_survey_questions
  ADD CONSTRAINT climate_survey_questions_kind_chk
  CHECK (question_kind IN ('likert', 'text', 'enps'));

COMMENT ON COLUMN climate_survey_questions.question_kind IS
  'likert | text | enps (0–10 → score −100…+100)';

-- B-2704: cycle flags + multi-rater side reviews (self/peer)
ALTER TABLE performance_cycles
  ADD COLUMN IF NOT EXISTS allow_self_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_peer_review BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN performance_cycles.allow_self_review IS
  'B-2704: enable self-assessment invites for the cycle';
COMMENT ON COLUMN performance_cycles.allow_peer_review IS
  'B-2704: enable peer assessment invites (token)';

CREATE TABLE IF NOT EXISTS performance_side_reviews (
  id                   BIGSERIAL PRIMARY KEY,
  cycle_id             BIGINT NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  role                 TEXT NOT NULL,
  reviewer_label       TEXT NOT NULL DEFAULT '',
  token                TEXT NOT NULL,
  outcomes             JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_notes        TEXT NOT NULL DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'pending',
  submitted_at         TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT performance_side_reviews_role_chk CHECK (role IN ('self', 'peer')),
  CONSTRAINT performance_side_reviews_status_chk CHECK (status IN ('pending', 'submitted', 'expired')),
  CONSTRAINT performance_side_reviews_token_len CHECK (char_length(token) >= 16 AND char_length(token) <= 128),
  CONSTRAINT performance_side_reviews_notes_len CHECK (char_length(overall_notes) <= 4000),
  CONSTRAINT performance_side_reviews_label_len CHECK (char_length(reviewer_label) <= 120)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_side_reviews_token
  ON performance_side_reviews (token);

CREATE INDEX IF NOT EXISTS idx_performance_side_reviews_cycle_candidate
  ON performance_side_reviews (cycle_id, candidate_id, role);

CREATE INDEX IF NOT EXISTS idx_performance_side_reviews_company
  ON performance_side_reviews (company_id, cycle_id, status);

COMMENT ON TABLE performance_side_reviews IS
  'B-2704: self/peer reviews via token; manager review stays in performance_reviews.';

-- B-2705: formal experience outcomes on check-ins
ALTER TABLE employee_onboarding_checkins
  DROP CONSTRAINT IF EXISTS employee_onboarding_checkins_outcome_chk;

ALTER TABLE employee_onboarding_checkins
  ADD CONSTRAINT employee_onboarding_checkins_outcome_chk
  CHECK (outcome IN ('', 'continue', 'develop', 'concern', 'pass', 'fail', 'extend'));

COMMENT ON COLUMN employee_onboarding_checkins.outcome IS
  'continue|develop|concern (light) or pass|fail|extend (B-2705 formal experience).';

-- B-2706: CV storage on candidates
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS cv_url TEXT,
  ADD COLUMN IF NOT EXISTS cv_key TEXT,
  ADD COLUMN IF NOT EXISTS cv_extracted_text TEXT,
  ADD COLUMN IF NOT EXISTS cv_updated_at TIMESTAMPTZ;

ALTER TABLE candidates
  DROP CONSTRAINT IF EXISTS candidates_cv_url_len;
ALTER TABLE candidates
  ADD CONSTRAINT candidates_cv_url_len CHECK (cv_url IS NULL OR char_length(cv_url) <= 2000);

ALTER TABLE candidates
  DROP CONSTRAINT IF EXISTS candidates_cv_key_len;
ALTER TABLE candidates
  ADD CONSTRAINT candidates_cv_key_len CHECK (cv_key IS NULL OR char_length(cv_key) <= 500);

ALTER TABLE candidates
  DROP CONSTRAINT IF EXISTS candidates_cv_text_len;
ALTER TABLE candidates
  ADD CONSTRAINT candidates_cv_text_len
  CHECK (cv_extracted_text IS NULL OR char_length(cv_extracted_text) <= 100000);

COMMENT ON COLUMN candidates.cv_url IS 'B-2706: public/object URL of uploaded CV PDF';
COMMENT ON COLUMN candidates.cv_extracted_text IS 'B-2706: extracted text for assist match (not shown publicly)';

-- B-2707: interview slots
CREATE TABLE IF NOT EXISTS interview_slots (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vacancy_id           BIGINT NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  starts_at            TIMESTAMPTZ NOT NULL,
  ends_at              TIMESTAMPTZ,
  meet_url             TEXT NOT NULL DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'scheduled',
  notes                TEXT NOT NULL DEFAULT '',
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_slots_status_chk
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  CONSTRAINT interview_slots_meet_url_len CHECK (char_length(meet_url) <= 500),
  CONSTRAINT interview_slots_notes_len CHECK (char_length(notes) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_interview_slots_vacancy_starts
  ON interview_slots (vacancy_id, starts_at ASC)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_interview_slots_company_starts
  ON interview_slots (company_id, starts_at ASC);

CREATE INDEX IF NOT EXISTS idx_interview_slots_candidate
  ON interview_slots (candidate_id, starts_at DESC);

COMMENT ON TABLE interview_slots IS
  'B-2707: light interview calendar per vacancy/candidate (no Google sync).';

INSERT INTO schema_migrations (name) VALUES ('080_solides_gaps_2702_2707.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 080_solides_gaps_2702_2707.sql =====

-- ===== BEGIN 081_candidate_session_version.sql =====
-- Candidate session_version for collaborator JWT revocation (parity with users.session_version).
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN candidates.session_version IS
  'Bumped on password change/reset/disable-2FA; JWT claim sv must match.';

INSERT INTO schema_migrations (name) VALUES ('081_candidate_session_version.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 081_candidate_session_version.sql =====

-- ===== BEGIN 082_product_feedback.sql =====
-- Product feedback inbox (feature ideas / bugs / UX) from managers → super-admin review.
CREATE TABLE IF NOT EXISTS product_feedback (
  id                BIGSERIAL PRIMARY KEY,
  company_id        BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'new',
  message           TEXT NOT NULL,
  active_tab        TEXT NOT NULL DEFAULT '',
  active_section    TEXT NOT NULL DEFAULT '',
  contact_ok        BOOLEAN NOT NULL DEFAULT TRUE,
  admin_notes       TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_feedback_kind_chk CHECK (kind IN ('idea', 'bug', 'ux')),
  CONSTRAINT product_feedback_status_chk CHECK (status IN ('new', 'reviewing', 'done', 'dismissed')),
  CONSTRAINT product_feedback_message_len CHECK (char_length(message) BETWEEN 10 AND 4000),
  CONSTRAINT product_feedback_admin_notes_len CHECK (char_length(admin_notes) <= 4000),
  CONSTRAINT product_feedback_tab_len CHECK (char_length(active_tab) <= 80),
  CONSTRAINT product_feedback_section_len CHECK (char_length(active_section) <= 80)
);

CREATE INDEX IF NOT EXISTS idx_product_feedback_status_created
  ON product_feedback (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_feedback_company_created
  ON product_feedback (company_id, created_at DESC);

COMMENT ON TABLE product_feedback IS
  'Manager-submitted product ideas/bugs/UX notes; inbox is super-admin only.';

INSERT INTO schema_migrations (name) VALUES ('082_product_feedback.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 082_product_feedback.sql =====

-- ===== BEGIN 083_employee_dp_light.sql =====
-- 083: Lightweight DP — profile, document checklist, leave requests (not payroll / eSocial / time clock).

CREATE TABLE IF NOT EXISTS candidate_dp_profiles (
  candidate_id         BIGINT PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  emergency_name       TEXT NOT NULL DEFAULT '',
  emergency_phone      TEXT NOT NULL DEFAULT '',
  emergency_relation   TEXT NOT NULL DEFAULT '',
  address_line         TEXT NOT NULL DEFAULT '',
  address_city         TEXT NOT NULL DEFAULT '',
  address_state        TEXT NOT NULL DEFAULT '',
  address_postal       TEXT NOT NULL DEFAULT '',
  internal_notes       TEXT NOT NULL DEFAULT '',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT candidate_dp_profiles_emergency_name_len CHECK (char_length(emergency_name) <= 120),
  CONSTRAINT candidate_dp_profiles_emergency_phone_len CHECK (char_length(emergency_phone) <= 40),
  CONSTRAINT candidate_dp_profiles_emergency_relation_len CHECK (char_length(emergency_relation) <= 80),
  CONSTRAINT candidate_dp_profiles_address_line_len CHECK (char_length(address_line) <= 240),
  CONSTRAINT candidate_dp_profiles_address_city_len CHECK (char_length(address_city) <= 120),
  CONSTRAINT candidate_dp_profiles_address_state_len CHECK (char_length(address_state) <= 2),
  CONSTRAINT candidate_dp_profiles_address_postal_len CHECK (char_length(address_postal) <= 16),
  CONSTRAINT candidate_dp_profiles_notes_len CHECK (char_length(internal_notes) <= 4000)
);

CREATE INDEX IF NOT EXISTS idx_candidate_dp_profiles_company
  ON candidate_dp_profiles (company_id);

CREATE TABLE IF NOT EXISTS employee_dp_documents (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  doc_key              TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending',
  notes                TEXT NOT NULL DEFAULT '',
  file_url             TEXT,
  file_key             TEXT,
  file_name            TEXT NOT NULL DEFAULT '',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT employee_dp_documents_key_chk
    CHECK (doc_key IN ('id_document', 'contract', 'aso', 'address_proof', 'bank_data', 'dependents', 'other')),
  CONSTRAINT employee_dp_documents_status_chk
    CHECK (status IN ('pending', 'received', 'waived')),
  CONSTRAINT employee_dp_documents_notes_len CHECK (char_length(notes) <= 2000),
  CONSTRAINT employee_dp_documents_file_name_len CHECK (char_length(file_name) <= 200),
  CONSTRAINT employee_dp_documents_candidate_key_uq UNIQUE (candidate_id, doc_key)
);

CREATE INDEX IF NOT EXISTS idx_employee_dp_documents_company_status
  ON employee_dp_documents (company_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_dp_documents_candidate
  ON employee_dp_documents (candidate_id, doc_key);

CREATE TABLE IF NOT EXISTS employee_leave_requests (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  leave_type           TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'requested',
  starts_on            DATE NOT NULL,
  ends_on              DATE NOT NULL,
  reason               TEXT NOT NULL DEFAULT '',
  manager_notes        TEXT NOT NULL DEFAULT '',
  requested_by         TEXT NOT NULL DEFAULT 'manager',
  decided_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  decided_at           TIMESTAMPTZ,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_leave_type_chk
    CHECK (leave_type IN ('vacation', 'sick', 'parental', 'unpaid', 'other')),
  CONSTRAINT employee_leave_status_chk
    CHECK (status IN ('requested', 'approved', 'rejected', 'cancelled', 'taken')),
  CONSTRAINT employee_leave_requested_by_chk
    CHECK (requested_by IN ('manager', 'employee')),
  CONSTRAINT employee_leave_dates_chk CHECK (ends_on >= starts_on),
  CONSTRAINT employee_leave_reason_len CHECK (char_length(reason) <= 2000),
  CONSTRAINT employee_leave_manager_notes_len CHECK (char_length(manager_notes) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_employee_leave_company_status_dates
  ON employee_leave_requests (company_id, status, starts_on ASC);

CREATE INDEX IF NOT EXISTS idx_employee_leave_candidate_dates
  ON employee_leave_requests (candidate_id, starts_on DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_employee_leave_company_range
  ON employee_leave_requests (company_id, starts_on, ends_on)
  WHERE status IN ('approved', 'taken', 'requested');

COMMENT ON TABLE candidate_dp_profiles IS
  'Light DP profile (emergency contact + address). Not eSocial.';
COMMENT ON TABLE employee_dp_documents IS
  'Admission document checklist with optional S3 attachment. Not legal GED.';
COMMENT ON TABLE employee_leave_requests IS
  'Vacation / leave requests for light DP. Not payroll time-off engine.';

INSERT INTO schema_migrations (name) VALUES ('083_employee_dp_light.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('083_employee_dp_light.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 083_employee_dp_light.sql =====

-- ===== BEGIN 084_market_salary_bands.sql =====
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

INSERT INTO schema_migrations (name) VALUES ('084_market_salary_bands.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 084_market_salary_bands.sql =====

-- ===== BEGIN 085_company_feed_kudos.sql =====
-- B-2712 company feed posts + B-2716 peer kudos (light intranet / recognition).
-- Soft delete; company-scoped. Not chat, not payroll.

CREATE TABLE IF NOT EXISTS company_posts (
  id                  BIGSERIAL PRIMARY KEY,
  company_id          BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  body_html           TEXT NOT NULL DEFAULT '',
  created_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  deleted             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_posts_title_len CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT company_posts_body_len CHECK (char_length(body_html) <= 20000)
);

CREATE INDEX IF NOT EXISTS idx_company_posts_company_created
  ON company_posts (company_id, created_at DESC)
  WHERE deleted = FALSE;

CREATE TABLE IF NOT EXISTS company_kudos (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_candidate_id    BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  to_candidate_id      BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  message              TEXT NOT NULL,
  deleted              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_kudos_message_len CHECK (char_length(message) BETWEEN 1 AND 280),
  CONSTRAINT company_kudos_not_self CHECK (from_candidate_id <> to_candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_company_kudos_company_created
  ON company_kudos (company_id, created_at DESC)
  WHERE deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_company_kudos_to_created
  ON company_kudos (to_candidate_id, created_at DESC)
  WHERE deleted = FALSE;

COMMENT ON TABLE company_posts IS
  'Company-wide intranet posts (RH). Soft delete. Shown in /employee feed.';
COMMENT ON TABLE company_kudos IS
  'Peer recognition (from→to employees). Soft delete. Visible in /employee + digest.';

INSERT INTO schema_migrations (name) VALUES ('085_company_feed_kudos.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 085_company_feed_kudos.sql =====

-- ===== BEGIN 086_interview_prep.sql =====
-- B-2709: candidate interview prep link (questions hedged; prepared flag only for manager)

CREATE TABLE IF NOT EXISTS interview_prep_links (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vacancy_id           BIGINT NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  token                TEXT NOT NULL,
  prepared_at          TIMESTAMPTZ,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at           TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  CONSTRAINT interview_prep_links_token_len CHECK (char_length(token) BETWEEN 16 AND 128)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_prep_links_token
  ON interview_prep_links (token);

CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_prep_links_vacancy_candidate
  ON interview_prep_links (vacancy_id, candidate_id);

CREATE INDEX IF NOT EXISTS idx_interview_prep_links_company
  ON interview_prep_links (company_id, created_at DESC);

COMMENT ON TABLE interview_prep_links IS
  'B-2709: public /prep/<token> for candidate interview prep; answers stay local; prepared_at visible to RH.';

INSERT INTO schema_migrations (name) VALUES ('086_interview_prep.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 086_interview_prep.sql =====

-- ===== BEGIN 087_leave_balance.sql =====
-- 087: Vacation leave balance (saldo) on top of light DP leave requests.
-- Used days are derived from approved/taken vacation rows; pending holds requested vacation.

CREATE TABLE IF NOT EXISTS employee_leave_balances (
  candidate_id         BIGINT PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entitlement_days     NUMERIC(6,1) NOT NULL DEFAULT 30,
  adjustment_days      NUMERIC(6,1) NOT NULL DEFAULT 0,
  notes                TEXT NOT NULL DEFAULT '',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT employee_leave_balances_entitlement_chk
    CHECK (entitlement_days >= 0 AND entitlement_days <= 365),
  CONSTRAINT employee_leave_balances_adjustment_chk
    CHECK (adjustment_days >= -365 AND adjustment_days <= 365),
  CONSTRAINT employee_leave_balances_notes_len CHECK (char_length(notes) <= 1000)
);

CREATE INDEX IF NOT EXISTS idx_employee_leave_balances_company
  ON employee_leave_balances (company_id);

COMMENT ON TABLE employee_leave_balances IS
  'Manual vacation entitlement + adjustment; used/pending derived from employee_leave_requests. Not payroll.';

INSERT INTO schema_migrations (name) VALUES ('087_leave_balance.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('087_leave_balance.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 087_leave_balance.sql =====

-- ===== BEGIN 088_dp_leave_polish.sql =====
-- 088: DP leave polish — period-scoped vacation balance + optional leave attachment (atestado).

ALTER TABLE employee_leave_balances
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE;

COMMENT ON COLUMN employee_leave_balances.period_start IS
  'Start of vacation entitlement window (aquisitivo). NULL = calendar year of today.';
COMMENT ON COLUMN employee_leave_balances.period_end IS
  'End of vacation entitlement window. NULL = calendar year of today.';

ALTER TABLE employee_leave_requests
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_key TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN employee_leave_requests.file_url IS
  'Optional attachment (e.g. sick-leave medical certificate). Not GED.';

INSERT INTO schema_migrations (name) VALUES ('088_dp_leave_polish.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('088_dp_leave_polish.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 088_dp_leave_polish.sql =====

-- ===== BEGIN 089_b3000_pack.sql =====
-- 089 — Epic B-3000 pack (B-3001 calibration, B-3003 variable pay status, B-3004 light OKRs)
-- Idempotent. Salary map (B-3002) is read-only over existing job_roles + compensation.

-- B-3001: calibration fields on submitted reviews (overall + exploratory 9Box cell)
ALTER TABLE performance_reviews
  ADD COLUMN IF NOT EXISTS overall_score NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS nine_box_cell SMALLINT,
  ADD COLUMN IF NOT EXISTS calibrated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS calibrated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS calibration_notes TEXT NOT NULL DEFAULT '';

ALTER TABLE performance_reviews
  DROP CONSTRAINT IF EXISTS performance_reviews_overall_score_chk;
ALTER TABLE performance_reviews
  ADD CONSTRAINT performance_reviews_overall_score_chk
  CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100));

ALTER TABLE performance_reviews
  DROP CONSTRAINT IF EXISTS performance_reviews_nine_box_cell_chk;
ALTER TABLE performance_reviews
  ADD CONSTRAINT performance_reviews_nine_box_cell_chk
  CHECK (nine_box_cell IS NULL OR (nine_box_cell >= 1 AND nine_box_cell <= 9));

ALTER TABLE performance_reviews
  DROP CONSTRAINT IF EXISTS performance_reviews_calibration_notes_len;
ALTER TABLE performance_reviews
  ADD CONSTRAINT performance_reviews_calibration_notes_len
  CHECK (char_length(calibration_notes) <= 2000);

COMMENT ON COLUMN performance_reviews.overall_score IS
  'B-3001: overall 0–100 (derived on submit; RH may calibrate with audit).';
COMMENT ON COLUMN performance_reviews.nine_box_cell IS
  'B-3001: optional exploratory 9Box cell 1–9 from calibration (not a promotion label).';

-- B-3003: proposed/approved variable pay on compensation events
ALTER TABLE employee_compensation_events
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS source_review_id BIGINT REFERENCES performance_reviews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_cycle_id BIGINT REFERENCES performance_cycles(id) ON DELETE SET NULL;

ALTER TABLE employee_compensation_events
  DROP CONSTRAINT IF EXISTS employee_compensation_events_approval_chk;
ALTER TABLE employee_compensation_events
  ADD CONSTRAINT employee_compensation_events_approval_chk
  CHECK (approval_status IN ('proposed', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_compensation_approval_company
  ON employee_compensation_events (company_id, approval_status, effective_date DESC)
  WHERE approval_status = 'proposed';

COMMENT ON COLUMN employee_compensation_events.approval_status IS
  'B-3003: proposed (from review) | approved | rejected. Legacy rows default approved.';

-- B-3004: light OKR tree (company → team group → person)
CREATE TABLE IF NOT EXISTS okr_objectives (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_id            BIGINT REFERENCES okr_objectives(id) ON DELETE CASCADE,
  level                TEXT NOT NULL DEFAULT 'company',
  title                TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  team_group_id        BIGINT REFERENCES team_groups(id) ON DELETE SET NULL,
  candidate_id         BIGINT REFERENCES candidates(id) ON DELETE SET NULL,
  period_start         DATE,
  period_end           DATE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT okr_objectives_level_chk CHECK (level IN ('company', 'team', 'person')),
  CONSTRAINT okr_objectives_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 300),
  CONSTRAINT okr_objectives_description_len CHECK (char_length(description) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_okr_objectives_company
  ON okr_objectives (company_id, level, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_okr_objectives_parent
  ON okr_objectives (company_id, parent_id)
  WHERE parent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS okr_key_results (
  id                      BIGSERIAL PRIMARY KEY,
  company_id              BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  objective_id            BIGINT NOT NULL REFERENCES okr_objectives(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  unit                    TEXT NOT NULL DEFAULT '',
  target_value            NUMERIC(14, 2) NOT NULL DEFAULT 0,
  current_value           NUMERIC(14, 2) NOT NULL DEFAULT 0,
  performance_goal_id     BIGINT REFERENCES performance_goals(id) ON DELETE SET NULL,
  sort_order              INT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT okr_key_results_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 300),
  CONSTRAINT okr_key_results_unit_len CHECK (char_length(unit) <= 40)
);

CREATE INDEX IF NOT EXISTS idx_okr_key_results_objective
  ON okr_key_results (objective_id, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_okr_key_results_company
  ON okr_key_results (company_id, objective_id);

COMMENT ON TABLE okr_objectives IS
  'B-3004 light OKRs: company / team (saved group) / person. Cap enforced in lib.';
COMMENT ON TABLE okr_key_results IS
  'B-3004 numeric key results; optional link to performance_goals.';

INSERT INTO schema_migrations (name) VALUES ('089_b3000_pack.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('089_b3000_pack.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 089_b3000_pack.sql =====

-- ===== BEGIN 090_b3005_3006_3010.sql =====
-- 090 — B-3005 ouvidoria, B-3006 organograma (manager), B-3010 feedback contínuo
-- Idempotent. Not climate, not kudos, not drag-drop reorg.

-- B-3006: reporting line on candidates (same-company + cycle checks in lib)
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS manager_candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_manager_company
  ON candidates (company_id, manager_candidate_id)
  WHERE manager_candidate_id IS NOT NULL;

COMMENT ON COLUMN candidates.manager_candidate_id IS
  'B-3006: direct manager (employee candidate in same company). Org chart reads this.';

-- B-3005: whistleblowing channel + reports (anonymous-capable; not climate)
CREATE TABLE IF NOT EXISTS whistleblowing_channels (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  token                TEXT NOT NULL,
  due_days             INT NOT NULL DEFAULT 15,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted              BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT whistleblowing_channels_title_len
    CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 200),
  CONSTRAINT whistleblowing_channels_due_days_chk
    CHECK (due_days >= 1 AND due_days <= 90),
  CONSTRAINT whistleblowing_channels_token_len
    CHECK (char_length(token) >= 24 AND char_length(token) <= 128)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whistleblowing_channels_token
  ON whistleblowing_channels (token)
  WHERE deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_whistleblowing_channels_company
  ON whistleblowing_channels (company_id, created_at DESC)
  WHERE deleted = FALSE;

CREATE TABLE IF NOT EXISTS whistleblowing_reports (
  id                      BIGSERIAL PRIMARY KEY,
  company_id              BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  channel_id              BIGINT NOT NULL REFERENCES whistleblowing_channels(id) ON DELETE CASCADE,
  category                TEXT NOT NULL,
  body                    TEXT NOT NULL,
  anonymous               BOOLEAN NOT NULL DEFAULT TRUE,
  reporter_candidate_id   BIGINT REFERENCES candidates(id) ON DELETE SET NULL,
  status                  TEXT NOT NULL DEFAULT 'new',
  due_at                  TIMESTAMPTZ,
  triage_notes            TEXT NOT NULL DEFAULT '',
  response_notes          TEXT NOT NULL DEFAULT '',
  responded_at            TIMESTAMPTZ,
  responded_by_user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT whistleblowing_reports_category_chk
    CHECK (category IN (
      'harassment', 'ethics', 'safety', 'discrimination', 'fraud', 'other'
    )),
  CONSTRAINT whistleblowing_reports_status_chk
    CHECK (status IN ('new', 'triaging', 'responded', 'closed')),
  CONSTRAINT whistleblowing_reports_body_len
    CHECK (char_length(btrim(body)) >= 20 AND char_length(body) <= 4000),
  CONSTRAINT whistleblowing_reports_triage_len
    CHECK (char_length(triage_notes) <= 2000),
  CONSTRAINT whistleblowing_reports_response_len
    CHECK (char_length(response_notes) <= 4000),
  CONSTRAINT whistleblowing_reports_anon_reporter_chk
    CHECK (
      (anonymous = TRUE AND reporter_candidate_id IS NULL)
      OR (anonymous = FALSE)
    )
);

CREATE INDEX IF NOT EXISTS idx_whistleblowing_reports_inbox
  ON whistleblowing_reports (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whistleblowing_reports_due
  ON whistleblowing_reports (company_id, due_at ASC)
  WHERE status IN ('new', 'triaging');

COMMENT ON TABLE whistleblowing_channels IS
  'B-3005: public token channel for reports. Not climate survey.';
COMMENT ON TABLE whistleblowing_reports IS
  'B-3005: reports. Anonymous = no reporter PII. RH triage with audit.';

-- B-3010: structured continuous feedback (ask / give) — not kudos / feed
CREATE TABLE IF NOT EXISTS feedback_requests (
  id                      BIGSERIAL PRIMARY KEY,
  company_id              BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subject_candidate_id    BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  from_candidate_id       BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  to_candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  prompt                  TEXT NOT NULL DEFAULT '',
  token                   TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'pending',
  response_text           TEXT NOT NULL DEFAULT '',
  answered_at             TIMESTAMPTZ,
  expires_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feedback_requests_status_chk
    CHECK (status IN ('pending', 'answered', 'cancelled', 'expired')),
  CONSTRAINT feedback_requests_prompt_len
    CHECK (char_length(prompt) <= 500),
  CONSTRAINT feedback_requests_response_len
    CHECK (char_length(response_text) <= 1000),
  CONSTRAINT feedback_requests_token_len
    CHECK (char_length(token) >= 24 AND char_length(token) <= 128),
  CONSTRAINT feedback_requests_not_self
    CHECK (from_candidate_id <> to_candidate_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_requests_token
  ON feedback_requests (token);

CREATE INDEX IF NOT EXISTS idx_feedback_requests_subject
  ON feedback_requests (company_id, subject_candidate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_requests_to_pending
  ON feedback_requests (company_id, to_candidate_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_requests_from_month
  ON feedback_requests (company_id, from_candidate_id, created_at DESC);

COMMENT ON TABLE feedback_requests IS
  'B-3010: request feedback about subject from to_candidate. Cap/month in lib. Not social feed.';

INSERT INTO schema_migrations (name) VALUES ('090_b3005_3006_3010.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('090_b3005_3006_3010.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 090_b3005_3006_3010.sql =====

-- ===== BEGIN 091_time_clock.sql =====
-- 091: B-2721 digital time clock MVP (web punches + day mirror). Not payroll / eSocial / facial.

CREATE TABLE IF NOT EXISTS company_time_schedules (
  company_id           BIGINT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  workday_start        TIME NOT NULL DEFAULT '09:00',
  workday_end          TIME NOT NULL DEFAULT '18:00',
  break_minutes        INT NOT NULL DEFAULT 60,
  timezone             TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  late_grace_minutes   INT NOT NULL DEFAULT 10,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT company_time_schedules_break_chk
    CHECK (break_minutes >= 0 AND break_minutes <= 240),
  CONSTRAINT company_time_schedules_grace_chk
    CHECK (late_grace_minutes >= 0 AND late_grace_minutes <= 120),
  CONSTRAINT company_time_schedules_tz_len
    CHECK (char_length(timezone) >= 3 AND char_length(timezone) <= 64)
);

COMMENT ON TABLE company_time_schedules IS
  'B-2721: simple fixed shift per company for late/missing hints. Not a full rota engine.';

CREATE TABLE IF NOT EXISTS employee_time_punches (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  punched_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  punch_kind           TEXT NOT NULL,
  source               TEXT NOT NULL DEFAULT 'web',
  latitude             NUMERIC(9, 6),
  longitude            NUMERIC(9, 6),
  notes                TEXT NOT NULL DEFAULT '',
  flag                 TEXT,
  review_status        TEXT NOT NULL DEFAULT 'none',
  reviewed_at          TIMESTAMPTZ,
  reviewed_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_time_punches_kind_chk
    CHECK (punch_kind IN ('in', 'out')),
  CONSTRAINT employee_time_punches_source_chk
    CHECK (source IN ('web', 'manager')),
  CONSTRAINT employee_time_punches_flag_chk
    CHECK (flag IS NULL OR flag IN ('late', 'early_out', 'odd_pair', 'manual')),
  CONSTRAINT employee_time_punches_review_chk
    CHECK (review_status IN ('none', 'ok', 'flagged', 'adjusted')),
  CONSTRAINT employee_time_punches_notes_len
    CHECK (char_length(notes) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_time_punches_company_day
  ON employee_time_punches (company_id, punched_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_punches_candidate_day
  ON employee_time_punches (candidate_id, punched_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_punches_company_review
  ON employee_time_punches (company_id, review_status, punched_at DESC)
  WHERE review_status IN ('flagged', 'none');

COMMENT ON TABLE employee_time_punches IS
  'B-2721 MVP web/manager punches. Not facial, offline, or WhatsApp time clock.';

INSERT INTO schema_migrations (name) VALUES ('091_time_clock.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('091_time_clock.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 091_time_clock.sql =====

-- ===== BEGIN 092_dp_leave_types_expand.sql =====
-- 092: Expand DP leave types (registrar ausência) — keep existing values valid.

ALTER TABLE employee_leave_requests
  DROP CONSTRAINT IF EXISTS employee_leave_type_chk;

ALTER TABLE employee_leave_requests
  ADD CONSTRAINT employee_leave_type_chk
  CHECK (leave_type IN (
    'vacation',
    'sick',
    'parental',
    'bereavement',
    'marriage',
    'medical_appointment',
    'compensatory',
    'unpaid',
    'other'
  ));

COMMENT ON COLUMN employee_leave_requests.leave_type IS
  'Closed taxonomy: vacation/sick/parental/bereavement/marriage/medical_appointment/compensatory/unpaid/other.';

INSERT INTO schema_migrations (name) VALUES ('092_dp_leave_types_expand.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('092_dp_leave_types_expand.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 092_dp_leave_types_expand.sql =====

-- ===== BEGIN 093_dp_profile_cpf.sql =====
-- 093: DP profile CPF (digits only; UI mask in PromptFormDialog).

ALTER TABLE candidate_dp_profiles
  ADD COLUMN IF NOT EXISTS cpf TEXT NOT NULL DEFAULT '';

ALTER TABLE candidate_dp_profiles
  DROP CONSTRAINT IF EXISTS candidate_dp_profiles_cpf_len;
ALTER TABLE candidate_dp_profiles
  ADD CONSTRAINT candidate_dp_profiles_cpf_len
  CHECK (char_length(cpf) <= 11);

COMMENT ON COLUMN candidate_dp_profiles.cpf IS
  'Optional CPF digits only (11). Not an identity proof / eSocial field.';

INSERT INTO schema_migrations (name) VALUES ('093_dp_profile_cpf.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('093_dp_profile_cpf.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 093_dp_profile_cpf.sql =====

-- ===== BEGIN 094_lms_quiz_cert.sql =====
-- 094: LMS depth (B-2713) — light quiz per lesson + cohort report support.
-- Certificate is print HTML (no blob storage). Not SCORM.

CREATE TABLE IF NOT EXISTS lms_lesson_quiz_questions (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lesson_id            BIGINT NOT NULL REFERENCES lms_lessons(id) ON DELETE CASCADE,
  prompt               TEXT NOT NULL,
  choices              JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_choice_id    TEXT NOT NULL,
  sort_order           INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lms_quiz_prompt_len CHECK (char_length(btrim(prompt)) >= 1 AND char_length(prompt) <= 500),
  CONSTRAINT lms_quiz_correct_len CHECK (char_length(correct_choice_id) >= 1 AND char_length(correct_choice_id) <= 40),
  CONSTRAINT lms_quiz_sort_chk CHECK (sort_order >= 0 AND sort_order <= 20)
);

CREATE INDEX IF NOT EXISTS idx_lms_quiz_questions_lesson
  ON lms_lesson_quiz_questions (lesson_id, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_lms_quiz_questions_company
  ON lms_lesson_quiz_questions (company_id, lesson_id);

COMMENT ON TABLE lms_lesson_quiz_questions IS
  'B-2713: 1–5 MC questions per lesson. choices JSON [{id,text}].';

CREATE TABLE IF NOT EXISTS lms_lesson_quiz_attempts (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  enrollment_id        BIGINT NOT NULL REFERENCES lms_enrollments(id) ON DELETE CASCADE,
  lesson_id            BIGINT NOT NULL REFERENCES lms_lessons(id) ON DELETE CASCADE,
  answers              JSONB NOT NULL DEFAULT '{}'::jsonb,
  correct_count        INT NOT NULL DEFAULT 0,
  total_count          INT NOT NULL DEFAULT 0,
  passed               BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lms_quiz_attempt_counts_chk
    CHECK (correct_count >= 0 AND total_count >= 0 AND correct_count <= total_count AND total_count <= 5)
);

CREATE INDEX IF NOT EXISTS idx_lms_quiz_attempts_enroll_lesson
  ON lms_lesson_quiz_attempts (enrollment_id, lesson_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lms_quiz_attempts_pass_once
  ON lms_lesson_quiz_attempts (enrollment_id, lesson_id)
  WHERE passed = TRUE;

COMMENT ON TABLE lms_lesson_quiz_attempts IS
  'B-2713: quiz attempts. Passed row unique per enrollment+lesson (gate complete lesson).';

INSERT INTO schema_migrations (name) VALUES ('094_lms_quiz_cert.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('094_lms_quiz_cert.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 094_lms_quiz_cert.sql =====

-- ===== BEGIN 095_lms_watch_progress.sql =====
-- 095: LMS watch progress (B-2717) — resume YouTube/Vimeo position per enrollment+lesson.
-- Not SCORM; no auto-complete by % watched.

CREATE TABLE IF NOT EXISTS lms_lesson_watch_progress (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  enrollment_id        BIGINT NOT NULL REFERENCES lms_enrollments(id) ON DELETE CASCADE,
  lesson_id            BIGINT NOT NULL REFERENCES lms_lessons(id) ON DELETE CASCADE,
  position_sec         INT NOT NULL DEFAULT 0,
  duration_sec         INT NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lms_watch_position_chk CHECK (position_sec >= 0 AND position_sec <= 172800),
  CONSTRAINT lms_watch_duration_chk CHECK (duration_sec >= 0 AND duration_sec <= 172800),
  CONSTRAINT lms_watch_enroll_lesson_uq UNIQUE (enrollment_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lms_watch_progress_enrollment
  ON lms_lesson_watch_progress (enrollment_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_lms_watch_progress_company
  ON lms_lesson_watch_progress (company_id, lesson_id);

COMMENT ON TABLE lms_lesson_watch_progress IS
  'B-2717: resume position (seconds) for youtube/vimeo lessons. PDF/link ignored.';

INSERT INTO schema_migrations (name) VALUES ('095_lms_watch_progress.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('095_lms_watch_progress.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 095_lms_watch_progress.sql =====

-- ===== BEGIN 096_okr_cycles.sql =====
-- 096: OKR cycles → areas → activities (phase 1 operational OKR).
-- Named cycle with start/end; areas under cycle; activities with progress % + deadline.
-- Does not remove light OKR tables (okr_objectives / okr_key_results); UI prefers this model.
-- Not bonus-by-attainment (phase 3).

CREATE TABLE IF NOT EXISTS okr_cycles (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  starts_on            DATE NOT NULL,
  ends_on              DATE NOT NULL,
  status               TEXT NOT NULL DEFAULT 'active',
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT okr_cycles_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 200),
  CONSTRAINT okr_cycles_dates_chk CHECK (ends_on >= starts_on),
  CONSTRAINT okr_cycles_status_chk CHECK (status IN ('active', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_okr_cycles_company
  ON okr_cycles (company_id, status, starts_on DESC, id DESC);

CREATE TABLE IF NOT EXISTS okr_areas (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id             BIGINT NOT NULL REFERENCES okr_cycles(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  sort_order           INT NOT NULL DEFAULT 0,
  team_group_id        BIGINT REFERENCES team_groups(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT okr_areas_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 200)
);

CREATE INDEX IF NOT EXISTS idx_okr_areas_cycle
  ON okr_areas (cycle_id, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_okr_areas_company
  ON okr_areas (company_id, cycle_id);

CREATE TABLE IF NOT EXISTS okr_activities (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  area_id              BIGINT NOT NULL REFERENCES okr_areas(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  progress_pct         INT NOT NULL DEFAULT 0,
  deadline             DATE,
  sort_order           INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT okr_activities_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 300),
  CONSTRAINT okr_activities_pct_chk CHECK (progress_pct >= 0 AND progress_pct <= 100)
);

CREATE INDEX IF NOT EXISTS idx_okr_activities_area
  ON okr_activities (area_id, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_okr_activities_company
  ON okr_activities (company_id, area_id);

CREATE INDEX IF NOT EXISTS idx_okr_activities_deadline
  ON okr_activities (company_id, deadline)
  WHERE deadline IS NOT NULL;

COMMENT ON TABLE okr_cycles IS
  'OKR phase 1: named cycle (e.g. 2026 H1) with start/end. Areas+activities roll up progress.';
COMMENT ON TABLE okr_areas IS
  'OKR phase 1: area under a cycle. Progress = mean of activity progress_pct.';
COMMENT ON TABLE okr_activities IS
  'OKR phase 1: activity with 0–100% and optional deadline (urgency in UI).';

INSERT INTO schema_migrations (name) VALUES ('096_okr_cycles.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 096_okr_cycles.sql =====

-- ===== BEGIN 097_okr_activity_assignees.sql =====
-- 097: OKR activity assignees (1..N people per activity).
-- Collaborator sees assigned activities on /employee; notify on new link.

CREATE TABLE IF NOT EXISTS okr_activity_assignees (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  activity_id          BIGINT NOT NULL REFERENCES okr_activities(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  assigned_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  assigned_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT okr_activity_assignees_uq UNIQUE (activity_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_okr_assignees_candidate
  ON okr_activity_assignees (company_id, candidate_id, assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_okr_assignees_activity
  ON okr_activity_assignees (activity_id, candidate_id);

COMMENT ON TABLE okr_activity_assignees IS
  'OKR: people linked to an activity. Employee hub lists by candidate_id; notify on insert.';

INSERT INTO schema_migrations (name) VALUES ('097_okr_activity_assignees.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 097_okr_activity_assignees.sql =====

-- ===== BEGIN 098_okr_weights_checkins.sql =====
-- 098: OKR activity weight + check-ins (phase 2 deepen).
-- Weighted rollup of area/cycle progress; check-in log updates progress_pct.
-- Not bonus-by-attainment.

ALTER TABLE okr_activities
  ADD COLUMN IF NOT EXISTS weight INT NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'okr_activities_weight_chk'
  ) THEN
    ALTER TABLE okr_activities
      ADD CONSTRAINT okr_activities_weight_chk
      CHECK (weight >= 1 AND weight <= 100);
  END IF;
END $$;

COMMENT ON COLUMN okr_activities.weight IS
  'Relative weight 1–100 for area/cycle rollup (default 1 = equal).';

CREATE TABLE IF NOT EXISTS okr_activity_checkins (
  id                         BIGSERIAL PRIMARY KEY,
  company_id                 BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  activity_id                BIGINT NOT NULL REFERENCES okr_activities(id) ON DELETE CASCADE,
  progress_pct               INT NOT NULL,
  note                       TEXT NOT NULL DEFAULT '',
  created_by_user_id         BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_by_candidate_id    BIGINT REFERENCES candidates(id) ON DELETE SET NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT okr_activity_checkins_pct_chk
    CHECK (progress_pct >= 0 AND progress_pct <= 100),
  CONSTRAINT okr_activity_checkins_note_len
    CHECK (char_length(note) <= 500),
  CONSTRAINT okr_activity_checkins_actor_chk
    CHECK (
      created_by_user_id IS NOT NULL
      OR created_by_candidate_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_okr_checkins_activity
  ON okr_activity_checkins (activity_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_okr_checkins_company
  ON okr_activity_checkins (company_id, created_at DESC);

COMMENT ON TABLE okr_activity_checkins IS
  'OKR: progress check-in log (manager or assignee). Updates activity progress_pct on insert.';

INSERT INTO schema_migrations (name) VALUES ('098_okr_weights_checkins.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('098_okr_weights_checkins.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 098_okr_weights_checkins.sql =====

-- ===== BEGIN 099_hour_bank.sql =====
-- 099: B-2722 hour bank / compensatory time on top of digital time clock.
-- Company toggle + ledger (manual + derived from punches). Not payroll / eSocial.

ALTER TABLE company_time_schedules
  ADD COLUMN IF NOT EXISTS hour_bank_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE company_time_schedules
  ADD COLUMN IF NOT EXISTS hour_bank_max_minutes INT NOT NULL DEFAULT 2400;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_time_schedules_bank_max_chk'
  ) THEN
    ALTER TABLE company_time_schedules
      ADD CONSTRAINT company_time_schedules_bank_max_chk
      CHECK (hour_bank_max_minutes >= 0 AND hour_bank_max_minutes <= 20000);
  END IF;
END $$;

COMMENT ON COLUMN company_time_schedules.hour_bank_enabled IS
  'B-2722: when true, RH can post hour-bank entries and generate overtime from punches.';
COMMENT ON COLUMN company_time_schedules.hour_bank_max_minutes IS
  'Soft cap on approved balance minutes (default 2400 = 40h). Block credits that would exceed.';

CREATE TABLE IF NOT EXISTS employee_hour_bank_entries (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  entry_kind           TEXT NOT NULL,
  minutes              INT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending',
  source               TEXT NOT NULL DEFAULT 'manual',
  work_on              DATE NOT NULL,
  note                 TEXT NOT NULL DEFAULT '',
  dedupe_key           TEXT,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_by_candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL,
  decided_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  decided_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_hour_bank_kind_chk
    CHECK (entry_kind IN ('credit', 'debit')),
  CONSTRAINT employee_hour_bank_minutes_chk
    CHECK (minutes >= 1 AND minutes <= 1440),
  CONSTRAINT employee_hour_bank_status_chk
    CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT employee_hour_bank_source_chk
    CHECK (source IN ('manual', 'time_clock', 'employee')),
  CONSTRAINT employee_hour_bank_note_len
    CHECK (char_length(note) <= 500),
  CONSTRAINT employee_hour_bank_actor_chk
    CHECK (
      created_by_user_id IS NOT NULL
      OR created_by_candidate_id IS NOT NULL
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hour_bank_dedupe
  ON employee_hour_bank_entries (company_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hour_bank_company_status
  ON employee_hour_bank_entries (company_id, status, work_on DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_hour_bank_candidate
  ON employee_hour_bank_entries (company_id, candidate_id, work_on DESC, id DESC);

COMMENT ON TABLE employee_hour_bank_entries IS
  'B-2722: hour-bank ledger. Balance = approved credits − approved debits. Not payslip.';

INSERT INTO schema_migrations (name) VALUES ('099_hour_bank.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('099_hour_bank.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 099_hour_bank.sql =====

-- ===== BEGIN 100_dp_document_signature.sql =====
-- 100: B-2724 admission document acknowledgment / internal e-sign (not ICP / provider GED).
-- Typed-name consent + audit fields on employee_dp_documents.

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signature_status TEXT NOT NULL DEFAULT 'none';

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signature_requested_at TIMESTAMPTZ;

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signature_requested_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signer_name TEXT NOT NULL DEFAULT '';

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signer_ip TEXT;

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signer_user_agent TEXT;

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signature_consent_version TEXT NOT NULL DEFAULT '';

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signature_file_key TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_dp_documents_sig_status_chk'
  ) THEN
    ALTER TABLE employee_dp_documents
      ADD CONSTRAINT employee_dp_documents_sig_status_chk
      CHECK (signature_status IN ('none', 'requested', 'signed', 'waived'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_dp_documents_signer_name_len'
  ) THEN
    ALTER TABLE employee_dp_documents
      ADD CONSTRAINT employee_dp_documents_signer_name_len
      CHECK (char_length(signer_name) <= 120);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_dp_documents_sig_consent_len'
  ) THEN
    ALTER TABLE employee_dp_documents
      ADD CONSTRAINT employee_dp_documents_sig_consent_len
      CHECK (char_length(signature_consent_version) <= 40);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employee_dp_docs_sig_pending
  ON employee_dp_documents (company_id, signature_status, updated_at DESC)
  WHERE signature_status = 'requested';

COMMENT ON COLUMN employee_dp_documents.signature_status IS
  'B-2724: none|requested|signed|waived. Internal typed-name acknowledgment — not ICP-Brasil / partner e-sign.';

INSERT INTO schema_migrations (name) VALUES ('100_dp_document_signature.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('100_dp_document_signature.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 100_dp_document_signature.sql =====

-- ===== BEGIN 101_dp_signature_stroke.sql =====
-- 101: B-2724 store drawn signature stroke (PNG data URL) with typed-name ack.
-- Still internal acknowledgment — not ICP-Brasil / partner e-sign.

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signer_stroke_png TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_dp_documents_stroke_png_len'
  ) THEN
    ALTER TABLE employee_dp_documents
      ADD CONSTRAINT employee_dp_documents_stroke_png_len
      CHECK (char_length(signer_stroke_png) <= 200000);
  END IF;
END $$;

COMMENT ON COLUMN employee_dp_documents.signer_stroke_png IS
  'B-2724: PNG data URL of drawn stroke (mouse/touch). Cap 200k chars. Not ICP.';

INSERT INTO schema_migrations (name) VALUES ('101_dp_signature_stroke.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('101_dp_signature_stroke.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 101_dp_signature_stroke.sql =====

-- ===== BEGIN 102_journey_p0_trail_experience_onboarding.sql =====
-- 102: P0 jornada gaps — LMS trail by job role, experience decision fields,
-- configurable pre-onboarding template.

-- ── LMS: cargo → cursos (trilha) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lms_job_role_courses (
  id              BIGSERIAL PRIMARY KEY,
  company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_role_id     BIGINT NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
  course_id       BIGINT NOT NULL REFERENCES lms_courses(id) ON DELETE CASCADE,
  sort_order      INT NOT NULL DEFAULT 0,
  mandatory       BOOLEAN NOT NULL DEFAULT TRUE,
  due_offset_days INT NOT NULL DEFAULT 30
    CHECK (due_offset_days BETWEEN 1 AND 365),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lms_job_role_courses_unique UNIQUE (job_role_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_lms_job_role_courses_co
  ON lms_job_role_courses (company_id, job_role_id, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_lms_job_role_courses_course
  ON lms_job_role_courses (company_id, course_id);

COMMENT ON TABLE lms_job_role_courses IS
  'P0: ordered LMS trail per job role (mandatory/recommended + due offset days).';

-- ── Experiência: prorrogação tipada + outcome terminate ────────────────────
ALTER TABLE employee_onboarding_checkins
  ADD COLUMN IF NOT EXISTS extend_days INT;

ALTER TABLE employee_onboarding_checkins
  DROP CONSTRAINT IF EXISTS employee_onboarding_checkins_outcome_chk;

ALTER TABLE employee_onboarding_checkins
  ADD CONSTRAINT employee_onboarding_checkins_outcome_chk
  CHECK (outcome IN (
    '', 'continue', 'develop', 'concern', 'pass', 'fail', 'extend', 'terminate'
  ));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_onboarding_checkins_extend_days_chk'
  ) THEN
    ALTER TABLE employee_onboarding_checkins
      ADD CONSTRAINT employee_onboarding_checkins_extend_days_chk
      CHECK (extend_days IS NULL OR (extend_days BETWEEN 1 AND 180));
  END IF;
END $$;

COMMENT ON COLUMN employee_onboarding_checkins.extend_days IS
  'P0: when outcome=extend, days added to later pending milestones.';
COMMENT ON COLUMN employee_onboarding_checkins.outcome IS
  'B-2705+P0: continue|develop|concern|pass|fail|extend|terminate (empty ok).';

-- ── Pré-onboarding: template por empresa ───────────────────────────────────
CREATE TABLE IF NOT EXISTS company_pre_onboarding_templates (
  id               BIGSERIAL PRIMARY KEY,
  company_id       BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_key         TEXT NOT NULL,
  label_pt         TEXT NOT NULL DEFAULT '',
  label_en         TEXT NOT NULL DEFAULT '',
  owner_role       TEXT NOT NULL DEFAULT 'rh',
  sort_order       INT NOT NULL DEFAULT 0,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  due_offset_days  INT NOT NULL DEFAULT 0
    CHECK (due_offset_days BETWEEN 0 AND 90),
  require_meet     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_pre_onboarding_templates_key_fmt
    CHECK (item_key ~ '^[a-z][a-z0-9_]{1,40}$'),
  CONSTRAINT company_pre_onboarding_templates_owner_chk
    CHECK (owner_role IN ('rh', 'manager', 'it', 'security', 'employee')),
  CONSTRAINT company_pre_onboarding_templates_unique
    UNIQUE (company_id, item_key),
  CONSTRAINT company_pre_onboarding_templates_label_pt_len
    CHECK (char_length(label_pt) <= 120),
  CONSTRAINT company_pre_onboarding_templates_label_en_len
    CHECK (char_length(label_en) <= 120)
);

CREATE INDEX IF NOT EXISTS idx_company_pre_onboarding_tpl_co
  ON company_pre_onboarding_templates (company_id, active, sort_order ASC, id ASC);

COMMENT ON TABLE company_pre_onboarding_templates IS
  'P0: company D1 checklist template (owner role + labels). Seeds employee_pre_onboarding_items.';

ALTER TABLE employee_pre_onboarding_items
  DROP CONSTRAINT IF EXISTS employee_pre_onboarding_item_key_chk;

ALTER TABLE employee_pre_onboarding_items
  ADD CONSTRAINT employee_pre_onboarding_item_key_chk
  CHECK (item_key ~ '^[a-z][a-z0-9_]{1,40}$');

ALTER TABLE employee_pre_onboarding_items
  ADD COLUMN IF NOT EXISTS owner_role TEXT NOT NULL DEFAULT 'rh';

ALTER TABLE employee_pre_onboarding_items
  ADD COLUMN IF NOT EXISTS label_snapshot TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_pre_onboarding_owner_chk'
  ) THEN
    ALTER TABLE employee_pre_onboarding_items
      ADD CONSTRAINT employee_pre_onboarding_owner_chk
      CHECK (owner_role IN ('rh', 'manager', 'it', 'security', 'employee'));
  END IF;
END $$;

INSERT INTO schema_migrations (name) VALUES ('102_journey_p0_trail_experience_onboarding.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('102_journey_p0_trail_experience_onboarding.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 102_journey_p0_trail_experience_onboarding.sql =====

-- ===== BEGIN 103_pre_onboarding_require_meet.sql =====
-- 103: persist require_meet on D1 checklist instances (from company template)
ALTER TABLE employee_pre_onboarding_items
  ADD COLUMN IF NOT EXISTS require_meet BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN employee_pre_onboarding_items.require_meet IS
  'P0 polish: when true, RH UI offers Meet link even if owner is not rh/manager.';

INSERT INTO schema_migrations (name) VALUES ('103_pre_onboarding_require_meet.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('103_pre_onboarding_require_meet.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 103_pre_onboarding_require_meet.sql =====

-- ===== BEGIN 104_okr_weight_0_10.sql =====
-- 104: OKR activity weight scale 0–10 (was 1–100).
-- 0 is skipped in area/cycle rollup; 10 pulls the total most. Existing values clamp to 10.

UPDATE okr_activities
   SET weight = LEAST(10, GREATEST(0, COALESCE(weight, 5)))
 WHERE weight < 0 OR weight > 10;

ALTER TABLE okr_activities DROP CONSTRAINT IF EXISTS okr_activities_weight_chk;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'okr_activities_weight_chk'
  ) THEN
    ALTER TABLE okr_activities
      ADD CONSTRAINT okr_activities_weight_chk
      CHECK (weight >= 0 AND weight <= 10);
  END IF;
END $$;

ALTER TABLE okr_activities ALTER COLUMN weight SET DEFAULT 5;

COMMENT ON COLUMN okr_activities.weight IS
  'Relative weight 0–10 for area/cycle rollup (0 skipped; 10 most important; default 5).';

INSERT INTO schema_migrations (name) VALUES ('104_okr_weight_0_10.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('104_okr_weight_0_10.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 104_okr_weight_0_10.sql =====

-- ===== BEGIN 105_candidates_created_by.sql =====
-- 105: Who created/invited the person (discrete registration metadata).

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_created_by
  ON candidates (company_id, created_by_user_id)
  WHERE created_by_user_id IS NOT NULL;

COMMENT ON COLUMN candidates.created_by_user_id IS
  'Manager user who first registered/invited this person (panel). Null when self-registered via public link.';

INSERT INTO schema_migrations (name) VALUES ('105_candidates_created_by.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('105_candidates_created_by.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 105_candidates_created_by.sql =====

-- ===== BEGIN 106_climate_survey_archive.sql =====
-- 106: Climate survey archive + version lineage (B-RH2-16)
-- After publish, questions stay frozen; changes = archive + new draft version.
-- Invite counts remain anonymous (no candidate linkage in aggregates).

ALTER TABLE climate_surveys
  DROP CONSTRAINT IF EXISTS climate_surveys_status_chk;

ALTER TABLE climate_surveys
  ADD CONSTRAINT climate_surveys_status_chk
  CHECK (status IN ('draft', 'open', 'closed', 'archived'));

ALTER TABLE climate_surveys
  ADD COLUMN IF NOT EXISTS source_survey_id BIGINT REFERENCES climate_surveys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_climate_surveys_company_status
  ON climate_surveys (company_id, status, updated_at DESC)
  WHERE deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_climate_surveys_source
  ON climate_surveys (company_id, source_survey_id)
  WHERE source_survey_id IS NOT NULL AND deleted = FALSE;

COMMENT ON COLUMN climate_surveys.source_survey_id IS
  'B-RH2-16: when this draft was created as a new version, points at the archived/closed prior survey.';

COMMENT ON CONSTRAINT climate_surveys_status_chk ON climate_surveys IS
  'draft | open | closed | archived. Questions editable only while draft.';

INSERT INTO schema_migrations (name) VALUES ('106_climate_survey_archive.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('106_climate_survey_archive.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 106_climate_survey_archive.sql =====

-- ===== BEGIN 107_employee_benefit_assignments.sql =====
-- 107: Employee benefit assignments (B-RH2-14)
-- Links catalog benefits to a collaborator with optional value note and history.
-- Not payroll / enrollment portal — RH tracking only.

CREATE TABLE IF NOT EXISTS employee_benefit_assignments (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  benefit_id           BIGINT NOT NULL REFERENCES company_benefits(id) ON DELETE RESTRICT,
  value_note           TEXT NOT NULL DEFAULT '',
  starts_on            DATE NOT NULL DEFAULT (CURRENT_DATE),
  ends_on              DATE,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_benefit_assignments_value_note_len
    CHECK (char_length(value_note) <= 500),
  CONSTRAINT employee_benefit_assignments_dates_chk
    CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

-- At most one active assignment per person+benefit
CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_benefit_active
  ON employee_benefit_assignments (company_id, candidate_id, benefit_id)
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_employee_benefit_candidate
  ON employee_benefit_assignments (company_id, candidate_id, active, starts_on DESC);

CREATE INDEX IF NOT EXISTS idx_employee_benefit_benefit
  ON employee_benefit_assignments (company_id, benefit_id, active)
  WHERE active = TRUE;

COMMENT ON TABLE employee_benefit_assignments IS
  'B-RH2-14: which catalog benefits a collaborator receives. History via ends_on + active=false. Not payroll.';

COMMENT ON COLUMN employee_benefit_assignments.value_note IS
  'Free-text value/amount context (e.g. R$ 30/day). Not a ledger amount.';

INSERT INTO schema_migrations (name) VALUES ('107_employee_benefit_assignments.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('107_employee_benefit_assignments.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 107_employee_benefit_assignments.sql =====

-- ===== BEGIN 108_formal_competency_reviews.sql =====
-- 108: Formal competency reviews (B-RH2-15)
-- Separate from light performance_cycles (goals → PDI). Likert 1–5 by competency.
-- Models: 90 (manager), 180 (+ upward), 360 (+ external). Optional self on any model.

CREATE TABLE IF NOT EXISTS company_competencies (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_competencies_name_len
    CHECK (char_length(btrim(name)) >= 1 AND char_length(name) <= 200),
  CONSTRAINT company_competencies_description_len
    CHECK (char_length(description) <= 2000)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_competencies_name_lower
  ON company_competencies (company_id, LOWER(btrim(name)))
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_company_competencies_company
  ON company_competencies (company_id, active, name ASC);

COMMENT ON TABLE company_competencies IS
  'B-RH2-15: company competency catalog for formal reviews (Likert).';

CREATE TABLE IF NOT EXISTS job_role_competencies (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_role_id          BIGINT NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
  competency_id        BIGINT NOT NULL REFERENCES company_competencies(id) ON DELETE CASCADE,
  sort_order           INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_role_id, competency_id)
);

CREATE INDEX IF NOT EXISTS idx_job_role_competencies_role
  ON job_role_competencies (job_role_id, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_job_role_competencies_company
  ON job_role_competencies (company_id, job_role_id);

COMMENT ON TABLE job_role_competencies IS
  'B-RH2-15: default competencies suggested from a job role into a formal review.';

CREATE TABLE IF NOT EXISTS formal_review_cycles (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  model                TEXT NOT NULL DEFAULT '90',
  include_self         BOOLEAN NOT NULL DEFAULT FALSE,
  status               TEXT NOT NULL DEFAULT 'draft',
  period_start         DATE,
  period_end           DATE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT formal_review_cycles_title_len
    CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 200),
  CONSTRAINT formal_review_cycles_description_len
    CHECK (char_length(description) <= 4000),
  CONSTRAINT formal_review_cycles_model_chk
    CHECK (model IN ('90', '180', '360')),
  CONSTRAINT formal_review_cycles_status_chk
    CHECK (status IN ('draft', 'open', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_formal_review_cycles_company
  ON formal_review_cycles (company_id, status, updated_at DESC);

COMMENT ON TABLE formal_review_cycles IS
  'B-RH2-15: formal competency review cycle. model 90/180/360; include_self optional.';

CREATE TABLE IF NOT EXISTS formal_reviews (
  id                     BIGSERIAL PRIMARY KEY,
  cycle_id               BIGINT NOT NULL REFERENCES formal_review_cycles(id) ON DELETE CASCADE,
  company_id             BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subject_candidate_id   BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  manager_user_id        BIGINT REFERENCES users(id) ON DELETE SET NULL,
  job_role_id            BIGINT REFERENCES job_roles(id) ON DELETE SET NULL,
  status                 TEXT NOT NULL DEFAULT 'draft',
  finalized_at           TIMESTAMPTZ,
  sent_at                TIMESTAMPTZ,
  archived_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cycle_id, subject_candidate_id),
  CONSTRAINT formal_reviews_status_chk
    CHECK (status IN ('draft', 'collecting', 'finalized', 'sent', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_formal_reviews_cycle
  ON formal_reviews (cycle_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_formal_reviews_subject
  ON formal_reviews (company_id, subject_candidate_id, status);

COMMENT ON TABLE formal_reviews IS
  'B-RH2-15: one formal package per subject in a cycle. After finalized: send or archive; no edit.';

CREATE TABLE IF NOT EXISTS formal_review_items (
  id                   BIGSERIAL PRIMARY KEY,
  review_id            BIGINT NOT NULL REFERENCES formal_reviews(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  competency_id        BIGINT REFERENCES company_competencies(id) ON DELETE SET NULL,
  label                TEXT NOT NULL,
  sort_order           INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT formal_review_items_label_len
    CHECK (char_length(btrim(label)) >= 1 AND char_length(label) <= 200)
);

CREATE INDEX IF NOT EXISTS idx_formal_review_items_review
  ON formal_review_items (review_id, sort_order ASC, id ASC);

COMMENT ON TABLE formal_review_items IS
  'B-RH2-15: competency rows on a review (label snapshot; optional catalog link).';

CREATE TABLE IF NOT EXISTS formal_review_raters (
  id                   BIGSERIAL PRIMARY KEY,
  review_id            BIGINT NOT NULL REFERENCES formal_reviews(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role                 TEXT NOT NULL,
  user_id              BIGINT REFERENCES users(id) ON DELETE SET NULL,
  candidate_id         BIGINT REFERENCES candidates(id) ON DELETE SET NULL,
  external_name        TEXT NOT NULL DEFAULT '',
  external_email       TEXT NOT NULL DEFAULT '',
  external_title       TEXT NOT NULL DEFAULT '',
  token                TEXT,
  token_expires_at     TIMESTAMPTZ,
  status               TEXT NOT NULL DEFAULT 'pending',
  submitted_at         TIMESTAMPTZ,
  overall_notes        TEXT NOT NULL DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT formal_review_raters_role_chk
    CHECK (role IN ('manager', 'upward', 'self', 'external')),
  CONSTRAINT formal_review_raters_status_chk
    CHECK (status IN ('pending', 'submitted', 'expired')),
  CONSTRAINT formal_review_raters_external_name_len
    CHECK (char_length(external_name) <= 200),
  CONSTRAINT formal_review_raters_external_email_len
    CHECK (char_length(external_email) <= 320),
  CONSTRAINT formal_review_raters_external_title_len
    CHECK (char_length(external_title) <= 200),
  CONSTRAINT formal_review_raters_notes_len
    CHECK (char_length(overall_notes) <= 4000),
  CONSTRAINT formal_review_raters_token_len
    CHECK (token IS NULL OR (char_length(token) >= 16 AND char_length(token) <= 128))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_formal_review_raters_token
  ON formal_review_raters (token)
  WHERE token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_formal_review_raters_role
  ON formal_review_raters (review_id, role);

CREATE INDEX IF NOT EXISTS idx_formal_review_raters_review
  ON formal_review_raters (review_id, role, status);

COMMENT ON TABLE formal_review_raters IS
  'B-RH2-15: manager (dashboard), upward/self/external (token). Always nominal.';

CREATE TABLE IF NOT EXISTS formal_review_scores (
  id                   BIGSERIAL PRIMARY KEY,
  rater_id             BIGINT NOT NULL REFERENCES formal_review_raters(id) ON DELETE CASCADE,
  item_id              BIGINT NOT NULL REFERENCES formal_review_items(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  score                SMALLINT NOT NULL,
  notes                TEXT NOT NULL DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rater_id, item_id),
  CONSTRAINT formal_review_scores_score_chk
    CHECK (score >= 1 AND score <= 5),
  CONSTRAINT formal_review_scores_notes_len
    CHECK (char_length(notes) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_formal_review_scores_rater
  ON formal_review_scores (rater_id);

CREATE INDEX IF NOT EXISTS idx_formal_review_scores_item
  ON formal_review_scores (item_id);

COMMENT ON TABLE formal_review_scores IS
  'B-RH2-15: Likert 1–5 per rater × competency item.';

INSERT INTO schema_migrations (name) VALUES ('108_formal_competency_reviews.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('108_formal_competency_reviews.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 108_formal_competency_reviews.sql =====

-- ===== BEGIN 109_company_module_entitlements.sql =====
-- 109: Company module entitlements (commercial packs / early-adopter onboarding)
-- NULL enabled_modules = all modules (legacy tenants). Non-null = only listed keys (+ core forced in app).

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS enabled_modules TEXT[];

COMMENT ON COLUMN companies.enabled_modules IS
  'B-modules: nullable = all modules enabled (legacy). Non-null = allow-list of module keys (core always implied in app).';

CREATE INDEX IF NOT EXISTS idx_companies_enabled_modules_gin
  ON companies USING GIN (enabled_modules)
  WHERE enabled_modules IS NOT NULL AND deleted = FALSE;

INSERT INTO schema_migrations (name) VALUES ('109_company_module_entitlements.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('109_company_module_entitlements.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 109_company_module_entitlements.sql =====

-- ===== BEGIN 110_company_pipeline_stages.sql =====
-- 110: Company-configurable recruiting pipeline (B-RH2-12).
-- Per-company stages (label + order + custom). Seed is lazy on first read.
-- Reports aggregate via canonical_key. Required stages cannot be deleted.

CREATE TABLE IF NOT EXISTS company_pipeline_stages (
  id             BIGSERIAL PRIMARY KEY,
  company_id     BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stage_key      TEXT NOT NULL,
  label_pt       TEXT NOT NULL,
  label_en       TEXT NOT NULL,
  sort_order     INT NOT NULL,
  canonical_key  TEXT NOT NULL,
  system         BOOLEAN NOT NULL DEFAULT FALSE,
  required       BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_pipeline_stages_stage_key_fmt
    CHECK (stage_key ~ '^[a-z][a-z0-9_]{0,63}$'),
  CONSTRAINT company_pipeline_stages_canonical_check
    CHECK (canonical_key IN (
      'new', 'interview', 'test_completed', 'screening',
      'approved', 'hired', 'rejected', 'archived'
    )),
  CONSTRAINT company_pipeline_stages_label_pt_len
    CHECK (char_length(btrim(label_pt)) BETWEEN 1 AND 60),
  CONSTRAINT company_pipeline_stages_label_en_len
    CHECK (char_length(btrim(label_en)) BETWEEN 1 AND 60)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_pipeline_stages_active_key
  ON company_pipeline_stages (company_id, stage_key)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_company_pipeline_stages_company_order
  ON company_pipeline_stages (company_id, sort_order ASC, id ASC)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE company_pipeline_stages IS
  'B-RH2-12: per-company recruiting pipeline stages. Seed lazy on first read.';
COMMENT ON COLUMN company_pipeline_stages.stage_key IS
  'Stable slug stored in vacancy_candidates.pipeline_stage / assessments.pipeline_stage. Seed stages reuse canonical keys; custom stages use c_<slug>.';
COMMENT ON COLUMN company_pipeline_stages.canonical_key IS
  'Bucket for reports/overview aggregation; also drives special actions (hired/rejected/archived).';
COMMENT ON COLUMN company_pipeline_stages.system IS
  'TRUE for seed stages (label/order editable; delete only if required=FALSE and count=0).';
COMMENT ON COLUMN company_pipeline_stages.required IS
  'TRUE for stages that must always exist (new, test_completed, hired, rejected, archived).';

-- Relax legacy CHECK constraints so custom stage_key slugs (c_*) are accepted.
-- Historic canonical values remain valid.
ALTER TABLE vacancy_candidates
  DROP CONSTRAINT IF EXISTS vacancy_candidates_pipeline_stage_check;
ALTER TABLE vacancy_candidates
  ADD CONSTRAINT vacancy_candidates_pipeline_stage_check
  CHECK (pipeline_stage IS NULL OR pipeline_stage ~ '^[a-z][a-z0-9_]{0,63}$');

ALTER TABLE assessments
  DROP CONSTRAINT IF EXISTS assessments_pipeline_stage_check;
ALTER TABLE assessments
  ADD CONSTRAINT assessments_pipeline_stage_check
  CHECK (pipeline_stage ~ '^[a-z][a-z0-9_]{0,63}$');

INSERT INTO schema_migrations (name) VALUES ('110_company_pipeline_stages.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('110_company_pipeline_stages.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 110_company_pipeline_stages.sql =====

-- ===== BEGIN 111_vacancy_pipeline_templates.sql =====
-- 111: Reusable pipeline templates and per-vacancy stage snapshots.
-- Owned by the recruiting tenant (company_id); existing vacancies keep the
-- company pipeline fallback until explicitly assigned or recreated.

CREATE TABLE IF NOT EXISTS pipeline_templates (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pipeline_templates_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 80)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pipeline_templates_company_name
  ON pipeline_templates (company_id, lower(name)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pipeline_templates_company_default
  ON pipeline_templates (company_id) WHERE is_default = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_company
  ON pipeline_templates (company_id, created_at ASC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS pipeline_template_stages (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL REFERENCES pipeline_templates(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  label_pt TEXT NOT NULL,
  label_en TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  sort_order INT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (template_id, stage_key),
  CONSTRAINT pipeline_template_stages_key_fmt CHECK (stage_key ~ '^[a-z][a-z0-9_]{0,63}$'),
  CONSTRAINT pipeline_template_stages_canonical_check CHECK (canonical_key IN (
    'new', 'interview', 'test_completed', 'screening',
    'approved', 'hired', 'rejected', 'archived'
  )),
  CONSTRAINT pipeline_template_stages_label_pt_len CHECK (char_length(btrim(label_pt)) BETWEEN 1 AND 60),
  CONSTRAINT pipeline_template_stages_label_en_len CHECK (char_length(btrim(label_en)) BETWEEN 1 AND 60)
);
CREATE INDEX IF NOT EXISTS idx_pipeline_template_stages_order
  ON pipeline_template_stages (template_id, sort_order ASC, id ASC);

CREATE TABLE IF NOT EXISTS vacancy_pipeline_stages (
  id BIGSERIAL PRIMARY KEY,
  vacancy_id BIGINT NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  label_pt TEXT NOT NULL,
  label_en TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  sort_order INT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vacancy_id, stage_key),
  CONSTRAINT vacancy_pipeline_stages_key_fmt CHECK (stage_key ~ '^[a-z][a-z0-9_]{0,63}$'),
  CONSTRAINT vacancy_pipeline_stages_canonical_check CHECK (canonical_key IN (
    'new', 'interview', 'test_completed', 'screening',
    'approved', 'hired', 'rejected', 'archived'
  )),
  CONSTRAINT vacancy_pipeline_stages_label_pt_len CHECK (char_length(btrim(label_pt)) BETWEEN 1 AND 60),
  CONSTRAINT vacancy_pipeline_stages_label_en_len CHECK (char_length(btrim(label_en)) BETWEEN 1 AND 60)
);
CREATE INDEX IF NOT EXISTS idx_vacancy_pipeline_stages_order
  ON vacancy_pipeline_stages (vacancy_id, sort_order ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_vacancy_pipeline_stages_tenant
  ON vacancy_pipeline_stages (company_id, vacancy_id);

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS pipeline_template_id BIGINT REFERENCES pipeline_templates(id) ON DELETE SET NULL;

COMMENT ON TABLE pipeline_templates IS
  'Reusable recruiting pipeline models owned by the tenant company.';
COMMENT ON TABLE vacancy_pipeline_stages IS
  'Immutable-at-creation stage snapshot selected for a vacancy; later editable per vacancy.';

INSERT INTO schema_migrations (name) VALUES ('111_vacancy_pipeline_templates.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('111_vacancy_pipeline_templates.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 111_vacancy_pipeline_templates.sql =====

-- ===== BEGIN 112_compensation_module_entitlement.sql =====
-- 112: isolate sensitive compensation data behind its own module/capabilities.
-- Compatibility: restricted tenants that previously received compensation through
-- core keep access. NULL remains the legacy unrestricted marker.

UPDATE companies
SET enabled_modules = array_append(enabled_modules, 'compensation')
WHERE enabled_modules IS NOT NULL
  AND 'core' = ANY(enabled_modules)
  AND NOT ('compensation' = ANY(enabled_modules));

COMMENT ON COLUMN companies.enabled_modules IS
  'Nullable legacy unrestricted marker. Non-null is an explicit module allow-list; empty input normalizes to core-only.';

INSERT INTO schema_migrations (name) VALUES ('112_compensation_module_entitlement.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('112_compensation_module_entitlement.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 112_compensation_module_entitlement.sql =====

-- ===== BEGIN 114_lms_lesson_description.sql =====
-- Descrição opcional por aula, compartilhada pelos fluxos de link/vídeo e PDF.
ALTER TABLE lms_lessons
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN lms_lessons.description IS
  'Optional sanitized lesson description shown with the lesson content.';

INSERT INTO schema_migrations (name) VALUES ('114_lms_lesson_description.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 114_lms_lesson_description.sql =====

-- ===== BEGIN 116_mobile_refresh_sessions.sql =====
-- 116: revocable, rotating mobile manager sessions. Only token hashes are persisted.
CREATE TABLE IF NOT EXISTS mobile_refresh_sessions (
  id BIGSERIAL PRIMARY KEY,
  family_id UUID NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_id BIGINT NOT NULL REFERENCES user_company_memberships(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL,
  session_version INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  replaced_by_id BIGINT REFERENCES mobile_refresh_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  CONSTRAINT mobile_refresh_sessions_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT mobile_refresh_sessions_lifecycle_check
    CHECK (NOT (rotated_at IS NOT NULL AND revoked_at IS NOT NULL))
);

COMMENT ON TABLE mobile_refresh_sessions IS
  'Hashed rotating refresh tokens for mobile manager sessions; family revocation detects replay.';

CREATE INDEX IF NOT EXISTS idx_mobile_refresh_sessions_family_active
  ON mobile_refresh_sessions (family_id, id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mobile_refresh_sessions_user_active
  ON mobile_refresh_sessions (user_id, expires_at)
  WHERE revoked_at IS NULL AND rotated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mobile_refresh_sessions_expiry
  ON mobile_refresh_sessions (expires_at)
  WHERE revoked_at IS NULL;

INSERT INTO schema_migrations (name) VALUES ('116_mobile_refresh_sessions.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('116_mobile_refresh_sessions.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 116_mobile_refresh_sessions.sql =====

-- ===== BEGIN 117_mobile_employee_refresh_sessions.sql =====
-- 117: rotating mobile sessions for employees (candidate identity, multi-company context).
CREATE TABLE IF NOT EXISTS mobile_employee_refresh_sessions (
  id BIGSERIAL PRIMARY KEY,
  family_id UUID NOT NULL,
  candidate_id BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  session_version INTEGER NOT NULL,
  allowed_contexts JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  replaced_by_id BIGINT REFERENCES mobile_employee_refresh_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  CONSTRAINT mobile_employee_refresh_lifecycle_check
    CHECK (NOT (rotated_at IS NOT NULL AND revoked_at IS NOT NULL)),
  CONSTRAINT mobile_employee_refresh_contexts_check
    CHECK (jsonb_typeof(allowed_contexts) = 'array' AND jsonb_array_length(allowed_contexts) BETWEEN 1 AND 10)
);

COMMENT ON TABLE mobile_employee_refresh_sessions IS
  'Hashed rotating refresh tokens for native employee sessions; allowed contexts were password-proven at login.';

CREATE INDEX IF NOT EXISTS idx_mobile_employee_refresh_family_active
  ON mobile_employee_refresh_sessions (family_id, id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mobile_employee_refresh_candidate_active
  ON mobile_employee_refresh_sessions (candidate_id, expires_at)
  WHERE revoked_at IS NULL AND rotated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mobile_employee_refresh_expiry
  ON mobile_employee_refresh_sessions (expires_at)
  WHERE revoked_at IS NULL;

INSERT INTO schema_migrations (name) VALUES ('117_mobile_employee_refresh_sessions.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('117_mobile_employee_refresh_sessions.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 117_mobile_employee_refresh_sessions.sql =====

-- ===== BEGIN 118_mobile_employee_push_tokens.sql =====
-- 118: Expo push tokens scoped to an active employee/company context.
CREATE TABLE IF NOT EXISTS mobile_employee_push_tokens (
  id BIGSERIAL PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  CONSTRAINT mobile_employee_push_tokens_token_unique UNIQUE (expo_push_token)
);

CREATE INDEX IF NOT EXISTS idx_mobile_employee_push_tokens_recipient
  ON mobile_employee_push_tokens (company_id, candidate_id)
  WHERE active = TRUE;

INSERT INTO schema_migrations (name) VALUES ('118_mobile_employee_push_tokens.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('118_mobile_employee_push_tokens.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 118_mobile_employee_push_tokens.sql =====

-- ===== BEGIN 119_analytics_canonical_indexes.sql =====
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

INSERT INTO schema_migrations (name) VALUES ('119_analytics_canonical_indexes.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 119_analytics_canonical_indexes.sql =====

-- ===== BEGIN 120_mobile_employee_mutation_idempotency.sql =====
-- 120: replay protection for critical employee mobile mutations.
ALTER TABLE employee_time_punches
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE company_kudos
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_time_punches_mobile_idempotency
  ON employee_time_punches (company_id, candidate_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_kudos_mobile_idempotency
  ON company_kudos (company_id, from_candidate_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN employee_time_punches.idempotency_key IS
  'Opaque client mutation key; prevents duplicate mobile punches after ambiguous network failures.';
COMMENT ON COLUMN company_kudos.idempotency_key IS
  'Opaque client mutation key; prevents duplicate mobile kudos after ambiguous network failures.';

INSERT INTO schema_migrations (name) VALUES ('120_mobile_employee_mutation_idempotency.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('120_mobile_employee_mutation_idempotency.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 120_mobile_employee_mutation_idempotency.sql =====

-- ===== BEGIN 121_organization_units.sql =====
-- Additive: existing employees remain unassigned; managers and roles are unchanged.
CREATE TABLE IF NOT EXISTS org_units (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  name VARCHAR(100) NOT NULL CHECK (length(btrim(name)) > 0),
  parent_id INTEGER,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, company_id),
  FOREIGN KEY (parent_id, company_id) REFERENCES org_units(id, company_id),
  CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE UNIQUE INDEX IF NOT EXISTS org_units_active_name_idx
  ON org_units(company_id, COALESCE(parent_id, 0), lower(btrim(name))) WHERE active;
CREATE INDEX IF NOT EXISTS org_units_parent_idx ON org_units(company_id, parent_id) WHERE active;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS org_unit_id INTEGER;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'candidates_org_unit_tenant_fk') THEN
    ALTER TABLE candidates ADD CONSTRAINT candidates_org_unit_tenant_fk
      FOREIGN KEY (org_unit_id, company_id) REFERENCES org_units(id, company_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS candidates_org_unit_idx ON candidates(company_id, org_unit_id);
INSERT INTO schema_migrations(name) VALUES ('121_organization_units.sql') ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('121_organization_units.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 121_organization_units.sql =====

-- ===== BEGIN 122_company_early_access_license.sql =====
-- Informational only: no authentication, module or employee access gates.
CREATE TABLE IF NOT EXISTS company_licenses (
  company_id INTEGER PRIMARY KEY REFERENCES companies(id),
  license_number BIGSERIAL NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'early_access' CHECK (plan = 'early_access'),
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > starts_at)
);

-- Database-owned issuance also covers old application instances during rollout.
-- UNIQUE company_id makes concurrent registrations safe; sequence gaps are normal.
CREATE OR REPLACE FUNCTION issue_company_early_access_license() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.signup_source = 'early_access' AND NEW.company_id IS NOT NULL THEN
    INSERT INTO company_licenses(company_id, starts_at, expires_at)
    VALUES (NEW.company_id, NEW.created_at,
      ((NEW.created_at AT TIME ZONE 'UTC') + interval '1 year') AT TIME ZONE 'UTC')
    ON CONFLICT (company_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS users_issue_early_access_license ON users;
CREATE TRIGGER users_issue_early_access_license
AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION issue_company_early_access_license();

-- Preserve the original first registration, even if that manager was deactivated.
-- Never extend or overwrite a license on migration retries.
INSERT INTO company_licenses(company_id, starts_at, expires_at)
SELECT company_id, min(created_at),
       ((min(created_at) AT TIME ZONE 'UTC') + interval '1 year') AT TIME ZONE 'UTC'
FROM users
WHERE signup_source = 'early_access' AND company_id IS NOT NULL
GROUP BY company_id
ORDER BY min(created_at), company_id
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO schema_migrations(name) VALUES ('122_company_early_access_license.sql') ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('122_company_early_access_license.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 122_company_early_access_license.sql =====

-- ===== BEGIN 123_dp_address_number.sql =====
-- Additive: do not parse or overwrite existing free-text addresses.
ALTER TABLE candidate_dp_profiles ADD COLUMN IF NOT EXISTS address_number VARCHAR(20) NOT NULL DEFAULT '';
INSERT INTO schema_migrations(name) VALUES ('123_dp_address_number.sql') ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('123_dp_address_number.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 123_dp_address_number.sql =====

-- ===== BEGIN 124_employee_profile_fields.sql =====
-- 124: Complete employee profile fields requested by RH.
-- Expand-only and idempotent: existing candidate/DP data is preserved.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS personal_email TEXT,
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS employee_number TEXT,
  ADD COLUMN IF NOT EXISTS work_format TEXT,
  ADD COLUMN IF NOT EXISTS work_history TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS candidates_company_employee_number_uq
  ON candidates (company_id, lower(btrim(employee_number)))
  WHERE employee_number IS NOT NULL AND btrim(employee_number) <> '';

ALTER TABLE candidate_dp_profiles
  ADD COLUMN IF NOT EXISTS rg TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dependents JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN candidates.personal_email IS 'Personal email for the employee profile.';
COMMENT ON COLUMN candidates.marital_status IS 'Marital status captured by HR.';
COMMENT ON COLUMN candidates.employee_number IS 'Company employee number / matrícula.';
COMMENT ON COLUMN candidates.work_format IS 'Employment format: clt, intern, contractor, or pj.';
COMMENT ON COLUMN candidates.work_history IS 'Internal work-format or employment history notes.';
COMMENT ON COLUMN candidate_dp_profiles.rg IS 'Brazilian identity document number.';
COMMENT ON COLUMN candidate_dp_profiles.dependents IS
  'JSON array of dependents: name, cpf, relation, birthDate.';

INSERT INTO schema_migrations (name) VALUES ('124_employee_profile_fields.sql')
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('124_employee_profile_fields.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 124_employee_profile_fields.sql =====

-- ===== BEGIN 125_company_trial_terms.sql =====
-- Commercial transition: preserve existing licenses and apply the new trial terms only to new companies.
ALTER TABLE company_licenses
  ADD COLUMN IF NOT EXISTS offer_tier TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS trial_days INTEGER NOT NULL DEFAULT 365;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_licenses_offer_tier_chk'
  ) THEN
    ALTER TABLE company_licenses
      ADD CONSTRAINT company_licenses_offer_tier_chk
      CHECK (offer_tier IN ('legacy', 'trial', 'early_adopter', 'design_partner'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_licenses_trial_days_chk'
  ) THEN
    ALTER TABLE company_licenses
      ADD CONSTRAINT company_licenses_trial_days_chk CHECK (trial_days > 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION issue_company_early_access_license() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  next_offer_tier TEXT := 'trial';
  next_trial_days INTEGER := 30;
BEGIN
  IF NEW.signup_source = 'early_access' AND NEW.company_id IS NOT NULL THEN
    -- Serialize cohort assignment so concurrent company signups cannot both claim the last slot.
    PERFORM pg_advisory_xact_lock(3035, 125);

    IF (SELECT COUNT(*) FROM company_licenses WHERE offer_tier = 'early_adopter') < 20 THEN
      next_offer_tier := 'early_adopter';
      next_trial_days := 90;
    END IF;

    INSERT INTO company_licenses(company_id, starts_at, expires_at, offer_tier, trial_days)
    VALUES (
      NEW.company_id,
      NEW.created_at,
      NEW.created_at + make_interval(days => next_trial_days),
      next_offer_tier,
      next_trial_days
    )
    ON CONFLICT (company_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_issue_early_access_license ON users;
CREATE TRIGGER users_issue_early_access_license
AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION issue_company_early_access_license();

COMMENT ON COLUMN company_licenses.offer_tier IS 'Commercial cohort: legacy, trial, early_adopter, or design_partner.';
COMMENT ON COLUMN company_licenses.trial_days IS 'Promised free period for the company cohort; existing legacy rows retain 365 days.';

INSERT INTO schema_migrations(name) VALUES ('125_company_trial_terms.sql') ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('125_company_trial_terms.sql') ON CONFLICT (name) DO NOTHING;
-- ===== END 125_company_trial_terms.sql =====

COMMIT;
