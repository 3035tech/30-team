-- 118: Expo push tokens scoped to an active employee/company context.
CREATE TABLE IF NOT EXISTS mobile_employee_push_tokens (
  id BIGSERIAL PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  CONSTRAINT mobile_employee_push_tokens_token_unique UNIQUE (expo_push_token)
);

CREATE INDEX IF NOT EXISTS idx_mobile_employee_push_tokens_recipient
  ON mobile_employee_push_tokens (company_id, candidate_id)
  WHERE active = TRUE;

INSERT INTO schema_migrations (name) VALUES ('118_mobile_employee_push_tokens.sql')
ON CONFLICT (name) DO NOTHING;
