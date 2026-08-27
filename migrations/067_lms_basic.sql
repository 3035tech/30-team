-- 067: Basic LMS — courses, ordered lessons (URL), enrollments, lesson completions.
-- No quiz, certificate, SCORM, or native video player. Collaborator consumes via /e token.
-- Academy (learning_resources) remains the PDI catalog — separate from this module.

CREATE TABLE IF NOT EXISTS lms_courses (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  completion_pct       SMALLINT NOT NULL DEFAULT 100,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lms_courses_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 300),
  CONSTRAINT lms_courses_description_len CHECK (char_length(description) <= 8000),
  CONSTRAINT lms_courses_completion_pct_chk CHECK (completion_pct >= 1 AND completion_pct <= 100)
);

CREATE INDEX IF NOT EXISTS idx_lms_courses_company
  ON lms_courses (company_id, active, updated_at DESC);

COMMENT ON TABLE lms_courses IS
  'Basic LMS courses (company-scoped). Lessons are URLs; progress via enrollments.';

CREATE TABLE IF NOT EXISTS lms_lessons (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id            BIGINT NOT NULL REFERENCES lms_courses(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  content_url          TEXT NOT NULL,
  content_kind         TEXT NOT NULL DEFAULT 'link',
  sort_order           INT NOT NULL DEFAULT 0,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lms_lessons_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 300),
  CONSTRAINT lms_lessons_url_len CHECK (char_length(btrim(content_url)) >= 1 AND char_length(content_url) <= 2000),
  CONSTRAINT lms_lessons_kind_chk CHECK (content_kind IN ('link', 'youtube', 'vimeo', 'pdf')),
  CONSTRAINT lms_lessons_sort_chk CHECK (sort_order >= 0 AND sort_order <= 10000)
);

CREATE INDEX IF NOT EXISTS idx_lms_lessons_course
  ON lms_lessons (course_id, active, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_lms_lessons_company
  ON lms_lessons (company_id, course_id);

COMMENT ON TABLE lms_lessons IS
  'Ordered lessons for an LMS course. content_url = external link / YouTube / Vimeo / PDF URL (e.g. S3).';

CREATE TABLE IF NOT EXISTS lms_enrollments (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id            BIGINT NOT NULL REFERENCES lms_courses(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  enrolled_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  enrolled_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ,
  UNIQUE (course_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_lms_enrollments_company_course
  ON lms_enrollments (company_id, course_id, enrolled_at DESC);

CREATE INDEX IF NOT EXISTS idx_lms_enrollments_candidate
  ON lms_enrollments (company_id, candidate_id, enrolled_at DESC);

COMMENT ON TABLE lms_enrollments IS
  'RH enrolls employees (candidates) on LMS courses. completed_at set when progress >= course.completion_pct.';

CREATE TABLE IF NOT EXISTS lms_lesson_completions (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  enrollment_id        BIGINT NOT NULL REFERENCES lms_enrollments(id) ON DELETE CASCADE,
  lesson_id            BIGINT NOT NULL REFERENCES lms_lessons(id) ON DELETE CASCADE,
  completed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (enrollment_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lms_lesson_completions_enrollment
  ON lms_lesson_completions (enrollment_id);

CREATE INDEX IF NOT EXISTS idx_lms_lesson_completions_company
  ON lms_lesson_completions (company_id, lesson_id);

COMMENT ON TABLE lms_lesson_completions IS
  'Lesson marked done for an enrollment. Progress derived from active lessons on the course.';
