-- 068: LMS next cut — cohorts (turmas), due/mandatory on enrollments, PDI↔ course links.
-- Complements 067 basic LMS (courses, lessons, enrollments, completions).

CREATE TABLE IF NOT EXISTS lms_cohorts (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id            BIGINT NOT NULL REFERENCES lms_courses(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  due_date             DATE,
  mandatory            BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lms_cohorts_name_len CHECK (char_length(btrim(name)) >= 1 AND char_length(name) <= 200)
);

CREATE INDEX IF NOT EXISTS idx_lms_cohorts_course
  ON lms_cohorts (company_id, course_id, created_at DESC);

COMMENT ON TABLE lms_cohorts IS
  'Simple LMS cohorts (turmas): named group on a course with optional shared due_date / mandatory.';

ALTER TABLE lms_enrollments
  ADD COLUMN IF NOT EXISTS cohort_id BIGINT REFERENCES lms_cohorts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS mandatory BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_lms_enrollments_due
  ON lms_enrollments (company_id, due_date)
  WHERE due_date IS NOT NULL AND completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lms_enrollments_cohort
  ON lms_enrollments (cohort_id)
  WHERE cohort_id IS NOT NULL;

COMMENT ON COLUMN lms_enrollments.due_date IS
  'Complete-by date (nullable). Used for Overview overdue + cron notifs.';
COMMENT ON COLUMN lms_enrollments.mandatory IS
  'When true, overdue enrollments surface as attention signals.';

CREATE TABLE IF NOT EXISTS development_plan_lms_links (
  id                   BIGSERIAL PRIMARY KEY,
  plan_item_id         BIGINT NOT NULL REFERENCES development_plan_items(id) ON DELETE CASCADE,
  course_id            BIGINT NOT NULL REFERENCES lms_courses(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_item_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_dev_plan_lms_links_item
  ON development_plan_lms_links (plan_item_id);

CREATE INDEX IF NOT EXISTS idx_dev_plan_lms_links_course
  ON development_plan_lms_links (course_id);

COMMENT ON TABLE development_plan_lms_links IS
  'Optional PDI item → LMS course link (progress lives on lms_enrollments, not Academy catalog).';
