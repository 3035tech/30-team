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
