-- 095: LMS watch progress (B-2717) — resume YouTube/Vimeo position per enrollment+lesson.
-- Not SCORM; no auto-complete by % watched.

CREATE TABLE IF NOT EXISTS lms_lesson_watch_progress (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  enrollment_id        BIGINT NOT NULL REFERENCES lms_enrollments(id) ON DELETE CASCADE,
  lesson_id            BIGINT NOT NULL REFERENCES lms_lessons(id) ON DELETE CASCADE,
  position_sec         INT NOT NULL DEFAULT 0,
  duration_sec         INT NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lms_watch_position_chk CHECK (position_sec >= 0 AND position_sec <= 172800),
  CONSTRAINT lms_watch_duration_chk CHECK (duration_sec >= 0 AND duration_sec <= 172800),
  CONSTRAINT lms_watch_enroll_lesson_uq UNIQUE (enrollment_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lms_watch_progress_enrollment
  ON lms_lesson_watch_progress (enrollment_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_lms_watch_progress_company
  ON lms_lesson_watch_progress (company_id, lesson_id);

COMMENT ON TABLE lms_lesson_watch_progress IS
  'B-2717: resume position (seconds) for youtube/vimeo lessons. PDF/link ignored.';

INSERT INTO schema_migrations (name) VALUES ('095_lms_watch_progress.sql')
ON CONFLICT (name) DO NOTHING;
