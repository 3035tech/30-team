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

