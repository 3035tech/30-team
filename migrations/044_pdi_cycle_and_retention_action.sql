-- 044 — B-600 A/B: PDI ciclo (owner) + fontes one_on_one/retention; follow-up de retenção

ALTER TABLE development_plan_items
  ADD COLUMN IF NOT EXISTS owner_label TEXT NOT NULL DEFAULT '';

ALTER TABLE development_plan_items
  DROP CONSTRAINT IF EXISTS development_plan_items_owner_label_len;
ALTER TABLE development_plan_items
  ADD CONSTRAINT development_plan_items_owner_label_len
  CHECK (char_length(owner_label) <= 120);

ALTER TABLE development_plan_items
  DROP CONSTRAINT IF EXISTS development_plan_items_source_chk;

ALTER TABLE development_plan_items
  ADD CONSTRAINT development_plan_items_source_chk
  CHECK (source IN ('manual', 'synthesis', 'one_on_one', 'retention'));

COMMENT ON COLUMN development_plan_items.owner_label IS
  'Free-text owner / responsible for the item (B-601).';
COMMENT ON COLUMN development_plan_items.source IS
  'manual | synthesis | one_on_one | retention (B-601/B-602).';

CREATE TABLE IF NOT EXISTS retention_followups (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  plan_id              BIGINT REFERENCES development_plans(id) ON DELETE SET NULL,
  signal_keys          TEXT[] NOT NULL DEFAULT '{}',
  explanation          TEXT NOT NULL DEFAULT '',
  suggested_question   TEXT NOT NULL DEFAULT '',
  review_due           DATE,
  reviewed_at          TIMESTAMPTZ,
  review_notes         TEXT NOT NULL DEFAULT '',
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT retention_followups_explanation_len CHECK (char_length(explanation) <= 2000),
  CONSTRAINT retention_followups_question_len CHECK (char_length(suggested_question) <= 1000),
  CONSTRAINT retention_followups_notes_len CHECK (char_length(review_notes) <= 4000)
);

CREATE INDEX IF NOT EXISTS idx_retention_followups_candidate
  ON retention_followups (candidate_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_retention_followups_company_review
  ON retention_followups (company_id, review_due ASC NULLS LAST)
  WHERE reviewed_at IS NULL;

COMMENT ON TABLE retention_followups IS
  'Retention watch → actionable follow-up (signal + question + plan + review). B-602.';

INSERT INTO schema_migrations (name) VALUES ('044_pdi_cycle_and_retention_action.sql')
ON CONFLICT (name) DO NOTHING;
