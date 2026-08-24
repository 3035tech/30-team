-- 051 — B-702 pre-onboarding checklist + B-703 minimal offer/acceptance

-- ── B-702 ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_pre_onboarding_items (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  item_key             TEXT NOT NULL,
  due_date             DATE NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending',
  notes                TEXT NOT NULL DEFAULT '',
  completed_at         TIMESTAMPTZ,
  completed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_pre_onboarding_item_key_chk
    CHECK (item_key IN ('welcome_kit', 'rh_onboarding_call', 'manager_onboarding')),
  CONSTRAINT employee_pre_onboarding_status_chk
    CHECK (status IN ('pending', 'done', 'skipped')),
  CONSTRAINT employee_pre_onboarding_notes_len
    CHECK (char_length(notes) <= 2000),
  CONSTRAINT employee_pre_onboarding_unique
    UNIQUE (candidate_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_pre_onboarding_company_due
  ON employee_pre_onboarding_items (company_id, due_date ASC, id ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_pre_onboarding_candidate
  ON employee_pre_onboarding_items (candidate_id, item_key ASC);

COMMENT ON TABLE employee_pre_onboarding_items IS
  'Day-1 checklist: welcome kit + access sheet, RH Meet, manager onboarding (B-702).';

-- ── B-703 ──────────────────────────────────────────────────────────────────
ALTER TABLE vacancy_candidates
  ADD COLUMN IF NOT EXISTS offer_salary TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS offer_start_date DATE,
  ADD COLUMN IF NOT EXISTS offer_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS offer_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_notes TEXT NOT NULL DEFAULT '';

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS offer_salary TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS offer_start_date DATE,
  ADD COLUMN IF NOT EXISTS offer_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS offer_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_notes TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vacancy_candidates_offer_status_chk') THEN
    ALTER TABLE vacancy_candidates DROP CONSTRAINT vacancy_candidates_offer_status_chk;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessments_offer_status_chk') THEN
    ALTER TABLE assessments DROP CONSTRAINT assessments_offer_status_chk;
  END IF;
END $$;

ALTER TABLE vacancy_candidates
  ADD CONSTRAINT vacancy_candidates_offer_status_chk
  CHECK (offer_status IN ('none', 'proposed', 'accepted', 'declined'));

ALTER TABLE assessments
  ADD CONSTRAINT assessments_offer_status_chk
  CHECK (offer_status IN ('none', 'proposed', 'accepted', 'declined'));

COMMENT ON COLUMN vacancy_candidates.offer_status IS
  'B-703 minimal proposal/acceptance: none|proposed|accepted|declined';
COMMENT ON COLUMN assessments.offer_status IS
  'B-703 minimal proposal/acceptance: none|proposed|accepted|declined';
