-- 120: replay protection for critical employee mobile mutations.
ALTER TABLE employee_time_punches
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE company_kudos
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_time_punches_mobile_idempotency
  ON employee_time_punches (company_id, candidate_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_kudos_mobile_idempotency
  ON company_kudos (company_id, from_candidate_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN employee_time_punches.idempotency_key IS
  'Opaque client mutation key; prevents duplicate mobile punches after ambiguous network failures.';
COMMENT ON COLUMN company_kudos.idempotency_key IS
  'Opaque client mutation key; prevents duplicate mobile kudos after ambiguous network failures.';

INSERT INTO schema_migrations (name) VALUES ('120_mobile_employee_mutation_idempotency.sql')
ON CONFLICT (name) DO NOTHING;
