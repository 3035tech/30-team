-- 041 — interview scorecards (B-407): structured 1–5 ratings vs briefing questions
CREATE TABLE IF NOT EXISTS interview_scorecards (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  vacancy_id BIGINT NOT NULL REFERENCES vacancies(id),
  candidate_id BIGINT NOT NULL REFERENCES candidates(id),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_user_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vacancy_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_scorecards_company
  ON interview_scorecards (company_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_interview_scorecards_candidate
  ON interview_scorecards (candidate_id, vacancy_id);
