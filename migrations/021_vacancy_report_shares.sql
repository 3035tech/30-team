-- 021: public temporary client reports per vacancy (strong token + snapshot)

CREATE TABLE IF NOT EXISTS vacancy_report_shares (
  id BIGSERIAL PRIMARY KEY,
  vacancy_id BIGINT NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  title TEXT,
  executive_note TEXT,
  snapshot JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vacancy_report_shares_token
  ON vacancy_report_shares (token);

CREATE INDEX IF NOT EXISTS idx_vacancy_report_shares_vacancy_created
  ON vacancy_report_shares (vacancy_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vacancy_report_shares_active
  ON vacancy_report_shares (vacancy_id, active)
  WHERE active = TRUE;

COMMENT ON TABLE vacancy_report_shares IS 'Client-facing vacancy shortlist reports; public /r/<token> until expiry or revoke';
COMMENT ON COLUMN vacancy_report_shares.snapshot IS 'Immutable JSON payload shown on the public page (no emails/phones)';
