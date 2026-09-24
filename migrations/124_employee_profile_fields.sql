-- 124: Complete employee profile fields requested by RH.
-- Expand-only and idempotent: existing candidate/DP data is preserved.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS personal_email TEXT,
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS employee_number TEXT,
  ADD COLUMN IF NOT EXISTS work_format TEXT,
  ADD COLUMN IF NOT EXISTS work_history TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS candidates_company_employee_number_uq
  ON candidates (company_id, lower(btrim(employee_number)))
  WHERE employee_number IS NOT NULL AND btrim(employee_number) <> '';

ALTER TABLE candidate_dp_profiles
  ADD COLUMN IF NOT EXISTS rg TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dependents JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN candidates.personal_email IS 'Personal email for the employee profile.';
COMMENT ON COLUMN candidates.marital_status IS 'Marital status captured by HR.';
COMMENT ON COLUMN candidates.employee_number IS 'Company employee number / matrícula.';
COMMENT ON COLUMN candidates.work_format IS 'Employment format: clt, intern, contractor, or pj.';
COMMENT ON COLUMN candidates.work_history IS 'Internal work-format or employment history notes.';
COMMENT ON COLUMN candidate_dp_profiles.rg IS 'Brazilian identity document number.';
COMMENT ON COLUMN candidate_dp_profiles.dependents IS
  'JSON array of dependents: name, cpf, relation, birthDate.';

INSERT INTO schema_migrations (name) VALUES ('124_employee_profile_fields.sql')
ON CONFLICT (name) DO NOTHING;
