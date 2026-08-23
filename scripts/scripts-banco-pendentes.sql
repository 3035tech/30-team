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

-- 027 — retenção de notificações in-app
CREATE INDEX IF NOT EXISTS idx_manager_notifications_created_at
  ON manager_notifications (created_at ASC);

-- 028 — pretensão no relatório do cliente (flag por vaga)
ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS client_report_show_salary BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN vacancies.client_report_show_salary IS
  'Se TRUE, o relatório público /r inclui pretensão salarial do candidato. FALSE = omitir (padrão).';

-- 029 — formato de contratação + troca de senha no 1º acesso
ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS employment_type TEXT;

COMMENT ON COLUMN vacancies.employment_type IS
  'internship | clt | pj | cooperative | NULL';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.must_change_password IS
  'TRUE após criação com senha temporária — obriga troca no próximo login.';

-- 030 — perfil empresa + página pública indexável da vaga
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS about_html TEXT;

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS public_page_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_allow_index BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS public_show_company_info BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_show_salary BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_vacancies_company_slug_public
  ON vacancies (company_id, LOWER(slug))
  WHERE deleted = FALSE AND public_page_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_vacancies_public_open_created
  ON vacancies (created_at DESC)
  WHERE deleted = FALSE
    AND public_page_enabled = TRUE
    AND public_allow_index = TRUE
    AND status = 'open';

-- 031 — indexação ligada por padrão (novas vagas)
ALTER TABLE vacancies
  ALTER COLUMN public_allow_index SET DEFAULT TRUE;

-- 032 — atribuição UTM + funil de vagas públicas
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS attr_source TEXT,
  ADD COLUMN IF NOT EXISTS attr_medium TEXT,
  ADD COLUMN IF NOT EXISTS attr_campaign TEXT,
  ADD COLUMN IF NOT EXISTS attr_content TEXT,
  ADD COLUMN IF NOT EXISTS attr_term TEXT,
  ADD COLUMN IF NOT EXISTS attr_ref TEXT,
  ADD COLUMN IF NOT EXISTS attr_landing TEXT,
  ADD COLUMN IF NOT EXISTS attr_session_id TEXT;

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

-- 033 — códigos referral (?ref=)
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_codes_code_lower
  ON referral_codes (LOWER(code));

CREATE INDEX IF NOT EXISTS idx_referral_codes_company_active
  ON referral_codes (company_id, active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_codes_vacancy
  ON referral_codes (vacancy_id)
  WHERE vacancy_id IS NOT NULL;

-- 034 — sessão revogável + expiração de convite Enneagrama
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE candidate_invites
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

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

-- 035 — job alerts (avisos de novas vagas por e-mail)
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

-- 036 — perfil público da empresa (opt-in; URL neutra /c/{slug})
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS public_profile_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_companies_public_profile_slug
  ON companies (LOWER(slug))
  WHERE deleted = FALSE AND active = TRUE AND public_profile_enabled = TRUE;

-- 037 — local / modalidade da vaga (IBGE cidade+UF; base para agregadores)
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

-- 038 — convite para definir senha (sem senha temporária no e-mail)
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

-- 039 — logo da empresa (URL + key S3; arquivo fora do Postgres)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_key TEXT;

COMMENT ON COLUMN companies.logo_url IS
  'URL pública https do logo (CDN/S3). Usado em /c, /j e JobPosting.hiringOrganization.logo.';
COMMENT ON COLUMN companies.logo_key IS
  'Object key no bucket S3 (companies/{id}/{uuid}.ext ou com S3_KEY_PREFIX). NULL se sem logo.';


-- 040 — grupos salvos (squads)
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


-- 041 — interview scorecards (B-407)

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

INSERT INTO schema_migrations (name) VALUES ('041_interview_scorecards.sql')
ON CONFLICT (name) DO NOTHING;
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

-- 044 — B-600 A/B: PDI ciclo (owner) + fontes one_on_one/retention; follow-up de retenção

ALTER TABLE development_plan_items
  ADD COLUMN IF NOT EXISTS owner_label TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'development_plan_items_owner_label_len'
  ) THEN
    ALTER TABLE development_plan_items DROP CONSTRAINT development_plan_items_owner_label_len;
  END IF;
END $$;

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
