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
