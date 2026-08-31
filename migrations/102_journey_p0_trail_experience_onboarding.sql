-- 102: P0 jornada gaps — LMS trail by job role, experience decision fields,
-- configurable pre-onboarding template.

-- ── LMS: cargo → cursos (trilha) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lms_job_role_courses (
  id              BIGSERIAL PRIMARY KEY,
  company_id      BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_role_id     BIGINT NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
  course_id       BIGINT NOT NULL REFERENCES lms_courses(id) ON DELETE CASCADE,
  sort_order      INT NOT NULL DEFAULT 0,
  mandatory       BOOLEAN NOT NULL DEFAULT TRUE,
  due_offset_days INT NOT NULL DEFAULT 30
    CHECK (due_offset_days BETWEEN 1 AND 365),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lms_job_role_courses_unique UNIQUE (job_role_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_lms_job_role_courses_co
  ON lms_job_role_courses (company_id, job_role_id, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_lms_job_role_courses_course
  ON lms_job_role_courses (company_id, course_id);

COMMENT ON TABLE lms_job_role_courses IS
  'P0: ordered LMS trail per job role (mandatory/recommended + due offset days).';

-- ── Experiência: prorrogação tipada + outcome terminate ────────────────────
ALTER TABLE employee_onboarding_checkins
  ADD COLUMN IF NOT EXISTS extend_days INT;

ALTER TABLE employee_onboarding_checkins
  DROP CONSTRAINT IF EXISTS employee_onboarding_checkins_outcome_chk;

ALTER TABLE employee_onboarding_checkins
  ADD CONSTRAINT employee_onboarding_checkins_outcome_chk
  CHECK (outcome IN (
    '', 'continue', 'develop', 'concern', 'pass', 'fail', 'extend', 'terminate'
  ));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_onboarding_checkins_extend_days_chk'
  ) THEN
    ALTER TABLE employee_onboarding_checkins
      ADD CONSTRAINT employee_onboarding_checkins_extend_days_chk
      CHECK (extend_days IS NULL OR (extend_days BETWEEN 1 AND 180));
  END IF;
END $$;

COMMENT ON COLUMN employee_onboarding_checkins.extend_days IS
  'P0: when outcome=extend, days added to later pending milestones.';
COMMENT ON COLUMN employee_onboarding_checkins.outcome IS
  'B-2705+P0: continue|develop|concern|pass|fail|extend|terminate (empty ok).';

-- ── Pré-onboarding: template por empresa ───────────────────────────────────
CREATE TABLE IF NOT EXISTS company_pre_onboarding_templates (
  id               BIGSERIAL PRIMARY KEY,
  company_id       BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_key         TEXT NOT NULL,
  label_pt         TEXT NOT NULL DEFAULT '',
  label_en         TEXT NOT NULL DEFAULT '',
  owner_role       TEXT NOT NULL DEFAULT 'rh',
  sort_order       INT NOT NULL DEFAULT 0,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  due_offset_days  INT NOT NULL DEFAULT 0
    CHECK (due_offset_days BETWEEN 0 AND 90),
  require_meet     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_pre_onboarding_templates_key_fmt
    CHECK (item_key ~ '^[a-z][a-z0-9_]{1,40}$'),
  CONSTRAINT company_pre_onboarding_templates_owner_chk
    CHECK (owner_role IN ('rh', 'manager', 'it', 'security', 'employee')),
  CONSTRAINT company_pre_onboarding_templates_unique
    UNIQUE (company_id, item_key),
  CONSTRAINT company_pre_onboarding_templates_label_pt_len
    CHECK (char_length(label_pt) <= 120),
  CONSTRAINT company_pre_onboarding_templates_label_en_len
    CHECK (char_length(label_en) <= 120)
);

CREATE INDEX IF NOT EXISTS idx_company_pre_onboarding_tpl_co
  ON company_pre_onboarding_templates (company_id, active, sort_order ASC, id ASC);

COMMENT ON TABLE company_pre_onboarding_templates IS
  'P0: company D1 checklist template (owner role + labels). Seeds employee_pre_onboarding_items.';

ALTER TABLE employee_pre_onboarding_items
  DROP CONSTRAINT IF EXISTS employee_pre_onboarding_item_key_chk;

ALTER TABLE employee_pre_onboarding_items
  ADD CONSTRAINT employee_pre_onboarding_item_key_chk
  CHECK (item_key ~ '^[a-z][a-z0-9_]{1,40}$');

ALTER TABLE employee_pre_onboarding_items
  ADD COLUMN IF NOT EXISTS owner_role TEXT NOT NULL DEFAULT 'rh';

ALTER TABLE employee_pre_onboarding_items
  ADD COLUMN IF NOT EXISTS label_snapshot TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_pre_onboarding_owner_chk'
  ) THEN
    ALTER TABLE employee_pre_onboarding_items
      ADD CONSTRAINT employee_pre_onboarding_owner_chk
      CHECK (owner_role IN ('rh', 'manager', 'it', 'security', 'employee'));
  END IF;
END $$;

INSERT INTO schema_migrations (name) VALUES ('102_journey_p0_trail_experience_onboarding.sql')
ON CONFLICT (name) DO NOTHING;
