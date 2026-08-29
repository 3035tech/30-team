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
