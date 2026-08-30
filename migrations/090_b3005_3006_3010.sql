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
