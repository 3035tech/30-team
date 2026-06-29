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
