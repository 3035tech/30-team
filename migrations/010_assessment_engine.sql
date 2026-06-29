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
