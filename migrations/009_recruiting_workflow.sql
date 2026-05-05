-- 009: convites rastreáveis, rubrica por vaga, pipeline em assessments.

CREATE TABLE IF NOT EXISTS candidate_invites (
  id                  BIGSERIAL PRIMARY KEY,
  vacancy_id          BIGINT NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  company_id          BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_name      TEXT NOT NULL,
  candidate_email     TEXT NOT NULL,
  token               TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'opened', 'completed', 'cancelled')),
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at           TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  last_reminder_at    TIMESTAMPTZ,
  reminder_count      INTEGER NOT NULL DEFAULT 0,
  created_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_invites_token_unique ON candidate_invites (token);
CREATE INDEX IF NOT EXISTS idx_candidate_invites_vacancy_email ON candidate_invites (vacancy_id, LOWER(candidate_email));
CREATE INDEX IF NOT EXISTS idx_candidate_invites_reminder ON candidate_invites (status, sent_at)
  WHERE status IN ('sent', 'opened');

CREATE TABLE IF NOT EXISTS vacancy_rubrics (
  vacancy_id              BIGINT PRIMARY KEY REFERENCES vacancies(id) ON DELETE CASCADE,
  desired_type_weights      JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes                     TEXT,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS invite_id BIGINT REFERENCES candidate_invites(id) ON DELETE SET NULL;

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'test_completed';

ALTER TABLE assessments
  DROP CONSTRAINT IF EXISTS assessments_pipeline_stage_check;

ALTER TABLE assessments
  ADD CONSTRAINT assessments_pipeline_stage_check CHECK (
    pipeline_stage IN (
      'new',
      'test_completed',
      'screening',
      'interview',
      'approved',
      'rejected',
      'archived'
    )
  );

CREATE INDEX IF NOT EXISTS idx_assessments_pipeline ON assessments (company_id, pipeline_stage, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_invite ON assessments (invite_id) WHERE invite_id IS NOT NULL;
