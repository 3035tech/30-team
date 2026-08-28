-- B-2501 — prep 1:1 na sessão colaborador + convites pessoais clima/pulso

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS one_on_one_prep_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS one_on_one_prep_note TEXT NOT NULL DEFAULT '';

ALTER TABLE candidates
  DROP CONSTRAINT IF EXISTS candidates_one_on_one_prep_note_len;
ALTER TABLE candidates
  ADD CONSTRAINT candidates_one_on_one_prep_note_len
  CHECK (char_length(one_on_one_prep_note) <= 2000);

COMMENT ON COLUMN candidates.one_on_one_prep_at IS
  'Colaborador marcou prep do próximo 1:1 em /colaborador (nota visível ao gestor na Equipe).';
COMMENT ON COLUMN candidates.one_on_one_prep_note IS
  'Nota opcional ao gestor sobre o próximo 1:1 (sessão autenticada).';

ALTER TABLE climate_survey_invites
  ADD COLUMN IF NOT EXISTS candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL;

ALTER TABLE team_pulse_invites
  ADD COLUMN IF NOT EXISTS candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_climate_invites_survey_candidate
  ON climate_survey_invites (survey_id, candidate_id)
  WHERE candidate_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_pulse_invites_pulse_candidate
  ON team_pulse_invites (pulse_id, candidate_id)
  WHERE candidate_id IS NOT NULL;
