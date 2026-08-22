-- 033 — códigos de referral (?ref=) para vagas / empresa

CREATE TABLE IF NOT EXISTS referral_codes (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  vacancy_id BIGINT REFERENCES vacancies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  owner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  owner_candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referral_codes_code_format CHECK (
    char_length(code) BETWEEN 2 AND 64
    AND code ~ '^[A-Z0-9][A-Z0-9_-]*$'
  )
);

-- Código único global (lookup por ?ref= sem ambiguidade)
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_codes_code_lower
  ON referral_codes (LOWER(code));

CREATE INDEX IF NOT EXISTS idx_referral_codes_company_active
  ON referral_codes (company_id, active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_codes_vacancy
  ON referral_codes (vacancy_id)
  WHERE vacancy_id IS NOT NULL;

COMMENT ON TABLE referral_codes IS
  'Códigos ?ref= gerenciados. vacancy_id NULL = escopo empresa. Sem PII no código.';
COMMENT ON COLUMN referral_codes.code IS 'Código normalizado (A-Z0-9_-) único no sistema';
COMMENT ON COLUMN referral_codes.vacancy_id IS 'NULL = vale para qualquer vaga pública da empresa';
