-- B-2709: candidate interview prep link (questions hedged; prepared flag only for manager)

CREATE TABLE IF NOT EXISTS interview_prep_links (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vacancy_id           BIGINT NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  token                TEXT NOT NULL,
  prepared_at          TIMESTAMPTZ,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at           TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  CONSTRAINT interview_prep_links_token_len CHECK (char_length(token) BETWEEN 16 AND 128)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_prep_links_token
  ON interview_prep_links (token);

CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_prep_links_vacancy_candidate
  ON interview_prep_links (vacancy_id, candidate_id);

CREATE INDEX IF NOT EXISTS idx_interview_prep_links_company
  ON interview_prep_links (company_id, created_at DESC);

COMMENT ON TABLE interview_prep_links IS
  'B-2709: public /prep/<token> for candidate interview prep; answers stay local; prepared_at visible to RH.';
