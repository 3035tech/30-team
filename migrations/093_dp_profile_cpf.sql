-- 093: DP profile CPF (digits only; UI mask in PromptFormDialog).

ALTER TABLE candidate_dp_profiles
  ADD COLUMN IF NOT EXISTS cpf TEXT NOT NULL DEFAULT '';

ALTER TABLE candidate_dp_profiles
  DROP CONSTRAINT IF EXISTS candidate_dp_profiles_cpf_len;
ALTER TABLE candidate_dp_profiles
  ADD CONSTRAINT candidate_dp_profiles_cpf_len
  CHECK (char_length(cpf) <= 11);

COMMENT ON COLUMN candidate_dp_profiles.cpf IS
  'Optional CPF digits only (11). Not an identity proof / eSocial field.';

INSERT INTO schema_migrations (name) VALUES ('093_dp_profile_cpf.sql')
ON CONFLICT (name) DO NOTHING;
