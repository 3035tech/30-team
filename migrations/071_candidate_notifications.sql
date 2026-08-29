-- 071: Collaborator in-app notifications + preferred locale on candidates.
-- Separate from manager_notifications (recipient = candidate, not users).

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT;

COMMENT ON COLUMN candidates.preferred_locale IS
  'UI locale for /employee (pt-BR|en); cookie also set client-side';

CREATE TABLE IF NOT EXISTS candidate_notifications (
  id                       BIGSERIAL PRIMARY KEY,
  company_id               BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recipient_candidate_id   BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  type                     TEXT NOT NULL,
  payload                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  entity_type              TEXT,
  entity_id                BIGINT,
  dedupe_key               TEXT,
  read_at                  TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_notifications_recipient_created
  ON candidate_notifications (recipient_candidate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_candidate_notifications_recipient_unread
  ON candidate_notifications (recipient_candidate_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_notifications_dedupe
  ON candidate_notifications (recipient_candidate_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidate_notifications_company_created
  ON candidate_notifications (company_id, created_at DESC);

COMMENT ON TABLE candidate_notifications IS
  'In-app inbox for collaborators (/employee). Fan-out by candidate_id within company.';
