-- 014: candidatos pré-cadastrados na vaga (entrevista → notas → envio do desafio).
-- Email é a chave de união com eneagrama/motivadores.

CREATE TABLE IF NOT EXISTS vacancy_candidates (
  id                  BIGSERIAL PRIMARY KEY,
  vacancy_id          BIGINT NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  candidate_id        BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id          BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  interview_notes     TEXT,
  created_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vacancy_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_vacancy_candidates_vacancy
  ON vacancy_candidates (vacancy_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vacancy_candidates_candidate
  ON vacancy_candidates (candidate_id);

CREATE INDEX IF NOT EXISTS idx_vacancy_candidates_company
  ON vacancy_candidates (company_id, created_at DESC);

ALTER TABLE candidate_invites
  ADD COLUMN IF NOT EXISTS candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_candidate_invites_candidate
  ON candidate_invites (candidate_id)
  WHERE candidate_id IS NOT NULL;

COMMENT ON TABLE vacancy_candidates IS
  'Vínculo candidato↔vaga criado na entrevista (antes do teste). Notas ricas em interview_notes.';
COMMENT ON COLUMN vacancy_candidates.interview_notes IS
  'Anotações da entrevista (HTML sanitizado do editor rico).';
COMMENT ON COLUMN candidate_invites.candidate_id IS
  'Candidato pré-cadastrado ao enviar o desafio de eneagrama.';
