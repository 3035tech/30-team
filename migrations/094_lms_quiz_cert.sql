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
