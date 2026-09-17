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
